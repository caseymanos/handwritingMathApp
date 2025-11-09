/**
 * Tutorial Sync Client
 *
 * Handles syncing tutorial lessons and progress with Supabase.
 * Used by tutorialStore for cloud sync operations.
 */

import { getSupabaseClient, getCurrentUser, isCloudSyncEnabled } from './supabaseClient';
import {
  TutorialLesson,
  TutorialProgress,
  TutorialLessonStatus,
  TutorialContentType,
  VideoPlatform,
} from '../../types/Tutorial';
import { ProblemCategory, ProblemDifficulty } from '../../types/Problem';
import { captureException, addBreadcrumb } from '../sentry';

/**
 * Fetch all published tutorial lessons from Supabase
 */
export async function fetchTutorialLessons(): Promise<TutorialLesson[]> {
  if (!isCloudSyncEnabled()) {
    console.warn('[TutorialSync] Cloud sync disabled');
    return [];
  }

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('tutorial_lessons')
      .select('*')
      .eq('published', true)
      .order('skill_category', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[TutorialSync] Failed to fetch lessons:', error);
      throw new Error(`Failed to fetch lessons: ${error.message}`);
    }

    // Map database rows to TutorialLesson objects
    const lessons: TutorialLesson[] = (data || []).map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      skillCategory: row.skill_category as ProblemCategory,
      difficulty: row.difficulty as ProblemDifficulty,
      contentType: row.content_type as TutorialContentType,
      videoUrl: row.video_url,
      videoPlatform: (row.video_platform || 'youtube') as VideoPlatform,
      durationSeconds: row.duration_seconds,
      transcript: row.transcript,
      interactiveContent: row.interactive_content,
      sortOrder: row.sort_order,
      prerequisites: row.prerequisites || [],
      tags: row.tags || [],
      thumbnailUrl: row.thumbnail_url,
      published: row.published,
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    }));

    addBreadcrumb('Lessons fetched', 'tutorial', { count: lessons.length });
    return lessons;
  } catch (error) {
    console.error('[TutorialSync] Error fetching lessons:', error);
    captureException(error as Error, { context: 'fetchTutorialLessons' });
    throw error;
  }
}

/**
 * Fetch user's tutorial progress from Supabase
 */
export async function fetchTutorialProgress(): Promise<TutorialProgress[]> {
  if (!isCloudSyncEnabled()) {
    console.warn('[TutorialSync] Cloud sync disabled');
    return [];
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[TutorialSync] Not authenticated');
      return [];
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('tutorial_progress')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('[TutorialSync] Failed to fetch progress:', error);
      throw new Error(`Failed to fetch progress: ${error.message}`);
    }

    // Map database rows to TutorialProgress objects
    const progress: TutorialProgress[] = (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      lessonId: row.lesson_id,
      status: row.status as TutorialLessonStatus,
      progressPercent: row.progress_percent,
      videoPositionSeconds: row.video_position_seconds || 0,
      startedAt: row.started_at ? new Date(row.started_at).getTime() : null,
      completedAt: row.completed_at ? new Date(row.completed_at).getTime() : null,
      timeSpentSeconds: row.time_spent_seconds,
      lastWatchedAt: row.last_watched_at ? new Date(row.last_watched_at).getTime() : null,
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    }));

    addBreadcrumb('Progress fetched', 'tutorial', { count: progress.length });
    return progress;
  } catch (error) {
    console.error('[TutorialSync] Error fetching progress:', error);
    captureException(error as Error, { context: 'fetchTutorialProgress' });
    throw error;
  }
}

/**
 * Start a lesson (create or update progress entry)
 */
export async function startLesson(lessonId: string): Promise<TutorialProgress> {
  if (!isCloudSyncEnabled()) {
    throw new Error('Cloud sync disabled');
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const client = getSupabaseClient();
    const now = new Date().toISOString();

    // Upsert progress record
    const { data, error } = await client
      .from('tutorial_progress')
      .upsert({
        user_id: user.id,
        lesson_id: lessonId,
        status: TutorialLessonStatus.IN_PROGRESS,
        progress_percent: 0,
        started_at: now,
        last_watched_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error('[TutorialSync] Failed to start lesson:', error);
      throw new Error(`Failed to start lesson: ${error.message}`);
    }

    const progress: TutorialProgress = {
      id: data.id,
      userId: data.user_id,
      lessonId: data.lesson_id,
      status: data.status as TutorialLessonStatus,
      progressPercent: data.progress_percent,
      videoPositionSeconds: data.video_position_seconds || 0,
      startedAt: data.started_at ? new Date(data.started_at).getTime() : null,
      completedAt: data.completed_at ? new Date(data.completed_at).getTime() : null,
      timeSpentSeconds: data.time_spent_seconds,
      lastWatchedAt: data.last_watched_at ? new Date(data.last_watched_at).getTime() : null,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
    };

    addBreadcrumb('Lesson started', 'tutorial', { lessonId });
    return progress;
  } catch (error) {
    console.error('[TutorialSync] Error starting lesson:', error);
    captureException(error as Error, { context: 'startLesson', lessonId });
    throw error;
  }
}

/**
 * Update video position (for resume-on-return)
 */
export async function updateVideoPosition(
  lessonId: string,
  positionSeconds: number
): Promise<TutorialProgress> {
  if (!isCloudSyncEnabled()) {
    throw new Error('Cloud sync disabled');
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const client = getSupabaseClient();
    const now = new Date().toISOString();

    // Update progress with new video position
    const { data, error } = await client
      .from('tutorial_progress')
      .update({
        video_position_seconds: positionSeconds,
        last_watched_at: now,
      })
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .select()
      .single();

    if (error) {
      console.error('[TutorialSync] Failed to update video position:', error);
      throw new Error(`Failed to update position: ${error.message}`);
    }

    const progress: TutorialProgress = {
      id: data.id,
      userId: data.user_id,
      lessonId: data.lesson_id,
      status: data.status as TutorialLessonStatus,
      progressPercent: data.progress_percent,
      videoPositionSeconds: data.video_position_seconds || 0,
      startedAt: data.started_at ? new Date(data.started_at).getTime() : null,
      completedAt: data.completed_at ? new Date(data.completed_at).getTime() : null,
      timeSpentSeconds: data.time_spent_seconds,
      lastWatchedAt: data.last_watched_at ? new Date(data.last_watched_at).getTime() : null,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
    };

    return progress;
  } catch (error) {
    console.error('[TutorialSync] Error updating video position:', error);
    captureException(error as Error, { context: 'updateVideoPosition', lessonId });
    throw error;
  }
}

/**
 * Complete a lesson
 */
export async function completeLesson(lessonId: string): Promise<TutorialProgress> {
  if (!isCloudSyncEnabled()) {
    throw new Error('Cloud sync disabled');
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const client = getSupabaseClient();
    const now = new Date().toISOString();

    // Update progress to completed
    const { data, error } = await client
      .from('tutorial_progress')
      .update({
        status: TutorialLessonStatus.COMPLETED,
        progress_percent: 100,
        completed_at: now,
        last_watched_at: now,
      })
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .select()
      .single();

    if (error) {
      console.error('[TutorialSync] Failed to complete lesson:', error);
      throw new Error(`Failed to complete lesson: ${error.message}`);
    }

    const progress: TutorialProgress = {
      id: data.id,
      userId: data.user_id,
      lessonId: data.lesson_id,
      status: data.status as TutorialLessonStatus,
      progressPercent: data.progress_percent,
      videoPositionSeconds: data.video_position_seconds || 0,
      startedAt: data.started_at ? new Date(data.started_at).getTime() : null,
      completedAt: data.completed_at ? new Date(data.completed_at).getTime() : null,
      timeSpentSeconds: data.time_spent_seconds,
      lastWatchedAt: data.last_watched_at ? new Date(data.last_watched_at).getTime() : null,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
    };

    addBreadcrumb('Lesson completed', 'tutorial', { lessonId });
    return progress;
  } catch (error) {
    console.error('[TutorialSync] Error completing lesson:', error);
    captureException(error as Error, { context: 'completeLesson', lessonId });
    throw error;
  }
}

/**
 * Check if a lesson is unlocked (based on prerequisites)
 */
export function isLessonUnlocked(
  lessonId: string,
  lessons: TutorialLesson[],
  progress: Map<string, TutorialProgress>
): boolean {
  const lesson = lessons.find((l) => l.id === lessonId);
  if (!lesson) {
    console.warn('[TutorialSync] Lesson not found:', lessonId);
    return false;
  }

  // No prerequisites = unlocked
  if (!lesson.prerequisites || lesson.prerequisites.length === 0) {
    return true;
  }

  // Check if all prerequisites are completed
  for (const prereqSlug of lesson.prerequisites) {
    const prereqLesson = lessons.find((l) => l.slug === prereqSlug);
    if (!prereqLesson) {
      console.warn('[TutorialSync] Prerequisite lesson not found:', prereqSlug);
      return false;
    }

    const prereqProgress = progress.get(prereqLesson.id);
    if (!prereqProgress || prereqProgress.status !== TutorialLessonStatus.COMPLETED) {
      return false;
    }
  }

  return true;
}

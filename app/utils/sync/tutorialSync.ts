/**
 * Tutorial Sync Client
 *
 * Handles tutorial lesson fetching and progress tracking sync.
 * Read-heavy workload with aggressive caching.
 */

import { getSupabaseClient, getCurrentUser, isCloudSyncEnabled } from './supabaseClient';
import { enqueue, QueueItemType } from './queue';
import { captureException, addBreadcrumb } from '../sentry';
import {
  TutorialLesson,
  TutorialProgress,
  LessonProgressStatus,
  TutorialContentType,
  VideoPlatform,
} from '../../types/Tutorial';
import { ProblemCategory, ProblemDifficulty } from '../../types/Problem';

/**
 * Fetch all published tutorial lessons
 * TODO: Implement MMKV caching with TTL
 */
export async function fetchTutorialLessons(): Promise<TutorialLesson[]> {
  if (!isCloudSyncEnabled()) {
    console.log('[TutorialSync] Cloud sync disabled, returning empty lessons');
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
      console.error('[TutorialSync] Fetch lessons failed:', error);
      captureException(new Error(`Fetch lessons failed: ${error.message}`));
      return [];
    }

    // Transform database rows to TutorialLesson type
    return (data || []).map((row) => ({
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
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
      published: row.published,
    }));
  } catch (error) {
    console.error('[TutorialSync] Fetch lessons error:', error);
    captureException(error as Error);
    return [];
  }
}

/**
 * Fetch single lesson by slug
 */
export async function fetchLessonBySlug(slug: string): Promise<TutorialLesson | null> {
  if (!isCloudSyncEnabled()) {
    console.log('[TutorialSync] Cloud sync disabled');
    return null;
  }

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('tutorial_lessons')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .limit(1)
      .single();

    if (error) {
      console.error('[TutorialSync] Fetch lesson failed:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      slug: data.slug,
      title: data.title,
      description: data.description,
      skillCategory: data.skill_category as ProblemCategory,
      difficulty: data.difficulty as ProblemDifficulty,
      contentType: data.content_type as TutorialContentType,
      videoUrl: data.video_url,
      videoPlatform: (data.video_platform || 'youtube') as VideoPlatform,
      durationSeconds: data.duration_seconds,
      transcript: data.transcript,
      interactiveContent: data.interactive_content,
      sortOrder: data.sort_order,
      prerequisites: data.prerequisites || [],
      tags: data.tags || [],
      thumbnailUrl: data.thumbnail_url,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
      published: data.published,
    };
  } catch (error) {
    console.error('[TutorialSync] Fetch lesson error:', error);
    captureException(error as Error, { slug });
    return null;
  }
}

/**
 * Fetch user's tutorial progress
 */
export async function fetchTutorialProgress(): Promise<Map<string, TutorialProgress>> {
  if (!isCloudSyncEnabled()) {
    console.log('[TutorialSync] Cloud sync disabled, returning empty progress');
    return new Map();
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[TutorialSync] Not authenticated');
      return new Map();
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('tutorial_progress')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('[TutorialSync] Fetch progress failed:', error);
      captureException(new Error(`Fetch progress failed: ${error.message}`));
      return new Map();
    }

    const progressMap = new Map<string, TutorialProgress>();
    (data || []).forEach((row) => {
      progressMap.set(row.lesson_id, {
        id: row.id,
        userId: row.user_id,
        lessonId: row.lesson_id,
        status: row.status as LessonProgressStatus,
        progressPercent: row.progress_percent,
        videoPositionSeconds: row.video_position_seconds || 0,
        startedAt: row.started_at ? new Date(row.started_at).getTime() : null,
        completedAt: row.completed_at ? new Date(row.completed_at).getTime() : null,
        timeSpentSeconds: row.time_spent_seconds,
        lastWatchedAt: row.last_watched_at ? new Date(row.last_watched_at).getTime() : null,
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: new Date(row.updated_at).getTime(),
      });
    });

    return progressMap;
  } catch (error) {
    console.error('[TutorialSync] Fetch progress error:', error);
    captureException(error as Error);
    return new Map();
  }
}

/**
 * Upsert tutorial progress to cloud
 */
export async function upsertTutorialProgress(progress: TutorialProgress): Promise<void> {
  if (!isCloudSyncEnabled()) {
    console.log('[TutorialSync] Cloud sync disabled, skipping progress upsert');
    return;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[TutorialSync] Not authenticated, enqueueing progress for later');
      enqueue(QueueItemType.TUTORIAL_PROGRESS, progress);
      return;
    }

    const client = getSupabaseClient();
    const { error } = await client.from('tutorial_progress').upsert({
      id: progress.id,
      user_id: progress.userId,
      lesson_id: progress.lessonId,
      status: progress.status,
      progress_percent: progress.progressPercent,
      video_position_seconds: progress.videoPositionSeconds,
      started_at: progress.startedAt ? new Date(progress.startedAt).toISOString() : null,
      completed_at: progress.completedAt ? new Date(progress.completedAt).toISOString() : null,
      time_spent_seconds: progress.timeSpentSeconds,
      last_watched_at: progress.lastWatchedAt ? new Date(progress.lastWatchedAt).toISOString() : null,
    });

    if (error) {
      console.error('[TutorialSync] Progress upsert failed:', error);
      enqueue(QueueItemType.TUTORIAL_PROGRESS, progress);
      captureException(new Error(`Progress sync failed: ${error.message}`), {
        progressId: progress.id,
      });
    } else {
      addBreadcrumb('Tutorial progress synced', 'sync', { lessonId: progress.lessonId });
      console.log('[TutorialSync] Progress synced:', progress.id);
    }
  } catch (error) {
    console.error('[TutorialSync] Progress upsert error:', error);
    enqueue(QueueItemType.TUTORIAL_PROGRESS, progress);
    captureException(error as Error, { progressId: progress.id });
  }
}

/**
 * Update video position (frequent, debounce recommended in store)
 */
export async function updateVideoPosition(
  lessonId: string,
  positionSeconds: number,
  progressPercent: number
): Promise<void> {
  if (!isCloudSyncEnabled()) {
    return;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return; // Don't queue video position updates
    }

    const client = getSupabaseClient();
    const { error } = await client
      .from('tutorial_progress')
      .update({
        video_position_seconds: positionSeconds,
        progress_percent: progressPercent,
        last_watched_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId);

    if (error) {
      console.error('[TutorialSync] Video position update failed:', error);
      // Don't queue frequent updates
    }
  } catch (error) {
    console.error('[TutorialSync] Video position update error:', error);
  }
}

/**
 * Start lesson (create progress entry)
 */
export async function startLesson(lessonId: string): Promise<TutorialProgress | null> {
  if (!isCloudSyncEnabled()) {
    console.log('[TutorialSync] Cloud sync disabled');
    return null;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[TutorialSync] Not authenticated');
      return null;
    }

    const client = getSupabaseClient();
    const progress: Partial<TutorialProgress> = {
      userId: user.id,
      lessonId,
      status: LessonProgressStatus.IN_PROGRESS,
      progressPercent: 0,
      videoPositionSeconds: 0,
      startedAt: Date.now(),
      timeSpentSeconds: 0,
      lastWatchedAt: Date.now(),
    };

    const { data, error } = await client
      .from('tutorial_progress')
      .upsert({
        user_id: user.id,
        lesson_id: lessonId,
        status: 'in_progress',
        progress_percent: 0,
        video_position_seconds: 0,
        started_at: new Date().toISOString(),
        time_spent_seconds: 0,
        last_watched_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[TutorialSync] Start lesson failed:', error);
      captureException(new Error(`Start lesson failed: ${error.message}`), { lessonId });
      return null;
    }

    addBreadcrumb('Lesson started', 'tutorial', { lessonId });
    console.log('[TutorialSync] Lesson started:', lessonId);

    return {
      id: data.id,
      userId: data.user_id,
      lessonId: data.lesson_id,
      status: data.status as LessonProgressStatus,
      progressPercent: data.progress_percent,
      videoPositionSeconds: data.video_position_seconds || 0,
      startedAt: new Date(data.started_at).getTime(),
      completedAt: null,
      timeSpentSeconds: data.time_spent_seconds,
      lastWatchedAt: new Date(data.last_watched_at).getTime(),
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
    };
  } catch (error) {
    console.error('[TutorialSync] Start lesson error:', error);
    captureException(error as Error, { lessonId });
    return null;
  }
}

/**
 * Mark lesson as complete
 */
export async function completeLesson(lessonId: string): Promise<void> {
  if (!isCloudSyncEnabled()) {
    console.log('[TutorialSync] Cloud sync disabled, skipping completion');
    return;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[TutorialSync] Not authenticated');
      return;
    }

    const client = getSupabaseClient();
    const { error } = await client
      .from('tutorial_progress')
      .update({
        status: 'completed',
        progress_percent: 100,
        completed_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId);

    if (error) {
      console.error('[TutorialSync] Lesson completion failed:', error);
      captureException(new Error(`Lesson completion failed: ${error.message}`), { lessonId });
    } else {
      addBreadcrumb('Lesson completed', 'tutorial', { lessonId });
      console.log('[TutorialSync] Lesson completed:', lessonId);
    }
  } catch (error) {
    console.error('[TutorialSync] Lesson completion error:', error);
    captureException(error as Error, { lessonId });
  }
}

/**
 * Check if lesson is unlocked based on prerequisites
 */
export function isLessonUnlocked(
  lesson: TutorialLesson,
  progress: Map<string, TutorialProgress>,
  allLessons: TutorialLesson[]
): boolean {
  // No prerequisites = always unlocked
  if (!lesson.prerequisites || lesson.prerequisites.length === 0) {
    return true;
  }

  // Check if all prerequisite lessons are completed
  for (const prereqSlug of lesson.prerequisites) {
    const prereqLesson = allLessons.find((l) => l.slug === prereqSlug);
    if (!prereqLesson) continue; // Skip if prereq lesson not found

    const prereqProgress = progress.get(prereqLesson.id);
    if (!prereqProgress || prereqProgress.status !== LessonProgressStatus.COMPLETED) {
      return false; // Prerequisite not completed
    }
  }

  return true;
}

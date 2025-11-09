/**
 * Hydrate
 *
 * Restores data from cloud on app launch.
 * Merges cloud data with local MMKV data using last-write-wins strategy.
 */

import { getSupabaseClient, getCurrentUser, isCloudSyncEnabled } from './supabaseClient';
import { deserializeStroke } from './serializer';
import { storage } from '../storage';
import { captureException, addBreadcrumb } from '../sentry';
import { Attempt, Step } from '../../types/Attempt';
import { Stroke } from '../../types/Canvas';

const LAST_SYNC_KEY = '@sync:last_hydration';

/**
 * Get last sync timestamp
 */
function getLastSyncTimestamp(): number {
  const stored = storage.getString(LAST_SYNC_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

/**
 * Set last sync timestamp
 */
function setLastSyncTimestamp(timestamp: number): void {
  storage.set(LAST_SYNC_KEY, timestamp.toString());
}

/**
 * Hydrate all data from cloud
 */
export async function hydrateFromCloud(): Promise<{
  attempts: Attempt[];
  success: boolean;
  error?: string;
}> {
  if (!isCloudSyncEnabled()) {
    console.log('[Hydrate] Cloud sync disabled, skipping hydration');
    return { attempts: [], success: true };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log('[Hydrate] Not authenticated, skipping hydration');
      return { attempts: [], success: true };
    }

    const lastSync = getLastSyncTimestamp();
    const client = getSupabaseClient();

    console.log('[Hydrate] Starting cloud hydration since:', new Date(lastSync).toISOString());

    // Fetch attempts modified since last sync
    const { data: attemptsData, error: attemptsError } = await client
      .from('attempts')
      .select('*')
      .eq('user_id', user.id)
      .gte('updated_at', new Date(lastSync).toISOString())
      .order('started_at', { ascending: false });

    if (attemptsError) {
      throw new Error(`Failed to fetch attempts: ${attemptsError.message}`);
    }

    console.log('[Hydrate] Fetched', attemptsData?.length || 0, 'attempts from cloud');

    const attempts: Attempt[] = [];

    // Hydrate each attempt with its steps and strokes
    for (const attemptRow of attemptsData || []) {
      try {
        const attempt = await hydrateAttempt(attemptRow.id);
        if (attempt) {
          attempts.push(attempt);
        }
      } catch (error) {
        console.error('[Hydrate] Error hydrating attempt:', attemptRow.id, error);
        captureException(error as Error, { attemptId: attemptRow.id });
      }
    }

    // Update last sync timestamp
    setLastSyncTimestamp(Date.now());

    addBreadcrumb('Hydration completed', 'sync', { attemptCount: attempts.length });
    console.log('[Hydrate] Hydration completed:', attempts.length, 'attempts restored');

    return { attempts, success: true };
  } catch (error) {
    console.error('[Hydrate] Hydration failed:', error);
    captureException(error as Error);
    return {
      attempts: [],
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Hydrate single attempt with all related data
 */
async function hydrateAttempt(attemptId: string): Promise<Attempt | null> {
  try {
    const client = getSupabaseClient();

    // Fetch attempt
    const { data: attemptRow, error: attemptError } = await client
      .from('attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

    if (attemptError || !attemptRow) {
      throw new Error(`Attempt not found: ${attemptId}`);
    }

    // Fetch steps for this attempt
    const { data: stepsData, error: stepsError } = await client
      .from('steps')
      .select('*')
      .eq('attempt_id', attemptId)
      .order('step_number', { ascending: true });

    if (stepsError) {
      throw new Error(`Failed to fetch steps: ${stepsError.message}`);
    }

    // Hydrate each step with strokes
    const steps: Step[] = [];
    for (const stepRow of stepsData || []) {
      const step = await hydrateStep(stepRow);
      if (step) {
        steps.push(step);
      }
    }

    // Fetch hints for this attempt
    const { data: hintsData, error: hintsError } = await client
      .from('hints')
      .select('*')
      .eq('attempt_id', attemptId)
      .order('created_at', { ascending: true });

    if (hintsError) {
      console.warn('[Hydrate] Failed to fetch hints:', hintsError);
    }

    // Build Attempt object
    const attempt: Attempt = {
      id: attemptRow.id,
      problemId: attemptRow.problem_id,
      steps,
      startTime: new Date(attemptRow.started_at).getTime(),
      endTime: attemptRow.ended_at ? new Date(attemptRow.ended_at).getTime() : null,
      completed: attemptRow.completed,
      solved: attemptRow.solved,
      hintsRequested: attemptRow.hints_requested,
      hintHistory: (hintsData || []).map((h: any) => ({
        id: h.id,
        timestamp: new Date(h.created_at).getTime(),
        hintText: h.hint_text,
        level: h.level,
        errorType: h.error_type,
        stepNumber: h.step_number,
        autoTriggered: h.auto_triggered,
      })),
      totalTime: attemptRow.total_time,
      deviceInfo: attemptRow.device_info,
      metadata: attemptRow.metadata,
    };

    return attempt;
  } catch (error) {
    console.error('[Hydrate] Error hydrating attempt:', attemptId, error);
    throw error;
  }
}

/**
 * Hydrate single step with strokes
 */
async function hydrateStep(stepRow: any): Promise<Step | null> {
  try {
    const client = getSupabaseClient();

    // Fetch strokes for this step
    const { data: strokesData, error: strokesError } = await client
      .from('strokes')
      .select('*')
      .eq('step_id', stepRow.id);

    if (strokesError) {
      console.warn('[Hydrate] Failed to fetch strokes:', strokesError);
    }

    // Deserialize strokes
    const strokes: Stroke[] = [];
    for (const strokeRow of strokesData || []) {
      try {
        const stroke = deserializeStroke(strokeRow.data, strokeRow.encoding);
        stroke.id = strokeRow.id; // Restore original ID
        strokes.push(stroke);
      } catch (error) {
        console.error('[Hydrate] Error deserializing stroke:', strokeRow.id, error);
      }
    }

    // Build Step object
    const step: Step = {
      id: stepRow.id,
      strokeData: strokes,
      recognizedText: stepRow.recognized_text || '',
      latex: stepRow.latex,
      color: strokes[0]?.color || '#000000',
      validation: stepRow.validation,
      startTime: new Date(stepRow.start_time).getTime(),
      endTime: new Date(stepRow.end_time).getTime(),
      manualInput: stepRow.manual_input,
      recognitionConfidence: stepRow.recognition_confidence,
    };

    return step;
  } catch (error) {
    console.error('[Hydrate] Error hydrating step:', stepRow.id, error);
    return null;
  }
}

/**
 * Trigger manual sync (for settings UI)
 */
export async function triggerManualSync(): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await hydrateFromCloud();

    if (result.success) {
      // Process sync queue to upload any pending items
      const { processSyncQueue } = await import('./syncClient');
      await processSyncQueue();
    }

    return result;
  } catch (error) {
    console.error('[Hydrate] Manual sync failed:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}
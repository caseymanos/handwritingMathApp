/**
 * Sync Client
 *
 * Handles idempotent upserts to Supabase for all data types.
 * Uses client-generated UUIDs for idempotency and conflict-free sync.
 *
 * All methods are write-through: they sync immediately and enqueue on failure.
 */

import { getSupabaseClient, getCurrentUser, isCloudSyncEnabled } from './supabaseClient';
import { enqueue, QueueItemType } from './queue';
import { serializeStroke } from './serializer';
import { captureException, addBreadcrumb } from '../sentry';
import { Attempt, Step } from '../../types/Attempt';
import { HintHistoryEntry } from '../../types/Hint';
import { Stroke } from '../../types/Canvas';

/**
 * Session data for cloud sync
 */
export interface SessionData {
  id: string;
  userId: string;
  startedAt: number;
  deviceInfo: {
    platform: 'ios' | 'android';
    deviceType: 'phone' | 'tablet';
    osVersion: string;
  };
  appVersion: string;
}

/**
 * Upsert session to cloud
 */
export async function upsertSession(session: SessionData): Promise<void> {
  if (!isCloudSyncEnabled()) {
    console.log('[SyncClient] Cloud sync disabled, skipping session upsert');
    return;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[SyncClient] Not authenticated, enqueueing session for later');
      enqueue(QueueItemType.SESSION, session);
      return;
    }

    const client = getSupabaseClient();
    const { error } = await client.from('sessions').upsert({
      id: session.id,
      user_id: user.id,
      started_at: new Date(session.startedAt).toISOString(),
      device_info: session.deviceInfo,
      app_version: session.appVersion,
    });

    if (error) {
      console.error('[SyncClient] Session upsert failed:', error);
      enqueue(QueueItemType.SESSION, session);
      captureException(new Error(`Session sync failed: ${error.message}`), { sessionId: session.id });
    } else {
      addBreadcrumb('Session synced', 'sync', { sessionId: session.id });
      console.log('[SyncClient] Session synced:', session.id);
    }
  } catch (error) {
    console.error('[SyncClient] Session upsert error:', error);
    enqueue(QueueItemType.SESSION, session);
    captureException(error as Error, { sessionId: session.id });
  }
}

/**
 * Upsert attempt to cloud
 */
export async function upsertAttempt(attempt: Attempt): Promise<void> {
  if (!isCloudSyncEnabled()) {
    console.log('[SyncClient] Cloud sync disabled, skipping attempt upsert');
    return;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[SyncClient] Not authenticated, enqueueing attempt for later');
      enqueue(QueueItemType.ATTEMPT, attempt);
      return;
    }

    const client = getSupabaseClient();
    const { error } = await client.from('attempts').upsert({
      id: attempt.id,
      user_id: user.id,
      session_id: attempt.metadata?.sessionId || null,
      problem_id: attempt.problemId,
      started_at: new Date(attempt.startTime).toISOString(),
      ended_at: attempt.endTime ? new Date(attempt.endTime).toISOString() : null,
      completed: attempt.completed,
      solved: attempt.solved,
      hints_requested: attempt.hintsRequested,
      total_time: attempt.totalTime,
      device_info: attempt.deviceInfo,
      metadata: attempt.metadata || {},
    });

    if (error) {
      console.error('[SyncClient] Attempt upsert failed:', error);
      enqueue(QueueItemType.ATTEMPT, attempt);
      captureException(new Error(`Attempt sync failed: ${error.message}`), { attemptId: attempt.id });
    } else {
      addBreadcrumb('Attempt synced', 'sync', { attemptId: attempt.id });
      console.log('[SyncClient] Attempt synced:', attempt.id);
    }
  } catch (error) {
    console.error('[SyncClient] Attempt upsert error:', error);
    enqueue(QueueItemType.ATTEMPT, attempt);
    captureException(error as Error, { attemptId: attempt.id });
  }
}

/**
 * Upsert step to cloud
 */
export async function upsertStep(step: Step, attemptId: string): Promise<void> {
  if (!isCloudSyncEnabled()) {
    console.log('[SyncClient] Cloud sync disabled, skipping step upsert');
    return;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[SyncClient] Not authenticated, enqueueing step for later');
      enqueue(QueueItemType.STEP, { step, attemptId });
      return;
    }

    const client = getSupabaseClient();

    // Extract line number from step ID or metadata (if available)
    const lineNumber = null; // Will be set by line detection in future

    const { error } = await client.from('steps').upsert({
      id: step.id,
      attempt_id: attemptId,
      user_id: user.id,
      step_number: 0, // Will be calculated from step order
      line_number: lineNumber,
      latex: step.latex,
      recognized_text: step.recognizedText,
      is_correct: step.validation?.isCorrect || null,
      is_useful: step.validation?.isUseful || null,
      validation: step.validation || {},
      start_time: new Date(step.startTime).toISOString(),
      end_time: new Date(step.endTime).toISOString(),
      manual_input: step.manualInput,
      recognition_confidence: step.recognitionConfidence || null,
    });

    if (error) {
      console.error('[SyncClient] Step upsert failed:', error);
      enqueue(QueueItemType.STEP, { step, attemptId });
      captureException(new Error(`Step sync failed: ${error.message}`), { stepId: step.id });
    } else {
      addBreadcrumb('Step synced', 'sync', { stepId: step.id });
      console.log('[SyncClient] Step synced:', step.id);

      // Enqueue stroke uploads for this step
      for (const stroke of step.strokeData) {
        enqueueStrokeUpload(stroke, step.id);
      }
    }
  } catch (error) {
    console.error('[SyncClient] Step upsert error:', error);
    enqueue(QueueItemType.STEP, { step, attemptId });
    captureException(error as Error, { stepId: step.id });
  }
}

/**
 * Enqueue stroke upload (async, background process)
 */
export function enqueueStrokeUpload(stroke: Stroke, stepId: string): void {
  try {
    enqueue(QueueItemType.STROKE, { stroke, stepId });
    console.log('[SyncClient] Stroke enqueued for upload:', stroke.id);
  } catch (error) {
    console.error('[SyncClient] Error enqueueing stroke:', error);
    captureException(error as Error, { strokeId: stroke.id, stepId });
  }
}

/**
 * Upload stroke to cloud (called by queue processor)
 */
export async function uploadStroke(stroke: Stroke, stepId: string): Promise<void> {
  if (!isCloudSyncEnabled()) {
    console.log('[SyncClient] Cloud sync disabled, skipping stroke upload');
    return;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Serialize stroke with compression
    const serialized = serializeStroke(stroke);

    const client = getSupabaseClient();
    const { error } = await client.from('strokes').upsert({
      id: stroke.id,
      step_id: stepId,
      user_id: user.id,
      line_number: null, // Will be set by line detection
      point_count: serialized.metadata.pointCount,
      bbox: serialized.metadata.bbox,
      bytes_compressed: serialized.metadata.bytesCompressed,
      bytes_original: serialized.metadata.bytesOriginal,
      encoding: serialized.encoding,
      data: serialized.data,
    });

    if (error) {
      console.error('[SyncClient] Stroke upload failed:', error);
      throw new Error(`Stroke sync failed: ${error.message}`);
    }

    addBreadcrumb('Stroke uploaded', 'sync', {
      strokeId: stroke.id,
      compressionRatio: `${(serialized.metadata.compressionRatio * 100).toFixed(1)}%`,
    });
    console.log('[SyncClient] Stroke uploaded:', stroke.id);
  } catch (error) {
    console.error('[SyncClient] Stroke upload error:', error);
    throw error; // Re-throw for queue retry logic
  }
}

/**
 * Upsert hint to cloud
 */
export async function upsertHint(hint: HintHistoryEntry, attemptId: string, stepId?: string): Promise<void> {
  if (!isCloudSyncEnabled()) {
    console.log('[SyncClient] Cloud sync disabled, skipping hint upsert');
    return;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[SyncClient] Not authenticated, enqueueing hint for later');
      enqueue(QueueItemType.HINT, { hint, attemptId, stepId });
      return;
    }

    const client = getSupabaseClient();
    const { error } = await client.from('hints').upsert({
      id: hint.id,
      attempt_id: attemptId,
      step_id: stepId || null,
      user_id: user.id,
      level: hint.level,
      error_type: hint.errorType,
      hint_text: hint.hintText,
      auto_triggered: hint.autoTriggered,
      step_number: hint.stepNumber,
    });

    if (error) {
      console.error('[SyncClient] Hint upsert failed:', error);
      enqueue(QueueItemType.HINT, { hint, attemptId, stepId });
      captureException(new Error(`Hint sync failed: ${error.message}`), { hintId: hint.id });
    } else {
      addBreadcrumb('Hint synced', 'sync', { hintId: hint.id });
      console.log('[SyncClient] Hint synced:', hint.id);
    }
  } catch (error) {
    console.error('[SyncClient] Hint upsert error:', error);
    enqueue(QueueItemType.HINT, { hint, attemptId, stepId });
    captureException(error as Error, { hintId: hint.id });
  }
}

/**
 * Process sync queue (call this periodically or on network recovery)
 */
export async function processSyncQueue(): Promise<void> {
  // Import queue functions
  const { dequeue, markInProgress, markCompleted, markFailed } = await import('./queue');

  let item = dequeue();
  let processed = 0;

  while (item && processed < 10) { // Process max 10 items per batch
    try {
      markInProgress(item.id);

      switch (item.type) {
        case QueueItemType.SESSION:
          await upsertSession(item.payload);
          break;

        case QueueItemType.ATTEMPT:
          await upsertAttempt(item.payload);
          break;

        case QueueItemType.STEP:
          await upsertStep(item.payload.step, item.payload.attemptId);
          break;

        case QueueItemType.STROKE:
          await uploadStroke(item.payload.stroke, item.payload.stepId);
          break;

        case QueueItemType.HINT:
          await upsertHint(item.payload.hint, item.payload.attemptId, item.payload.stepId);
          break;
      }

      markCompleted(item.id);
      processed++;
    } catch (error) {
      markFailed(item.id, error as Error);
    }

    item = dequeue();
  }

  if (processed > 0) {
    console.log(`[SyncClient] Processed ${processed} queued items`);
  }
}
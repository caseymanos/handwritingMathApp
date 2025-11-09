/**
 * Sync Queue
 *
 * MMKV-backed queue for reliable cloud sync with retry/backoff.
 * Handles transient network errors and API rate limits.
 *
 * Features:
 * - Persistent queue (survives app restarts)
 * - Exponential backoff (1s → 2s → 4s → 8s → 16s → 32s → 64s → 128s)
 * - Max 8 retry attempts
 * - Telemetry integration with Sentry
 * - Priority queue (attempts > steps > strokes > hints)
 */

import { MMKV } from 'react-native-mmkv';
import { genId } from '../id';
import { captureException, addBreadcrumb } from '../sentry';

// Queue storage
const queueStorage = new MMKV({ id: 'sync-queue' });

/**
 * Queue item types
 */
export enum QueueItemType {
  SESSION = 'session',
  ATTEMPT = 'attempt',
  STEP = 'step',
  STROKE = 'stroke',
  HINT = 'hint',
  // PR13-16: New item types for collaboration, tutorial, and assessment
  TEACHER_STUDENT_LINK = 'teacher_student_link',
  COLLABORATION_SESSION = 'collaboration_session',
  TUTORIAL_PROGRESS = 'tutorial_progress',
  ASSESSMENT = 'assessment',
  ASSESSMENT_STROKE = 'assessment_stroke',
}

/**
 * Queue item priority (lower = higher priority)
 */
const PRIORITY: Record<QueueItemType, number> = {
  [QueueItemType.SESSION]: 0,
  [QueueItemType.ATTEMPT]: 1,
  [QueueItemType.STEP]: 2,
  [QueueItemType.STROKE]: 3,
  [QueueItemType.HINT]: 4,
  // PR13-16: New item priorities
  [QueueItemType.TEACHER_STUDENT_LINK]: 0, // High priority (user-facing action)
  [QueueItemType.COLLABORATION_SESSION]: 1, // Same as attempt
  [QueueItemType.TUTORIAL_PROGRESS]: 2, // Same as step
  [QueueItemType.ASSESSMENT]: 1, // Same as attempt
  [QueueItemType.ASSESSMENT_STROKE]: 3, // Same as stroke
};

/**
 * Queue item status
 */
export enum QueueItemStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Queue item
 */
export interface QueueItem {
  id: string;
  type: QueueItemType;
  payload: any;
  status: QueueItemStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  updatedAt: number;
  lastError?: string;
  nextRetryAt?: number;
}

/**
 * Retry configuration
 */
const MAX_ATTEMPTS = parseInt(process.env.SYNC_RETRY_MAX_ATTEMPTS || '8', 10);
const INITIAL_DELAY_MS = parseInt(process.env.SYNC_RETRY_DELAY_MS || '1000', 10);
const BACKOFF_MULTIPLIER = 2;

/**
 * Queue storage keys
 */
const STORAGE_KEYS = {
  QUEUE_PREFIX: 'queue:',
  QUEUE_INDEX: 'queue:index',
  STATS: 'queue:stats',
};

/**
 * Queue statistics
 */
interface QueueStats {
  totalEnqueued: number;
  totalCompleted: number;
  totalFailed: number;
  totalRetries: number;
}

// ============================================================================
// QUEUE OPERATIONS
// ============================================================================

/**
 * Enqueue item for sync
 */
export function enqueue(type: QueueItemType, payload: any): string {
  try {
    const id = genId('q_');
    const now = Date.now();

    const item: QueueItem = {
      id,
      type,
      payload,
      status: QueueItemStatus.PENDING,
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      createdAt: now,
      updatedAt: now,
    };

    // Save item
    const key = `${STORAGE_KEYS.QUEUE_PREFIX}${id}`;
    queueStorage.set(key, JSON.stringify(item));

    // Add to index
    addToIndex(id);

    // Update stats
    updateStats('enqueued');

    addBreadcrumb('Sync item enqueued', 'sync', { type, id });
    console.log(`[Queue] Enqueued ${type} item: ${id}`);

    return id;
  } catch (error) {
    console.error('[Queue] Error enqueueing item:', error);
    captureException(error as Error, { type, payload });
    throw error;
  }
}

/**
 * Get next pending item (by priority)
 */
export function dequeue(): QueueItem | null {
  try {
    const index = getIndex();
    const now = Date.now();

    // Sort by priority, then by creation time
    const sortedItems = index
      .map((id) => getItem(id))
      .filter((item): item is QueueItem => item !== null)
      .filter(
        (item) =>
          item.status === QueueItemStatus.PENDING &&
          (!item.nextRetryAt || item.nextRetryAt <= now)
      )
      .sort((a, b) => {
        if (PRIORITY[a.type] !== PRIORITY[b.type]) {
          return PRIORITY[a.type] - PRIORITY[b.type];
        }
        return a.createdAt - b.createdAt;
      });

    return sortedItems[0] || null;
  } catch (error) {
    console.error('[Queue] Error dequeuing item:', error);
    return null;
  }
}

/**
 * Mark item as in progress
 */
export function markInProgress(id: string): void {
  try {
    const item = getItem(id);
    if (!item) return;

    item.status = QueueItemStatus.IN_PROGRESS;
    item.attempts += 1;
    item.updatedAt = Date.now();

    saveItem(item);
    console.log(`[Queue] Marked ${item.type} as in progress: ${id} (attempt ${item.attempts})`);
  } catch (error) {
    console.error('[Queue] Error marking item in progress:', error);
  }
}

/**
 * Mark item as completed
 */
export function markCompleted(id: string): void {
  try {
    const item = getItem(id);
    if (!item) return;

    item.status = QueueItemStatus.COMPLETED;
    item.updatedAt = Date.now();

    saveItem(item);
    removeFromIndex(id);
    updateStats('completed');

    addBreadcrumb('Sync item completed', 'sync', {
      type: item.type,
      id,
      attempts: item.attempts,
    });
    console.log(`[Queue] Completed ${item.type}: ${id} (${item.attempts} attempts)`);

    // Delete completed items after 1 hour (keep for debugging)
    setTimeout(() => deleteItem(id), 3600000);
  } catch (error) {
    console.error('[Queue] Error marking item completed:', error);
  }
}

/**
 * Mark item as failed with retry logic
 */
export function markFailed(id: string, error: Error): void {
  try {
    const item = getItem(id);
    if (!item) return;

    item.lastError = error.message;
    item.updatedAt = Date.now();

    // Check if should retry
    if (item.attempts < item.maxAttempts) {
      // Schedule retry with exponential backoff
      const delay = calculateBackoff(item.attempts);
      item.nextRetryAt = Date.now() + delay;
      item.status = QueueItemStatus.PENDING;

      updateStats('retry');

      addBreadcrumb('Sync item scheduled for retry', 'sync', {
        type: item.type,
        id,
        attempts: item.attempts,
        delay,
      });
      console.warn(
        `[Queue] Retrying ${item.type}: ${id} in ${delay}ms (attempt ${item.attempts}/${item.maxAttempts})`
      );
    } else {
      // Max retries exceeded, mark as failed
      item.status = QueueItemStatus.FAILED;
      removeFromIndex(id);
      updateStats('failed');

      captureException(error, {
        queueItemId: id,
        queueItemType: item.type,
        attempts: item.attempts,
      });
      console.error(
        `[Queue] Failed ${item.type}: ${id} after ${item.attempts} attempts - ${error.message}`
      );
    }

    saveItem(item);
  } catch (err) {
    console.error('[Queue] Error marking item failed:', err);
  }
}

/**
 * Get queue statistics
 */
export function getQueueStats(): QueueStats & { pendingCount: number } {
  try {
    const statsJson = queueStorage.getString(STORAGE_KEYS.STATS);
    const stats: QueueStats = statsJson
      ? JSON.parse(statsJson)
      : {
          totalEnqueued: 0,
          totalCompleted: 0,
          totalFailed: 0,
          totalRetries: 0,
        };

    const index = getIndex();
    const pendingCount = index.length;

    return { ...stats, pendingCount };
  } catch (error) {
    console.error('[Queue] Error getting stats:', error);
    return {
      totalEnqueued: 0,
      totalCompleted: 0,
      totalFailed: 0,
      totalRetries: 0,
      pendingCount: 0,
    };
  }
}

/**
 * Clear all queue items
 */
export function clearQueue(): void {
  try {
    const index = getIndex();
    for (const id of index) {
      deleteItem(id);
    }

    queueStorage.set(STORAGE_KEYS.QUEUE_INDEX, JSON.stringify([]));
    console.log('[Queue] Cleared all items');
  } catch (error) {
    console.error('[Queue] Error clearing queue:', error);
  }
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Get queue index (list of pending item IDs)
 */
function getIndex(): string[] {
  try {
    const indexJson = queueStorage.getString(STORAGE_KEYS.QUEUE_INDEX);
    return indexJson ? JSON.parse(indexJson) : [];
  } catch (error) {
    console.error('[Queue] Error getting index:', error);
    return [];
  }
}

/**
 * Add item ID to index
 */
function addToIndex(id: string): void {
  try {
    const index = getIndex();
    if (!index.includes(id)) {
      index.push(id);
      queueStorage.set(STORAGE_KEYS.QUEUE_INDEX, JSON.stringify(index));
    }
  } catch (error) {
    console.error('[Queue] Error adding to index:', error);
  }
}

/**
 * Remove item ID from index
 */
function removeFromIndex(id: string): void {
  try {
    const index = getIndex();
    const filtered = index.filter((itemId) => itemId !== id);
    queueStorage.set(STORAGE_KEYS.QUEUE_INDEX, JSON.stringify(filtered));
  } catch (error) {
    console.error('[Queue] Error removing from index:', error);
  }
}

/**
 * Get queue item by ID
 */
function getItem(id: string): QueueItem | null {
  try {
    const key = `${STORAGE_KEYS.QUEUE_PREFIX}${id}`;
    const itemJson = queueStorage.getString(key);
    return itemJson ? JSON.parse(itemJson) : null;
  } catch (error) {
    console.error('[Queue] Error getting item:', error);
    return null;
  }
}

/**
 * Save queue item
 */
function saveItem(item: QueueItem): void {
  try {
    const key = `${STORAGE_KEYS.QUEUE_PREFIX}${item.id}`;
    queueStorage.set(key, JSON.stringify(item));
  } catch (error) {
    console.error('[Queue] Error saving item:', error);
  }
}

/**
 * Delete queue item
 */
function deleteItem(id: string): void {
  try {
    const key = `${STORAGE_KEYS.QUEUE_PREFIX}${id}`;
    queueStorage.delete(key);
  } catch (error) {
    console.error('[Queue] Error deleting item:', error);
  }
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoff(attemptNumber: number): number {
  return INITIAL_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, attemptNumber - 1);
}

/**
 * Update queue statistics
 */
function updateStats(event: 'enqueued' | 'completed' | 'failed' | 'retry'): void {
  try {
    const stats = getQueueStats();

    switch (event) {
      case 'enqueued':
        stats.totalEnqueued += 1;
        break;
      case 'completed':
        stats.totalCompleted += 1;
        break;
      case 'failed':
        stats.totalFailed += 1;
        break;
      case 'retry':
        stats.totalRetries += 1;
        break;
    }

    queueStorage.set(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch (error) {
    console.error('[Queue] Error updating stats:', error);
  }
}

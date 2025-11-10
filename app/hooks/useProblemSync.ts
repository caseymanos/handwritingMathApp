/**
 * Problem Synchronization Hook
 *
 * Handles problem synchronization between teacher and student during collaboration.
 * When one person changes the problem, both canvases are cleared and the problem updates.
 */

import { useEffect, useRef } from 'react';
import { useCollaborationStore } from '../stores/collaborationStore';
import { useCanvasStore } from '../stores/canvasStore';
import { ProblemChangePayload } from '../types/Collaboration';
import { getCurrentUser } from '../utils/sync/supabaseClient';

interface UseProblemSyncOptions {
  currentProblemId: string | null;
  onProblemChange?: (problemId: string) => void;
  onCanvasClear?: () => void;
}

/**
 * Hook to synchronize problem changes between teacher and student
 *
 * @param options.currentProblemId - The current problem ID being worked on
 * @param options.onProblemChange - Callback when peer changes the problem
 * @param options.onCanvasClear - Callback to clear local canvas state
 */
export const useProblemSync = ({
  currentProblemId,
  onProblemChange,
  onCanvasClear,
}: UseProblemSyncOptions) => {
  const activeSession = useCollaborationStore(state => state.activeSession);
  const broadcastProblemChange = useCollaborationStore(state => state.broadcastProblemChange);
  const clearLiveStrokes = useCollaborationStore(state => state.clearLiveStrokes);
  const clearStrokes = useCanvasStore(state => state.clearStrokes);

  // Track the previous problem ID to detect changes
  const previousProblemIdRef = useRef<string | null>(currentProblemId);

  /**
   * Broadcast problem change when local problem changes
   */
  useEffect(() => {
    // Skip if not in a collaboration session
    if (!activeSession) {
      previousProblemIdRef.current = currentProblemId;
      return;
    }

    // Skip if problem hasn't changed
    if (currentProblemId === previousProblemIdRef.current) {
      return;
    }

    // Skip if this is the initial mount
    if (previousProblemIdRef.current === null && currentProblemId === null) {
      return;
    }

    // Problem has changed locally, broadcast to peer
    if (currentProblemId) {
      console.log('[useProblemSync] Local problem changed to:', currentProblemId);
      broadcastProblemChange(currentProblemId).catch(error => {
        console.error('[useProblemSync] Failed to broadcast problem change:', error);
      });
    }

    // Update the reference
    previousProblemIdRef.current = currentProblemId;
  }, [currentProblemId, activeSession, broadcastProblemChange]);

  /**
   * Listen for problem changes from peer
   */
  useEffect(() => {
    // Skip if not in a collaboration session
    if (!activeSession) {
      return;
    }

    // Check if the session's problem changed (from peer)
    const sessionProblemId = activeSession.currentProblemId;

    // Skip if session problem matches current problem
    if (sessionProblemId === currentProblemId) {
      return;
    }

    // Skip if session problem is null (no problem set yet)
    if (!sessionProblemId) {
      return;
    }

    // Problem changed by peer, handle it
    handlePeerProblemChange(sessionProblemId);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.currentProblemId, activeSession?.updatedAt]);

  /**
   * Handle problem change from peer
   */
  const handlePeerProblemChange = async (newProblemId: string) => {
    try {
      console.log('[useProblemSync] Peer changed problem to:', newProblemId);

      // Clear local canvas strokes
      clearStrokes();

      // Clear peer's live strokes from collaboration store
      clearLiveStrokes();

      // Call the local clear callback if provided
      if (onCanvasClear) {
        onCanvasClear();
      }

      // Notify parent component to update the problem
      if (onProblemChange) {
        onProblemChange(newProblemId);
      }
    } catch (error) {
      console.error('[useProblemSync] Error handling peer problem change:', error);
    }
  };

  /**
   * Manually sync problem change (for explicit problem changes)
   */
  const syncProblemChange = async (problemId: string) => {
    if (!activeSession) {
      console.warn('[useProblemSync] No active session, skipping problem sync');
      return;
    }

    try {
      console.log('[useProblemSync] Manually syncing problem change:', problemId);
      await broadcastProblemChange(problemId);

      // Clear local canvas
      clearStrokes();

      // Clear peer's live strokes from collaboration store
      clearLiveStrokes();

      // Call the local clear callback if provided
      if (onCanvasClear) {
        onCanvasClear();
      }
    } catch (error) {
      console.error('[useProblemSync] Failed to sync problem change:', error);
    }
  };

  return {
    syncProblemChange,
    isInCollaboration: !!activeSession,
  };
};

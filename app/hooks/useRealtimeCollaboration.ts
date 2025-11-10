/**
 * useRealtimeCollaboration Hook
 *
 * Manages Supabase Realtime subscriptions for live collaboration sessions.
 * Handles stroke broadcasting, presence tracking, and cursor synchronization.
 */

import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient, getCurrentUser, isCloudSyncEnabled } from '../utils/sync/supabaseClient';
import { useCollaborationStore, selectActiveSession, selectSessionStatus } from '../stores/collaborationStore';
import { LiveStroke, PresenceState } from '../types/Collaboration';
import { captureException, addBreadcrumb } from '../utils/sentry';

/**
 * Presence heartbeat interval (5 seconds)
 */
const PRESENCE_HEARTBEAT_INTERVAL = 5000;

/**
 * Hook for managing real-time collaboration subscriptions
 */
export function useRealtimeCollaboration() {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  const activeSession = useCollaborationStore(selectActiveSession);
  const sessionStatus = useCollaborationStore(selectSessionStatus);

  useEffect(() => {
    // Only subscribe if we have an active session
    if (!activeSession || sessionStatus !== 'connected' || !isCloudSyncEnabled()) {
      cleanup();
      return;
    }

    subscribeToSession();

    return cleanup;
  }, [activeSession?.id, sessionStatus]);

  /**
   * Subscribe to the collaboration session channel
   */
  async function subscribeToSession() {
    if (!activeSession) return;

    try {
      const user = await getCurrentUser();
      if (!user) {
        console.warn('[RealtimeCollaboration] Not authenticated');
        return;
      }

      const client = getSupabaseClient();
      const channelName = `session:${activeSession.id}`;

      addBreadcrumb('Subscribing to collaboration channel', 'realtime', { channelName });

      // Create channel
      const channel = client.channel(channelName, {
        config: {
          broadcast: { self: false }, // Don't receive own broadcasts
          presence: { key: user.id },
        },
      });

      // Subscribe to live_strokes INSERT events
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_strokes',
          filter: `session_id=eq.${activeSession.id}`,
        },
        (payload) => {
          handleIncomingStroke(payload.new);
        }
      );

      // Subscribe to presence (online/offline tracking)
      channel
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          handlePresenceSync(presenceState);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('[RealtimeCollaboration] User joined:', key);
          handlePresenceJoin(key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('[RealtimeCollaboration] User left:', key);
          handlePresenceLeave(key, leftPresences);
        });

      // Subscribe to broadcast for cursor positions
      channel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
        handleCursorUpdate(payload);
      });

      // Subscribe to channel
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[RealtimeCollaboration] Subscribed to channel:', channelName);

          // Track initial presence
          const isTeacher = user.id === activeSession.teacherId;
          await channel.track({
            userId: user.id,
            role: isTeacher ? 'teacher' : 'student',
            online: true,
            lastSeen: Date.now(),
            cursorPosition: null,
          });

          // Start presence heartbeat
          startPresenceHeartbeat(channel, user.id, isTeacher);

          // Update store
          useCollaborationStore.setState({
            realtimeChannel: {
              channelName,
              connected: true,
              subscribed: true,
              presenceCount: 1,
              lastMessageAt: null,
            },
          });
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[RealtimeCollaboration] Channel error:', channelName);
          captureException(new Error('Realtime channel error'), { channelName });
        } else if (status === 'TIMED_OUT') {
          console.error('[RealtimeCollaboration] Channel timed out:', channelName);
          captureException(new Error('Realtime channel timeout'), { channelName });
        }
      });

      channelRef.current = channel;
    } catch (error) {
      console.error('[RealtimeCollaboration] Failed to subscribe:', error);
      captureException(error as Error, { sessionId: activeSession.id });
    }
  }

  /**
   * Handle incoming stroke from peer
   */
  function handleIncomingStroke(row: any) {
    try {
      const liveStroke: LiveStroke = {
        id: row.id,
        sessionId: row.session_id,
        authorId: row.author_id,
        strokeData: row.stroke_data,
        color: row.color,
        strokeWidth: row.stroke_width,
        lineNumber: row.line_number,
        isAnnotation: row.is_annotation,
        createdAt: new Date(row.created_at).getTime(),
      };

      // Add to store
      useCollaborationStore.setState(state => {
        const newStrokes = [...state.liveStrokes, liveStroke];
        return {
          liveStrokes: newStrokes,
          realtimeChannel: state.realtimeChannel
            ? { ...state.realtimeChannel, lastMessageAt: Date.now() }
            : null,
        };
      });

      console.log('[RealtimeCollaboration] Incoming stroke:', liveStroke.id);
    } catch (error) {
      console.error('[RealtimeCollaboration] Failed to handle incoming stroke:', error);
      captureException(error as Error);
    }
  }

  /**
   * Handle presence sync
   */
  function handlePresenceSync(presenceState: any) {
    try {
      const presenceMap = new Map<string, PresenceState>();

      Object.entries(presenceState).forEach(([userId, presences]) => {
        const latest = (presences as any[])[0];
        if (latest) {
          presenceMap.set(userId, {
            userId,
            role: latest.role,
            online: latest.online,
            lastSeen: latest.lastSeen,
            cursorPosition: latest.cursorPosition,
          });
        }
      });

      useCollaborationStore.setState({
        presence: presenceMap,
        realtimeChannel: useCollaborationStore.getState().realtimeChannel
          ? {
              ...useCollaborationStore.getState().realtimeChannel!,
              presenceCount: presenceMap.size,
            }
          : null,
      });

      console.log('[RealtimeCollaboration] Presence synced:', presenceMap.size);
    } catch (error) {
      console.error('[RealtimeCollaboration] Failed to handle presence sync:', error);
      captureException(error as Error);
    }
  }

  /**
   * Handle user joining
   */
  function handlePresenceJoin(key: string, newPresences: any[]) {
    try {
      const latest = newPresences[0];
      if (!latest) return;

      const presence: PresenceState = {
        userId: key,
        role: latest.role,
        online: true,
        lastSeen: latest.lastSeen,
        cursorPosition: latest.cursorPosition,
      };

      useCollaborationStore.setState(state => {
        const newPresence = new Map(state.presence);
        newPresence.set(key, presence);

        // Update role-specific tracking
        if (presence.role === 'teacher') {
          return { presence: newPresence, connectedTeacher: key };
        } else if (presence.role === 'student') {
          const activeStudents = Array.from(newPresence.values())
            .filter(p => p.role === 'student' && p.online)
            .map(p => p.userId);
          return { presence: newPresence, activeStudents };
        }

        return { presence: newPresence };
      });
    } catch (error) {
      console.error('[RealtimeCollaboration] Failed to handle presence join:', error);
      captureException(error as Error);
    }
  }

  /**
   * Handle user leaving
   */
  function handlePresenceLeave(key: string, leftPresences: any[]) {
    try {
      useCollaborationStore.setState(state => {
        const newPresence = new Map(state.presence);
        newPresence.delete(key);

        // Update role-specific tracking
        const connectedTeacher = state.connectedTeacher === key ? null : state.connectedTeacher;
        const activeStudents = state.activeStudents.filter(id => id !== key);

        return { presence: newPresence, connectedTeacher, activeStudents };
      });
    } catch (error) {
      console.error('[RealtimeCollaboration] Failed to handle presence leave:', error);
      captureException(error as Error);
    }
  }

  /**
   * Handle cursor position update from peer
   */
  function handleCursorUpdate(payload: any) {
    try {
      const { userId, x, y, color, timestamp } = payload;

      useCollaborationStore.setState(state => {
        const newCursors = new Map(state.peerCursors);
        newCursors.set(userId, { userId, x, y, color, timestamp });
        return { peerCursors: newCursors };
      });
    } catch (error) {
      console.error('[RealtimeCollaboration] Failed to handle cursor update:', error);
      captureException(error as Error);
    }
  }

  /**
   * Start presence heartbeat to keep session alive
   */
  function startPresenceHeartbeat(channel: RealtimeChannel, userId: string, isTeacher: boolean) {
    // Clear existing heartbeat
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    // Send heartbeat every 5 seconds
    heartbeatRef.current = setInterval(() => {
      channel.track({
        userId,
        role: isTeacher ? 'teacher' : 'student',
        online: true,
        lastSeen: Date.now(),
        cursorPosition: null,
      });
    }, PRESENCE_HEARTBEAT_INTERVAL);
  }

  /**
   * Cleanup subscriptions and timers
   */
  function cleanup() {
    if (channelRef.current) {
      addBreadcrumb('Unsubscribing from collaboration channel', 'realtime');
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    useCollaborationStore.setState({
      realtimeChannel: null,
      presence: new Map(),
      connectedTeacher: null,
      activeStudents: [],
    });

    console.log('[RealtimeCollaboration] Cleaned up');
  }

  /**
   * Broadcast cursor position to peers
   */
  function broadcastCursor(x: number, y: number, color: string) {
    if (!channelRef.current || !activeSession) return;

    getCurrentUser().then(user => {
      if (!user) return;

      channelRef.current?.send({
        type: 'broadcast',
        event: 'cursor',
        payload: {
          userId: user.id,
          x,
          y,
          color,
          timestamp: Date.now(),
        },
      });
    });
  }

  return {
    broadcastCursor,
    isConnected: sessionStatus === 'connected',
  };
}

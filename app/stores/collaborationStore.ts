/**
 * Collaboration Store
 *
 * Zustand store for managing real-time teacher-student collaboration.
 * Handles sessions, invite codes, live strokes, and presence tracking.
 */

import { create } from 'zustand';
import {
  CollaborationSession,
  TeacherStudentLink,
  LiveStroke,
  PresenceState,
  CursorPosition,
  RealtimeChannelState,
  SessionStatus,
  LinkStatus,
  CollaborationStoreState,
} from '../types/Collaboration';
import { Stroke, CANVAS_COLORS } from '../types/Canvas';
import {
  upsertCollaborationSession,
  upsertTeacherStudentLink,
  insertLiveStroke,
  fetchTeacherStudentLinks,
  fetchCollaborationSessions,
  generateInviteCode as generateCode,
} from '../utils/sync/collaborationSync';
import { getCurrentUser, isCloudSyncEnabled } from '../utils/sync/supabaseClient';
import { genId } from '../utils/id';
import { captureException, addBreadcrumb } from '../utils/sentry';

/**
 * Performance limits
 */
const MAX_LIVE_STROKES = 1000; // Maximum live strokes to keep in memory
const MAX_PEER_CURSORS = 10; // Maximum peer cursors to track

/**
 * Initial state
 */
const initialState = {
  // Session management
  activeSession: null as CollaborationSession | null,
  sessionStatus: 'disconnected' as 'disconnected' | 'connecting' | 'connected',

  // Real-time data
  liveStrokes: [] as LiveStroke[],
  peerCursors: new Map() as Map<string, CursorPosition>,
  presence: new Map() as Map<string, PresenceState>,

  // Teacher-specific
  linkedStudents: [] as TeacherStudentLink[],
  activeStudents: [] as string[],

  // Student-specific
  linkedTeachers: [] as TeacherStudentLink[],
  connectedTeacher: null as string | null,

  // Realtime channel
  realtimeChannel: null as RealtimeChannelState | null,
};

/**
 * Collaboration store
 */
export const useCollaborationStore = create<CollaborationStoreState>((set, get) => ({
  ...initialState,

  /**
   * Start a new collaboration session
   */
  startSession: async (partnerId: string) => {
    if (!isCloudSyncEnabled()) {
      console.warn('[CollaborationStore] Cloud sync disabled, cannot start session');
      return;
    }

    try {
      set({ sessionStatus: 'connecting' });
      addBreadcrumb('Starting collaboration session', 'collaboration', { partnerId });

      const user = await getCurrentUser();
      if (!user) {
        console.error('[CollaborationStore] Not authenticated');
        set({ sessionStatus: 'disconnected' });
        return;
      }

      // Determine role from existing links
      const teacherLinks = await fetchTeacherStudentLinks('teacher');
      const studentLinks = await fetchTeacherStudentLinks('student');

      const isTeacher = teacherLinks.some(
        link => link.studentId === partnerId && link.status === LinkStatus.ACTIVE
      );
      const isStudent = studentLinks.some(
        link => link.teacherId === partnerId && link.status === LinkStatus.ACTIVE
      );

      if (!isTeacher && !isStudent) {
        console.error('[CollaborationStore] No active link found with partner');
        set({ sessionStatus: 'disconnected' });
        return;
      }

      // Find the link
      const link = isTeacher
        ? teacherLinks.find(l => l.studentId === partnerId && l.status === LinkStatus.ACTIVE)
        : studentLinks.find(l => l.teacherId === partnerId && l.status === LinkStatus.ACTIVE);

      if (!link) {
        console.error('[CollaborationStore] Link not found');
        set({ sessionStatus: 'disconnected' });
        return;
      }

      // Create new session
      const now = Date.now();
      const session: CollaborationSession = {
        id: genId(),
        studentId: isTeacher ? partnerId : user.id,
        teacherId: isTeacher ? user.id : partnerId,
        linkId: link.id,
        attemptId: null,
        status: SessionStatus.ACTIVE,
        startedAt: now,
        endedAt: null,
        studentLastSeen: now,
        teacherLastSeen: now,
        metadata: {},
        createdAt: now,
        updatedAt: now,
      };

      // Save to cloud
      await upsertCollaborationSession(session);

      // Update local state
      set({
        activeSession: session,
        sessionStatus: 'connected',
        liveStrokes: [],
        peerCursors: new Map(),
        presence: new Map(),
      });

      console.log('[CollaborationStore] Session started:', session.id);
    } catch (error) {
      console.error('[CollaborationStore] Failed to start session:', error);
      captureException(error as Error, { partnerId });
      set({ sessionStatus: 'disconnected' });
    }
  },

  /**
   * End the active collaboration session
   */
  endSession: async () => {
    const { activeSession } = get();
    if (!activeSession) {
      console.warn('[CollaborationStore] No active session to end');
      return;
    }

    try {
      addBreadcrumb('Ending collaboration session', 'collaboration', {
        sessionId: activeSession.id,
      });

      // Update session status
      const updatedSession: CollaborationSession = {
        ...activeSession,
        status: SessionStatus.ENDED,
        endedAt: Date.now(),
        updatedAt: Date.now(),
      };

      await upsertCollaborationSession(updatedSession);

      // Reset local state
      set({
        activeSession: null,
        sessionStatus: 'disconnected',
        liveStrokes: [],
        peerCursors: new Map(),
        presence: new Map(),
        connectedTeacher: null,
        activeStudents: [],
      });

      console.log('[CollaborationStore] Session ended:', activeSession.id);
    } catch (error) {
      console.error('[CollaborationStore] Failed to end session:', error);
      captureException(error as Error, { sessionId: activeSession.id });
    }
  },

  /**
   * Broadcast a stroke to the active session
   */
  broadcastStroke: async (stroke: Stroke) => {
    const { activeSession } = get();
    if (!activeSession) {
      console.warn('[CollaborationStore] No active session, cannot broadcast stroke');
      return;
    }

    try {
      const user = await getCurrentUser();
      if (!user) {
        console.warn('[CollaborationStore] Not authenticated');
        return;
      }

      // Determine if this is a teacher annotation (red stroke)
      const isTeacher = user.id === activeSession.teacherId;
      const isAnnotation = isTeacher && stroke.color === CANVAS_COLORS.RED;

      // Create live stroke
      const liveStroke: LiveStroke = {
        id: genId(),
        sessionId: activeSession.id,
        authorId: user.id,
        strokeData: stroke,
        color: stroke.color,
        strokeWidth: stroke.width || 2,
        lineNumber: stroke.lineNumber || null,
        isAnnotation,
        createdAt: Date.now(),
      };

      // Insert to cloud (fire-and-forget for real-time performance)
      insertLiveStroke(liveStroke);

      // Add to local state
      set(state => {
        const newStrokes = [...state.liveStrokes, liveStroke];
        // Enforce limit
        const liveStrokes =
          newStrokes.length > MAX_LIVE_STROKES
            ? newStrokes.slice(newStrokes.length - MAX_LIVE_STROKES)
            : newStrokes;
        return { liveStrokes };
      });

      console.log('[CollaborationStore] Stroke broadcasted:', liveStroke.id);
    } catch (error) {
      console.error('[CollaborationStore] Failed to broadcast stroke:', error);
      captureException(error as Error, { sessionId: activeSession.id });
    }
  },

  /**
   * Update cursor position for peer awareness
   */
  updateCursorPosition: (position: { x: number; y: number }) => {
    const { activeSession, peerCursors } = get();
    if (!activeSession) return;

    getCurrentUser().then(user => {
      if (!user) return;

      const cursor: CursorPosition = {
        userId: user.id,
        x: position.x,
        y: position.y,
        color: CANVAS_COLORS.BLACK,
        timestamp: Date.now(),
      };

      // Update local cursors (this will be synced via Realtime channel)
      const newCursors = new Map(peerCursors);
      newCursors.set(user.id, cursor);

      // Enforce limit
      if (newCursors.size > MAX_PEER_CURSORS) {
        const oldest = Array.from(newCursors.entries()).sort(
          (a, b) => a[1].timestamp - b[1].timestamp
        )[0];
        newCursors.delete(oldest[0]);
      }

      set({ peerCursors: newCursors });
    });
  },

  /**
   * Generate a new invite code (teacher-side)
   */
  generateInviteCode: async (): Promise<string> => {
    if (!isCloudSyncEnabled()) {
      console.warn('[CollaborationStore] Cloud sync disabled');
      return '';
    }

    try {
      const user = await getCurrentUser();
      if (!user) {
        console.error('[CollaborationStore] Not authenticated');
        return '';
      }

      const code = generateCode();
      const now = Date.now();
      const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

      const link: TeacherStudentLink = {
        id: genId(),
        teacherId: user.id,
        studentId: null, // Will be filled when student accepts
        inviteCode: code,
        status: LinkStatus.PENDING,
        permissions: {
          can_write: true,
          can_view_all: true,
          can_annotate: true,
        },
        createdAt: now,
        expiresAt,
        acceptedAt: null,
        revokedAt: null,
        updatedAt: now,
      };

      await upsertTeacherStudentLink(link);

      // Update local state
      set(state => ({
        linkedStudents: [...state.linkedStudents, link],
      }));

      addBreadcrumb('Invite code generated', 'collaboration', { code });
      console.log('[CollaborationStore] Invite code generated:', code);

      return code;
    } catch (error) {
      console.error('[CollaborationStore] Failed to generate invite code:', error);
      captureException(error as Error);
      return '';
    }
  },

  /**
   * Accept an invite code (student-side)
   */
  acceptInviteCode: async (code: string) => {
    if (!isCloudSyncEnabled()) {
      console.warn('[CollaborationStore] Cloud sync disabled');
      return;
    }

    try {
      const user = await getCurrentUser();
      if (!user) {
        console.error('[CollaborationStore] Not authenticated');
        return;
      }

      // Import the accept function
      const { acceptInviteCode: acceptCode } = await import(
        '../utils/sync/collaborationSync'
      );
      const link = await acceptCode(code);

      if (!link) {
        console.error('[CollaborationStore] Failed to accept invite code');
        return;
      }

      // Update local state
      set(state => ({
        linkedTeachers: [...state.linkedTeachers, link],
      }));

      addBreadcrumb('Invite code accepted', 'collaboration', { code });
      console.log('[CollaborationStore] Invite code accepted:', code);
    } catch (error) {
      console.error('[CollaborationStore] Failed to accept invite code:', error);
      captureException(error as Error, { code });
    }
  },

  /**
   * Revoke a teacher-student link
   */
  revokeLink: async (linkId: string) => {
    try {
      const link = get().linkedStudents.find(l => l.id === linkId);
      if (!link) {
        console.error('[CollaborationStore] Link not found:', linkId);
        return;
      }

      const updatedLink: TeacherStudentLink = {
        ...link,
        status: LinkStatus.REVOKED,
        revokedAt: Date.now(),
        updatedAt: Date.now(),
      };

      await upsertTeacherStudentLink(updatedLink);

      // Update local state
      set(state => ({
        linkedStudents: state.linkedStudents.map(l =>
          l.id === linkId ? updatedLink : l
        ),
      }));

      addBreadcrumb('Link revoked', 'collaboration', { linkId });
      console.log('[CollaborationStore] Link revoked:', linkId);
    } catch (error) {
      console.error('[CollaborationStore] Failed to revoke link:', error);
      captureException(error as Error, { linkId });
    }
  },
}));

/**
 * Selectors for optimized re-renders
 */

// Get active session
export const selectActiveSession = (state: CollaborationStoreState) => state.activeSession;

// Get session status
export const selectSessionStatus = (state: CollaborationStoreState) => state.sessionStatus;

// Get live strokes from peer (exclude own strokes)
// Memoized to prevent infinite re-renders from array filtering
const peerStrokesCache = new Map<string, { sourceStrokes: LiveStroke[], filteredStrokes: LiveStroke[] }>();
export const selectPeerStrokes = (userId: string) => {
  return (state: CollaborationStoreState) => {
    const cached = peerStrokesCache.get(userId);

    // Check if cache is valid (same source strokes array reference)
    if (cached && cached.sourceStrokes === state.liveStrokes) {
      return cached.filteredStrokes;
    }

    // Filter and cache both the source and result
    const filtered = state.liveStrokes.filter(stroke => stroke.authorId !== userId);
    peerStrokesCache.set(userId, { sourceStrokes: state.liveStrokes, filteredStrokes: filtered });

    return filtered;
  };
};

// Get all live strokes
export const selectLiveStrokes = (state: CollaborationStoreState) => state.liveStrokes;

// Get broadcastStroke function
export const selectBroadcastStroke = (state: CollaborationStoreState) => state.broadcastStroke;

// Get peer cursors
export const selectPeerCursors = (state: CollaborationStoreState) => state.peerCursors;

// Get presence state
export const selectPresence = (state: CollaborationStoreState) => state.presence;

// Get linked students (teacher view)
export const selectLinkedStudents = (state: CollaborationStoreState) => state.linkedStudents;

// Get linked teachers (student view)
export const selectLinkedTeachers = (state: CollaborationStoreState) => state.linkedTeachers;

// Check if in an active session
export const selectIsInSession = (state: CollaborationStoreState) =>
  state.activeSession !== null && state.sessionStatus === 'connected';

// Get connected teacher (student view)
export const selectConnectedTeacher = (state: CollaborationStoreState) =>
  state.connectedTeacher;

// Get active students (teacher view)
export const selectActiveStudents = (state: CollaborationStoreState) => state.activeStudents;

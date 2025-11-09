/**
 * Collaboration Types
 *
 * Type definitions for real-time teacher-student collaboration (PR13).
 * Supports invite codes, live sessions, and WebSocket stroke streaming.
 */

import { Stroke } from './Canvas';

/**
 * Teacher-student relationship status
 */
export enum LinkStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  REVOKED = 'revoked',
}

/**
 * Collaboration permissions
 */
export interface CollaborationPermissions {
  /** Can teacher write on student's canvas? */
  can_write: boolean;
  /** Can teacher view all student data? */
  can_view_all: boolean;
  /** Can teacher add annotations? */
  can_annotate: boolean;
}

/**
 * Teacher-student link (invite-based pairing)
 */
export interface TeacherStudentLink {
  id: string;
  teacherId: string;
  studentId: string;
  inviteCode: string; // 6-character alphanumeric (e.g., ABC123)
  status: LinkStatus;
  permissions: CollaborationPermissions;
  createdAt: number; // timestamp
  expiresAt: number | null; // null = never expires
  acceptedAt: number | null;
  revokedAt: number | null;
  updatedAt: number;
}

/**
 * Collaboration session status
 */
export enum SessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  ENDED = 'ended',
}

/**
 * Active collaboration session
 */
export interface CollaborationSession {
  id: string;
  studentId: string;
  teacherId: string;
  linkId: string; // References TeacherStudentLink
  attemptId: string | null; // Optional link to current attempt
  status: SessionStatus;
  startedAt: number;
  endedAt: number | null;
  studentLastSeen: number; // For presence tracking
  teacherLastSeen: number;
  metadata: Record<string, any>; // Flexible metadata (problem context, etc.)
  createdAt: number;
  updatedAt: number;
}

/**
 * Live stroke data (ephemeral, real-time)
 */
export interface LiveStroke {
  id: string;
  sessionId: string;
  authorId: string; // User who drew this stroke
  strokeData: Stroke; // Full stroke object (uncompressed for speed)
  color: string;
  strokeWidth: number;
  lineNumber: number | null;
  isAnnotation: boolean; // true if drawn by teacher
  createdAt: number;
}

/**
 * Invite code format and validation
 */
export interface InviteCode {
  code: string; // 6 characters, uppercase alphanumeric
  teacherId: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Presence state for real-time tracking
 */
export interface PresenceState {
  userId: string;
  role: 'teacher' | 'student';
  online: boolean;
  lastSeen: number;
  cursorPosition: { x: number; y: number } | null;
}

/**
 * Cursor position for peer awareness
 */
export interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  color: string;
  timestamp: number;
}

/**
 * Real-time channel subscription state
 */
export interface RealtimeChannelState {
  channelName: string;
  connected: boolean;
  subscribed: boolean;
  presenceCount: number;
  lastMessageAt: number | null;
}

/**
 * Collaboration store state (for collaborationStore.ts)
 */
export interface CollaborationStoreState {
  // Session management
  activeSession: CollaborationSession | null;
  sessionStatus: 'disconnected' | 'connecting' | 'connected';

  // Real-time data
  liveStrokes: LiveStroke[];
  peerCursors: Map<string, CursorPosition>;
  presence: Map<string, PresenceState>;

  // Teacher-specific
  linkedStudents: TeacherStudentLink[];
  activeStudents: string[]; // User IDs of online students

  // Student-specific
  linkedTeachers: TeacherStudentLink[];
  connectedTeacher: string | null; // User ID if teacher is online

  // Realtime channel
  realtimeChannel: RealtimeChannelState | null;

  // Actions (to be implemented in store)
  startSession: (teacherId: string) => Promise<void>;
  endSession: () => Promise<void>;
  broadcastStroke: (stroke: Stroke) => Promise<void>;
  updateCursorPosition: (position: { x: number; y: number }) => void;
  generateInviteCode: () => Promise<string>;
  acceptInviteCode: (code: string) => Promise<void>;
  revokeLink: (linkId: string) => Promise<void>;
}

/**
 * Invite code generation options
 */
export interface InviteCodeOptions {
  length: number; // Default: 6
  expiresInHours: number; // Default: 24
  allowedCharacters: string; // Default: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' (no 0/O/1/I)
}

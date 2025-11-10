/**
 * Collaboration Sync Client
 *
 * Handles idempotent upserts for teacher-student collaboration features.
 * Follows patterns from syncClient.ts for consistency.
 */

import { getSupabaseClient, getCurrentUser, isCloudSyncEnabled } from './supabaseClient';
import { enqueue, QueueItemType } from './queue';
import { captureException, addBreadcrumb } from '../sentry';
import {
  TeacherStudentLink,
  CollaborationSession,
  LiveStroke,
  LinkStatus,
  SessionStatus,
} from '../../types/Collaboration';

/**
 * Upsert teacher-student link to cloud
 */
export async function upsertTeacherStudentLink(link: TeacherStudentLink): Promise<void> {
  if (!isCloudSyncEnabled()) {
    console.log('[CollaborationSync] Cloud sync disabled, skipping link upsert');
    return;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[CollaborationSync] Not authenticated, enqueueing link for later');
      enqueue(QueueItemType.TEACHER_STUDENT_LINK, link);
      throw new Error('You must be signed in to sync collaboration links.');
    }

    const client = getSupabaseClient();
    const { error } = await client.from('teacher_student_links').upsert({
      id: link.id,
      teacher_id: link.teacherId,
      student_id: link.studentId,
      invite_code: link.inviteCode,
      status: link.status,
      permissions: link.permissions,
      created_at: new Date(link.createdAt).toISOString(),
      expires_at: link.expiresAt ? new Date(link.expiresAt).toISOString() : null,
      accepted_at: link.acceptedAt ? new Date(link.acceptedAt).toISOString() : null,
      revoked_at: link.revokedAt ? new Date(link.revokedAt).toISOString() : null,
    });

    if (error) {
      throw error;
    }

    addBreadcrumb('Teacher-student link synced', 'sync', { linkId: link.id });
    console.log('[CollaborationSync] Link synced:', link.id);
  } catch (error) {
    console.error('[CollaborationSync] Link upsert error:', error);
    enqueue(QueueItemType.TEACHER_STUDENT_LINK, link);
    captureException(error as Error, { linkId: link.id });
    throw (error instanceof Error ? error : new Error('Failed to sync teacher-student link'));
  }
}

/**
 * Upsert collaboration session to cloud
 */
export async function upsertCollaborationSession(session: CollaborationSession): Promise<void> {
  if (!isCloudSyncEnabled()) {
    console.log('[CollaborationSync] Cloud sync disabled, skipping session upsert');
    return;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[CollaborationSync] Not authenticated, enqueueing session for later');
      enqueue(QueueItemType.COLLABORATION_SESSION, session);
      throw new Error('You must be signed in to sync collaboration sessions.');
    }

    const client = getSupabaseClient();
    const { error } = await client.from('collaboration_sessions').upsert({
      id: session.id,
      student_id: session.studentId,
      teacher_id: session.teacherId,
      link_id: session.linkId,
      attempt_id: session.attemptId,
      status: session.status,
      started_at: new Date(session.startedAt).toISOString(),
      ended_at: session.endedAt ? new Date(session.endedAt).toISOString() : null,
      student_last_seen: new Date(session.studentLastSeen).toISOString(),
      teacher_last_seen: new Date(session.teacherLastSeen).toISOString(),
      metadata: session.metadata,
    });

    if (error) {
      throw error;
    }

    addBreadcrumb('Collaboration session synced', 'sync', { sessionId: session.id });
    console.log('[CollaborationSync] Session synced:', session.id);
  } catch (error) {
    console.error('[CollaborationSync] Session upsert error:', error);
    enqueue(QueueItemType.COLLABORATION_SESSION, session);
    captureException(error as Error, { sessionId: session.id });
    throw (error instanceof Error ? error : new Error('Failed to sync collaboration session'));
  }
}

/**
 * Insert live stroke to cloud (ephemeral, not queued on failure)
 * NOTE: Live strokes are not queued because they're ephemeral real-time data
 */
export async function insertLiveStroke(stroke: LiveStroke): Promise<void> {
  if (!isCloudSyncEnabled()) {
    return; // Silent fail for ephemeral data
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[CollaborationSync] Not authenticated, skipping live stroke');
      return; // Don't queue ephemeral data
    }

    const client = getSupabaseClient();
    const { error } = await client.from('live_strokes').insert({
      id: stroke.id,
      session_id: stroke.sessionId,
      author_id: stroke.authorId,
      stroke_data: stroke.strokeData, // Uncompressed for real-time speed
      color: stroke.color,
      stroke_width: stroke.strokeWidth,
      line_number: stroke.lineNumber,
      is_annotation: stroke.isAnnotation,
      created_at: new Date(stroke.createdAt).toISOString(),
    });

    if (error) {
      console.error('[CollaborationSync] Live stroke insert failed:', error);
      // Don't queue ephemeral data - it's already outdated
    } else {
      console.log('[CollaborationSync] Live stroke inserted:', stroke.id);
    }
  } catch (error) {
    console.error('[CollaborationSync] Live stroke insert error:', error);
    // Silent fail for ephemeral data
  }
}

/**
 * Fetch teacher-student links for current user
 */
export async function fetchTeacherStudentLinks(
  role: 'teacher' | 'student'
): Promise<TeacherStudentLink[]> {
  if (!isCloudSyncEnabled()) {
    console.log('[CollaborationSync] Cloud sync disabled, returning empty links');
    return [];
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[CollaborationSync] Not authenticated');
      return [];
    }

    const client = getSupabaseClient();
    const column = role === 'teacher' ? 'teacher_id' : 'student_id';
    const { data, error } = await client
      .from('teacher_student_links')
      .select('*')
      .eq(column, user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[CollaborationSync] Fetch links failed:', error);
      captureException(new Error(`Fetch links failed: ${error.message}`));
      return [];
    }

    // Transform database rows to TeacherStudentLink type
    return (data || []).map((row) => ({
      id: row.id,
      teacherId: row.teacher_id,
      studentId: row.student_id,
      inviteCode: row.invite_code,
      status: row.status as LinkStatus,
      permissions: row.permissions,
      createdAt: new Date(row.created_at).getTime(),
      expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : null,
      acceptedAt: row.accepted_at ? new Date(row.accepted_at).getTime() : null,
      revokedAt: row.revoked_at ? new Date(row.revoked_at).getTime() : null,
      updatedAt: new Date(row.updated_at).getTime(),
    }));
  } catch (error) {
    console.error('[CollaborationSync] Fetch links error:', error);
    captureException(error as Error);
    return [];
  }
}

/**
 * Fetch collaboration sessions for current user
 */
export async function fetchCollaborationSessions(
  role: 'teacher' | 'student',
  status?: SessionStatus
): Promise<CollaborationSession[]> {
  if (!isCloudSyncEnabled()) {
    console.log('[CollaborationSync] Cloud sync disabled, returning empty sessions');
    return [];
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[CollaborationSync] Not authenticated');
      return [];
    }

    const client = getSupabaseClient();
    const column = role === 'teacher' ? 'teacher_id' : 'student_id';

    let query = client
      .from('collaboration_sessions')
      .select('*')
      .eq(column, user.id)
      .order('started_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[CollaborationSync] Fetch sessions failed:', error);
      captureException(new Error(`Fetch sessions failed: ${error.message}`));
      return [];
    }

    // Transform database rows to CollaborationSession type
    return (data || []).map((row) => ({
      id: row.id,
      studentId: row.student_id,
      teacherId: row.teacher_id,
      linkId: row.link_id,
      attemptId: row.attempt_id,
      status: row.status as SessionStatus,
      startedAt: new Date(row.started_at).getTime(),
      endedAt: row.ended_at ? new Date(row.ended_at).getTime() : null,
      studentLastSeen: new Date(row.student_last_seen).getTime(),
      teacherLastSeen: new Date(row.teacher_last_seen).getTime(),
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    }));
  } catch (error) {
    console.error('[CollaborationSync] Fetch sessions error:', error);
    captureException(error as Error);
    return [];
  }
}

/**
 * Cleanup old live strokes (manual garbage collection)
 * Should be called periodically (e.g., hourly) or after session ends
 */
export async function cleanupOldLiveStrokes(olderThanHours: number = 1): Promise<number> {
  if (!isCloudSyncEnabled()) {
    return 0;
  }

  try {
    const client = getSupabaseClient();
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();

    const { data, error } = await client
      .from('live_strokes')
      .delete()
      .lt('created_at', cutoff)
      .select('id');

    if (error) {
      console.error('[CollaborationSync] Cleanup failed:', error);
      return 0;
    }

    const deletedCount = data?.length || 0;
    console.log(`[CollaborationSync] Cleaned up ${deletedCount} old live strokes`);
    return deletedCount;
  } catch (error) {
    console.error('[CollaborationSync] Cleanup error:', error);
    return 0;
  }
}

/**
 * Accept invite code (student-side)
 */
export async function acceptInviteCode(inviteCode: string): Promise<TeacherStudentLink | null> {
  if (!isCloudSyncEnabled()) {
    console.log('[CollaborationSync] Cloud sync disabled');
    return null;
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn('[CollaborationSync] Not authenticated');
      return null;
    }

    const client = getSupabaseClient();

    // Use security-definer RPC so students can claim codes without teacher assignment
    const { data, error } = await client.rpc('claim_invite_code', {
      p_invite_code: inviteCode.toUpperCase(),
    });

    if (error || !data) {
      console.error('[CollaborationSync] Invite code not found or expired', error);
      captureException(error || new Error('Invite code not found or expired'), { inviteCode });
      return null;
    }

    const link = Array.isArray(data) ? data[0] : data;

    addBreadcrumb('Invite code accepted', 'collaboration', { inviteCode, linkId: link.id });
    console.log('[CollaborationSync] Invite code accepted:', inviteCode);

    return {
      id: link.id,
      teacherId: link.teacher_id,
      studentId: user.id,
      inviteCode: link.invite_code,
      status: link.status as LinkStatus,
      permissions: link.permissions,
      createdAt: new Date(link.created_at).getTime(),
      expiresAt: link.expires_at ? new Date(link.expires_at).getTime() : null,
      acceptedAt: link.accepted_at ? new Date(link.accepted_at).getTime() : Date.now(),
      revokedAt: link.revoked_at ? new Date(link.revoked_at).getTime() : null,
      updatedAt: link.updated_at ? new Date(link.updated_at).getTime() : Date.now(),
    };
  } catch (error) {
    console.error('[CollaborationSync] Accept invite error:', error);
    captureException(error as Error, { inviteCode });
    return null;
  }
}

/**
 * Generate a random 6-character invite code
 * Format: ABC123 (uppercase letters + numbers, no confusing chars like 0/O, 1/I)
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0, O, 1, I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

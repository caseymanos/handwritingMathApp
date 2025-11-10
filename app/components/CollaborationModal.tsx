/**
 * CollaborationModal
 *
 * Modal for starting a collaboration session.
 * Allows users to select role (Teacher/Student) and generate/enter invite codes.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import { Colors as BaseColors } from '../styles/colors';
import { Spacing } from '../styles/spacing';
import { TextStyles } from '../styles/typography';
import { useCollaborationStore } from '../stores/collaborationStore';
import { LinkStatus } from '../types/Collaboration';

// Backward-compatible color helpers
const primaryColor = (BaseColors as any)?.primary?.main || (BaseColors as any)?.primary || '#2563eb';
const bgColor = (BaseColors as any)?.background?.primary || (BaseColors as any)?.background || '#ffffff';
const overlay = (BaseColors as any)?.ui?.overlay || 'rgba(0,0,0,0.5)';
const textColor = (BaseColors as any)?.text?.primary || (BaseColors as any)?.text || '#111827';
const borderColor = (BaseColors as any)?.ui?.border || '#e5e7eb';
const errorColor = (BaseColors as any)?.feedback?.error || '#ef4444';
const successColor = (BaseColors as any)?.feedback?.success || '#10b981';
const warningColor = (BaseColors as any)?.feedback?.warning || '#f59e0b';
const white = (BaseColors as any)?.text?.inverse || '#ffffff';

type Role = 'teacher' | 'student';

interface CollaborationModalProps {
  visible: boolean;
  onClose: () => void;
  onSessionStarted?: () => void;
}

export const CollaborationModal: React.FC<CollaborationModalProps> = ({
  visible,
  onClose,
  onSessionStarted,
}) => {
  const [role, setRole] = useState<Role>('student');
  const [inviteCode, setInviteCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const generateInviteCode = useCollaborationStore(state => state.generateInviteCode);
  const acceptInviteCode = useCollaborationStore(state => state.acceptInviteCode);
  const linkedStudents = useCollaborationStore(state => state.linkedStudents);
  const linkedTeachers = useCollaborationStore(state => state.linkedTeachers);
  const startSession = useCollaborationStore(state => state.startSession);
  const endSession = useCollaborationStore(state => state.endSession);
  const sessionStatus = useCollaborationStore(state => state.sessionStatus);
  const activeSession = useCollaborationStore(state => state.activeSession);
  const loadLinks = useCollaborationStore(state => state.loadLinks);

  const formatErrorMessage = (err: unknown, fallback: string) => {
    if (err instanceof Error && err.message) {
      return err.message;
    }
    if (typeof err === 'object' && err !== null && 'message' in err) {
      const message = (err as { message?: string }).message;
      if (message) return message;
    }
    return fallback;
  };

  const refreshLinkLists = useCallback(async () => {
    setListLoading(true);
    try {
      await loadLinks();
    } catch (err) {
      console.error('[CollaborationModal] Failed to load collaboration links:', err);
      setError('Unable to load collaboration links. Please try again.');
    } finally {
      setListLoading(false);
    }
  }, [loadLinks]);

  useEffect(() => {
    if (visible) {
      refreshLinkLists();
    }
  }, [visible, refreshLinkLists]);

  /**
   * Handle generating invite code (teacher)
   */
  const handleGenerateCode = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const code = await generateInviteCode();
      if (code) {
        setGeneratedCode(code);
        setSuccess('Invite code generated! Share it with your student.');
        await refreshLinkLists();
      } else {
        setError('Failed to generate invite code. Please try again.');
      }
    } catch (err) {
      setError(
        formatErrorMessage(
          err,
          'Failed to generate invite code. Please check your connection and try again.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle accepting invite code (student)
   */
  const handleAcceptCode = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await acceptInviteCode(inviteCode.trim().toUpperCase());
      await refreshLinkLists();
      setSuccess('Invite code accepted! Select your teacher below to start collaborating.');
    } catch (err) {
      setError('Invalid or expired invite code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCollaboration = async ({
    linkId,
    partnerId,
  }: {
    linkId: string;
    partnerId: string | null;
  }) => {
    if (!partnerId) {
      setError('Waiting for your partner to accept the invite before starting.');
      return;
    }

    setSessionLoading(true);
    setActionLoadingId(linkId);
    setError(null);
    setSuccess(null);

    try {
      await startSession(partnerId);
      setSuccess('Session started! Close this modal to begin collaborating.');
      onSessionStarted?.();
    } catch (err) {
      console.error('[CollaborationModal] Failed to start session:', err);
      setError('Failed to start session. Please try again.');
    } finally {
      setSessionLoading(false);
      setActionLoadingId(null);
    }
  };

  const handleLeaveSession = async () => {
    if (!activeSession) return;

    setSessionLoading(true);
    setError(null);

    try {
      await endSession();
      setSuccess('Session ended.');
    } catch (err) {
      console.error('[CollaborationModal] Failed to leave session:', err);
      setError('Failed to leave session. Please try again.');
    } finally {
      setSessionLoading(false);
      setActionLoadingId(null);
    }
  };

  /**
   * Copy invite code to clipboard
   */
  const handleCopyCode = () => {
    if (generatedCode) {
      Clipboard.setString(generatedCode);
      setSuccess('Code copied to clipboard!');
      setTimeout(() => setSuccess(null), 2000);
    }
  };

  /**
   * Reset modal state when closing
   */
  const handleClose = () => {
    setRole('student');
    setInviteCode('');
    setGeneratedCode(null);
    setError(null);
    setSuccess(null);
    onClose();
  };

  const activeStudentLinks = linkedStudents.filter(link => link.status === LinkStatus.ACTIVE);
  const pendingStudentLinks = linkedStudents.filter(link => link.status === LinkStatus.PENDING);
  const activeTeacherLinks = linkedTeachers.filter(link => link.status === LinkStatus.ACTIVE);
  const pendingTeacherLinks = linkedTeachers.filter(link => link.status === LinkStatus.PENDING);
  const hasActiveSession = Boolean(activeSession && sessionStatus === 'connected');
  const sessionTitleText = hasActiveSession
    ? 'Live session active'
    : sessionStatus === 'connecting'
    ? 'Connecting to session...'
    : 'No active session';
  const sessionSubtitleText = hasActiveSession
    ? 'Close this modal to access canvas controls or leave the session here.'
    : 'Generate or accept a code, then pick a linked partner to begin.';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>Start Collaboration</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={refreshLinkLists}
                style={styles.refreshBtn}
                disabled={listLoading}
                accessibilityLabel="Refresh collaboration links"
              >
                {listLoading ? (
                  <ActivityIndicator color={primaryColor} size="small" />
                ) : (
                  <Text style={styles.refreshText}>Refresh</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn} accessibilityLabel="Close">
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.sessionCard, hasActiveSession && styles.sessionCardActive]}>
            <Text style={styles.sessionTitle}>{sessionTitleText}</Text>
            <Text style={styles.sessionSubtitle}>{sessionSubtitleText}</Text>
            {hasActiveSession && (
              <TouchableOpacity
                style={styles.sessionActionBtn}
                onPress={handleLeaveSession}
                disabled={sessionLoading}
              >
                {sessionLoading ? (
                  <ActivityIndicator color={white} />
                ) : (
                  <Text style={styles.sessionActionText}>Leave Session</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Role Selection */}
          <View style={styles.roleRow}>
            <TouchableOpacity
              onPress={() => {
                setRole('teacher');
                setError(null);
                setSuccess(null);
              }}
              style={[styles.roleBtn, role === 'teacher' && styles.roleBtnActive]}
            >
              <Text style={[styles.roleText, role === 'teacher' && styles.roleTextActive]}>
                I'm a Teacher
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setRole('student');
                setError(null);
                setSuccess(null);
              }}
              style={[styles.roleBtn, role === 'student' && styles.roleBtnActive]}
            >
              <Text style={[styles.roleText, role === 'student' && styles.roleTextActive]}>
                I'm a Student
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content based on role */}
          <View style={styles.content}>
            {role === 'teacher' ? (
              // Teacher: Generate invite code
              <View style={styles.section}>
                <Text style={styles.instruction}>
                  Generate a 6-character invite code and share it with your student.
                </Text>

                {generatedCode ? (
                  <View style={styles.codeContainer}>
                    <View style={styles.codeBox}>
                      <Text style={styles.codeText}>{generatedCode}</Text>
                    </View>
                    <TouchableOpacity onPress={handleCopyCode} style={styles.copyBtn}>
                      <Text style={styles.copyBtnText}>Copy Code</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={handleGenerateCode}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={white} />
                    ) : (
                      <Text style={styles.primaryBtnText}>Generate Invite Code</Text>
                    )}
                  </TouchableOpacity>
                )}

                <Text style={styles.note}>
                  Note: The invite code expires in 24 hours and can only be used once.
                </Text>

                <View style={styles.divider} />

                <View style={styles.listSection}>
                  <Text style={styles.subheading}>Linked Students</Text>
                  {listLoading ? (
                    <ActivityIndicator color={primaryColor} />
                  ) : activeStudentLinks.length > 0 ? (
                    activeStudentLinks.map(link => (
                      <View key={link.id} style={styles.linkCard}>
                        <View style={styles.linkInfo}>
                          <Text style={styles.linkLabel}>Ready to connect</Text>
                          <Text style={styles.linkDetail}>Invite code: {link.inviteCode}</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.linkActionBtn, hasActiveSession && styles.linkActionBtnDisabled]}
                          onPress={() =>
                            handleStartCollaboration({ linkId: link.id, partnerId: link.studentId })
                          }
                          disabled={sessionLoading || actionLoadingId === link.id || hasActiveSession}
                        >
                          {actionLoadingId === link.id ? (
                            <ActivityIndicator color={white} />
                          ) : (
                            <Text style={styles.linkActionText}>Start Session</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.note}>
                      No active students yet. Share your invite code so a student can join your class.
                    </Text>
                  )}
                </View>

                {pendingStudentLinks.length > 0 && (
                  <View style={styles.listSection}>
                    <Text style={styles.subheading}>Pending Invites</Text>
                    {pendingStudentLinks.map(link => (
                      <View key={`pending-${link.id}`} style={styles.pendingCard}>
                        <Text style={styles.linkDetail}>Code: {link.inviteCode}</Text>
                        <Text style={styles.pendingStatus}>Waiting for student...</Text>
                      </View>
                    ))}
                  </View>
                )}

                {hasActiveSession && (
                  <Text style={styles.note}>
                    Leave your current session before starting with another student.
                  </Text>
                )}
              </View>
            ) : (
              // Student: Enter invite code
              <View style={styles.section}>
                <Text style={styles.instruction}>
                  Enter the 6-character invite code provided by your teacher.
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="ABC123"
                  placeholderTextColor={textColor + '66'}
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  autoCapitalize="characters"
                  maxLength={6}
                />

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleAcceptCode}
                  disabled={loading || !inviteCode.trim()}
                >
                  {loading ? (
                    <ActivityIndicator color={white} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Join Session</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.divider} />

                <View style={styles.listSection}>
                  <Text style={styles.subheading}>Linked Teachers</Text>
                  {listLoading ? (
                    <ActivityIndicator color={primaryColor} />
                  ) : activeTeacherLinks.length > 0 ? (
                    activeTeacherLinks.map(link => (
                      <View key={link.id} style={styles.linkCard}>
                        <View style={styles.linkInfo}>
                          <Text style={styles.linkLabel}>Ready to connect</Text>
                          <Text style={styles.linkDetail}>Invite code: {link.inviteCode}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.linkActionBtn}
                          onPress={() =>
                            handleStartCollaboration({ linkId: link.id, partnerId: link.teacherId })
                          }
                          disabled={sessionLoading || actionLoadingId === link.id}
                        >
                          {actionLoadingId === link.id ? (
                            <ActivityIndicator color={white} />
                          ) : (
                            <Text style={styles.linkActionText}>Start Session</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.note}>
                      Enter an invite code above to link with your teacher. Linked teachers will appear here.
                    </Text>
                  )}
                </View>

                {pendingTeacherLinks.length > 0 && (
                  <View style={styles.listSection}>
                    <Text style={styles.subheading}>Pending Requests</Text>
                    {pendingTeacherLinks.map(link => (
                      <View key={`pending-${link.id}`} style={styles.pendingCard}>
                        <Text style={styles.linkDetail}>Code: {link.inviteCode}</Text>
                        <Text style={styles.pendingStatus}>Waiting for teacher approval...</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Error/Success Messages */}
            {error && <Text style={styles.errorText}>{error}</Text>}
            {success && <Text style={styles.successText}>{success}</Text>}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: bgColor,
    borderRadius: Spacing.component.borderRadiusXLarge || 16,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: borderColor,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  title: {
    ...(TextStyles?.h2 || {}),
    color: textColor,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  refreshBtn: {
    borderWidth: 1,
    borderColor: borderColor,
    borderRadius: Spacing.component.borderRadius || 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  refreshText: {
    ...(TextStyles?.caption || TextStyles?.captionSmall || {}),
    color: textColor,
  },
  closeBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  closeText: {
    ...(TextStyles?.button || TextStyles?.buttonMedium || {}),
    color: textColor,
  },
  roleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  roleBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: borderColor,
    borderRadius: Spacing.component.borderRadius || 8,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  roleBtnActive: {
    backgroundColor: primaryColor + '10',
    borderColor: primaryColor,
  },
  roleText: {
    ...(TextStyles?.body || TextStyles?.bodyMedium || {}),
    color: textColor,
  },
  roleTextActive: {
    color: primaryColor,
    fontWeight: '600',
  },
  content: {
    gap: Spacing.md,
  },
  sessionCard: {
    borderWidth: 1,
    borderColor: borderColor,
    borderRadius: Spacing.component.borderRadius || 12,
    padding: Spacing.md,
    backgroundColor: bgColor,
    marginBottom: Spacing.md,
  },
  sessionCardActive: {
    borderColor: successColor,
    backgroundColor: successColor + '10',
  },
  sessionTitle: {
    ...(TextStyles?.bodyLarge || TextStyles?.body || {}),
    color: textColor,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  sessionSubtitle: {
    ...(TextStyles?.caption || TextStyles?.captionSmall || {}),
    color: textColor + '99',
    marginBottom: Spacing.sm,
  },
  sessionActionBtn: {
    backgroundColor: errorColor,
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.component.borderRadius || 8,
    alignItems: 'center',
  },
  sessionActionText: {
    ...(TextStyles?.button || TextStyles?.buttonMedium || {}),
    color: white,
  },
  section: {
    gap: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: borderColor,
    marginVertical: Spacing.md,
  },
  listSection: {
    gap: Spacing.sm,
  },
  subheading: {
    ...(TextStyles?.bodySmall || TextStyles?.caption || {}),
    color: textColor,
    fontWeight: '600',
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: borderColor,
    borderRadius: Spacing.component.borderRadius || 10,
    padding: Spacing.sm,
    backgroundColor: white,
  },
  linkInfo: {
    flex: 1,
  },
  linkLabel: {
    ...(TextStyles?.bodySmall || TextStyles?.caption || {}),
    color: textColor,
    fontWeight: '600',
  },
  linkDetail: {
    ...(TextStyles?.caption || TextStyles?.captionSmall || {}),
    color: textColor + '99',
  },
  linkActionBtn: {
    backgroundColor: primaryColor,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.component.borderRadius || 8,
    alignItems: 'center',
    minWidth: 120,
  },
  linkActionBtnDisabled: {
    opacity: 0.5,
  },
  linkActionText: {
    ...(TextStyles?.caption || TextStyles?.captionSmall || {}),
    color: white,
    fontWeight: '600',
  },
  pendingCard: {
    borderWidth: 1,
    borderColor: borderColor,
    borderStyle: 'dashed',
    borderRadius: Spacing.component.borderRadius || 8,
    padding: Spacing.sm,
    backgroundColor: bgColor,
  },
  pendingStatus: {
    ...(TextStyles?.caption || TextStyles?.captionSmall || {}),
    color: warningColor,
  },
  instruction: {
    ...(TextStyles?.body || TextStyles?.bodyMedium || {}),
    color: textColor,
    lineHeight: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: borderColor,
    borderRadius: Spacing.component.borderRadius || 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: textColor,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 2,
  },
  primaryBtn: {
    backgroundColor: primaryColor,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.component.borderRadius || 8,
    alignItems: 'center',
  },
  primaryBtnText: {
    ...(TextStyles?.button || TextStyles?.buttonMedium || {}),
    color: white,
  },
  codeContainer: {
    gap: Spacing.sm,
  },
  codeBox: {
    backgroundColor: primaryColor + '10',
    borderWidth: 2,
    borderColor: primaryColor,
    borderRadius: Spacing.component.borderRadius || 8,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  codeText: {
    fontSize: 32,
    fontWeight: '700',
    color: primaryColor,
    letterSpacing: 4,
  },
  copyBtn: {
    borderWidth: 1,
    borderColor: primaryColor,
    borderRadius: Spacing.component.borderRadius || 8,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  copyBtnText: {
    ...(TextStyles?.button || TextStyles?.buttonMedium || {}),
    color: primaryColor,
  },
  note: {
    ...(TextStyles?.caption || TextStyles?.captionSmall || {}),
    color: textColor + '99',
    fontStyle: 'italic',
  },
  errorText: {
    ...(TextStyles?.caption || TextStyles?.captionSmall || {}),
    color: errorColor,
    textAlign: 'center',
  },
  successText: {
    ...(TextStyles?.caption || TextStyles?.captionSmall || {}),
    color: successColor,
    textAlign: 'center',
  },
});

export default CollaborationModal;

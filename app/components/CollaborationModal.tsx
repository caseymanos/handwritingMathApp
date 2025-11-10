/**
 * CollaborationModal
 *
 * Modal for starting a collaboration session.
 * Allows users to select role (Teacher/Student) and generate/enter invite codes.
 */

import React, { useState } from 'react';
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

// Backward-compatible color helpers
const primaryColor = (BaseColors as any)?.primary?.main || (BaseColors as any)?.primary || '#2563eb';
const bgColor = (BaseColors as any)?.background?.primary || (BaseColors as any)?.background || '#ffffff';
const overlay = (BaseColors as any)?.ui?.overlay || 'rgba(0,0,0,0.5)';
const textColor = (BaseColors as any)?.text?.primary || (BaseColors as any)?.text || '#111827';
const borderColor = (BaseColors as any)?.ui?.border || '#e5e7eb';
const errorColor = (BaseColors as any)?.feedback?.error || '#ef4444';
const successColor = (BaseColors as any)?.feedback?.success || '#10b981';
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

  const generateInviteCode = useCollaborationStore(state => state.generateInviteCode);
  const acceptInviteCode = useCollaborationStore(state => state.acceptInviteCode);

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
      } else {
        setError('Failed to generate invite code. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
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
      setSuccess('Invite code accepted! You can now start a session.');
      setTimeout(() => {
        onSessionStarted?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError('Invalid or expired invite code. Please check and try again.');
    } finally {
      setLoading(false);
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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>Start Collaboration</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} accessibilityLabel="Close">
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
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
  },
  title: {
    ...(TextStyles?.h2 || {}),
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
  section: {
    gap: Spacing.md,
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

/**
 * AuthModal
 * Simple inline modal for email/password sign in or sign up.
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
} from 'react-native';
import { Colors as BaseColors } from '../styles/colors';
import { Spacing } from '../styles/spacing';
import { TextStyles } from '../styles/typography';

// Backward-compatible color helpers (handles both flat and nested palettes)
const primaryColor = (BaseColors as any)?.primary?.main || (BaseColors as any)?.primary || '#2563eb';
const bgColor = (BaseColors as any)?.background?.primary || (BaseColors as any)?.background || '#ffffff';
const overlay = (BaseColors as any)?.ui?.overlay || 'rgba(0,0,0,0.5)';
const textColor = (BaseColors as any)?.text?.primary || (BaseColors as any)?.text || '#111827';
const borderColor = (BaseColors as any)?.ui?.border || '#e5e7eb';
const errorColor = (BaseColors as any)?.feedback?.error || '#ef4444';
const white = (BaseColors as any)?.text?.inverse || '#ffffff';

type Mode = 'signin' | 'signup';

interface AuthModalProps {
  visible: boolean;
  mode?: Mode;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ visible, mode = 'signin', onClose, onSuccess }) => {
  const [authMode, setAuthMode] = useState<Mode>(mode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Enter email and password');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { signInWithPassword, signUpWithPassword } = await import('../utils/sync/supabaseClient');
      if (authMode === 'signin') {
        const { error } = await signInWithPassword(email.trim(), password);
        if (error) {
          setError(error.message || 'Invalid email or password. If you just signed up, check your email to confirm.');
          return;
        }
        onSuccess?.();
        onClose();
      } else {
        const { error, pendingEmailConfirmation } = await signUpWithPassword(email.trim(), password);
        if (error) {
          setError(error.message || 'Sign up failed');
          return;
        }
        if (pendingEmailConfirmation) {
          setError('Account created. Please confirm via email before signing in.');
          return;
        }
        onSuccess?.();
        onClose();
      }
    } catch (e) {
      setError('Unexpected error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{authMode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close">
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modeRow}>
            <TouchableOpacity
              onPress={() => setAuthMode('signin')}
              style={[styles.modeBtn, authMode === 'signin' && styles.modeBtnActive]}
            >
              <Text style={[styles.modeText, authMode === 'signin' && styles.modeTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAuthMode('signup')}
              style={[styles.modeBtn, authMode === 'signup' && styles.modeBtnActive]}
            >
              <Text style={[styles.modeText, authMode === 'signup' && styles.modeTextActive]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <TextInput
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              placeholderTextColor={textColor + '66'}
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              placeholder="Password"
              secureTextEntry
              style={styles.input}
              placeholderTextColor={textColor + '66'}
              value={password}
              onChangeText={setPassword}
            />

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={white} />
              ) : (
                <Text style={styles.submitText}>{authMode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
              )}
            </TouchableOpacity>

            {/* Secondary actions */}
            {authMode === 'signin' && (
              <View style={styles.secondaryRow}>
                <TouchableOpacity
                  onPress={async () => {
                    if (!email) {
                      setError('Enter your email to reset password');
                      return;
                    }
                    setLoading(true);
                    const { resetPassword } = await import('../utils/sync/supabaseClient');
                    const { error } = await resetPassword(email.trim());
                    setLoading(false);
                    if (error) setError(error.message || 'Failed to send reset email');
                    else setError('Password reset email sent. Check your inbox.');
                  }}
                >
                  <Text style={styles.linkText}>Forgot password?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={async () => {
                    if (!email) {
                      setError('Enter your email to send a magic link');
                      return;
                    }
                    setLoading(true);
                    const { signInWithMagicLink } = await import('../utils/sync/supabaseClient');
                    const { error } = await signInWithMagicLink(email.trim());
                    setLoading(false);
                    if (error) setError(error.message || 'Failed to send magic link');
                    else setError('Magic link sent. Check your inbox.');
                  }}
                >
                  <Text style={styles.linkText}>Send magic link</Text>
                </TouchableOpacity>
              </View>
            )}

            {authMode === 'signup' && (
              <View style={styles.secondaryRow}>
                <TouchableOpacity
                  onPress={async () => {
                    if (!email) {
                      setError('Enter your email to resend confirmation');
                      return;
                    }
                    setLoading(true);
                    const { resendConfirmation } = await import('../utils/sync/supabaseClient');
                    const { error } = await resendConfirmation(email.trim());
                    setLoading(false);
                    if (error) setError(error.message || 'Failed to resend confirmation');
                    else setError('Confirmation email resent. Check your inbox.');
                  }}
                >
                  <Text style={styles.linkText}>Resend confirmation email</Text>
                </TouchableOpacity>
              </View>
            )}
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
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  modeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: borderColor,
    borderRadius: Spacing.component.borderRadius || 8,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: primaryColor + '10',
    borderColor: primaryColor,
  },
  modeText: {
    ...(TextStyles?.body || TextStyles?.bodyMedium || {}),
    color: textColor,
  },
  modeTextActive: {
    color: primaryColor,
    fontWeight: '600',
  },
  form: {
    gap: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: borderColor,
    borderRadius: Spacing.component.borderRadius || 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: textColor,
  },
  submitBtn: {
    marginTop: Spacing.md,
    backgroundColor: primaryColor,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.component.borderRadius || 8,
    alignItems: 'center',
  },
  submitText: {
    ...(TextStyles?.button || TextStyles?.buttonMedium || {}),
    color: white,
  },
  errorText: {
    ...(TextStyles?.caption || TextStyles?.captionSmall || {}),
    color: errorColor,
  },
  secondaryRow: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  linkText: {
    ...(TextStyles?.caption || TextStyles?.captionSmall || {}),
    color: primaryColor,
  },
});

export default AuthModal;

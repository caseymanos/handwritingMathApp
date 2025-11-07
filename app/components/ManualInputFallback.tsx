/**
 * Manual Input Fallback Component
 *
 * Allows users to manually enter math expressions if recognition fails.
 * Provides a fallback mechanism for poor recognition results.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Spacing, TextStyles, Shadows, Typography } from '../styles';

/**
 * Props for ManualInputFallback
 */
interface ManualInputFallbackProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when user submits manual input */
  onSubmit: (input: string) => void;
  /** Callback when user cancels */
  onCancel: () => void;
  /** Initial value to pre-fill (e.g., from failed recognition) */
  initialValue?: string;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * ManualInputFallback Component
 *
 * Modal that allows manual text input when recognition fails
 */
export const ManualInputFallback: React.FC<ManualInputFallbackProps> = ({
  visible,
  onSubmit,
  onCancel,
  initialValue = '',
  placeholder = 'Enter math expression (e.g., 2x + 3 = 7)',
}) => {
  const [input, setInput] = useState(initialValue);

  // Reset input when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      setInput(initialValue);
    }
  }, [visible, initialValue]);

  const handleSubmit = () => {
    if (input.trim()) {
      onSubmit(input.trim());
      setInput('');
    }
  };

  const handleCancel = () => {
    setInput('');
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      accessibilityLabel="Manual input modal"
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleCancel}
        />
        <View style={styles.container}>
          <Text style={styles.title}>Manual Input</Text>
          <Text style={styles.description}>
            Recognition didn't work? Type your math expression below:
          </Text>

          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={placeholder}
            placeholderTextColor={Colors.text.tertiary}
            autoFocus
            multiline
            numberOfLines={3}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            accessibilityLabel="Math expression input"
            accessibilityHint="Enter your math expression manually"
          />

          <View style={styles.exampleContainer}>
            <Text style={styles.exampleTitle}>Examples:</Text>
            <Text style={styles.exampleText}>• 2x + 3 = 7</Text>
            <Text style={styles.exampleText}>• x^2 - 5x + 6 = 0</Text>
            <Text style={styles.exampleText}>• (a + b) / 2 = 10</Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                !input.trim() && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!input.trim()}
              accessibilityLabel="Submit"
              accessibilityRole="button"
              accessibilityState={{ disabled: !input.trim() }}
            >
              <Text
                style={[
                  styles.submitButtonText,
                  !input.trim() && styles.submitButtonTextDisabled,
                ]}
              >
                Submit
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.ui.overlay,
  },
  container: {
    width: '85%',
    maxWidth: 500,
    backgroundColor: Colors.background.primary,
    borderRadius: Spacing.md,
    padding: Spacing.lg,
    ...Shadows.large,
  },
  title: {
    ...TextStyles.h1,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  description: {
    ...TextStyles.bodyMedium,
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
  },
  input: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: Spacing.sm,
    padding: Spacing.md,
    ...TextStyles.bodyLarge,
    fontFamily: Typography.fontFamily.mono,
    color: Colors.text.primary,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.ui.border,
  },
  exampleContainer: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderRadius: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary.main,
  },
  exampleTitle: {
    ...TextStyles.labelMedium,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  exampleText: {
    ...TextStyles.bodySmall,
    color: Colors.text.secondary,
    fontFamily: Typography.fontFamily.mono,
    marginVertical: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.background.tertiary,
    borderWidth: 1,
    borderColor: Colors.ui.border,
  },
  cancelButtonText: {
    ...TextStyles.buttonMedium,
    color: Colors.text.secondary,
  },
  submitButton: {
    backgroundColor: Colors.primary.main,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.ui.disabled,
  },
  submitButtonText: {
    ...TextStyles.buttonMedium,
    color: Colors.primary.contrast,
  },
  submitButtonTextDisabled: {
    color: Colors.text.tertiary,
  },
});

export default ManualInputFallback;

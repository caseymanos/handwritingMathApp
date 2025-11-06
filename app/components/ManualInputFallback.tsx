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
            placeholderTextColor="#999"
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    width: '85%',
    maxWidth: 500,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  exampleContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  exampleText: {
    fontSize: 14,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginVertical: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#2196F3',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  submitButtonTextDisabled: {
    color: '#999',
  },
});

export default ManualInputFallback;

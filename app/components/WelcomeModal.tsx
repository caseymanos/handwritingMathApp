/**
 * WelcomeModal Component
 *
 * First-launch tutorial modal with instructions
 * Shows once, then stores preference in AsyncStorage
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Colors, Spacing, TextStyles, Shadows } from '../styles';

interface WelcomeModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  visible,
  onDismiss,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView contentContainerStyle={styles.content}>
            {/* Header */}
            <Text style={styles.title}>Welcome to Canvas Demo!</Text>
            <Text style={styles.subtitle}>
              Your tablet handwriting experience
            </Text>

            {/* Instructions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎨 Getting Started</Text>
              <Text style={styles.instruction}>
                • Use your finger or stylus to draw on the canvas
              </Text>
              <Text style={styles.instruction}>
                • Tap the toolbar to select colors and tools
              </Text>
              <Text style={styles.instruction}>
                • Drag the toolbar to reposition it anywhere
              </Text>
              <Text style={styles.instruction}>
                • Hide the toolbar using the × button
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✏️ Drawing Tools</Text>
              <Text style={styles.instruction}>
                • <Text style={styles.bold}>Pen:</Text> Draw smooth, pressure-sensitive strokes
              </Text>
              <Text style={styles.instruction}>
                • <Text style={styles.bold}>Eraser:</Text> Remove strokes from the canvas
              </Text>
              <Text style={styles.instruction}>
                • <Text style={styles.bold}>Colors:</Text> Choose from 5 vibrant colors
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📏 Line Guides</Text>
              <Text style={styles.instruction}>
                • Horizontal guides help organize your work
              </Text>
              <Text style={styles.instruction}>
                • Toggle guides on/off from the toolbar
              </Text>
              <Text style={styles.instruction}>
                • Perfect for writing math problems line-by-line
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💡 Pro Tips</Text>
              <Text style={styles.instruction}>
                • Pressure-sensitive drawing works with Apple Pencil & S-Pen
              </Text>
              <Text style={styles.instruction}>
                • Works in both portrait and landscape orientation
              </Text>
              <Text style={styles.instruction}>
                • Toolbar snaps to 9 convenient positions
              </Text>
            </View>

            {/* Dismiss Button */}
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={onDismiss}
              accessibilityLabel="Get started"
              accessibilityRole="button"
            >
              <Text style={styles.dismissButtonText}>Get Started!</Text>
            </TouchableOpacity>

            <Text style={styles.footnote}>
              This tutorial will only show once. You can access help anytime from the toolbar.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.ui.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modal: {
    backgroundColor: Colors.background.primary,
    borderRadius: Spacing.md,
    maxWidth: 600,
    width: '90%',
    maxHeight: '80%',
    ...Shadows.large,
  },
  content: {
    padding: Spacing.lg,
  },
  title: {
    ...TextStyles.displayMedium,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...TextStyles.bodyLarge,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...TextStyles.h3,
    color: Colors.primary.main,
    marginBottom: Spacing.md,
  },
  instruction: {
    ...TextStyles.bodyMedium,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  bold: {
    fontWeight: TextStyles.labelMedium.fontWeight,
    color: Colors.text.primary,
  },
  dismissButton: {
    backgroundColor: Colors.primary.main,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  dismissButtonText: {
    ...TextStyles.buttonLarge,
    color: Colors.primary.contrast,
  },
  footnote: {
    ...TextStyles.bodySmall,
    color: Colors.text.tertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

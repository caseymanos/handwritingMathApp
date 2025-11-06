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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxWidth: 600,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0066CC',
    marginBottom: 12,
  },
  instruction: {
    fontSize: 16,
    color: '#444',
    marginBottom: 8,
    lineHeight: 24,
  },
  bold: {
    fontWeight: '600',
    color: '#333',
  },
  dismissButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  dismissButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  footnote: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

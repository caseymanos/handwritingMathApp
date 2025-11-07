/**
 * AppHeader Component
 *
 * Simple branded header for the app with "Write Math" branding.
 * Designed to work with SafeAreaView and avoid status bar conflicts.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, TextStyles } from '../styles';

/**
 * AppHeader Component
 *
 * Displays app branding at the top of the screen
 */
export const AppHeader: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Write Math</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
    alignItems: 'center',
  },
  title: {
    ...TextStyles.h2,
    color: Colors.text.primary,
  },
});

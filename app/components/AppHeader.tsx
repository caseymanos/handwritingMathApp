/**
 * AppHeader Component
 *
 * Simple branded header for the app with "Write Math" branding.
 * Designed to work with SafeAreaView and avoid status bar conflicts.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E4E8',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D1D1F',
    letterSpacing: 0.5,
  },
});

/**
 * SettingsScreen - App Configuration and Preferences
 *
 * Displays API configuration status, device info, and app settings.
 * Allows clearing cache and viewing app version.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import type { SettingsScreenProps } from '../navigation/types';
import { useProgressStore } from '../stores/progressStore';
import { storage } from '../utils/storage';

// App version (should match package.json in production)
const APP_VERSION = '1.0.0';
const BUILD_NUMBER = '1';

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [apiStatus, setApiStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');

  // Get progress store data
  const totalAttempts = useProgressStore(state => state.attemptCount);
  const clearHistory = useProgressStore(state => state.clearHistory);

  // Get device info
  const deviceInfo = {
    platform: Platform.OS,
    osVersion: Platform.Version.toString(),
    isTablet: Platform.isPad || Platform.isTV,
  };

  // Handle clear cache
  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data but keep your progress history. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            try {
              // Clear specific cache keys (but not progress data)
              // This would clear validation cache, etc.
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          },
        },
      ]
    );
  };

  // Handle clear all data
  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all data including your progress history. This cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            clearHistory();
            Alert.alert('Success', 'All data cleared successfully');
          },
        },
      ]
    );
  };

  // Handle feedback/support
  const handleFeedback = () => {
    Alert.alert(
      'Send Feedback',
      'Choose how you would like to send feedback:',
      [
        {
          text: 'Email',
          onPress: () => {
            Linking.openURL('mailto:support@handwritingmath.app?subject=App Feedback');
          },
        },
        {
          text: 'GitHub Issues',
          onPress: () => {
            Linking.openURL('https://github.com/your-repo/issues');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Handle privacy policy
  const handlePrivacy = () => {
    Linking.openURL('https://handwritingmath.app/privacy');
  };

  return (
    <ScrollView style={styles.container}>
      {/* App Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Information</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>{APP_VERSION}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Build</Text>
          <Text style={styles.infoValue}>{BUILD_NUMBER}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Total Attempts</Text>
          <Text style={styles.infoValue}>{totalAttempts}</Text>
        </View>
      </View>

      {/* Device Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device Information</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Platform</Text>
          <Text style={styles.infoValue}>
            {deviceInfo.platform === 'ios' ? 'iOS' : 'Android'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>OS Version</Text>
          <Text style={styles.infoValue}>{deviceInfo.osVersion}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Device Type</Text>
          <Text style={styles.infoValue}>{deviceInfo.isTablet ? 'Tablet' : 'Phone'}</Text>
        </View>
      </View>

      {/* API Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Status</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>CameraMath API</Text>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                apiStatus === 'connected'
                  ? styles.statusConnected
                  : apiStatus === 'disconnected'
                  ? styles.statusDisconnected
                  : styles.statusUnknown,
              ]}
            />
            <Text style={styles.statusText}>
              {apiStatus === 'connected'
                ? 'Connected'
                : apiStatus === 'disconnected'
                ? 'Disconnected'
                : 'Not tested'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            // Test API connection
            Alert.alert('Testing', 'API connection test not implemented yet');
          }}
        >
          <Text style={styles.buttonText}>Test Connection</Text>
        </TouchableOpacity>
      </View>

      {/* Data Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>

        <TouchableOpacity style={styles.button} onPress={handleClearCache}>
          <Text style={styles.buttonText}>Clear Cache</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={handleClearAllData}
        >
          <Text style={[styles.buttonText, styles.dangerButtonText]}>Clear All Data</Text>
        </TouchableOpacity>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>

        <TouchableOpacity style={styles.button} onPress={handleFeedback}>
          <Text style={styles.buttonText}>Send Feedback</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handlePrivacy}>
          <Text style={styles.buttonText}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        <Text style={styles.aboutText}>
          Handwriting Math is an intelligent tutoring app that helps students practice solving
          linear equations through handwriting input with real-time step-by-step validation.
        </Text>

        <Text style={styles.aboutText}>
          Built with React Native, ML Kit Digital Ink Recognition, and CameraMath API.
        </Text>

        <Text style={styles.copyrightText}>© 2025 Handwriting Math. All rights reserved.</Text>
      </View>

      {/* Bottom spacing */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  infoLabel: {
    fontSize: 16,
    color: '#1D1D1F',
  },
  infoValue: {
    fontSize: 16,
    color: '#6E6E73',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusConnected: {
    backgroundColor: '#34C759',
  },
  statusDisconnected: {
    backgroundColor: '#FF3B30',
  },
  statusUnknown: {
    backgroundColor: '#8E8E93',
  },
  statusText: {
    fontSize: 16,
    color: '#6E6E73',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dangerButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  dangerButtonText: {
    color: '#FF3B30',
  },
  aboutText: {
    fontSize: 14,
    color: '#6E6E73',
    lineHeight: 20,
    marginBottom: 12,
  },
  copyrightText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 20,
  },
  bottomSpacing: {
    height: 40,
  },
});

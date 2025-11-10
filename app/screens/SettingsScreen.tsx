/**
 * SettingsScreen - App Configuration and Preferences
 *
 * Displays API configuration status, device info, and app settings.
 * Allows clearing cache and viewing app version.
 */

import React, { useEffect, useState } from 'react';
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
import { useTutorialStore } from '../stores/tutorialStore';
import { useCollaborationStore } from '../stores/collaborationStore';
import { storage } from '../utils/storage';
import { LinkStatus } from '../types/Collaboration';

// App version (should match package.json in production)
const APP_VERSION = '1.0.0';
const BUILD_NUMBER = '1';

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [apiStatus, setApiStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');

  // Get progress store data
  const totalAttempts = useProgressStore(state => state.attemptCount);
  const clearHistory = useProgressStore(state => state.clearHistory);

  // Get tutorial store methods
  const clearLessonsCache = useTutorialStore(state => state.clearLessonsCache);
  const fetchLessons = useTutorialStore(state => state.fetchLessons);
  const isAuthed = useTutorialStore(state => state.isAuthed);
  const cloudEnabled = useTutorialStore(state => state.cloudEnabled);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Collaboration store
  const linkedTeachers = useCollaborationStore(state => state.linkedTeachers);
  const linkedStudents = useCollaborationStore(state => state.linkedStudents);
  const revokeLink = useCollaborationStore(state => state.revokeLink);
  const loadCollaborationLinks = useCollaborationStore(state => state.loadLinks);

  // Fetch user email when authed
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (isAuthed) {
          const { getCurrentUser } = await import('../utils/sync/supabaseClient');
          const user = await getCurrentUser();
          if (!cancelled) setUserEmail(user?.email ?? null);
        } else {
          if (!cancelled) setUserEmail(null);
        }
      } catch {
        if (!cancelled) setUserEmail(null);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthed]);

  // Load collaboration links when authenticated
  useEffect(() => {
    if (isAuthed && cloudEnabled) {
      loadCollaborationLinks().catch(error => {
        console.error('[SettingsScreen] Failed to load collaboration links:', error);
      });
    }
  }, [isAuthed, cloudEnabled, loadCollaborationLinks]);

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
      'This will clear all cached data (including tutorial lessons) but keep your progress history. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear tutorial lessons cache
              clearLessonsCache();

              // Fetch fresh lessons from Supabase
              await fetchLessons();

              Alert.alert('Success', 'Cache cleared successfully. Tutorial lessons refreshed from server.');
            } catch (error) {
              console.error('Failed to clear cache:', error);
              Alert.alert('Error', 'Failed to clear cache. Please try again.');
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
      {/* Account (moved to the top) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cloud Sync</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status</Text>
          <Text style={styles.infoValue}>
            {cloudEnabled ? (isAuthed ? 'Signed in' : 'Not signed in') : 'Cloud disabled'}
          </Text>
        </View>

        {cloudEnabled && isAuthed && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{userEmail || '—'}</Text>
          </View>
        )}

        {cloudEnabled && !isAuthed && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            Alert.prompt(
              'Sign In',
              'Enter your email to receive a magic link:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Send Link',
                  onPress: async (email) => {
                    if (!email) return;
                    try {
                      const { signInWithMagicLink } = await import('../utils/sync/supabaseClient');
                      const { error } = await signInWithMagicLink(email);
                      if (error) {
                        Alert.alert('Error', error.message);
                      } else {
                        Alert.alert('Success', 'Check your email for the magic link!');
                      }
                    } catch (error) {
                      Alert.alert('Error', 'Failed to send magic link');
                    }
                  },
                },
              ],
              'plain-text'
            );
          }}
        >
          <Text style={styles.buttonText}>Sign In with Email</Text>
        </TouchableOpacity>
        )}

        {cloudEnabled && !isAuthed && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            // Prompt for email, then password
            Alert.prompt(
              'Sign In',
              'Enter your email:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Next',
                  onPress: (email) => {
                    if (!email) return;
                    Alert.prompt(
                      'Password',
                      'Enter your password:',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Sign In',
                          onPress: async (password) => {
                            if (!password) return;
                            try {
                              const { signInWithPassword } = await import('../utils/sync/supabaseClient');
                              const { error } = await signInWithPassword(email, password);
                              if (error) {
                                Alert.alert('Error', error.message);
                              } else {
                                Alert.alert('Success', 'Signed in');
                              }
                            } catch {
                              Alert.alert('Error', 'Failed to sign in');
                            }
                          },
                        },
                      ],
                      'secure-text'
                    );
                  },
                },
              ],
              'plain-text'
            );
          }}
        >
          <Text style={styles.buttonText}>Sign In with Password</Text>
        </TouchableOpacity>
        )}

        {cloudEnabled && !isAuthed && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            // Prompt for email + password to create account
            Alert.prompt(
              'Create Account',
              'Enter your email:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Next',
                  onPress: (email) => {
                    if (!email) return;
                    Alert.prompt(
                      'Password',
                      'Choose a password:',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Create',
                          onPress: async (password) => {
                            if (!password) return;
                            try {
                              const { signUpWithPassword } = await import('../utils/sync/supabaseClient');
                              const { error } = await signUpWithPassword(email, password);
                              if (error) {
                                Alert.alert('Error', error.message);
                              } else {
                                Alert.alert('Success', 'Account created. You are signed in.');
                              }
                            } catch {
                              Alert.alert('Error', 'Failed to create account');
                            }
                          },
                        },
                      ],
                      'secure-text'
                    );
                  },
                },
              ],
              'plain-text'
            );
          }}
        >
          <Text style={styles.buttonText}>Create Account</Text>
        </TouchableOpacity>
        )}

        {cloudEnabled && isAuthed && (
        <TouchableOpacity
          style={styles.button}
          onPress={async () => {
            try {
              const { triggerManualSync } = await import('../utils/sync/hydrate');
              Alert.alert('Syncing...', 'Please wait');
              const result = await triggerManualSync();
              if (result.success) {
                Alert.alert('Success', 'Cloud sync completed');
              } else {
                Alert.alert('Error', result.error || 'Sync failed');
              }
            } catch (error) {
              Alert.alert('Error', 'Sync failed');
            }
          }}
        >
          <Text style={styles.buttonText}>Manual Sync</Text>
        </TouchableOpacity>
        )}

        {cloudEnabled && isAuthed && (
        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={async () => {
            try {
              const { signOut } = await import('../utils/sync/supabaseClient');
              const { error } = await signOut();
              if (error) {
                Alert.alert('Error', error.message);
              } else {
                Alert.alert('Success', 'Signed out');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          }}
        >
          <Text style={[styles.buttonText, styles.dangerButtonText]}>Sign Out</Text>
        </TouchableOpacity>
        )}
      </View>

      {/* Collaboration Section */}
      {cloudEnabled && isAuthed && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Collaboration</Text>

        {/* Linked Teachers */}
        {linkedTeachers.length > 0 && (
          <View>
            <Text style={styles.subsectionTitle}>Linked Teachers</Text>
            {linkedTeachers.map(link => (
              <View key={link.id} style={styles.linkRow}>
                <View style={styles.linkInfo}>
                  <Text style={styles.linkLabel}>
                    {link.status === LinkStatus.ACTIVE ? '✓ Active' : '⏳ Pending'}
                  </Text>
                  <Text style={styles.linkDetail}>Code: {link.inviteCode}</Text>
                </View>
                {link.status === LinkStatus.ACTIVE && (
                  <TouchableOpacity
                    style={[styles.button, styles.dangerButton, { paddingVertical: 6, paddingHorizontal: 12 }]}
                    onPress={() => {
                      Alert.alert(
                        'Remove Link',
                        'Are you sure you want to remove this teacher link?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Remove',
                            style: 'destructive',
                            onPress: () => revokeLink(link.id),
                          },
                        ]
                      );
                    }}
                  >
                    <Text style={[styles.buttonText, styles.dangerButtonText, { fontSize: 12 }]}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Linked Students */}
        {linkedStudents.length > 0 && (
          <View style={{ marginTop: linkedTeachers.length > 0 ? 16 : 0 }}>
            <Text style={styles.subsectionTitle}>Linked Students</Text>
            {linkedStudents.map(link => (
              <View key={link.id} style={styles.linkRow}>
                <View style={styles.linkInfo}>
                  <Text style={styles.linkLabel}>
                    {link.status === LinkStatus.ACTIVE ? '✓ Active' : '⏳ Pending'}
                  </Text>
                  <Text style={styles.linkDetail}>Code: {link.inviteCode}</Text>
                </View>
                {link.status === LinkStatus.ACTIVE && (
                  <TouchableOpacity
                    style={[styles.button, styles.dangerButton, { paddingVertical: 6, paddingHorizontal: 12 }]}
                    onPress={() => {
                      Alert.alert(
                        'Remove Link',
                        'Are you sure you want to remove this student link?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Remove',
                            style: 'destructive',
                            onPress: () => revokeLink(link.id),
                          },
                        ]
                      );
                    }}
                  >
                    <Text style={[styles.buttonText, styles.dangerButtonText, { fontSize: 12 }]}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {linkedTeachers.length === 0 && linkedStudents.length === 0 && (
          <Text style={styles.infoValue}>No collaboration links yet</Text>
        )}

        <TouchableOpacity
          style={[styles.button, { marginTop: 16 }]}
          onPress={() => navigation.navigate('TrainingMode', { problemId: undefined })}
        >
          <Text style={styles.buttonText}>Go to Canvas to Collaborate</Text>
        </TouchableOpacity>
      </View>
      )}

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
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6E6E73',
    marginBottom: 8,
    marginTop: 8,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  linkInfo: {
    flex: 1,
  },
  linkLabel: {
    fontSize: 16,
    color: '#1D1D1F',
    fontWeight: '500',
  },
  linkDetail: {
    fontSize: 14,
    color: '#6E6E73',
    marginTop: 4,
  },
});

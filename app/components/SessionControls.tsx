/**
 * SessionControls
 *
 * Compact controls for active collaboration sessions.
 * Shows connection status and provides option to leave session.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors as BaseColors } from '../styles/colors';
import { Spacing } from '../styles/spacing';
import { TextStyles } from '../styles/typography';
import { useCollaborationStore } from '../stores/collaborationStore';

// Backward-compatible color helpers
const primaryColor = (BaseColors as any)?.primary?.main || (BaseColors as any)?.primary || '#2563eb';
const textColor = (BaseColors as any)?.text?.primary || (BaseColors as any)?.text || '#111827';
const borderColor = (BaseColors as any)?.ui?.border || '#e5e7eb';
const errorColor = (BaseColors as any)?.feedback?.error || '#ef4444';
const successColor = (BaseColors as any)?.feedback?.success || '#10b981';
const warningColor = (BaseColors as any)?.feedback?.warning || '#f59e0b';
const white = (BaseColors as any)?.text?.inverse || '#ffffff';

interface SessionControlsProps {
  onLeaveSession?: () => void;
}

export const SessionControls: React.FC<SessionControlsProps> = ({ onLeaveSession }) => {
  const [loading, setLoading] = useState(false);

  const activeSession = useCollaborationStore(state => state.activeSession);
  const sessionStatus = useCollaborationStore(state => state.sessionStatus);
  const connectedTeacher = useCollaborationStore(state => state.connectedTeacher);
  const activeStudents = useCollaborationStore(state => state.activeStudents);
  const endSession = useCollaborationStore(state => state.endSession);

  // Don't render if no active session
  if (!activeSession) {
    return null;
  }

  /**
   * Handle leaving the session
   */
  const handleLeaveSession = async () => {
    setLoading(true);
    try {
      await endSession();
      onLeaveSession?.();
    } catch (error) {
      console.error('[SessionControls] Failed to leave session:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get status indicator color
   */
  const getStatusColor = () => {
    switch (sessionStatus) {
      case 'connected':
        return successColor;
      case 'connecting':
        return warningColor;
      case 'disconnected':
        return errorColor;
      default:
        return borderColor;
    }
  };

  /**
   * Get status text
   */
  const getStatusText = () => {
    switch (sessionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  /**
   * Get peer info text
   */
  const getPeerInfo = () => {
    if (connectedTeacher) {
      return 'Teacher online';
    }
    if (activeStudents.length > 0) {
      return `${activeStudents.length} student${activeStudents.length > 1 ? 's' : ''} online`;
    }
    return 'Waiting for peer...';
  };

  return (
    <View style={styles.container}>
      {/* Status Indicator */}
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
        <Text style={styles.statusText}>{getStatusText()}</Text>
        <Text style={styles.peerInfo}>{getPeerInfo()}</Text>
      </View>

      {/* Leave Button */}
      <TouchableOpacity
        style={styles.leaveBtn}
        onPress={handleLeaveSession}
        disabled={loading}
        accessibilityLabel="Leave collaboration session"
      >
        {loading ? (
          <ActivityIndicator size="small" color={white} />
        ) : (
          <Text style={styles.leaveBtnText}>Leave</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.component.borderRadius || 8,
    borderWidth: 1,
    borderColor: borderColor,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...(TextStyles?.caption || TextStyles?.captionSmall || {}),
    color: textColor,
    fontWeight: '600',
  },
  peerInfo: {
    ...(TextStyles?.caption || TextStyles?.captionSmall || {}),
    color: textColor + '99',
  },
  leaveBtn: {
    backgroundColor: errorColor,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.component.borderRadius || 8,
    minWidth: 60,
    alignItems: 'center',
  },
  leaveBtnText: {
    ...(TextStyles?.caption || TextStyles?.captionSmall || {}),
    color: white,
    fontWeight: '600',
  },
});

export default SessionControls;

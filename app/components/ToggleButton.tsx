/**
 * ToggleButton Component
 *
 * Small floating button to show/hide the toolbar
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import { ToolbarPosition } from '../types/Canvas';
import { Colors, Shadows, Spacing, TextStyles } from '../styles';

interface ToggleButtonProps {
  isToolbarVisible: boolean;
  toolbarPosition: ToolbarPosition;
  onPress: () => void;
}

/**
 * Get position styles based on toolbar position
 */
const getPositionStyle = (position: ToolbarPosition) => {
  const baseOffset = 20;

  switch (position) {
    case ToolbarPosition.TOP_LEFT:
      return { top: baseOffset, left: baseOffset };
    case ToolbarPosition.TOP_CENTER:
      return { top: baseOffset, alignSelf: 'center' as const };
    case ToolbarPosition.TOP_RIGHT:
      return { top: baseOffset, right: baseOffset };
    case ToolbarPosition.MIDDLE_LEFT:
      return { left: baseOffset, transform: [{ translateY: -25 }] };
    case ToolbarPosition.MIDDLE_CENTER:
      return { alignSelf: 'center' as const, transform: [{ translateY: -25 }] };
    case ToolbarPosition.MIDDLE_RIGHT:
      return { right: baseOffset, transform: [{ translateY: -25 }] };
    case ToolbarPosition.BOTTOM_LEFT:
      return { bottom: baseOffset, left: baseOffset };
    case ToolbarPosition.BOTTOM_CENTER:
      return { bottom: baseOffset, alignSelf: 'center' as const };
    case ToolbarPosition.BOTTOM_RIGHT:
      return { bottom: baseOffset, right: baseOffset };
  }
};

export const ToggleButton: React.FC<ToggleButtonProps> = ({
  isToolbarVisible,
  toolbarPosition,
  onPress,
}) => {
  // Don't show the toggle button if toolbar is already visible
  if (isToolbarVisible) {
    return null;
  }

  const positionStyle = getPositionStyle(toolbarPosition);

  return (
    <TouchableOpacity
      style={[styles.button, positionStyle]}
      onPress={onPress}
      accessibilityLabel="Show toolbar"
      accessibilityRole="button"
    >
      <Text style={styles.icon}>⚙️</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    width: 50,
    height: 50,
    top: '50%',
    borderRadius: 25,
    backgroundColor: Colors.ui.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
  },
  icon: {
    fontSize: 24,
  },
});

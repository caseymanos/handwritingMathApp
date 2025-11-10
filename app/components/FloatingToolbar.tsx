/**
 * FloatingToolbar Component
 *
 * Modern draggable toolbar with Kokonut UI style
 * Snaps to 2 positions: left-center (vertical/rotated) or bottom-center (horizontal)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  useWindowDimensions,
  Animated,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import {
  DrawingTool,
  CANVAS_COLORS,
  CanvasColor,
  ToolbarPosition,
} from '../types/Canvas';
import { Colors, Spacing } from '../styles';

interface FloatingToolbarProps {
  selectedColor: CanvasColor;
  selectedTool: DrawingTool;
  showLineGuides: boolean;
  onColorSelect: (color: CanvasColor) => void;
  onToolSelect: (tool: DrawingTool) => void;
  onToggleLineGuides: () => void;
  onClose: () => void;
  position: ToolbarPosition;
  onPositionChange: (position: ToolbarPosition) => void;
  // Undo controls (optional)
  onUndoStroke?: () => void;
  onUndoLine?: () => void;
  canUndo?: boolean;
  // Audio toggle (optional)
  audioEnabled?: boolean;
  onToggleAudio?: () => void;
}

/**
 * Calculate snap position based on drag coordinates
 * Only 2 positions: MIDDLE_LEFT or BOTTOM_CENTER
 */
const calculateSnapPosition = (
  x: number,
  y: number,
  screenWidth: number,
  screenHeight: number
): ToolbarPosition => {
  // Determine if closer to left edge or bottom edge
  const distanceToLeft = x;
  const distanceToBottom = screenHeight - y;

  // If closer to left edge than bottom, snap to MIDDLE_LEFT
  // Otherwise snap to BOTTOM_CENTER
  if (distanceToLeft < distanceToBottom && x < screenWidth / 2) {
    return ToolbarPosition.MIDDLE_LEFT;
  }
  return ToolbarPosition.BOTTOM_CENTER;
};

/**
 * Get absolute position coordinates from ToolbarPosition enum
 */
const getAbsolutePosition = (
  position: ToolbarPosition,
  screenWidth: number,
  screenHeight: number,
  toolbarWidth: number,
  toolbarHeight: number
): { x: number; y: number; rotation: string } => {
  const padding = 16;

  if (position === ToolbarPosition.MIDDLE_LEFT) {
    // Vertical on left side (rotated) - hug left edge, centered vertically
    return {
      // Move back to previous comfortable offset so the toolbar hugs the edge
      // regardless of width changes.
      x: -275, 
      y: screenHeight / 2, // Center vertically
      rotation: '-90deg',
    };
  } else {
    // Horizontal on bottom - push up by 1/3 toolbar height to avoid iPad swipe gesture
    return {
      x: (screenWidth - toolbarWidth) / 2,
      y: screenHeight - toolbarHeight - padding - (toolbarHeight / 3),
      rotation: '0deg',
    };
  }
};

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  selectedColor,
  selectedTool,
  showLineGuides,
  onColorSelect,
  onToolSelect,
  onToggleLineGuides,
  onClose,
  position,
  onPositionChange,
  onUndoStroke,
  onUndoLine,
  canUndo = true,
}) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Dimensions for toolbar
  // Widened to accommodate new undo buttons so the white background fully covers all controls.
  // Clamp to screen width with a small margin to avoid edge clipping.
  const toolbarHeight = 64;
  const toolbarWidth = Math.min(screenWidth - 40, 620);

  const { x, y, rotation } = getAbsolutePosition(
    position,
    screenWidth,
    screenHeight,
    toolbarWidth,
    toolbarHeight
  );
  const currentX = x + dragOffset.x;
  const currentY = y + dragOffset.y;

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragUpdate = useCallback((translationX: number, translationY: number) => {
    setDragOffset({ x: translationX, y: translationY });
  }, []);

  const handleDragEnd = useCallback((translationX: number, translationY: number) => {
    // Calculate final position
    const finalX = x + translationX;
    const finalY = y + translationY;

    // Determine snap position
    const newPosition = calculateSnapPosition(finalX, finalY, screenWidth, screenHeight);
    onPositionChange(newPosition);

    // Reset drag offset
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }, [x, y, screenWidth, screenHeight, onPositionChange]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      handleDragStart();
    })
    .onUpdate((event) => {
      handleDragUpdate(event.translationX, event.translationY);
    })
    .onEnd((event) => {
      handleDragEnd(event.translationX, event.translationY);
    })
    .runOnJS(true);

  const colorOptions = Object.entries(CANVAS_COLORS);

  return (
    <GestureDetector gesture={panGesture}>
      <View
        style={[
          styles.toolbar,
          {
            left: currentX,
            top: currentY,
            width: toolbarWidth,
            height: toolbarHeight,
            opacity: isDragging ? 0.9 : 1,
            transform: [{ rotate: rotation }],
          },
        ]}
      >
          {/* Flip Position Arrow (tap to toggle between left/bottom) */}
          <TouchableOpacity
            style={styles.flipButton}
            onPress={() =>
              onPositionChange(
                position === ToolbarPosition.MIDDLE_LEFT
                  ? ToolbarPosition.BOTTOM_CENTER
                  : ToolbarPosition.MIDDLE_LEFT
              )
            }
            accessibilityLabel="Flip toolbar position"
          >
            {/* Keep arrow upright even when toolbar is rotated */}
            <Text
              style={[
                styles.flipIcon,
                rotation === '-90deg' ? { transform: [{ rotate: '90deg' }] } : null,
              ]}
            >
              {position === ToolbarPosition.BOTTOM_CENTER ? '↖︎' : '↘︎'}
            </Text>
          </TouchableOpacity>

          {/* Color Picker */}
          <View style={styles.colorSection}>
            {colorOptions.map(([name, color]) => {
              const isSelected = selectedColor === color;
              return (
                <TouchableOpacity
                  key={name}
                  style={[
                    styles.colorButton,
                    { backgroundColor: color },
                    isSelected && styles.selectedColorBorder,
                  ]}
                  onPress={() => onColorSelect(color)}
                  accessibilityLabel={`Select ${name.toLowerCase()} color`}
                >
                  {isSelected && <View style={styles.selectedDot} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Tool Selection */}
          <View style={styles.toolSection}>
            <TouchableOpacity
              style={[
                styles.toolButton,
                selectedTool === DrawingTool.PEN && styles.selectedTool,
              ]}
              onPress={() => onToolSelect(DrawingTool.PEN)}
              accessibilityLabel="Select pen tool"
            >
              <Text style={styles.toolIcon}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toolButton,
                selectedTool === DrawingTool.ERASER && styles.selectedTool,
              ]}
              onPress={() => onToolSelect(DrawingTool.ERASER)}
              accessibilityLabel="Select eraser tool"
            >
              <Text style={styles.toolIcon}>⌫</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Undo Controls */}
          <View style={styles.toolSection}>
            <TouchableOpacity
              disabled={!canUndo}
              style={[styles.toolButton, !canUndo && styles.disabledButton]}
              onPress={onUndoStroke}
              accessibilityLabel="Undo last stroke"
            >
              <Text style={[styles.toolIcon, styles.strongIcon]}>↶</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!canUndo}
              style={[styles.toolButton, !canUndo && styles.disabledButton]}
              onPress={onUndoLine}
              accessibilityLabel="Undo last line"
            >
              <Text style={[styles.toolIcon, styles.strongIcon]}>⤺</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Line Guides Toggle */}
          <TouchableOpacity
            style={[
              styles.toolButton,
              showLineGuides && styles.selectedTool,
            ]}
            onPress={onToggleLineGuides}
            accessibilityLabel={`${showLineGuides ? 'Hide' : 'Show'} line guides`}
          >
            <Text style={styles.toolIcon}>📏</Text>
          </TouchableOpacity>

          {/* Audio Toggle (if callback provided) */}
          {onToggleAudio && (
            <>
              {/* Divider */}
              <View style={styles.divider} />
              
              <TouchableOpacity
                style={[
                  styles.toolButton,
                  audioEnabled && styles.selectedTool,
                ]}
                onPress={onToggleAudio}
                accessibilityLabel={`${audioEnabled ? 'Disable' : 'Enable'} audio hints`}
              >
                <Text style={styles.toolIcon}>{audioEnabled ? '🔊' : '🔇'}</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="Hide toolbar"
          >
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  toolbar: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 32,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    zIndex: 1000,
  },
  flipButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  flipIcon: {
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
  },
  colorSection: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  colorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorBorder: {
    borderColor: '#000',
    borderWidth: 2.5,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginHorizontal: 12,
  },
  toolSection: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  toolButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedTool: {
    backgroundColor: '#5856D6',
  },
  toolIcon: {
    fontSize: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.4,
  },
  strongIcon: {
    fontSize: 24,
    fontWeight: '800',
  },
});
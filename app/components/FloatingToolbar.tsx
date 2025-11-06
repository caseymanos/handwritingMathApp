/**
 * FloatingToolbar Component
 *
 * Draggable toolbar with color picker and tool selection
 * Snaps to 9 positions: top/middle/bottom x left/center/right
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  useWindowDimensions,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import {
  DrawingTool,
  CANVAS_COLORS,
  CanvasColor,
  ToolbarPosition,
} from '../types/Canvas';

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
}

/**
 * Calculate snap position based on drag coordinates
 */
const calculateSnapPosition = (
  x: number,
  y: number,
  screenWidth: number,
  screenHeight: number
): ToolbarPosition => {
  const horizontalThird = screenWidth / 3;
  const verticalThird = screenHeight / 3;

  let horizontal: 'left' | 'center' | 'right';
  let vertical: 'top' | 'middle' | 'bottom';

  // Determine horizontal position
  if (x < horizontalThird) {
    horizontal = 'left';
  } else if (x < horizontalThird * 2) {
    horizontal = 'center';
  } else {
    horizontal = 'right';
  }

  // Determine vertical position
  if (y < verticalThird) {
    vertical = 'top';
  } else if (y < verticalThird * 2) {
    vertical = 'middle';
  } else {
    vertical = 'bottom';
  }

  // Combine to form position enum
  const positionKey = `${vertical.toUpperCase()}_${horizontal.toUpperCase()}`;
  return ToolbarPosition[positionKey as keyof typeof ToolbarPosition];
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
): { x: number; y: number } => {
  const padding = 20;

  switch (position) {
    case ToolbarPosition.TOP_LEFT:
      return { x: padding, y: padding };
    case ToolbarPosition.TOP_CENTER:
      return { x: (screenWidth - toolbarWidth) / 2, y: padding };
    case ToolbarPosition.TOP_RIGHT:
      return { x: screenWidth - toolbarWidth - padding, y: padding };
    case ToolbarPosition.MIDDLE_LEFT:
      return { x: padding, y: (screenHeight - toolbarHeight) / 2 };
    case ToolbarPosition.MIDDLE_CENTER:
      return { x: (screenWidth - toolbarWidth) / 2, y: (screenHeight - toolbarHeight) / 2 };
    case ToolbarPosition.MIDDLE_RIGHT:
      return { x: screenWidth - toolbarWidth - padding, y: (screenHeight - toolbarHeight) / 2 };
    case ToolbarPosition.BOTTOM_LEFT:
      return { x: padding, y: screenHeight - toolbarHeight - padding };
    case ToolbarPosition.BOTTOM_CENTER:
      return { x: (screenWidth - toolbarWidth) / 2, y: screenHeight - toolbarHeight - padding };
    case ToolbarPosition.BOTTOM_RIGHT:
      return { x: screenWidth - toolbarWidth - padding, y: screenHeight - toolbarHeight - padding };
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
}) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Responsive dimensions based on screen size
  const isTablet = screenWidth >= 768;
  const toolbarWidth = isTablet ? 80 : 60;
  const toolbarHeight = isTablet ? 400 : 200;

  const absolutePosition = getAbsolutePosition(position, screenWidth, screenHeight, toolbarWidth, toolbarHeight);
  const currentX = absolutePosition.x + dragOffset.x;
  const currentY = absolutePosition.y + dragOffset.y;

  const panGesture = Gesture.Pan()
    .onStart(() => {
      setIsDragging(true);
    })
    .onUpdate((event) => {
      setDragOffset({
        x: event.translationX,
        y: event.translationY,
      });
    })
    .onEnd((event) => {
      // Calculate final position
      const finalX = absolutePosition.x + event.translationX;
      const finalY = absolutePosition.y + event.translationY;

      // Determine snap position
      const newPosition = calculateSnapPosition(finalX, finalY, screenWidth, screenHeight);
      onPositionChange(newPosition);

      // Reset drag offset
      setDragOffset({ x: 0, y: 0 });
      setIsDragging(false);
    });

  const colorOptions = Object.entries(CANVAS_COLORS);

  // Responsive button sizes
  const buttonSize = isTablet ? 50 : 36;
  const iconSize = isTablet ? 24 : 18;
  const padding = isTablet ? 12 : 8;

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <GestureDetector gesture={panGesture}>
        <View
          style={[
            styles.toolbar,
            {
              left: currentX,
              top: currentY,
              opacity: isDragging ? 0.8 : 1,
              width: toolbarWidth,
              padding: padding,
            },
          ]}
        >
          {/* Header with drag handle and close button */}
          <View style={styles.header}>
            <View style={styles.dragHandle}>
              <View style={styles.dragIndicator} />
              <View style={styles.dragIndicator} />
              <View style={styles.dragIndicator} />
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel="Hide toolbar"
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Color Picker */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: isTablet ? 12 : 10 }]}>Colors</Text>
            {colorOptions.map(([name, color]) => {
              const isSelected = selectedColor === color;
              return (
                <TouchableOpacity
                  key={name}
                  style={[
                    styles.colorButton,
                    {
                      backgroundColor: color,
                      width: buttonSize,
                      height: buttonSize,
                      borderRadius: buttonSize / 2,
                    },
                    isSelected && styles.selectedBorder,
                  ]}
                  onPress={() => onColorSelect(color)}
                  accessibilityLabel={`Select ${name.toLowerCase()} color`}
                >
                  {isSelected && <View style={[styles.selectedDot, { width: buttonSize / 4, height: buttonSize / 4, borderRadius: buttonSize / 8 }]} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tool Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: isTablet ? 12 : 10 }]}>Tools</Text>
            <TouchableOpacity
              style={[
                styles.toolButton,
                {
                  width: buttonSize,
                  height: buttonSize,
                },
                selectedTool === DrawingTool.PEN && styles.selectedTool,
              ]}
              onPress={() => onToolSelect(DrawingTool.PEN)}
              accessibilityLabel="Select pen tool"
            >
              <Text style={[styles.toolIcon, { fontSize: iconSize }]}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toolButton,
                {
                  width: buttonSize,
                  height: buttonSize,
                },
                selectedTool === DrawingTool.ERASER && styles.selectedTool,
              ]}
              onPress={() => onToolSelect(DrawingTool.ERASER)}
              accessibilityLabel="Select eraser tool"
            >
              <Text style={[styles.toolIcon, { fontSize: iconSize }]}>⌫</Text>
            </TouchableOpacity>
          </View>

          {/* Line Guides Toggle */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.toolButton,
                {
                  width: buttonSize,
                  height: buttonSize,
                },
                showLineGuides && styles.selectedTool,
              ]}
              onPress={onToggleLineGuides}
              accessibilityLabel={`${showLineGuides ? 'Hide' : 'Show'} line guides`}
            >
              <Text style={[styles.toolIcon, { fontSize: iconSize }]}>📏</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  toolbar: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dragHandle: {
    flexDirection: 'column',
    gap: 2,
  },
  dragIndicator: {
    width: 20,
    height: 3,
    backgroundColor: '#CCC',
    borderRadius: 2,
  },
  closeButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 18,
    color: '#666',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  colorButton: {
    marginVertical: 6,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedBorder: {
    borderColor: '#0066CC',
    borderWidth: 3,
  },
  selectedDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  toolButton: {
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 6,
    alignSelf: 'center',
  },
  selectedTool: {
    backgroundColor: '#0066CC',
  },
  toolIcon: {
    // fontSize set dynamically based on device size
  },
});

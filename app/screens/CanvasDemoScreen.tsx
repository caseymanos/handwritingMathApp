/**
 * CanvasDemoScreen
 *
 * Full-screen tablet-optimized canvas with floating toolbar
 * Supports portrait and landscape orientations
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HandwritingCanvas } from '../components/HandwritingCanvas';
import { FloatingToolbar } from '../components/FloatingToolbar';
import { ToggleButton } from '../components/ToggleButton';
import { WelcomeModal } from '../components/WelcomeModal';
import {
  DrawingTool,
  CANVAS_COLORS,
  CanvasColor,
  Stroke,
  ToolbarPosition,
} from '../types/Canvas';

const WELCOME_MODAL_KEY = '@handwriting_math:welcome_shown';

export const CanvasDemoScreen: React.FC = () => {
  const [selectedColor, setSelectedColor] = useState<CanvasColor>(
    CANVAS_COLORS.BLACK,
  );
  const [selectedTool, setSelectedTool] = useState<DrawingTool>(
    DrawingTool.PEN,
  );
  const [showLineGuides, setShowLineGuides] = useState(true);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [toolbarPosition, setToolbarPosition] = useState<ToolbarPosition>(
    ToolbarPosition.MIDDLE_LEFT,
  );
  const [showWelcome, setShowWelcome] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);

  // Check if welcome modal should be shown (first launch only)
  useEffect(() => {
    const checkWelcomeStatus = async () => {
      try {
        const hasShown = await AsyncStorage.getItem(WELCOME_MODAL_KEY);
        if (!hasShown) {
          setShowWelcome(true);
        }
      } catch (error) {
        console.error('Error checking welcome status:', error);
        // Show welcome by default if there's an error
        setShowWelcome(true);
      }
    };

    checkWelcomeStatus();
  }, []);

  const handleWelcomeDismiss = async () => {
    try {
      await AsyncStorage.setItem(WELCOME_MODAL_KEY, 'true');
      setShowWelcome(false);
    } catch (error) {
      console.error('Error saving welcome status:', error);
      setShowWelcome(false);
    }
  };

  const handleStrokeComplete = (stroke: Stroke) => {
    setStrokeCount(prev => prev + 1);
    console.log('Stroke completed:', {
      id: stroke.id,
      pointCount: stroke.points.length,
      color: stroke.color,
    });
  };

  const handleStrokesChange = (strokes: Stroke[]) => {
    console.log('Total strokes:', strokes.length);
  };

  const handleColorSelect = (color: CanvasColor) => {
    setSelectedColor(color);
    setSelectedTool(DrawingTool.PEN);
  };

  const handleToolSelect = (tool: DrawingTool) => {
    setSelectedTool(tool);
  };

  const handleToggleLineGuides = () => {
    setShowLineGuides(prev => !prev);
  };

  const handleToggleToolbar = () => {
    setIsToolbarVisible(prev => !prev);
  };

  const handleToolbarPositionChange = (position: ToolbarPosition) => {
    setToolbarPosition(position);
  };

  return (
    <View style={styles.container}>
      {/* Full-screen canvas */}
      <View style={styles.canvasWrapper}>
        <HandwritingCanvas
          selectedColor={selectedColor}
          selectedTool={selectedTool}
          showLineGuides={showLineGuides}
          onStrokeComplete={handleStrokeComplete}
          onStrokesChange={handleStrokesChange}
        />
      </View>

      {/* Floating toolbar (draggable) */}
      {isToolbarVisible && (
        <FloatingToolbar
          selectedColor={selectedColor}
          selectedTool={selectedTool}
          showLineGuides={showLineGuides}
          onColorSelect={handleColorSelect}
          onToolSelect={handleToolSelect}
          onToggleLineGuides={handleToggleLineGuides}
          onClose={handleToggleToolbar}
          position={toolbarPosition}
          onPositionChange={handleToolbarPositionChange}
        />
      )}

      {/* Toggle button (shows when toolbar is hidden) */}
      <ToggleButton
        isToolbarVisible={isToolbarVisible}
        toolbarPosition={toolbarPosition}
        onPress={handleToggleToolbar}
      />

      {/* Welcome modal (first launch only) */}
      <WelcomeModal
        visible={showWelcome}
        onDismiss={handleWelcomeDismiss}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  canvasWrapper: {
    flex: 1,
  },
});

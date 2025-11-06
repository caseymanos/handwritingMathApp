/**
 * CanvasDemoScreen
 *
 * Full-screen tablet-optimized canvas with floating toolbar
 * Supports portrait and landscape orientations
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HandwritingCanvas } from '../components/HandwritingCanvas';
import { FloatingToolbar } from '../components/FloatingToolbar';
import { ToggleButton } from '../components/ToggleButton';
import { WelcomeModal } from '../components/WelcomeModal';
import { RecognitionIndicator } from '../components/RecognitionIndicator';
import { ManualInputFallback } from '../components/ManualInputFallback';
import {
  DrawingTool,
  CANVAS_COLORS,
  CanvasColor,
  Stroke,
  ToolbarPosition,
} from '../types/Canvas';
import { useCanvasStore } from '../stores/canvasStore';
import { RecognitionStatus, MyScriptEndpoint } from '../types/MyScript';
import { getMyScriptClient } from '../utils/myScriptClient';

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
  const [showManualInput, setShowManualInput] = useState(false);
  const [currentEndpoint, setCurrentEndpoint] = useState<MyScriptEndpoint>('batch');

  // Access canvas store for recognition state
  const { recognitionResult, recognitionStatus, setRecognitionResult, clearStrokes } = useCanvasStore();

  // Initialize endpoint from client on mount
  useEffect(() => {
    try {
      const client = getMyScriptClient();
      const config = client.getConfig();
      setCurrentEndpoint(config.endpoint);
    } catch (error) {
      console.error('Error getting MyScript client config:', error);
    }
  }, []);

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

  const handleRecognitionComplete = (latex?: string) => {
    if (latex) {
      console.log('Recognition completed:', latex);
    }
  };

  const handleManualInput = (input: string) => {
    console.log('Manual input:', input);
    // Create a manual recognition result
    setRecognitionResult({
      status: RecognitionStatus.SUCCESS,
      latex: input,
      timestamp: Date.now(),
      strokeIds: [],
    });
    setShowManualInput(false);
  };

  const handleToggleEndpoint = () => {
    try {
      const client = getMyScriptClient();
      const newEndpoint: MyScriptEndpoint = currentEndpoint === 'batch' ? 'recognize' : 'batch';
      client.setEndpoint(newEndpoint);
      setCurrentEndpoint(newEndpoint);
      console.log(`Switched to ${newEndpoint} endpoint`);
    } catch (error) {
      console.error('Error toggling endpoint:', error);
    }
  };

  const handleClearCanvas = () => {
    clearStrokes();
    setStrokeCount(0);
    console.log('Canvas cleared');
  };

  // Auto-show manual input fallback on recognition error
  useEffect(() => {
    if (recognitionStatus === RecognitionStatus.ERROR) {
      // Wait 2 seconds before showing manual input option
      const timer = setTimeout(() => {
        setShowManualInput(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [recognitionStatus]);

  return (
    <View style={styles.container}>
      {/* Full-screen canvas */}
      <View style={styles.canvasWrapper}>
        <HandwritingCanvas
          selectedColor={selectedColor}
          selectedTool={selectedTool}
          showLineGuides={showLineGuides}
          enableRecognition={true}
          onStrokeComplete={handleStrokeComplete}
          onStrokesChange={handleStrokesChange}
          onRecognitionComplete={handleRecognitionComplete}
        />
      </View>

      {/* Recognition indicator (shows status and results) */}
      <RecognitionIndicator
        top={20}
        showConfidence={true}
        showErrors={true}
      />

      {/* Control buttons container (below recognition banner) */}
      <View style={styles.controlsContainer}>
        {/* Clear Canvas button */}
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearCanvas}
          activeOpacity={0.7}
        >
          <Text style={styles.clearButtonText}>Clear Canvas</Text>
        </TouchableOpacity>

        {/* Endpoint toggle button */}
        <TouchableOpacity
          style={styles.endpointToggle}
          onPress={handleToggleEndpoint}
          activeOpacity={0.7}
        >
          <Text style={styles.endpointLabel}>Endpoint:</Text>
          <Text style={styles.endpointValue}>{currentEndpoint}</Text>
          <Text style={styles.endpointHint}>
            {currentEndpoint === 'batch' ? '(legacy)' : '(latest)'}
          </Text>
        </TouchableOpacity>
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

      {/* Manual input fallback (shows on recognition error) */}
      <ManualInputFallback
        visible={showManualInput}
        onSubmit={handleManualInput}
        onCancel={() => setShowManualInput(false)}
        initialValue={recognitionResult?.text || ''}
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
  controlsContainer: {
    position: 'absolute',
    top: 80, // Below the recognition banner
    right: 20,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  endpointToggle: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  endpointLabel: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  endpointValue: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '700',
  },
  endpointHint: {
    fontSize: 11,
    color: '#999999',
    fontStyle: 'italic',
  },
});

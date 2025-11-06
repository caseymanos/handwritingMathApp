/**
 * HandwritingCanvas Component
 *
 * High-performance canvas for handwriting input with stylus/touch support.
 * Uses Skia for GPU-accelerated rendering (120 FPS capable).
 */

import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  Canvas,
  Path,
  Skia,
  Group,
  Line,
  vec,
} from '@shopify/react-native-skia';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import {
  Stroke,
  StrokePoint,
  DrawingTool,
  CANVAS_COLORS,
  CanvasColor,
} from '../types/Canvas';
import { useStylus } from '../hooks/useStylus';
import { calculateStrokeWidth, getEraserWidth } from '../utils/pressureUtils';
import { useCanvasStore } from '../stores/canvasStore';
import { useRecognition } from '../hooks/useRecognition';

// Line guide configuration
const LINE_GUIDE_SPACING = 60; // pixels between horizontal guides
const LINE_GUIDE_COLOR = '#E0E0E0';

interface HandwritingCanvasProps {
  selectedColor?: CanvasColor;
  selectedTool?: DrawingTool;
  showLineGuides?: boolean;
  enableRecognition?: boolean;
  onStrokeComplete?: (stroke: Stroke) => void;
  onStrokesChange?: (strokes: Stroke[]) => void;
  onRecognitionComplete?: (latex?: string) => void;
}

/**
 * HandwritingCanvas - Main drawing canvas component
 */
export const HandwritingCanvas: React.FC<HandwritingCanvasProps> = ({
  selectedColor = CANVAS_COLORS.BLACK,
  selectedTool = DrawingTool.PEN,
  showLineGuides = true,
  enableRecognition = true,
  onStrokeComplete,
  onStrokesChange,
  onRecognitionComplete,
}) => {
  // Use Zustand store for state management
  const canvasStore = useCanvasStore();
  const { strokes, currentStroke, addStroke, setCurrentStroke } = canvasStore;

  // Initialize recognition hook
  const { startPauseDetection, cancelPauseDetection } = useRecognition({
    enabled: enableRecognition,
    onRecognitionComplete,
  });

  const { processTouchEvent } = useStylus();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Generate line guides for the canvas (dynamic based on screen height)
  const lineGuides = useMemo(() => {
    if (!showLineGuides) return [];

    const guides = [];
    for (let y = LINE_GUIDE_SPACING; y < screenHeight; y += LINE_GUIDE_SPACING) {
      guides.push(y);
    }
    return guides;
  }, [showLineGuides, screenHeight]);

  /**
   * Handle start of drawing gesture
   */
  const handlePanStart = useCallback(
    (event: any) => {
      // Cancel any pending recognition when starting a new stroke
      cancelPauseDetection();

      const { deviceType, pressure } = processTouchEvent(event);

      const point: StrokePoint = {
        x: event.x,
        y: event.y,
        pressure,
        timestamp: Date.now(),
      };

      const strokeWidth =
        selectedTool === DrawingTool.ERASER
          ? getEraserWidth(deviceType)
          : calculateStrokeWidth(pressure, deviceType);

      const newStroke: Stroke = {
        id: `stroke-${Date.now()}-${Math.random()}`,
        points: [point],
        color: selectedTool === DrawingTool.ERASER ? '#FFFFFF' : selectedColor,
        strokeWidth,
        timestamp: Date.now(),
      };

      setCurrentStroke(newStroke);
    },
    [processTouchEvent, selectedColor, selectedTool, cancelPauseDetection, setCurrentStroke],
  );

  /**
   * Handle continuation of drawing gesture
   */
  const handlePanUpdate = useCallback(
    (event: any) => {
      if (!currentStroke) return;

      const { deviceType, pressure } = processTouchEvent(event);

      const point: StrokePoint = {
        x: event.x,
        y: event.y,
        pressure,
        timestamp: Date.now(),
      };

      // Update stroke width based on current pressure
      const strokeWidth =
        selectedTool === DrawingTool.ERASER
          ? getEraserWidth(deviceType)
          : calculateStrokeWidth(pressure, deviceType);

      setCurrentStroke({
        ...currentStroke,
        points: [...currentStroke.points, point],
        strokeWidth, // Update with latest pressure
      });
    },
    [currentStroke, processTouchEvent, selectedTool],
  );

  /**
   * Handle end of drawing gesture
   */
  const handlePanEnd = useCallback(() => {
    if (!currentStroke) return;

    // Add completed stroke to store
    addStroke(currentStroke);
    setCurrentStroke(null);

    // Notify parent components
    onStrokeComplete?.(currentStroke);
    onStrokesChange?.([...strokes, currentStroke]);

    // Start pause detection for recognition
    if (enableRecognition) {
      startPauseDetection();
    }
  }, [
    currentStroke,
    strokes,
    addStroke,
    setCurrentStroke,
    onStrokeComplete,
    onStrokesChange,
    enableRecognition,
    startPauseDetection,
  ]);

  /**
   * Pan gesture configuration
   */
  const panGesture = Gesture.Pan()
    .onStart(handlePanStart)
    .onUpdate(handlePanUpdate)
    .onEnd(handlePanEnd)
    .minDistance(0); // Respond immediately

  /**
   * Convert stroke to Skia path
   */
  const createPathFromStroke = useCallback((stroke: Stroke) => {
    if (stroke.points.length === 0) return null;

    const path = Skia.Path.Make();
    const firstPoint = stroke.points[0];

    path.moveTo(firstPoint.x, firstPoint.y);

    // Use quadratic curves for smooth lines
    for (let i = 1; i < stroke.points.length; i++) {
      const currentPoint = stroke.points[i];
      const previousPoint = stroke.points[i - 1];

      // Calculate control point (midpoint between current and previous)
      const controlX = (previousPoint.x + currentPoint.x) / 2;
      const controlY = (previousPoint.y + currentPoint.y) / 2;

      path.quadTo(previousPoint.x, previousPoint.y, controlX, controlY);
    }

    // Draw to the last point
    if (stroke.points.length > 1) {
      const lastPoint = stroke.points[stroke.points.length - 1];
      path.lineTo(lastPoint.x, lastPoint.y);
    }

    return path;
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.canvasContainer}>
        <GestureDetector gesture={panGesture}>
          <Canvas style={styles.canvas}>
            {/* Line guides */}
            {showLineGuides &&
              lineGuides.map((y, index) => (
                <Line
                  key={`guide-${index}`}
                  p1={vec(0, y)}
                  p2={vec(screenWidth, y)}
                  color={LINE_GUIDE_COLOR}
                  style="stroke"
                  strokeWidth={1}
                />
              ))}

            {/* Render completed strokes */}
            <Group>
              {strokes.map(stroke => {
                const path = createPathFromStroke(stroke);
                if (!path) return null;

                return (
                  <Path
                    key={stroke.id}
                    path={path}
                    color={stroke.color}
                    style="stroke"
                    strokeWidth={stroke.strokeWidth}
                    strokeCap="round"
                    strokeJoin="round"
                  />
                );
              })}
            </Group>

            {/* Render current stroke being drawn */}
            {currentStroke && (() => {
              const path = createPathFromStroke(currentStroke);
              if (!path) return null;

              return (
                <Path
                  path={path}
                  color={currentStroke.color}
                  style="stroke"
                  strokeWidth={currentStroke.strokeWidth}
                  strokeCap="round"
                  strokeJoin="round"
                />
              );
            })()}
          </Canvas>
        </GestureDetector>

        {/* Accessibility label for canvas */}
        <View
          accessible={true}
          accessibilityLabel="Handwriting canvas for drawing math solutions"
          accessibilityRole="none"
        />
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  canvas: {
    flex: 1,
  },
});

/**
 * HandwritingCanvas Component
 *
 * High-performance canvas for handwriting input with stylus/touch support.
 * Uses Skia for GPU-accelerated rendering (120 FPS capable).
 */

import React, { useCallback, useMemo, useReducer, useRef, useState, useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { StyleSheet, View, useWindowDimensions, AppState } from 'react-native';
import { Canvas, Path, Skia, Group, Line, vec } from '@shopify/react-native-skia';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import {
  Stroke,
  StrokePoint,
  DrawingTool,
  CANVAS_COLORS,
  CanvasColor,
} from '../types/Canvas';
import { LiveStroke } from '../types/Collaboration';
import { useStylus } from '../hooks/useStylus';
import { calculateStrokeWidth, getEraserWidth } from '../utils/pressureUtils';
import { useCanvasStore } from '../stores/canvasStore';
import { useRecognition } from '../hooks/useRecognition';
import { Colors } from '../styles';
import { genId } from '../utils/id';

// Line guide configuration (must stay in sync with lineDetectionUtils)
const LINE_GUIDE_SPACING = 60; // pixels between horizontal guides
const TOP_OFFSET = 150; // space at top for problem header
const LINE_GUIDE_COLOR = '#999999'; // Medium gray for better visibility

interface HandwritingCanvasProps {
  selectedColor?: CanvasColor;
  selectedTool?: DrawingTool;
  showLineGuides?: boolean;
  enableRecognition?: boolean;
  peerStrokes?: LiveStroke[]; // Strokes from collaborating peer
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
  peerStrokes = [],
  onStrokeComplete,
  onStrokesChange,
  onRecognitionComplete,
}) => {
  // Use Zustand store with proper selectors to avoid unnecessary re-renders
  const strokes = useCanvasStore(state => state.strokes);
  const addStroke = useCanvasStore(state => state.addStroke);
  const setCurrentStroke = useCanvasStore(state => state.setCurrentStroke);

  // Use local ref for active drawing stroke to avoid re-renders during pan gestures
  // This is the KEY optimization: no state updates = no re-renders during drawing
  const currentStrokeRef = useRef<Stroke | null>(null);

  // Use useReducer for stable forced re-renders (more stable than useState for this pattern)
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  // Initialize recognition hook
  const { startPauseDetection, cancelPauseDetection } = useRecognition({
    enabled: enableRecognition,
    onRecognitionComplete,
  });

  const { processTouchEvent } = useStylus();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [canvasKey, setCanvasKey] = useState(0);
  const isFocused = useIsFocused?.() ?? true;

  // Force remount of Skia Canvas when app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setCanvasKey((k) => k + 1);
      }
    });
    return () => sub.remove();
  }, []);

  // Also bump key when screen regains focus (e.g., after redbox or nav)
  useEffect(() => {
    if (isFocused) {
      setCanvasKey((k) => k + 1);
    }
  }, [isFocused]);

  // Generate line guides for the canvas (dynamic based on screen height)
  const lineGuides = useMemo(() => {
    if (!showLineGuides) return [];

    const guides = [];
    for (let y = TOP_OFFSET; y < screenHeight; y += LINE_GUIDE_SPACING) {
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
        id: genId(),
        points: [point],
        color: selectedTool === DrawingTool.ERASER ? '#FFFFFF' : selectedColor,
        strokeWidth: Math.max(strokeWidth, 5), // Force minimum 5px width
        timestamp: Date.now(),
      };

      console.log('[HandwritingCanvas] Starting new stroke:', newStroke.id, 'color:', newStroke.color, 'width:', newStroke.strokeWidth);

      // Store in local ref instead of Zustand state
      currentStrokeRef.current = newStroke;
      forceUpdate();
    },
    [processTouchEvent, selectedColor, selectedTool, cancelPauseDetection, forceUpdate],
  );

  /**
   * Handle continuation of drawing gesture
   * Optimized: push to array instead of spreading for better performance
   */
  const handlePanUpdate = useCallback(
    (event: any) => {
      const current = currentStrokeRef.current;
      if (!current) return;

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

      // Mutate the ref directly - no state updates, no re-renders!
      current.points.push(point);
      current.strokeWidth = strokeWidth;

      // Trigger minimal Skia update without full component re-render
      forceUpdate();
    },
    [processTouchEvent, selectedTool, forceUpdate],
  );

  /**
   * Handle end of drawing gesture
   */
  const handlePanEnd = useCallback(() => {
    const completedStroke = currentStrokeRef.current;
    if (!completedStroke) return;

    console.log('[HandwritingCanvas] Completing stroke:', completedStroke.id, 'points:', completedStroke.points.length, 'color:', completedStroke.color);

    // Add completed stroke to Zustand store (only happens once per stroke)
    addStroke(completedStroke);
    console.log('[HandwritingCanvas] Stroke added to store, total strokes now:', strokes.length + 1);
    setCurrentStroke(null);

    // Clear local ref
    currentStrokeRef.current = null;

    // Notify parent components
    onStrokeComplete?.(completedStroke);
    onStrokesChange?.([...strokes, completedStroke]);

    // Start pause detection for recognition
    if (enableRecognition) {
      startPauseDetection();
    }
  }, [
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
    .runOnJS(true) // Explicitly run callbacks on JS thread
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
    <View style={styles.container}>
      <View style={styles.canvasContainer}>
        <GestureDetector gesture={panGesture}>
          <View style={styles.gestureArea} collapsable={false}>
            <Canvas key={canvasKey} style={[styles.canvas, { width: screenWidth, height: screenHeight }]}>
            {/* Line guides */}
            {showLineGuides &&
              lineGuides.map((y, index) => (
                <Line
                  key={`guide-${index}`}
                  p1={vec(0, y)}
                  p2={vec(screenWidth, y)}
                  color={LINE_GUIDE_COLOR}
                  style="stroke"
                  strokeWidth={2}
                  opacity={0.9}
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
                    strokeWidth={Math.max(stroke.strokeWidth, 3)}
                    strokeCap="round"
                    strokeJoin="round"
                    opacity={1}
                  />
                );
              })}
            </Group>

            {/* Render peer strokes (from collaborating teacher/student) */}
            <Group>
              {peerStrokes.map(liveStroke => {
                const stroke = liveStroke.strokeData;
                const path = createPathFromStroke(stroke);
                if (!path) return null;

                return (
                  <Path
                    key={liveStroke.id}
                    path={path}
                    color={liveStroke.color}
                    style="stroke"
                    strokeWidth={Math.max(liveStroke.strokeWidth, 3)}
                    strokeCap="round"
                    strokeJoin="round"
                    opacity={liveStroke.isAnnotation ? 0.8 : 0.6} // Teacher annotations slightly more visible
                  />
                );
              })}
            </Group>

            {/* Render current stroke being drawn - using ref */}
            {currentStrokeRef.current && (() => {
              const stroke = currentStrokeRef.current;
              if (!stroke) return null;

              const path = createPathFromStroke(stroke);
              if (!path) return null;

              return (
                <Path
                  path={path}
                  color={stroke.color}
                  style="stroke"
                  strokeWidth={Math.max(stroke.strokeWidth, 3)}
                  strokeCap="round"
                  strokeJoin="round"
                  opacity={1}
                />
              );
            })()}
            </Canvas>
          </View>
        </GestureDetector>

        {/* Accessibility label for canvas */}
        <View
          accessible={true}
          accessibilityLabel="Handwriting canvas for drawing math solutions"
          accessibilityRole="none"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#FFFFFF', // Force white background
  },
  gestureArea: {
    flex: 1,
  },
  canvas: {
    backgroundColor: '#FFFFFF', // Force white background on canvas too
    zIndex: 0,
  },
});

/**
 * CanvasDemoScreen
 *
 * Full-screen tablet-optimized canvas with floating toolbar
 * Supports portrait and landscape orientations
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HandwritingCanvas } from '../components/HandwritingCanvas';
import { FloatingToolbar } from '../components/FloatingToolbar';
import { ToggleButton } from '../components/ToggleButton';
import { WelcomeModal } from '../components/WelcomeModal';
import { RecognitionIndicator } from '../components/RecognitionIndicator';
import { ManualInputFallback } from '../components/ManualInputFallback';
import { ProblemDisplay } from '../components/ProblemDisplay';
import { ValidationFeedback } from '../components/ValidationFeedback';
import { AppHeader } from '../components/AppHeader';
import {
  DrawingTool,
  CANVAS_COLORS,
  CanvasColor,
  Stroke,
  ToolbarPosition,
} from '../types/Canvas';
import { Problem, ProblemDifficulty } from '../types/Problem';
import { useCanvasStore } from '../stores/canvasStore';
import { useValidationStore } from '../stores/validationStore';
import { RecognitionStatus, MyScriptEndpoint } from '../types/MyScript';
import { getMyScriptClient } from '../utils/myScriptClient';
import { getRandomProblem, getNextProblem } from '../utils/problemData';
import { getNextStepHint } from '../utils/mathValidation';

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
  const [currentEndpoint, setCurrentEndpoint] = useState<MyScriptEndpoint>('recognize');
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);

  // Access canvas store for recognition state
  const { recognitionResult, recognitionStatus, setRecognitionResult, clearStrokes } = useCanvasStore();

  // Access validation store
  const {
    validateStep,
    setCurrentProblem: setValidationProblem,
    setCurrentStepNumber,
    addPreviousStep,
    currentStepNumber,
    requestHint,
    getNextHintLevel,
  } = useValidationStore();

  // Track hint state locally for display
  const currentHint = useValidationStore(state => state.currentHint);
  const hintLevel = useValidationStore(state => state.hintLevel);

  // Initialize with a random easy problem
  useEffect(() => {
    const initialProblem = getRandomProblem(ProblemDifficulty.EASY);
    setCurrentProblem(initialProblem);
    console.log('Initial problem loaded:', initialProblem.id);
  }, []);

  // Initialize validation store when problem changes
  useEffect(() => {
    if (currentProblem) {
      setValidationProblem(currentProblem.id);
      console.log('[CanvasDemoScreen] Validation store initialized for problem:', currentProblem.id);
    }
  }, [currentProblem, setValidationProblem]);

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

  const handleValidateStep = async () => {
    if (!recognitionResult?.latex || !currentProblem) {
      console.warn('[CanvasDemoScreen] Cannot validate: no recognition result or problem');
      return;
    }

    try {
      console.log('[CanvasDemoScreen] Validating step:', currentStepNumber, recognitionResult.latex);

      const validationResult = await validateStep({
        problemId: currentProblem.id,
        studentStep: recognitionResult.latex,
        stepNumber: currentStepNumber,
        previousSteps: [],
        problemStatement: currentProblem.latex,
      });

      console.log('[CanvasDemoScreen] Validation result:', validationResult);

      // If correct, add to previous steps and increment step number
      if (validationResult.isCorrect && validationResult.isUseful) {
        addPreviousStep(recognitionResult.latex);
        setCurrentStepNumber(currentStepNumber + 1);
        console.log('[CanvasDemoScreen] Step validated successfully, moving to step:', currentStepNumber + 1);
      }
    } catch (error) {
      console.error('[CanvasDemoScreen] Validation failed:', error);
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

  const handleNextProblem = () => {
    if (currentProblem) {
      const nextProblem = getNextProblem(currentProblem.id);
      if (nextProblem) {
        setCurrentProblem(nextProblem);
        handleClearCanvas(); // Clear canvas for new problem
        console.log('Next problem loaded:', nextProblem.id);
      } else {
        console.log('No more problems, looping back to first problem');
        // Loop back to first easy problem
        const firstProblem = getRandomProblem(ProblemDifficulty.EASY);
        setCurrentProblem(firstProblem);
        handleClearCanvas();
      }
    }
  };

  const handleRequestHint = () => {
    if (!currentProblem) {
      console.warn('[CanvasDemoScreen] Cannot request hint: no current problem');
      return;
    }

    console.log('[CanvasDemoScreen] Requesting hint');

    // Get next hint level from store
    const nextLevel = getNextHintLevel();

    // Get the actual hint text
    const hint = getNextStepHint(currentProblem.id, currentStepNumber, nextLevel);

    // Update store with new hint and level
    useValidationStore.setState({
      currentHint: hint,
      hintLevel: nextLevel,
    });

    console.log('[CanvasDemoScreen] Hint requested:', nextLevel, hint);
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* App Header */}
        <AppHeader />

        {/* Problem Display - Fixed at top */}
        <ProblemDisplay
          problem={currentProblem}
          showDifficulty={true}
          showInstructions={true}
        />

      {/* Full-screen canvas (below problem) */}
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

      {/* Recognition indicator (top right corner) */}
      <RecognitionIndicator
        top={75}
        showConfidence={false}
        showErrors={true}
      />

      {/* Control buttons container (below recognition banner) */}
      <View style={styles.controlsContainer}>
        {/* Validate Step button */}
        <TouchableOpacity
          style={[
            styles.validateButton,
            !recognitionResult?.latex && styles.validateButtonDisabled,
          ]}
          onPress={handleValidateStep}
          activeOpacity={0.7}
          disabled={!recognitionResult?.latex}
        >
          <Text style={styles.validateButtonText}>
            Validate Step {currentStepNumber}
          </Text>
        </TouchableOpacity>

        {/* Next Problem button */}
        <TouchableOpacity
          style={styles.nextProblemButton}
          onPress={handleNextProblem}
          activeOpacity={0.7}
        >
          <Text style={styles.nextProblemText}>Next Problem</Text>
        </TouchableOpacity>

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
            {currentEndpoint === 'batch' ? '(legacy)' : '(standard)'}
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

      {/* Validation feedback (shows validation results) */}
      <ValidationFeedback
        bottom={120}
        showConfidence={false}
        showSuggestedSteps={true}
        onRequestHint={handleRequestHint}
      />

      {/* Manual input fallback (shows on recognition error) */}
      <ManualInputFallback
        visible={showManualInput}
        onSubmit={handleManualInput}
        onCancel={() => setShowManualInput(false)}
        initialValue={recognitionResult?.text || ''}
      />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7', // Light grey so we can see white elements
  },
  canvasWrapper: {
    flex: 1,
  },
  controlsContainer: {
    position: 'absolute',
    top: 180, // Below header + problem display + recognition banner
    right: 20,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  nextProblemButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  nextProblemText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
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
  validateButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  validateButtonDisabled: {
    backgroundColor: '#A8A8A8',
    opacity: 0.5,
  },
  validateButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

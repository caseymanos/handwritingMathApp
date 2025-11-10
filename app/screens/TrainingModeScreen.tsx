/**
 * TrainingModeScreen (formerly CanvasDemoScreen)
 *
 * Full-screen tablet-optimized canvas with floating toolbar
 * Supports portrait and landscape orientations
 * Accepts problemId via navigation route params
 */

import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TrainingModeScreenProps } from '../navigation/types';
import { HandwritingCanvas } from '../components/HandwritingCanvas';
import { FloatingToolbar } from '../components/FloatingToolbar';
import { ToggleButton } from '../components/ToggleButton';
import { WelcomeModal } from '../components/WelcomeModal';
import { RecognitionIndicator } from '../components/RecognitionIndicator';
import { ManualInputFallback } from '../components/ManualInputFallback';
import { ProblemDisplay } from '../components/ProblemDisplay';
import { ValidationFeedback } from '../components/ValidationFeedback';
import { AppHeader } from '../components/AppHeader';
import { StepResultDisplay, StepResult } from '../components/StepResultDisplay';
import { CollaborationModal } from '../components/CollaborationModal';
import { SessionControls } from '../components/SessionControls';
import { getLineNumberFromStrokes } from '../utils/lineDetectionUtils';
import SuccessAnimation from '../components/SuccessAnimation';
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
import { useHintStore } from '../stores/hintStore';
import { useProgressStore } from '../stores/progressStore';
import { useCollaborationStore, selectPeerStrokes, selectIsInSession, selectLiveStrokes, selectBroadcastStroke } from '../stores/collaborationStore';
import { useRealtimeCollaboration } from '../hooks/useRealtimeCollaboration';
import { getCurrentUser } from '../utils/sync/supabaseClient';
import { RecognitionStatus, MyScriptEndpoint } from '../types/MyScript';
import { getMyScriptClient } from '../utils/myScriptClient';
import { getRandomProblem, getNextProblem, getProblemById } from '../utils/problemData';
import { ValidationErrorType } from '../types/Validation';
import { Step } from '../types/Attempt';
import { genId } from '../utils/id';

const WELCOME_MODAL_KEY = '@handwriting_math:welcome_shown';

export const TrainingModeScreen: React.FC<TrainingModeScreenProps> = ({ navigation, route }) => {
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
  const [stepResults, setStepResults] = useState<StepResult[]>([]); // Track all step results
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showCollaborationModal, setShowCollaborationModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Use ref for timer to avoid stale closures and ensure proper cleanup
  const autoValidationTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Access canvas store for recognition state
  const { recognitionResult, recognitionStatus, setRecognitionResult, clearStrokes, clearRecognitionHistory, strokes, undoLastStroke, } = useCanvasStore();

  // Access validation store
  const {
    validateStep,
    setCurrentProblem: setValidationProblem,
    setCurrentStepNumber,
    addPreviousStep,
    currentStepNumber,
    currentValidation,
  } = useValidationStore();

  // Access hint store
  const {
    requestHint,
    clearHint,
    incrementIncorrectAttempts,
    resetIncorrectAttempts,
    shouldShowAutoHint,
    startInactivityTimer,
    stopInactivityTimer,
    escalateHint,
  } = useHintStore();

  // Access progress store
  const {
    startAttempt,
    endAttempt,
    addStepToAttempt,
    currentAttempt,
  } = useProgressStore();

  // Access collaboration store
  const isInSession = useCollaborationStore(selectIsInSession);
  const allLiveStrokes = useCollaborationStore(selectLiveStrokes);
  const peerStrokes = useMemo(
    () => allLiveStrokes.filter(stroke => stroke.authorId !== (currentUserId || '')),
    [allLiveStrokes, currentUserId]
  );
  const broadcastStroke = useCollaborationStore(selectBroadcastStroke);

  // Initialize realtime collaboration hook
  useRealtimeCollaboration();

  // Track step start time for attempt tracking
  const [stepStartTime, setStepStartTime] = useState<number | null>(null);

  // Initialize with problem from route params or random easy problem
  useEffect(() => {
    const problemId = route.params?.problemId;
    if (problemId) {
      const problem = getProblemById(problemId);
      if (problem) {
        setCurrentProblem(problem);
        console.log('Problem loaded from route params:', problem.id);
      } else {
        console.warn('Problem not found:', problemId, '- loading random problem');
        const initialProblem = getRandomProblem(ProblemDifficulty.EASY);
        setCurrentProblem(initialProblem);
      }
    } else {
      const initialProblem = getRandomProblem(ProblemDifficulty.EASY);
      setCurrentProblem(initialProblem);
      console.log('Initial problem loaded:', initialProblem.id);
    }
  }, [route.params?.problemId]);

  // Initialize validation store when problem changes
  useEffect(() => {
    if (currentProblem) {
      setValidationProblem(currentProblem.id);
      console.log('[TrainingModeScreen] Validation store initialized for problem:', currentProblem.id);

      // Start new attempt for this problem
      startAttempt(currentProblem.id);
      console.log('[TrainingModeScreen] Started new attempt for problem:', currentProblem.id);

      // Clear any active inactivity timer and hints when problem changes
      stopInactivityTimer();
      clearHint();
      resetIncorrectAttempts();

      // Clear auto-validation timer to prevent stale validations
      if (autoValidationTimerRef.current) {
        clearTimeout(autoValidationTimerRef.current);
        autoValidationTimerRef.current = null;
        console.log('[TrainingModeScreen] Cleared auto-validation timer for new problem');
      }

      // Clear step results for new problem
      setStepResults([]);
      console.log('[TrainingModeScreen] Cleared step results for new problem');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProblem]);

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

  // Get current user ID for collaboration
  useEffect(() => {
    getCurrentUser().then(user => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });
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

    // Broadcast stroke to collaborating peer if in session
    if (isInSession) {
      broadcastStroke(stroke);
    }

    // Don't cancel auto-validation timer - let it complete so validation always happens
    // This ensures users always get feedback on their work
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

  const handleManualCheck = () => {
    // Find the most recent unvalidated step
    const unvalidatedStep = stepResults.find(step => !step.isValidated);

    if (unvalidatedStep) {
      console.log('[TrainingModeScreen] Manual check triggered for line:', unvalidatedStep.lineNumber);
      // Cancel auto-validation timer if it exists
      if (autoValidationTimerRef.current) {
        clearTimeout(autoValidationTimerRef.current);
        autoValidationTimerRef.current = null;
        console.log('[TrainingModeScreen] Cancelled auto-validation timer for manual check');
      }
      // Validate immediately
      handleValidateStep(unvalidatedStep.lineNumber, unvalidatedStep.latex);
    } else {
      console.log('[TrainingModeScreen] No unvalidated steps to check');
    }
  };

  const handleToolbarPositionChange = (position: ToolbarPosition) => {
    setToolbarPosition(position);
  };

  const handleRecognitionComplete = (latex?: string) => {
    if (latex) {
      console.log('[TrainingModeScreen] Recognition completed:', latex);
      // Mark the start time for this step (when recognition completes)
      setStepStartTime(Date.now());

      // Calculate which line the strokes are on
      const lineNumber = getLineNumberFromStrokes(strokes);
      console.log('[TrainingModeScreen] Detected line number:', lineNumber, 'for', strokes.length, 'strokes');

      // Default to line 0 if null (strokes above canvas area)
      const displayLineNumber = lineNumber !== null ? lineNumber : 0;

      // Add unvalidated step result to display
      const newStepResult: StepResult = {
        lineNumber: displayLineNumber,
        latex,
        isValidated: false,
      };

      // Replace any existing result for this line, or add new
      setStepResults(prev => {
        const filtered = prev.filter(r => r.lineNumber !== displayLineNumber);
        return [...filtered, newStepResult];
      });

      // Clear any existing auto-validation timer
      if (autoValidationTimerRef.current) {
        clearTimeout(autoValidationTimerRef.current);
        autoValidationTimerRef.current = null;
      }

      // Start auto-validation countdown (500ms to ensure stroke detection is complete)
      // Increased from 150ms to 500ms to avoid race conditions
      autoValidationTimerRef.current = setTimeout(() => {
        console.log('[TrainingModeScreen] Auto-validation timer expired, validating step');
        handleValidateStep(displayLineNumber, latex);
        autoValidationTimerRef.current = null;
      }, 500);
    }
  };

  const handleValidateStep = async (lineNumber?: number, latex?: string) => {
    // Use provided values or fall back to recognition result
    const stepLatex = latex || recognitionResult?.latex;
    const stepLineNumber = lineNumber !== undefined ? lineNumber : (recognitionResult ? 0 : undefined);

    if (!stepLatex || !currentProblem || stepLineNumber === undefined) {
      console.warn('[TrainingModeScreen] Cannot validate: no recognition result or problem');
      return;
    }

    try {
      console.log('[TrainingModeScreen] Validating step:', currentStepNumber, stepLatex, '(fixed null ref)');

      // Clear any active inactivity timer when validating
      stopInactivityTimer();

      const validationResult = await validateStep({
        problemId: currentProblem.id,
        studentStep: stepLatex,
        stepNumber: currentStepNumber,
        previousSteps: [],
        problemStatement: currentProblem.latex,
      });

      console.log('[TrainingModeScreen] Validation result:', validationResult);

      // Update step result with validation status
      setStepResults(prev => {
        const updated = prev.map(result => {
          if (result.lineNumber === stepLineNumber && !result.isValidated) {
            return {
              ...result,
              isValidated: true,
              isCorrect: validationResult.isCorrect,
              isUseful: validationResult.isUseful,
            };
          }
          return result;
        });
        return updated;
      });

      // Create Step object and add to attempt (regardless of validation result)
      if (stepStartTime) {
        const stepData: Step = {
          id: genId(),
          strokeData: [...strokes], // Deep copy strokes
          recognizedText: recognitionResult?.text || stepLatex,
          latex: stepLatex,
          color: selectedColor,
          validation: validationResult,
          startTime: stepStartTime,
          endTime: Date.now(),
          manualInput: false,
          recognitionConfidence: recognitionResult?.confidence,
        };

        addStepToAttempt(stepData);
        console.log('[TrainingModeScreen] Step added to attempt:', stepData.id);
      }

      // If correct and useful, reset error tracking and move to next step
      if (validationResult.isCorrect && validationResult.isUseful) {
        addPreviousStep(stepLatex);
        setCurrentStepNumber(currentStepNumber + 1);
        resetIncorrectAttempts();
        console.log('[TrainingModeScreen] Step validated successfully, moving to step:', currentStepNumber + 1);

        // Check if this is the final answer
        const isFinalAnswer = validationResult.isFinalAnswer;
        if (isFinalAnswer) {
          console.log('[TrainingModeScreen] Final answer reached, showing success animation');
          endAttempt(true);

          // Show success animation
          setShowSuccessAnimation(true);
        }
      } else if (!validationResult.isCorrect) {
        // Track incorrect attempt in hint store
        const errorType = validationResult.errorType as ValidationErrorType || ValidationErrorType.ARITHMETIC;
        incrementIncorrectAttempts(errorType);

        // Check if we should start inactivity timer (auto-hint after 2+ errors + 10s delay)
        if (shouldShowAutoHint()) {
          console.log('[TrainingModeScreen] Starting inactivity timer for auto-hint');
          // Start timer with callback to show hint
          startInactivityTimer(() => {
            console.log('[TrainingModeScreen] Inactivity timer expired, requesting hint');
            requestHint(
              errorType,
              currentProblem.category,
              currentStepNumber,
              recognitionResult?.latex
            );
          });
        }

        console.log('[TrainingModeScreen] Incorrect step, errorType:', errorType);
      }
    } catch (error) {
      console.error('[TrainingModeScreen] Validation failed:', error);
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
    // Clear any pending auto-validation timer
    if (autoValidationTimerRef.current) {
      clearTimeout(autoValidationTimerRef.current);
      autoValidationTimerRef.current = null;
      console.log('[TrainingModeScreen] Cleared auto-validation timer on canvas clear');
    }

    clearStrokes();
    clearRecognitionHistory(); // Clear recognition history to prevent memory growth
    setStrokeCount(0);
    setStepResults([]); // Clear all step results
    console.log('[TrainingModeScreen] Canvas cleared (including recognition history and step results)');
  };

  const handleBackToHome = () => {
    // End current attempt as incomplete before navigating away
    try {
      const state = useProgressStore.getState?.();
      if (state?.currentAttempt) {
        state.endAttempt(false);
      }
    } catch {}
    console.log('[TrainingModeScreen] Ended incomplete attempt, navigating to Home');

    // Clear recognition history before leaving to free memory
    clearRecognitionHistory();

    navigation.navigate('Home');
  };

  const handleNextProblem = () => {
    if (!currentProblem) return;

    // End current attempt as incomplete before loading next problem
    try {
      const state = useProgressStore.getState?.();
      if (state?.currentAttempt) {
        state.endAttempt(false);
      }
    } catch {}
    console.log('[TrainingModeScreen] Ended incomplete attempt, moving to next problem');

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
  };

  const handleSuccessAnimationComplete = () => {
    // Hide animation
    setShowSuccessAnimation(false);

    // Move to next problem
    handleNextProblem();
  };

  const handleRequestHint = () => {
    if (!currentProblem || !currentValidation) {
      console.warn('[TrainingModeScreen] Cannot request hint: no current problem or validation');
      return;
    }

    console.log('[TrainingModeScreen] Manually requesting hint (with escalation)');

    // Use the error type from the latest validation result
    const errorType = currentValidation.errorType as ValidationErrorType || ValidationErrorType.ARITHMETIC;

    // FIRST: Escalate to the next hint level (concept → direction → micro)
    escalateHint(errorType);
    console.log('[TrainingModeScreen] Escalated hint level for error type:', errorType);

    // THEN: Request hint from hint store with the new escalation level
    requestHint(
      errorType,
      currentProblem.category,
      currentStepNumber,
      recognitionResult?.latex
    );

    console.log('[TrainingModeScreen] Hint requested at escalated level for error type:', errorType);
  };

  // Manual input is now triggered by user tapping the error message
  // (removed automatic modal popup)

  // Cleanup: end incomplete attempt on component unmount
  useEffect(() => {
    return () => {
      // Read latest attempt state directly from store to avoid stale closure
      try {
        const state = useProgressStore.getState?.();
        const attempt = state?.currentAttempt;
        if (attempt) {
          console.log('[TrainingModeScreen] Component unmounting, ending incomplete attempt');
          state?.endAttempt(false);
        }
      } catch (e) {
        // noop
      }

      // Clear auto-validation timer on unmount
      if (autoValidationTimerRef.current) {
        clearTimeout(autoValidationTimerRef.current);
        autoValidationTimerRef.current = null;
        console.log('[TrainingModeScreen] Cleared auto-validation timer on unmount');
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* App Header */}
        <AppHeader />

      {/* Control buttons container (below header) */}
      <View style={styles.controlsContainer}>
        {/* Next Problem button */}
        <TouchableOpacity
          style={styles.nextProblemButton}
          onPress={handleNextProblem}
          activeOpacity={0.7}
        >
          <Text style={styles.nextProblemText}>Next Problem</Text>
        </TouchableOpacity>

        {/* Back to Home button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToHome}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>Home</Text>
        </TouchableOpacity>

        {/* Clear Canvas button */}
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearCanvas}
          activeOpacity={0.7}
        >
          <Text style={styles.clearButtonText}>Clear Canvas</Text>
        </TouchableOpacity>

        {/* Manual Check button (replaces Clear Cache) */}
        <TouchableOpacity
          style={[styles.clearButton, { backgroundColor: '#34C759' }]}
          onPress={handleManualCheck}
          activeOpacity={0.7}
        >
          <Text style={styles.clearButtonText}>Check Now</Text>
        </TouchableOpacity>

        {/* Show Toolbar button (only visible when toolbar is hidden) */}
        {!isToolbarVisible && (
          <TouchableOpacity
            style={[styles.clearButton, { backgroundColor: '#5856D6' }]}
            onPress={handleToggleToolbar}
            activeOpacity={0.7}
          >
            <Text style={styles.clearButtonText}>Show Toolbar</Text>
          </TouchableOpacity>
        )}

        {/* Collaborate button */}
        {!isInSession && (
          <TouchableOpacity
            style={[styles.clearButton, { backgroundColor: '#007AFF' }]}
            onPress={() => setShowCollaborationModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.clearButtonText}>Collaborate</Text>
          </TouchableOpacity>
        )}
      </View>

        {/* Problem Display - Between buttons and canvas */}
        <View style={styles.problemContainer}>
          <ProblemDisplay
            problem={currentProblem}
            showDifficulty={true}
            showInstructions={true}
          />
        </View>

      {/* Collaboration session controls (shown when in active session) */}
      {isInSession && (
        <View style={styles.sessionControlsContainer}>
          <SessionControls
            onLeaveSession={() => {
              console.log('[TrainingModeScreen] Left collaboration session');
            }}
          />
        </View>
      )}

      {/* Full-screen canvas (below problem) */}
      <View style={styles.canvasWrapper}>
        <HandwritingCanvas
          selectedColor={selectedColor}
          selectedTool={selectedTool}
          showLineGuides={showLineGuides}
          enableRecognition={true}
          peerStrokes={peerStrokes}
          onStrokeComplete={handleStrokeComplete}
          onStrokesChange={handleStrokesChange}
          onRecognitionComplete={handleRecognitionComplete}
        />

        {/* Step results display (on right side of each line) - limited to last 10 for performance */}
        {stepResults.slice(-10).map((stepResult, index) => (
          <StepResultDisplay key={`step-${stepResult.lineNumber}-${index}`} stepResult={stepResult} />
        ))}
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
          // Undo handlers
          onUndoStroke={() => undoLastStroke()}
          onUndoLine={() => {
            // Use store's new undoLastLine action via getState to avoid stale closure
            const store = useCanvasStore.getState();
            (store as any).undoLastLine?.();
          }}
          canUndo={strokes.length > 0}
        />
      )}

      {/* Welcome modal (first launch only) */}
      <WelcomeModal
        visible={showWelcome}
        onDismiss={handleWelcomeDismiss}
      />

      {/* Collaboration modal (for starting collaboration sessions) */}
      <CollaborationModal
        visible={showCollaborationModal}
        onClose={() => setShowCollaborationModal(false)}
        onSessionStarted={() => {
          setShowCollaborationModal(false);
        }}
      />

      {/* Validation feedback (shows validation results) */}
      <ValidationFeedback
        bottom={120}
        showConfidence={false}
        showSuggestedSteps={true}
        onRequestHint={handleRequestHint}
      />

      {/* Recognition error banner (tap to enter manually) */}
      {recognitionStatus === RecognitionStatus.ERROR && !showManualInput && (
        <TouchableOpacity
          style={styles.errorBanner}
          onPress={() => setShowManualInput(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.errorBannerText}>
            Recognition failed - Tap here to enter manually
          </Text>
        </TouchableOpacity>
      )}

      {/* Manual input fallback (shows on recognition error) */}
      <ManualInputFallback
        visible={showManualInput}
        onSubmit={handleManualInput}
        onCancel={() => setShowManualInput(false)}
        initialValue={recognitionResult?.text || ''}
      />

      {/* Success animation (shows when problem is completed) */}
      <SuccessAnimation
        visible={showSuccessAnimation}
        onComplete={handleSuccessAnimationComplete}
        duration={2500}
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
  problemContainer: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    zIndex: 10,
    pointerEvents: 'none', // Ensure touches go to canvas; UI is informational
  },
  controlsContainer: {
    position: 'absolute',
    top: 75,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    zIndex: 100,
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
  backButton: {
    backgroundColor: '#5856D6',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  backButtonText: {
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
  errorBanner: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    backgroundColor: '#FF9500',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  errorBannerText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  sessionControlsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F5F5F7',
  },
});

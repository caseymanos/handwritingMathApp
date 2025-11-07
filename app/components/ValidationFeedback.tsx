/**
 * Validation Feedback Component
 *
 * Displays validation results with animated visual feedback.
 * Shows correct/incorrect status, usefulness, and actionable feedback.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { ValidationStatus, ValidationErrorType } from '../types/Validation';
import { useValidationStore } from '../stores/validationStore';

/**
 * Props for ValidationFeedback
 */
interface ValidationFeedbackProps {
  /** Position from bottom of screen */
  bottom?: number;
  /** Whether to show confidence score */
  showConfidence?: boolean;
  /** Whether to show suggested steps */
  showSuggestedSteps?: boolean;
  /** Callback when requesting a hint */
  onRequestHint?: () => void;
}

/**
 * ValidationFeedback Component
 *
 * Displays validation results at the bottom of the screen
 */
export const ValidationFeedback: React.FC<ValidationFeedbackProps> = ({
  bottom = 120,
  showConfidence = false,
  showSuggestedSteps = true,
  onRequestHint,
}) => {
  // Select individual properties to avoid re-render issues
  const status = useValidationStore(state => state.status);
  const currentValidation = useValidationStore(state => state.currentValidation);
  const error = useValidationStore(state => state.error);
  const currentHint = useValidationStore(state => state.currentHint);
  const hintLevel = useValidationStore(state => state.hintLevel);

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  // Animate in/out when status changes
  React.useEffect(() => {
    if (status === ValidationStatus.VALIDATING || currentValidation || error) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [status, currentValidation, error]);

  // Don't render if no validation activity
  if (status === ValidationStatus.IDLE && !currentValidation && !error) {
    return null;
  }

  // Get status indicator emoji
  const getStatusEmoji = (): string => {
    if (status === ValidationStatus.VALIDATING) return '🔄';
    if (error) return '⚠️';
    if (!currentValidation) return '';

    if (currentValidation.isCorrect && currentValidation.isUseful) return '✅';
    if (currentValidation.isCorrect && !currentValidation.isUseful) return '⚠️';
    return '❌';
  };

  // Get status color
  const getStatusStyle = () => {
    if (status === ValidationStatus.VALIDATING) return styles.validating;
    if (error) return styles.error;
    if (!currentValidation) return styles.idle;

    if (currentValidation.isCorrect && currentValidation.isUseful) return styles.correct;
    if (currentValidation.isCorrect && !currentValidation.isUseful) return styles.notUseful;
    return styles.incorrect;
  };

  // Get status title
  const getStatusTitle = (): string => {
    if (status === ValidationStatus.VALIDATING) return 'Validating...';
    if (error) return 'Validation Error';
    if (!currentValidation) return '';

    if (currentValidation.isCorrect && currentValidation.isUseful) {
      return 'Correct & Useful!';
    }
    if (currentValidation.isCorrect && !currentValidation.isUseful) {
      return 'Correct but Not Useful';
    }
    return 'Incorrect Step';
  };

  // Get error type label
  const getErrorTypeLabel = (errorType: ValidationErrorType): string => {
    switch (errorType) {
      case ValidationErrorType.SYNTAX:
        return 'Syntax Error';
      case ValidationErrorType.ARITHMETIC:
        return 'Arithmetic Error';
      case ValidationErrorType.LOGIC:
        return 'Logic Error';
      case ValidationErrorType.METHOD:
        return 'Wrong Method';
      default:
        return 'Error';
    }
  };

  const renderContent = () => {
    if (status === ValidationStatus.VALIDATING) {
      return (
        <View style={styles.contentRow}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.title}>Validating your step...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.contentColumn}>
          <Text style={styles.title}>⚠️ {error}</Text>
          <Text style={styles.subtitleText}>
            Please try again or check your network connection.
          </Text>
        </View>
      );
    }

    if (currentValidation) {
      return (
        <View style={styles.contentColumn}>
          {/* Status header */}
          <View style={styles.headerRow}>
            <Text style={styles.emoji}>{getStatusEmoji()}</Text>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>{getStatusTitle()}</Text>
              {currentValidation.errorType && (
                <Text style={styles.errorTypeText}>
                  {getErrorTypeLabel(currentValidation.errorType)}
                </Text>
              )}
            </View>
          </View>

          {/* Feedback message */}
          <Text style={styles.feedbackText}>{currentValidation.feedback}</Text>

          {/* Confidence score */}
          {showConfidence && currentValidation.confidence !== undefined && (
            <Text style={styles.confidenceText}>
              Confidence: {Math.round(currentValidation.confidence * 100)}%
            </Text>
          )}

          {/* Suggested steps */}
          {showSuggestedSteps &&
            currentValidation.suggestedSteps &&
            currentValidation.suggestedSteps.length > 0 && (
              <View style={styles.suggestedStepsContainer}>
                <Text style={styles.suggestedStepsTitle}>Suggested next steps:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.suggestedStepsScroll}
                >
                  {currentValidation.suggestedSteps.map((step, index) => (
                    <View key={index} style={styles.suggestedStepChip}>
                      <Text style={styles.suggestedStepText}>{step}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

          {/* Cached indicator */}
          {currentValidation.cachedResult && (
            <Text style={styles.cachedText}>📦 Cached result</Text>
          )}

          {/* Hint display */}
          {currentHint && (
            <View style={styles.hintContainer}>
              <Text style={styles.hintLabel}>
                💡 Hint ({hintLevel === 'concept' ? 'Concept' : hintLevel === 'direction' ? 'Direction' : 'Specific'}):
              </Text>
              <Text style={styles.hintText}>{currentHint}</Text>
            </View>
          )}

          {/* Hint button */}
          {!currentValidation.isCorrect && onRequestHint && (
            <TouchableOpacity
              style={styles.hintButton}
              onPress={onRequestHint}
              activeOpacity={0.7}
            >
              <Text style={styles.hintButtonText}>
                {currentHint ? '💡 Need More Help?' : '💡 Need a Hint?'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return null;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        getStatusStyle(),
        {
          bottom,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {renderContent()}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: 250,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contentColumn: {
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  emoji: {
    fontSize: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  errorTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  feedbackText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: 21,
    marginTop: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
  },
  confidenceText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    marginTop: 8,
  },
  cachedText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
    marginTop: 6,
  },
  suggestedStepsContainer: {
    marginTop: 12,
  },
  suggestedStepsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  suggestedStepsScroll: {
    marginHorizontal: -4,
  },
  suggestedStepChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
  },
  suggestedStepText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  hintButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  hintButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  hintContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  hintLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 6,
  },
  hintText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },

  // Status-based styles
  validating: {
    backgroundColor: '#4A90E2',
  },
  correct: {
    backgroundColor: '#27AE60',
  },
  notUseful: {
    backgroundColor: '#F39C12',
  },
  incorrect: {
    backgroundColor: '#E74C3C',
  },
  error: {
    backgroundColor: '#C0392B',
  },
  idle: {
    backgroundColor: '#95A5A6',
  },
});

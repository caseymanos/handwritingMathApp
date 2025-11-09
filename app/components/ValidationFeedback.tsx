/**
 * Validation Feedback Component
 *
 * Displays validation results with animated visual feedback.
 * Shows correct/incorrect status, usefulness, and actionable feedback.
 */

import React, { useMemo } from 'react';
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
import { useHintStore } from '../stores/hintStore';
import { getHintLevelDisplayText, getHintLevelIcon } from '../utils/hintUtils';
import { Colors, Spacing, TextStyles, Shadows, getValidationColor } from '../styles';
import FeedbackAnimation from './FeedbackAnimation';
import HintReveal from './HintReveal';
import { useUIStore } from '../stores/uiStore';
// (Swipe-to-collapse removed for stability; will revisit once canvas is fully stable)

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
export const ValidationFeedback: React.FC<ValidationFeedbackProps> = React.memo(({
  bottom = 120,
  showConfidence = false,
  showSuggestedSteps = true,
  onRequestHint,
}) => {
  const collapsed = useUIStore(state => state.hintCollapsed);
  const setCollapsed = useUIStore(state => state.setHintCollapsed);
  // Select individual properties to avoid re-render issues
  const status = useValidationStore(state => state.status);
  const currentValidation = useValidationStore(state => state.currentValidation);
  const error = useValidationStore(state => state.error);
  const currentHint = useHintStore(state => state.currentHint);
  const hintLevel = useHintStore(state => state.currentHint?.level);

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

  // Get FeedbackAnimation status
  const getFeedbackAnimationStatus = (): 'correct' | 'warning' | 'error' | 'idle' => {
    if (status === ValidationStatus.VALIDATING) return 'idle';
    if (error) return 'error';
    if (!currentValidation) return 'idle';

    if (currentValidation.isCorrect && currentValidation.isUseful) return 'correct';
    if (currentValidation.isCorrect && !currentValidation.isUseful) return 'warning';
    return 'error';
  };

  // Get background color based on status
  const getBackgroundColor = (): string => {
    if (status === ValidationStatus.VALIDATING) return Colors.primary.main;
    if (error) return Colors.feedback.error;
    if (!currentValidation) return Colors.ui.overlay;

    return getValidationColor(
      currentValidation.isCorrect,
      currentValidation.isUseful
    );
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
          {/* Status header with animated feedback icon */}
          <View style={styles.headerRow}>
            <FeedbackAnimation
              status={getFeedbackAnimationStatus()}
              size={40}
              animated={true}
            />
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


          {/* Hint display with HintReveal component */}
          {currentHint && (
            <HintReveal
              hint={currentHint.text}
              level={hintLevel || null}
              animated={true}
            />
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
      pointerEvents="box-none"
      style={[
        styles.container,
        collapsed ? styles.collapsedContainer : styles.expandedContainer,
        {
          backgroundColor: getBackgroundColor(),
          bottom,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View pointerEvents="auto" style={styles.innerContent}>
        {/* Collapsed state: single large tap target */}
        {collapsed ? (
          <TouchableOpacity
            style={styles.collapsedTapTarget}
            onPress={() => setCollapsed(false)}
            accessibilityLabel="Expand hint panel"
            activeOpacity={0.8}
          >
            <Text style={styles.collapsedIcon}>∑</Text>
            <Text style={styles.collapsedLabel}>Hints</Text>
          </TouchableOpacity>
        ) : (
          <>
          {/* Collapse toggle shown only when expanded */}
          <TouchableOpacity
            style={styles.collapseToggle}
            onPress={() => setCollapsed(true)}
            accessibilityLabel="Collapse hint panel"
            activeOpacity={0.8}
          >
            <Text style={styles.collapseIcon}>‹</Text>
          </TouchableOpacity>
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {renderContent()}
          </ScrollView>
          </>
        )}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    borderRadius: Spacing.component.borderRadiusLarge,
    ...Shadows.large,
    maxHeight: 400,
  },
  expandedContainer: {
    left: Spacing.lg,
    right: Spacing.lg,
  },
  collapsedContainer: {
    left: Spacing.lg,
    width: 120, // wider with label
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  innerContent: {
    width: '100%',
  },
  scrollContainer: {
    maxHeight: 400,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  contentColumn: {
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    ...TextStyles.h3,
    color: Colors.primary.contrast,
  },
  errorTypeText: {
    ...TextStyles.labelMedium,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: Spacing.xs / 2,
  },
  feedbackText: {
    ...TextStyles.bodyMedium,
    color: 'rgba(255, 255, 255, 0.95)',
    marginTop: Spacing.xs,
  },
  subtitleText: {
    ...TextStyles.bodySmall,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: Spacing.xs,
  },
  confidenceText: {
    ...TextStyles.labelSmall,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: Spacing.sm,
  },
  cachedText: {
    ...TextStyles.captionSmall,
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
  suggestedStepsContainer: {
    marginTop: Spacing.md,
  },
  suggestedStepsTitle: {
    ...TextStyles.labelMedium,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: Spacing.sm,
  },
  suggestedStepsScroll: {
    marginHorizontal: -Spacing.xs,
  },
  suggestedStepChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: Spacing.component.borderRadius,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginHorizontal: Spacing.xs,
  },
  suggestedStepText: {
    ...TextStyles.labelMedium,
    color: Colors.primary.contrast,
  },
  hintButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: Spacing.component.borderRadius,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  hintButtonText: {
    ...TextStyles.buttonMedium,
    color: Colors.primary.contrast,
  },
  collapseToggle: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    zIndex: 2,
  },
  collapseIcon: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginTop: -1,
  },
  collapsedTapTarget: {
    width: '100%',
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: Spacing.component.borderRadiusLarge,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  collapsedIcon: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '700',
  },
  collapsedLabel: {
    ...TextStyles.labelMedium,
    color: '#fff',
    fontWeight: '700',
  },
});

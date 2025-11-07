/**
 * FormattedStep Component
 *
 * Displays a solution step with math notation using KaTeX.
 * Used for showing expected steps, student steps, and validation feedback.
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Katex from 'react-native-katex';
import { Colors, Spacing, TextStyles, Shadows, getValidationColor } from '../styles';

interface FormattedStepProps {
  stepNumber: number;
  expression: string; // LaTeX expression
  description?: string;
  isCorrect?: boolean;
  isUseful?: boolean;
  showFeedback?: boolean;
}

export const FormattedStep: React.FC<FormattedStepProps> = ({
  stepNumber,
  expression,
  description,
  isCorrect,
  isUseful,
  showFeedback = false,
}) => {
  // Determine feedback icon and color using style system
  let feedbackIcon = '';
  let feedbackColor = Colors.text.tertiary;

  if (showFeedback) {
    if (isCorrect && isUseful) {
      feedbackIcon = '✅';
      feedbackColor = Colors.feedback.success;
    } else if (isCorrect && !isUseful) {
      feedbackIcon = '⚠️';
      feedbackColor = Colors.feedback.warning;
    } else if (!isCorrect) {
      feedbackIcon = '❌';
      feedbackColor = Colors.feedback.error;
    }
  }

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel={`Step ${stepNumber}: ${description || expression}`}
      accessibilityRole="text"
    >
      {/* Step number and feedback */}
      <View style={styles.header}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepNumber}>{stepNumber}</Text>
        </View>
        {showFeedback && feedbackIcon && (
          <Text
            style={[styles.feedbackIcon, { color: feedbackColor }]}
            accessible={true}
            accessibilityLabel={
              isCorrect && isUseful
                ? 'Correct and useful'
                : isCorrect && !isUseful
                ? 'Correct but not useful'
                : 'Incorrect'
            }
          >
            {feedbackIcon}
          </Text>
        )}
      </View>

      {/* Math expression */}
      <View style={styles.mathContainer}>
        <Katex
          expression={`\\displaystyle ${expression}`}
          displayMode={false}
          style={styles.katex}
          inlineStyle={`
            html, body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100%;
              margin: 0;
              padding: 0;
            }
            .katex {
              font-size: 1.5em;
              margin: 0;
            }
          `}
        />
      </View>

      {/* Description (optional) */}
      {description && (
        <Text style={styles.description}>{description}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.primary,
    borderRadius: Spacing.component.borderRadius,
    padding: Spacing.md,
    marginVertical: Spacing.xs,
    ...Shadows.small,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  stepNumber: {
    ...TextStyles.labelSmall,
    color: Colors.primary.contrast,
  },
  feedbackIcon: {
    fontSize: 18,
    marginLeft: 'auto',
  },
  mathContainer: {
    paddingVertical: Spacing.sm,
    width: '100%',
  },
  katex: {
    width: '100%',
    height: 50,
  },
  description: {
    ...TextStyles.bodySmall,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
});

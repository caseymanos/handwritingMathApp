/**
 * FormattedStep Component
 *
 * Displays a solution step with math notation using KaTeX.
 * Used for showing expected steps, student steps, and validation feedback.
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Katex from 'react-native-katex';

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
  // Determine feedback icon and color
  let feedbackIcon = '';
  let feedbackColor = '#999999';

  if (showFeedback) {
    if (isCorrect && isUseful) {
      feedbackIcon = '✅';
      feedbackColor = '#34C759';
    } else if (isCorrect && !isUseful) {
      feedbackIcon = '⚠️';
      feedbackColor = '#FF9500';
    } else if (!isCorrect) {
      feedbackIcon = '❌';
      feedbackColor = '#FF3B30';
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
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  feedbackIcon: {
    fontSize: 18,
    marginLeft: 'auto',
  },
  mathContainer: {
    paddingVertical: 8,
    width: '100%',
  },
  katex: {
    width: '100%',
    height: 50,
  },
  description: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

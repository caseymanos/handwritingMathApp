/**
 * ProblemDisplay Component
 *
 * Displays math problem at top of screen with KaTeX rendering.
 * Stays visible throughout solving process.
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Katex from 'react-native-katex';
import { Problem } from '../types/Problem';
import { Colors, Spacing, TextStyles, Shadows, getDifficultyColor } from '../styles';

interface ProblemDisplayProps {
  problem: Problem | null;
  showDifficulty?: boolean;
  showInstructions?: boolean;
}

// Helper function to convert LaTeX to readable text
const formatLatexToText = (latex: string): string => {
  return latex
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)') // \frac{a}{b} -> (a/b)
    .replace(/\\cdot/g, '×')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\displaystyle\s*/g, '')
    .replace(/\{/g, '')
    .replace(/\}/g, '')
    .trim();
};

export const ProblemDisplay: React.FC<ProblemDisplayProps> = ({
  problem,
  showDifficulty = true,
  showInstructions = true,
}) => {
  if (!problem) {
    return (
      <View style={styles.container}>
        <Text style={styles.noProblemText}>No problem selected</Text>
      </View>
    );
  }

  // Difficulty badge color from style system
  const difficultyColor = getDifficultyColor(problem.difficulty);

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel={`Math problem: ${problem.text}`}
      accessibilityRole="text"
    >
      {/* Problem header with difficulty badge */}
      <View style={styles.header}>
        {showDifficulty && (
          <View style={[styles.difficultyBadge, { backgroundColor: difficultyColor }]}>
            <Text style={styles.difficultyText}>
              {problem.difficulty.toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.problemId}>Problem {problem.id}</Text>
      </View>

      {/* Instructions */}
      {showInstructions && (
        <Text style={styles.instructions}>
          Solve for x. Write each step on a new line.
        </Text>
      )}

      {/* Math problem with KaTeX */}
      <View style={styles.mathContainer}>
        <Katex
          expression={`\\displaystyle ${problem.latex}`}
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
              font-size: 2em;
              margin: 0;
            }
          `}
          onError={(error) => console.log('KaTeX render error:', error)}
        />
        {/* Fallback: show formatted equation */}
        <Text style={styles.fallbackText}>{formatLatexToText(problem.latex)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.secondary,
    borderBottomWidth: 2,
    borderBottomColor: Colors.ui.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    ...Shadows.small,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  difficultyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.component.borderRadius,
    marginRight: Spacing.sm,
  },
  difficultyText: {
    ...TextStyles.labelSmall,
    color: Colors.primary.contrast,
    textTransform: 'uppercase',
  },
  problemId: {
    ...TextStyles.labelMedium,
    color: Colors.text.secondary,
  },
  instructions: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  mathContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    width: '100%',
  },
  katex: {
    width: '100%',
    height: 60,
  },
  fallbackText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    letterSpacing: 1,
  },
  noProblemText: {
    ...TextStyles.bodyMedium,
    color: Colors.text.tertiary,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
});

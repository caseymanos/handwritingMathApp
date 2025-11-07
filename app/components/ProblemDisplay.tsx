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

  // Difficulty badge color
  const difficultyColor = {
    easy: '#34C759',
    medium: '#FF9500',
    hard: '#FF3B30',
  }[problem.difficulty];

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
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 2,
    borderBottomColor: '#E1E4E8',
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  problemId: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  instructions: {
    fontSize: 13,
    color: '#444444',
    marginBottom: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  mathContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    width: '100%',
  },
  katex: {
    width: '100%',
    height: 60,
  },
  fallbackText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    letterSpacing: 1,
  },
  noProblemText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    paddingVertical: 20,
  },
});

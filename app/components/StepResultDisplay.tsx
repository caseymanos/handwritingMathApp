/**
 * StepResultDisplay - Shows recognized LaTeX and validation result on right side of each line
 * Persists after validation with color coding (green/yellow/red)
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Katex from 'react-native-katex';
import { Colors } from '../styles/colors';
import { getYCoordinateForLine } from '../utils/lineDetectionUtils';

export interface StepResult {
  lineNumber: number;
  latex: string;
  isCorrect?: boolean;
  isUseful?: boolean;
  isValidated: boolean; // false = recognizing, true = validated
}

interface StepResultDisplayProps {
  stepResult: StepResult;
}

export const StepResultDisplay: React.FC<StepResultDisplayProps> = React.memo(({ stepResult }) => {
  const { lineNumber, latex, isCorrect, isUseful, isValidated } = stepResult;

  // Calculate Y position using shared utility (accounts for top offset + spacing)
  const yPosition = getYCoordinateForLine(lineNumber);

  // Determine background color based on validation status
  const getBackgroundColor = () => {
    if (!isValidated) {
      return Colors.ui.background; // White/neutral while recognizing
    }

    if (isCorrect && isUseful) {
      return Colors.feedback.success; // Green
    } else if (isCorrect && !isUseful) {
      return '#FFA500'; // Orange/Yellow
    } else {
      return Colors.feedback.error; // Red
    }
  };

  // Determine text color
  const getTextColor = () => {
    return isValidated ? Colors.primary.contrast : Colors.text.primary;
  };

  return (
    <View
      style={[
        styles.container,
        {
          // Center the chip around the grid line
          top: yPosition - 24,
          right: 20,
          backgroundColor: getBackgroundColor(),
        },
      ]}
    >
      <View style={styles.mathContainer}>
        <Katex
          expression={latex}
          displayMode={false}
          style={styles.katexView}
          inlineStyle={`
            html, body { display: flex; align-items: center; justify-content: center; }
            .katex { font-size: 1.1em; margin: 0; color: ${getTextColor()}; }
          `}
          onError={(error) => console.log('[StepResultDisplay] KaTeX render error:', error)}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    maxWidth: 250,
    borderRadius: 8,
    padding: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    shadowColor: Colors.ui.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mathContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  katexView: {
    minHeight: 30,
    width: '100%',
  },
});

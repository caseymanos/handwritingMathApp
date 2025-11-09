/**
 * InlineRecognitionDisplay - Shows recognized LaTeX on the right side of each line guide
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import Katex from 'react-native-katex';
import { Colors } from '../styles/colors';
import { getYCoordinateForLine } from '../utils/lineDetectionUtils';

interface InlineRecognitionDisplayProps {
  latex: string;
  lineNumber: number;
  isVisible: boolean;
  onHide?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const InlineRecognitionDisplay: React.FC<InlineRecognitionDisplayProps> = ({
  latex,
  lineNumber,
  isVisible,
  onHide,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (isVisible) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Call onHide after animation completes
        if (onHide) {
          onHide();
        }
      });
    }
  }, [isVisible, fadeAnim, onHide]);

  if (!latex) return null;

  const yPosition = getYCoordinateForLine(lineNumber);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: yPosition - 20, // Offset to center on line guide
          right: 20,
          opacity: fadeAnim,
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
            .katex { font-size: 1.2em; margin: 0; }
          `}
          onError={(error) => console.log('[InlineRecognitionDisplay] KaTeX render error:', error)}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    maxWidth: 250,
    backgroundColor: Colors.ui.background,
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

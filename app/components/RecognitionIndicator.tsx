/**
 * Recognition Indicator Component
 *
 * Displays recognition status (processing, success, error) with visual feedback.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import Katex from 'react-native-katex';
import { RecognitionStatus } from '../types/MyScript';
import { formatRecognitionResult, getConfidenceLevel } from '../utils/recognitionUtils';
import { useCanvasStore } from '../stores/canvasStore';
import { Colors, Spacing, TextStyles, Shadows } from '../styles';

/**
 * Props for RecognitionIndicator
 */
interface RecognitionIndicatorProps {
  /** Position from top of screen */
  top?: number;
  /** Whether to show confidence score */
  showConfidence?: boolean;
  /** Whether to show error messages */
  showErrors?: boolean;
}

/**
 * RecognitionIndicator Component
 *
 * Shows recognition status and results at the top of the canvas
 */
export const RecognitionIndicator: React.FC<RecognitionIndicatorProps> = React.memo(({
  top = 20,
  showConfidence = true,
  showErrors = true,
}) => {
  // Use individual selectors to avoid creating new objects on every render
  const result = useCanvasStore(state => state.recognitionResult);
  const status = useCanvasStore(state => state.recognitionStatus);
  const isRecognizing = useCanvasStore(state => state.isRecognizing);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Fade in/out animation when status changes
  React.useEffect(() => {
    if (isRecognizing || result) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isRecognizing, result, fadeAnim]);

  // Don't render if no recognition activity
  if (!isRecognizing && !result) {
    return null;
  }

  // Get background color based on status
  const getBackgroundColor = (): string => {
    switch (status) {
      case RecognitionStatus.PROCESSING:
        return Colors.primary.main;
      case RecognitionStatus.SUCCESS:
        return Colors.feedback.success;
      case RecognitionStatus.ERROR:
        return Colors.feedback.error;
      default:
        return Colors.ui.overlay;
    }
  };

  const renderContent = () => {
    if (isRecognizing) {
      return (
        <View style={styles.contentRow}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.text}>Recognizing...</Text>
        </View>
      );
    }

    if (result) {
      if (result.status === RecognitionStatus.ERROR && showErrors) {
        return (
          <View style={styles.contentColumn}>
            <Text style={styles.errorText}>✗ Recognition Failed</Text>
            {result.error && (
              <Text style={styles.errorDetailText}>{result.error}</Text>
            )}
          </View>
        );
      }

      if (result.status === RecognitionStatus.SUCCESS) {
        return (
          <View style={styles.contentRow}>
            {result.latex && (
              <View style={styles.katexContainer}>
                <Katex
                  expression={result.latex}
                  displayMode={false}
                  style={styles.katex}
                  inlineStyle={`
                    html, body { display: flex; align-items: center; }
                    .katex { font-size: 1.2em; margin: 0; }
                  `}
                  onError={(error) => console.log('[RecognitionIndicator] KaTeX render error:', error)}
                />
              </View>
            )}
          </View>
        );
      }
    }

    return null;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          top,
          opacity: fadeAnim,
        },
      ]}
      accessibilityLabel="Recognition status indicator"
      accessibilityLiveRegion="polite"
    >
      {renderContent()}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: Spacing.lg,
    padding: Spacing.sm,
    borderRadius: Spacing.component.borderRadius,
    ...Shadows.medium,
    zIndex: 1000,
    minWidth: 60,
    maxWidth: 400,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  contentColumn: {
    flexDirection: 'column',
    gap: Spacing.sm,
  },
  text: {
    ...TextStyles.labelMedium,
    color: Colors.primary.contrast,
  },
  successText: {
    ...TextStyles.labelMedium,
    color: Colors.primary.contrast,
  },
  errorText: {
    ...TextStyles.labelMedium,
    color: Colors.primary.contrast,
  },
  errorDetailText: {
    ...TextStyles.bodySmall,
    color: Colors.primary.contrast,
    opacity: 0.9,
  },
  katexContainer: {
    flex: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: Spacing.xs,
    overflow: 'hidden',
  },
  katex: {
    flex: 1,
  },
  confidenceText: {
    ...TextStyles.captionSmall,
    color: Colors.primary.contrast,
    opacity: 0.8,
  },
});

export default RecognitionIndicator;

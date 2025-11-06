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
import { RecognitionStatus } from '../types/MyScript';
import { formatRecognitionResult, getConfidenceLevel } from '../utils/recognitionUtils';
import { useCanvasStore } from '../stores/canvasStore';

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
export const RecognitionIndicator: React.FC<RecognitionIndicatorProps> = ({
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

  // Determine colors and content based on status
  const getStatusStyle = () => {
    switch (status) {
      case RecognitionStatus.PROCESSING:
        return styles.processing;
      case RecognitionStatus.SUCCESS:
        return styles.success;
      case RecognitionStatus.ERROR:
        return styles.error;
      default:
        return styles.idle;
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
          <View style={styles.contentColumn}>
            <Text style={styles.successText}>✓ Recognized</Text>
            {result.latex && (
              <Text style={styles.resultText} numberOfLines={2}>
                {result.latex}
              </Text>
            )}
            {showConfidence && result.confidence !== undefined && (
              <Text style={styles.confidenceText}>
                Confidence: {(result.confidence * 100).toFixed(0)}% (
                {getConfidenceLevel(result.confidence)})
              </Text>
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
        getStatusStyle(),
        { top, opacity: fadeAnim },
      ]}
      accessibilityLabel="Recognition status indicator"
      accessibilityLiveRegion="polite"
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
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  idle: {
    backgroundColor: '#666',
  },
  processing: {
    backgroundColor: '#2196F3', // Blue
  },
  success: {
    backgroundColor: '#4CAF50', // Green
  },
  error: {
    backgroundColor: '#F44336', // Red
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contentColumn: {
    flexDirection: 'column',
    gap: 8,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorDetailText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  resultText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
    fontFamily: 'Courier', // Monospace for LaTeX
  },
  confidenceText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
  },
});

export default RecognitionIndicator;

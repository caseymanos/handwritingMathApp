/**
 * FeedbackAnimation Component
 *
 * Animated validation feedback using Reanimated 3.
 * Shows ✅/⚠️/❌ states with smooth transitions and micro-interactions.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Colors, Spacing } from '../styles';

interface FeedbackAnimationProps {
  /** Validation state */
  status: 'correct' | 'warning' | 'error' | 'idle';

  /** Size of the icon */
  size?: number;

  /** Show animation? */
  animated?: boolean;

  /** Custom styles */
  style?: any;
}

/**
 * FeedbackAnimation Component
 *
 * Renders an animated icon based on validation status:
 * - ✅ Correct & useful: Green checkmark with bounce
 * - ⚠️ Correct but not useful: Yellow warning with shake
 * - ❌ Incorrect: Red X with bounce + shake
 * - Idle: No icon
 */

const FeedbackAnimation: React.FC<FeedbackAnimationProps> = ({
  status,
  size = 48,
  animated = true,
  style,
}) => {
  // Shared values for animations
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);
  const translateX = useSharedValue(0);

  // Trigger animation when status changes
  useEffect(() => {
    if (status === 'idle') {
      // Hide the icon
      scale.value = withTiming(0, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
      return;
    }

    if (!animated) {
      // No animation, just show
      scale.value = 1;
      opacity.value = 1;
      return;
    }

    // Reset and animate based on status
    scale.value = 0;
    opacity.value = 0;

    if (status === 'correct') {
      // Success: bounce in
      scale.value = withSequence(
        withTiming(1.2, { duration: 200, easing: Easing.out(Easing.cubic) }),
        withSpring(1, { damping: 8, stiffness: 200 })
      );
      opacity.value = withTiming(1, { duration: 300 });
    } else if (status === 'warning') {
      // Warning: bounce + subtle shake
      scale.value = withSpring(1, { damping: 10, stiffness: 150 });
      opacity.value = withTiming(1, { duration: 300 });

      // Subtle shake
      translateX.value = withSequence(
        withDelay(200, withTiming(-4, { duration: 50 })),
        withTiming(4, { duration: 100 }),
        withTiming(-4, { duration: 100 }),
        withTiming(0, { duration: 50 })
      );
    } else if (status === 'error') {
      // Error: bounce + shake
      scale.value = withSequence(
        withTiming(1.1, { duration: 200, easing: Easing.out(Easing.cubic) }),
        withSpring(1, { damping: 6, stiffness: 180 })
      );
      opacity.value = withTiming(1, { duration: 300 });

      // Shake animation
      translateX.value = withSequence(
        withDelay(200, withTiming(-6, { duration: 50 })),
        withTiming(6, { duration: 100 }),
        withTiming(-6, { duration: 100 }),
        withTiming(6, { duration: 100 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [status, animated]);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateX: translateX.value },
        { rotate: `${rotation.value}deg` },
      ],
      opacity: opacity.value,
    };
  });

  // Get icon and color based on status
  const getIcon = () => {
    switch (status) {
      case 'correct':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return null;
    }
  };

  const getColor = () => {
    switch (status) {
      case 'correct':
        return Colors.feedback.success;
      case 'warning':
        return Colors.feedback.warning;
      case 'error':
        return Colors.feedback.error;
      default:
        return Colors.text.primary;
    }
  };

  const icon = getIcon();

  if (!icon) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      <View
        style={[
          styles.iconContainer,
          {
            width: size,
            height: size,
            backgroundColor: `${getColor()}15`,
          },
        ]}
      >
        <Animated.Text
          style={[
            styles.icon,
            {
              fontSize: size * 0.6,
            },
          ]}
        >
          {icon}
        </Animated.Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    textAlign: 'center',
  },
});

export default FeedbackAnimation;

/**
 * SuccessAnimation Component
 *
 * Celebration animation for correct and useful steps.
 * Displays a confetti-like effect with emoji burst.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Colors, Spacing } from '../styles';

const { width, height } = Dimensions.get('window');

/**
 * Individual confetti particle component
 * Separated to avoid hooks-in-loop issue
 */
interface ParticleProps {
  particle: {
    translateY: Animated.SharedValue<number>;
    translateX: Animated.SharedValue<number>;
    opacity: Animated.SharedValue<number>;
    scale: Animated.SharedValue<number>;
    rotate: Animated.SharedValue<number>;
  };
  emoji: string;
  color: string;
}

const ConfettiParticle: React.FC<ParticleProps> = ({ particle, emoji, color }) => {
  const animatedParticleStyle = useAnimatedStyle(() => {
    return {
      opacity: particle.opacity.value,
      transform: [
        { translateX: particle.translateX.value },
        { translateY: particle.translateY.value },
        { scale: particle.scale.value },
        { rotate: `${particle.rotate.value}deg` },
      ],
    };
  });

  return (
    <Animated.View style={[styles.particle, animatedParticleStyle]}>
      <Text style={[styles.particleEmoji, { color }]}>{emoji}</Text>
    </Animated.View>
  );
};

interface SuccessAnimationProps {
  /** Show the animation */
  visible: boolean;

  /** Callback when animation completes */
  onComplete?: () => void;

  /** Duration in ms */
  duration?: number;

  /** Custom styles */
  style?: any;
}

/**
 * SuccessAnimation Component
 *
 * Displays a celebration animation when student completes a step correctly:
 * - Confetti-style emoji burst
 * - Success message with bounce
 * - Auto-hides after duration
 */

const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
  visible,
  onComplete,
  duration = 2000,
  style,
}) => {
  // Shared values for container
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  // Shared values for confetti particles
  const confettiEmojis = ['🎉', '✨', '⭐', '🌟', '💫', '🎊'];
  const particleAnimations = confettiEmojis.map(() => ({
    translateY: useSharedValue(0),
    translateX: useSharedValue(0),
    opacity: useSharedValue(0),
    scale: useSharedValue(0),
    rotate: useSharedValue(0),
  }));

  // Trigger animation when visible changes
  useEffect(() => {
    if (!visible) {
      // Hide animation
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.8, { duration: 200 });
      return;
    }

    // Show animation
    opacity.value = 0;
    scale.value = 0.8;

    // Fade in container
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, { damping: 10, stiffness: 100 });

    // Animate each confetti particle
    particleAnimations.forEach((particle, index) => {
      const randomDelay = index * 50;
      const randomAngle = Math.random() * Math.PI * 2;
      const randomDistance = 80 + Math.random() * 40;
      const randomRotation = Math.random() * 360;

      const targetX = Math.cos(randomAngle) * randomDistance;
      const targetY = Math.sin(randomAngle) * randomDistance;

      // Reset particle
      particle.translateX.value = 0;
      particle.translateY.value = 0;
      particle.opacity.value = 0;
      particle.scale.value = 0;
      particle.rotate.value = 0;

      // Burst outward
      particle.translateX.value = withDelay(
        randomDelay,
        withSpring(targetX, { damping: 8, stiffness: 80 })
      );
      particle.translateY.value = withDelay(
        randomDelay,
        withSpring(targetY, { damping: 8, stiffness: 80 })
      );
      particle.opacity.value = withDelay(
        randomDelay,
        withSequence(
          withTiming(1, { duration: 200 }),
          withDelay(
            duration - 600,
            withTiming(0, { duration: 400 })
          )
        )
      );
      particle.scale.value = withDelay(
        randomDelay,
        withSequence(
          withSpring(1.2, { damping: 10, stiffness: 150 }),
          withTiming(0.8, { duration: 200 })
        )
      );
      particle.rotate.value = withDelay(
        randomDelay,
        withTiming(randomRotation, { duration: 1000, easing: Easing.out(Easing.cubic) })
      );
    });

    // Hide after duration
    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 400 }, () => {
        if (onComplete) {
          runOnJS(onComplete)();
        }
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [visible, duration]);

  // Animated styles for container
  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  if (!visible) {
    return null;
  }

  return (
    <View style={[styles.overlay, style]} pointerEvents="none">
      <Animated.View style={[styles.container, containerAnimatedStyle]}>
        {/* Success message */}
        <View style={styles.messageContainer}>
          <Text style={styles.successEmoji}>✅</Text>
          <Text style={styles.successText}>Great work!</Text>
        </View>

        {/* Confetti particles */}
        <View style={styles.confettiContainer}>
          {particleAnimations.map((particle, index) => (
            <ConfettiParticle
              key={index}
              particle={particle}
              emoji={confettiEmojis[index]}
              color={Colors.primary.main}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: Spacing.component.borderRadiusLarge,
    padding: Spacing.lg,
    shadowColor: Colors.ui.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  successEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  successText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.feedback.success,
  },
  confettiContainer: {
    position: 'absolute',
    width: width,
    height: height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confettiEmoji: {
    position: 'absolute',
    fontSize: 32,
  },
  particle: {
    position: 'absolute',
  },
  particleEmoji: {
    fontSize: 32,
  },
});

export default SuccessAnimation;

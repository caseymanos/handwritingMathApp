/**
 * HintReveal Component
 *
 * Animated hint display with progressive escalation visualization.
 * Shows smooth reveal animation when hint changes.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Colors, Spacing, TextStyles, getHintLevelColor } from '../styles';
import { InlineMath } from './InlineMath';

interface HintRevealProps {
  /** Hint text to display */
  hint: string | null;

  /** Hint level for color coding */
  level: 'concept' | 'direction' | 'micro' | null;

  /** Show animation? */
  animated?: boolean;

  /** Custom styles */
  style?: any;
}

/**
 * HintReveal Component
 *
 * Displays hints with smooth reveal animations:
 * - Slides in from right with fade
 * - Color-coded by hint level (concept: blue, direction: orange, micro: red)
 * - Smooth transitions between hints
 */

const HintReveal: React.FC<HintRevealProps> = ({
  hint,
  level,
  animated = true,
  style,
}) => {
  // Shared values for animations
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(20);
  const scale = useSharedValue(0.95);

  // Trigger animation when hint changes
  useEffect(() => {
    if (!hint) {
      // Hide hint
      opacity.value = withTiming(0, { duration: 200 });
      translateX.value = withTiming(20, { duration: 200 });
      scale.value = withTiming(0.95, { duration: 200 });
      return;
    }

    if (!animated) {
      // No animation, just show
      opacity.value = 1;
      translateX.value = 0;
      scale.value = 1;
      return;
    }

    // Reset and animate reveal
    opacity.value = 0;
    translateX.value = 20;
    scale.value = 0.95;

    // Slide in from right with fade
    opacity.value = withDelay(
      100,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
    translateX.value = withDelay(
      100,
      withSpring(0, { damping: 15, stiffness: 150 })
    );
    scale.value = withDelay(
      100,
      withSpring(1, { damping: 12, stiffness: 180 })
    );
  }, [hint, animated]);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateX: translateX.value }, { scale: scale.value }],
    };
  });

  // Get color and icon based on hint level
  const getHintColor = () => {
    if (!level) return Colors.primary.main;
    return getHintLevelColor(level);
  };

  const getHintIcon = () => {
    switch (level) {
      case 'concept':
        return '💡'; // Light bulb for conceptual hint
      case 'direction':
        return '🎯'; // Target for directional hint
      case 'micro':
        return '👉'; // Pointing hand for specific hint
      default:
        return '💭'; // Thought bubble
    }
  };

  const getHintLevelLabel = () => {
    switch (level) {
      case 'concept':
        return 'Concept Hint';
      case 'direction':
        return 'Directional Hint';
      case 'micro':
        return 'Next Step Hint';
      default:
        return 'Hint';
    }
  };

  if (!hint) {
    return null;
  }

  const hintColor = getHintColor();
  const icon = getHintIcon();
  const label = getHintLevelLabel();

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      <View
        style={[
          styles.hintContainer,
          {
            borderLeftColor: hintColor,
            backgroundColor: `${hintColor}10`,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={[styles.label, { color: hintColor }]}>{label}</Text>
        </View>
        <InlineMath text={hint} textStyle={styles.hintText} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  hintContainer: {
    borderLeftWidth: 4,
    borderRadius: Spacing.component.borderRadius,
    padding: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  icon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  label: {
    ...TextStyles.labelMedium,
    fontWeight: '600',
  },
  hintText: {
    ...TextStyles.bodyMedium,
    color: Colors.text.primary,
    lineHeight: 22,
  },
});

export default HintReveal;

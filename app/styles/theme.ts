/**
 * Theme System
 *
 * Centralized theme configuration combining colors, spacing, and typography.
 * Provides easy access to all design tokens throughout the app.
 */

import { Colors } from './colors';
import { Spacing } from './spacing';
import { Typography, TextStyles } from './typography';
import { Dimensions, Platform } from 'react-native';

/**
 * Device utilities
 */

const { width, height } = Dimensions.get('window');

export const Device = {
  width,
  height,
  isSmallDevice: width < 375,
  isTablet: width >= 768,
  isLandscape: width > height,
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
} as const;

/**
 * Shadows
 */

export const Shadows = {
  small: {
    shadowColor: Colors.ui.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },

  medium: {
    shadowColor: Colors.ui.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3.0,
    elevation: 3,
  },

  large: {
    shadowColor: Colors.ui.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5.0,
    elevation: 5,
  },

  floating: {
    shadowColor: Colors.ui.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10.0,
    elevation: 8,
  },
} as const;

/**
 * Animation timings
 */

export const Animation = {
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    slower: 800,
  },

  easing: {
    default: 'ease-in-out',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    linear: 'linear',
  },
} as const;

/**
 * Z-Index layers
 */

export const ZIndex = {
  background: 0,
  content: 1,
  canvas: 2,
  toolbar: 10,
  floatingButton: 20,
  overlay: 30,
  modal: 40,
  tooltip: 50,
  dropdown: 60,
} as const;

/**
 * Border styles
 */

export const Borders = {
  width: {
    thin: 1,
    medium: 2,
    thick: 3,
  },

  radius: {
    small: Spacing.component.borderRadius,
    medium: Spacing.component.borderRadiusLarge,
    large: Spacing.component.borderRadiusXLarge,
    round: 999,
  },

  style: {
    solid: 'solid' as const,
    dashed: 'dashed' as const,
    dotted: 'dotted' as const,
  },
} as const;

/**
 * Complete theme object
 */

export const Theme = {
  colors: Colors,
  spacing: Spacing,
  typography: Typography,
  textStyles: TextStyles,
  shadows: Shadows,
  animation: Animation,
  zIndex: ZIndex,
  borders: Borders,
  device: Device,
} as const;

/**
 * Theme type for TypeScript
 */

export type AppTheme = typeof Theme;

/**
 * Default export
 */

export default Theme;

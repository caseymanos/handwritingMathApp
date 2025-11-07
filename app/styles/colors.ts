/**
 * Color Palette
 *
 * Centralized color system for the app with support for light/dark modes.
 * Colors are organized by semantic meaning for consistency.
 */

export const Colors = {
  // Primary colors (brand/main actions)
  primary: {
    main: '#2563eb', // Blue for primary actions
    light: '#60a5fa',
    dark: '#1e40af',
    contrast: '#ffffff',
  },

  // Secondary colors
  secondary: {
    main: '#8b5cf6', // Purple accent
    light: '#a78bfa',
    dark: '#6d28d9',
    contrast: '#ffffff',
  },

  // Validation feedback colors
  feedback: {
    success: '#10b981', // Green for correct
    successLight: '#6ee7b7',
    successDark: '#059669',

    warning: '#f59e0b', // Orange/Yellow for "correct but not useful"
    warningLight: '#fbbf24',
    warningDark: '#d97706',

    error: '#ef4444', // Red for incorrect
    errorLight: '#f87171',
    errorDark: '#dc2626',

    info: '#3b82f6', // Blue for informational
    infoLight: '#60a5fa',
    infoDark: '#2563eb',
  },

  // Canvas drawing colors
  canvas: {
    black: '#000000',
    blue: '#2563eb',
    red: '#dc2626',
    green: '#059669',
    purple: '#7c3aed',
    eraser: 'transparent',
  },

  // Background colors
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    tertiary: '#f3f4f6',
    inverse: '#111827',
    canvas: '#ffffff',
  },

  // Text colors
  text: {
    primary: '#111827',
    secondary: '#6b7280',
    tertiary: '#9ca3af',
    inverse: '#ffffff',
    disabled: '#d1d5db',
  },

  // UI element colors
  ui: {
    border: '#e5e7eb',
    borderDark: '#d1d5db',
    divider: '#f3f4f6',
    shadow: 'rgba(0, 0, 0, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.5)',
    disabled: '#f3f4f6',
  },

  // Difficulty badge colors
  difficulty: {
    easy: '#10b981',
    medium: '#f59e0b',
    hard: '#ef4444',
  },

  // Hint indicator colors
  hint: {
    concept: '#3b82f6', // Blue for concept hints
    direction: '#f59e0b', // Orange for directional hints
    micro: '#ef4444', // Red for micro hints (most specific)
  },

  // Dark mode colors (optional for PR8)
  dark: {
    background: {
      primary: '#111827',
      secondary: '#1f2937',
      tertiary: '#374151',
      canvas: '#1f2937',
    },
    text: {
      primary: '#f9fafb',
      secondary: '#d1d5db',
      tertiary: '#9ca3af',
      disabled: '#6b7280',
    },
    ui: {
      border: '#374151',
      borderDark: '#4b5563',
      divider: '#374151',
      shadow: 'rgba(0, 0, 0, 0.3)',
      overlay: 'rgba(0, 0, 0, 0.7)',
      disabled: '#374151',
    },
  },
} as const;

/**
 * Color utility functions
 */

export const getValidationColor = (
  isCorrect: boolean,
  isUseful: boolean
): string => {
  if (!isCorrect) {
    return Colors.feedback.error;
  }
  if (isCorrect && !isUseful) {
    return Colors.feedback.warning;
  }
  return Colors.feedback.success;
};

export const getDifficultyColor = (
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
): string => {
  switch (difficulty) {
    case 'EASY':
      return Colors.difficulty.easy;
    case 'MEDIUM':
      return Colors.difficulty.medium;
    case 'HARD':
      return Colors.difficulty.hard;
    default:
      return Colors.text.secondary;
  }
};

export const getHintLevelColor = (
  level: 'concept' | 'direction' | 'micro'
): string => {
  switch (level) {
    case 'concept':
      return Colors.hint.concept;
    case 'direction':
      return Colors.hint.direction;
    case 'micro':
      return Colors.hint.micro;
    default:
      return Colors.primary.main;
  }
};

export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

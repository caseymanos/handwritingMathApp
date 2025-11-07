/**
 * Spacing System
 *
 * Consistent spacing units based on 8px grid system.
 * All spacing values are multiples of 4 for alignment.
 */

export const Spacing = {
  // Base spacing units (8px grid)
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,

  // Component-specific spacing
  component: {
    paddingSmall: 8,
    paddingMedium: 16,
    paddingLarge: 24,

    marginSmall: 8,
    marginMedium: 16,
    marginLarge: 24,

    borderRadius: 8,
    borderRadiusLarge: 12,
    borderRadiusXLarge: 16,
  },

  // Screen padding (tablet-optimized)
  screen: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingHorizontalTablet: 40,
    paddingVerticalTablet: 32,
  },

  // Canvas and drawing area
  canvas: {
    lineGuideSpacing: 60, // Space between horizontal guide lines
    toolbarSize: 80, // Toolbar height/width on tablet
    toolbarSizePhone: 60, // Toolbar height/width on phone
  },

  // Touch target sizes (for accessibility)
  touchTarget: {
    minimum: 44, // iOS minimum touch target
    comfortable: 48,
    large: 56,
  },
} as const;

/**
 * Spacing utility functions
 */

export const getResponsiveSpacing = (
  isTablet: boolean,
  phoneValue: number,
  tabletValue: number
): number => {
  return isTablet ? tabletValue : phoneValue;
};

export const getScreenPadding = (isTablet: boolean) => ({
  horizontal: isTablet
    ? Spacing.screen.paddingHorizontalTablet
    : Spacing.screen.paddingHorizontal,
  vertical: isTablet
    ? Spacing.screen.paddingVerticalTablet
    : Spacing.screen.paddingVertical,
});

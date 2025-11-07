/**
 * Hint Utility Functions
 *
 * Helper functions for the hint system including LaTeX formatting,
 * inactivity detection, and hint safety validation.
 */

import { HintEntry, HintLevel } from '../types/Hint';

/**
 * Format hint text with KaTeX LaTeX rendering
 * Extracts LaTeX expressions wrapped in $ delimiters
 *
 * @param hint - Hint text (may contain $...$ LaTeX)
 * @returns Object with plain text and LaTeX expressions
 */
export function formatHintWithKaTeX(hint: string): {
  plainText: string;
  latexExpressions: string[];
  hasLatex: boolean;
} {
  // Extract LaTeX expressions (text between $ delimiters)
  const latexRegex = /\$([^$]+)\$/g;
  const latexExpressions: string[] = [];
  let match;

  while ((match = latexRegex.exec(hint)) !== null) {
    latexExpressions.push(match[1]);
  }

  // Remove $ delimiters for plain text version
  const plainText = hint.replace(/\$/g, '');

  return {
    plainText,
    latexExpressions,
    hasLatex: latexExpressions.length > 0,
  };
}

/**
 * Check if should show inactivity hint based on timer and attempt count
 *
 * @param incorrectAttempts - Number of incorrect attempts
 * @param lastActivityTime - Timestamp of last activity (ms)
 * @param inactivityThresholdMs - Inactivity threshold (default: 10000ms)
 * @param minIncorrectAttempts - Minimum incorrect attempts before auto-show (default: 2)
 * @returns True if should show inactivity hint
 */
export function shouldShowInactivityHint(
  incorrectAttempts: number,
  lastActivityTime: number | null,
  inactivityThresholdMs: number = 10000,
  minIncorrectAttempts: number = 2
): boolean {
  // Must have minimum incorrect attempts
  if (incorrectAttempts < minIncorrectAttempts) {
    return false;
  }

  // Must have a last activity time
  if (!lastActivityTime) {
    return false;
  }

  // Check if inactivity threshold exceeded
  const timeSinceLastActivity = Date.now() - lastActivityTime;
  return timeSinceLastActivity >= inactivityThresholdMs;
}

/**
 * Check if a hint is safe (doesn't reveal full solution)
 *
 * @param hintText - Hint text to check
 * @param solution - Full solution (if known)
 * @returns True if hint is safe
 */
export function isHintSafe(hintText: string, solution?: string): boolean {
  if (!solution) {
    return true; // Can't check without solution
  }

  // Remove LaTeX formatting and whitespace for comparison
  const cleanHint = hintText.replace(/\$/g, '').replace(/\s/g, '').toLowerCase();
  const cleanSolution = solution.replace(/\$/g, '').replace(/\s/g, '').toLowerCase();

  // Check if hint contains the full solution
  if (cleanHint.includes(cleanSolution) && cleanSolution.length > 3) {
    return false;
  }

  // Check for forbidden phrases
  const forbiddenPhrases = [
    'the answer is',
    'x equals',
    'x=',
    'solve to get',
    'result is',
    'solution is',
    'final answer',
  ];

  const lowerHint = hintText.toLowerCase();
  for (const phrase of forbiddenPhrases) {
    if (lowerHint.includes(phrase)) {
      return false;
    }
  }

  return true;
}

/**
 * Get next escalation level in the progression
 *
 * @param currentLevel - Current hint level
 * @returns Next hint level
 */
export function getNextEscalationLevel(currentLevel: HintLevel): HintLevel {
  const levels: HintLevel[] = ['concept', 'direction', 'micro'];
  const currentIndex = levels.indexOf(currentLevel);

  // Stay at 'micro' if already at max
  if (currentIndex === levels.length - 1) {
    return 'micro';
  }

  return levels[currentIndex + 1];
}

/**
 * Get previous escalation level (for de-escalation)
 *
 * @param currentLevel - Current hint level
 * @returns Previous hint level
 */
export function getPreviousEscalationLevel(currentLevel: HintLevel): HintLevel {
  const levels: HintLevel[] = ['concept', 'direction', 'micro'];
  const currentIndex = levels.indexOf(currentLevel);

  // Stay at 'concept' if already at min
  if (currentIndex === 0) {
    return 'concept';
  }

  return levels[currentIndex - 1];
}

/**
 * Convert hint level to display text
 *
 * @param level - Hint level
 * @returns Display text for the level
 */
export function getHintLevelDisplayText(level: HintLevel): string {
  const displayMap: Record<HintLevel, string> = {
    concept: 'Concept Cue',
    direction: 'Directional Hint',
    micro: 'Specific Hint',
  };

  return displayMap[level];
}

/**
 * Get hint level emoji/icon
 *
 * @param level - Hint level
 * @returns Emoji for the level
 */
export function getHintLevelIcon(level: HintLevel): string {
  const iconMap: Record<HintLevel, string> = {
    concept: '💡', // Light bulb for concepts
    direction: '🧭', // Compass for direction
    micro: '🎯', // Target for specific hints
  };

  return iconMap[level];
}

/**
 * Calculate time since last hint shown
 *
 * @param lastHintTimestamp - Timestamp of last hint (ms)
 * @returns Time since last hint in seconds
 */
export function getTimeSinceLastHint(lastHintTimestamp: number | null): number | null {
  if (!lastHintTimestamp) {
    return null;
  }

  const timeDiffMs = Date.now() - lastHintTimestamp;
  return Math.floor(timeDiffMs / 1000); // Convert to seconds
}

/**
 * Format hint for accessibility (screen readers)
 *
 * @param hint - Hint entry
 * @returns Accessibility-friendly text
 */
export function formatHintForAccessibility(hint: HintEntry): string {
  const levelText = getHintLevelDisplayText(hint.level);
  return `${levelText}: ${hint.plainText}`;
}

/**
 * Extract mathematical expressions from hint text
 * Useful for identifying what concepts the hint references
 *
 * @param hintText - Hint text
 * @returns Array of mathematical expressions found
 */
export function extractMathExpressions(hintText: string): string[] {
  // Match text within $ delimiters
  const latexRegex = /\$([^$]+)\$/g;
  const expressions: string[] = [];
  let match;

  while ((match = latexRegex.exec(hintText)) !== null) {
    expressions.push(match[1]);
  }

  return expressions;
}

/**
 * Check if hint references a specific variable
 *
 * @param hintText - Hint text
 * @param variable - Variable to check for (e.g., 'x', 'y')
 * @returns True if hint references the variable
 */
export function hintReferencesVariable(hintText: string, variable: string): boolean {
  // Check both plain text and LaTeX forms
  const plainCheck = hintText.toLowerCase().includes(variable.toLowerCase());
  const latexCheck = hintText.includes(`$${variable}$`) || hintText.includes(`$${variable.toUpperCase()}$`);

  return plainCheck || latexCheck;
}

/**
 * Get hint urgency level based on attempt count and time
 *
 * @param incorrectAttempts - Number of incorrect attempts
 * @param timeSinceLastAttempt - Time since last attempt in seconds
 * @returns Urgency level: 'low' | 'medium' | 'high'
 */
export function getHintUrgency(
  incorrectAttempts: number,
  timeSinceLastAttempt: number | null
): 'low' | 'medium' | 'high' {
  // High urgency: 3+ incorrect attempts and been stuck for a while
  if (incorrectAttempts >= 3 && timeSinceLastAttempt && timeSinceLastAttempt > 15) {
    return 'high';
  }

  // Medium urgency: 2+ incorrect attempts
  if (incorrectAttempts >= 2) {
    return 'medium';
  }

  // Low urgency: 1 or fewer incorrect attempts
  return 'low';
}

/**
 * Format hint for logging/debugging
 *
 * @param hint - Hint entry
 * @returns Formatted string for logs
 */
export function formatHintForLogging(hint: HintEntry): string {
  return `[${hint.errorType}/${hint.level}] ${hint.text.substring(0, 50)}...`;
}

/**
 * Check if two hints are substantially similar
 * Useful for avoiding showing nearly identical hints
 *
 * @param hint1 - First hint text
 * @param hint2 - Second hint text
 * @param threshold - Similarity threshold (0-1, default: 0.7)
 * @returns True if hints are similar
 */
export function areHintsSimilar(hint1: string, hint2: string, threshold: number = 0.7): boolean {
  // Simple similarity check based on word overlap
  const words1 = hint1.toLowerCase().split(/\s+/);
  const words2 = hint2.toLowerCase().split(/\s+/);

  // Count common words
  const commonWords = words1.filter((word) => words2.includes(word));
  const similarity = commonWords.length / Math.max(words1.length, words2.length);

  return similarity >= threshold;
}

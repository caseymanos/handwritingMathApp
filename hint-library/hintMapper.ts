/**
 * Hint Mapper
 *
 * Maps validation errors to appropriate progressive hints.
 * Handles hint selection, validation, and safety checks to ensure
 * hints never reveal the full solution.
 */

import { HintEntry, HintSelectionCriteria, HintValidationResult } from '../app/types/Hint';
import { ValidationErrorType } from '../app/types/Validation';
import { ProblemCategory } from '../app/types/Problem';
import { HINT_LIBRARY, getHintsByLevel } from './hints';

/**
 * Select the most appropriate hint based on error type, category, and escalation level
 *
 * @param criteria - Hint selection criteria
 * @returns Selected hint entry or null if no match
 */
export function selectHint(criteria: HintSelectionCriteria): HintEntry | null {
  const {
    errorType,
    category,
    level,
    previousHints = [],
  } = criteria;

  // Get all hints matching error type, category, and level
  let matchingHints = getHintsByLevel(errorType, level, category);

  // If no exact matches found, try with UNKNOWN error type as fallback
  if (matchingHints.length === 0 && errorType !== ValidationErrorType.UNKNOWN) {
    console.log(`[HintMapper] No hints found for ${errorType}/${level}, trying UNKNOWN fallback`);
    matchingHints = getHintsByLevel(ValidationErrorType.UNKNOWN, level, category);
  }

  // If still no matches, return null
  if (matchingHints.length === 0) {
    console.warn(`[HintMapper] No hints available for ${errorType}/${level}/${category}`);
    return null;
  }

  // Filter out previously shown hints to avoid repetition
  const unseenHints = matchingHints.filter(
    (hint) => !previousHints.includes(hint.text)
  );

  // If all hints have been shown, restart with all hints
  const availableHints = unseenHints.length > 0 ? unseenHints : matchingHints;

  // Select the highest priority hint
  // (hints are already sorted by priority in getHintsByLevel)
  const selectedHint = availableHints[0];

  // Validate hint safety (ensure it doesn't reveal solution)
  const validation = validateHintSafety(selectedHint, criteria.expectedNext);
  if (!validation.safe) {
    console.warn(`[HintMapper] Hint unsafe: ${validation.reason}`);
    // Try next hint
    if (availableHints.length > 1) {
      return availableHints[1];
    }
    return null;
  }

  return selectedHint;
}

/**
 * Validate that a hint doesn't reveal the full solution
 *
 * @param hint - Hint to validate
 * @param expectedNext - Expected next step (if known)
 * @returns Validation result
 */
export function validateHintSafety(
  hint: HintEntry,
  expectedNext?: string
): HintValidationResult {
  // Basic safety check: micro hints should not contain the exact expected expression
  if (hint.level === 'micro' && expectedNext) {
    // Remove LaTeX formatting and whitespace for comparison
    const cleanHint = hint.text.replace(/\$/g, '').replace(/\s/g, '').toLowerCase();
    const cleanExpected = expectedNext.replace(/\$/g, '').replace(/\s/g, '').toLowerCase();

    // Check if hint contains the full expected expression
    if (cleanHint.includes(cleanExpected) && cleanExpected.length > 3) {
      return {
        safe: false,
        reason: 'Hint reveals the exact next step',
      };
    }
  }

  // Check for forbidden phrases that reveal solutions
  const forbiddenPhrases = [
    'the answer is',
    'x equals',
    'x=',
    'solve to get',
    'result is',
  ];

  const lowerHint = hint.text.toLowerCase();
  for (const phrase of forbiddenPhrases) {
    if (lowerHint.includes(phrase)) {
      return {
        safe: false,
        reason: `Hint contains forbidden phrase: "${phrase}"`,
      };
    }
  }

  // Hint passes safety checks
  return {
    safe: true,
  };
}

/**
 * Get fallback hint when no specific hint is available
 *
 * @param level - Escalation level
 * @returns Generic fallback hint
 */
export function getFallbackHint(level: 'concept' | 'direction' | 'micro'): HintEntry {
  const fallbackHints: Record<string, HintEntry> = {
    concept: {
      id: 'fallback_concept',
      errorType: ValidationErrorType.UNKNOWN,
      category: ProblemCategory.LINEAR_EQUATIONS,
      level: 'concept',
      text: 'Think about what you\'re trying to accomplish. What\'s your goal for this step?',
      plainText: 'Think about what you\'re trying to accomplish. What\'s your goal for this step?',
      priority: 1,
    },
    direction: {
      id: 'fallback_direction',
      errorType: ValidationErrorType.UNKNOWN,
      category: ProblemCategory.LINEAR_EQUATIONS,
      level: 'direction',
      text: 'Review your step carefully. Is there a different approach you could try?',
      plainText: 'Review your step carefully. Is there a different approach you could try?',
      priority: 1,
    },
    micro: {
      id: 'fallback_micro',
      errorType: ValidationErrorType.UNKNOWN,
      category: ProblemCategory.LINEAR_EQUATIONS,
      level: 'micro',
      text: 'Try breaking down the problem into smaller steps. What can you simplify first?',
      plainText: 'Try breaking down the problem into smaller steps. What can you simplify first?',
      priority: 1,
    },
  };

  return fallbackHints[level];
}

/**
 * Get hints by tag (for context-specific hint selection)
 *
 * @param tags - Array of tags to match
 * @param errorType - Error type filter
 * @param level - Escalation level filter
 * @returns Matching hints sorted by priority
 */
export function getHintsByTags(
  tags: string[],
  errorType?: ValidationErrorType,
  level?: 'concept' | 'direction' | 'micro'
): HintEntry[] {
  let hints = HINT_LIBRARY.filter((hint) => {
    // Check if hint has any of the requested tags
    const hasMatchingTag = hint.tags?.some((tag) => tags.includes(tag)) ?? false;
    return hasMatchingTag;
  });

  // Apply error type filter if provided
  if (errorType) {
    hints = hints.filter((hint) => hint.errorType === errorType);
  }

  // Apply level filter if provided
  if (level) {
    hints = hints.filter((hint) => hint.level === level);
  }

  // Sort by priority
  return hints.sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

/**
 * Check if a hint has been shown too recently
 *
 * @param hintId - Hint ID to check
 * @param recentHints - Array of recently shown hint IDs with timestamps
 * @param cooldownMs - Cooldown period in milliseconds (default: 2 minutes)
 * @returns True if hint is on cooldown
 */
export function isHintOnCooldown(
  hintId: string,
  recentHints: Array<{ id: string; timestamp: number }>,
  cooldownMs: number = 120000 // 2 minutes
): boolean {
  const recentHint = recentHints.find((h) => h.id === hintId);
  if (!recentHint) {
    return false;
  }

  const timeSinceShown = Date.now() - recentHint.timestamp;
  return timeSinceShown < cooldownMs;
}

/**
 * Map validation error type to hint tags for contextual hints
 *
 * @param errorType - Validation error type
 * @returns Relevant tags for this error type
 */
export function getTagsForErrorType(errorType: ValidationErrorType): string[] {
  const tagMap: Record<ValidationErrorType, string[]> = {
    [ValidationErrorType.SYNTAX]: ['syntax', 'format', 'notation', 'equation'],
    [ValidationErrorType.ARITHMETIC]: ['arithmetic', 'calculation', 'compute', 'negative'],
    [ValidationErrorType.LOGIC]: ['logic', 'isolate', 'balance', 'inverse', 'move'],
    [ValidationErrorType.METHOD]: ['method', 'strategy', 'approach', 'simplify'],
    [ValidationErrorType.UNKNOWN]: ['general', 'review', 'check'],
  };

  return tagMap[errorType] || [];
}

/**
 * Advanced hint selection with context awareness
 * Uses student input and expected next step for better hint matching
 *
 * @param criteria - Hint selection criteria with context
 * @returns Best matching hint with context
 */
export function selectContextualHint(criteria: HintSelectionCriteria): HintEntry | null {
  // First try standard selection
  const standardHint = selectHint(criteria);

  // If we have student input and expected next, try to find more specific hints
  if (criteria.studentInput && criteria.expectedNext) {
    // Get tags for this error type
    const relevantTags = getTagsForErrorType(criteria.errorType);

    // Find hints matching tags and level
    const taggedHints = getHintsByTags(relevantTags, criteria.errorType, criteria.level);

    // Filter by previous hints
    const unseenTaggedHints = taggedHints.filter(
      (hint) => !criteria.previousHints?.includes(hint.text)
    );

    // If we found context-specific hints, prefer them
    if (unseenTaggedHints.length > 0) {
      const contextHint = unseenTaggedHints[0];
      const validation = validateHintSafety(contextHint, criteria.expectedNext);
      if (validation.safe) {
        return contextHint;
      }
    }
  }

  // Fall back to standard hint
  return standardHint || getFallbackHint(criteria.level);
}

/**
 * Batch validate multiple hints
 *
 * @param hints - Hints to validate
 * @param expectedNext - Expected next step
 * @returns Array of safe hints
 */
export function validateHints(hints: HintEntry[], expectedNext?: string): HintEntry[] {
  return hints.filter((hint) => {
    const validation = validateHintSafety(hint, expectedNext);
    return validation.safe;
  });
}

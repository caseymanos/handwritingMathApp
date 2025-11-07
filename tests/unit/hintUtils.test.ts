/**
 * Unit Tests for Hint Utilities
 *
 * Tests the hint formatting, escalation logic, inactivity detection,
 * and helper functions for the hint system.
 */

import {
  formatHintWithKaTeX,
  shouldShowInactivityHint,
  isHintSafe,
  getNextEscalationLevel,
  getPreviousEscalationLevel,
  getHintLevelDisplayText,
  getHintLevelIcon,
  getTimeSinceLastHint,
  formatHintForAccessibility,
  extractMathExpressions,
  hintReferencesVariable,
  getHintUrgency,
  formatHintForLogging,
  areHintsSimilar,
} from '../../app/utils/hintUtils';
import { HintEntry, HintLevel } from '../../app/types/Hint';
import { ValidationErrorType } from '../../app/types/Validation';

// Test data
const createTestHint = (
  level: HintLevel,
  text: string,
  errorType: ValidationErrorType = ValidationErrorType.UNKNOWN
): HintEntry => ({
  level,
  text,
  plainText: text.replace(/\$/g, ''),
  errorType,
  stepNumber: 1,
  timestamp: Date.now(),
});

describe('hintUtils', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('formatHintWithKaTeX', () => {
    it('should extract LaTeX expressions from hint text', () => {
      const hint = 'Try subtracting $5$ from both sides of $x + 5 = 12$.';
      const result = formatHintWithKaTeX(hint);

      expect(result.hasLatex).toBe(true);
      expect(result.latexExpressions).toEqual(['5', 'x + 5 = 12']);
      expect(result.plainText).toBe('Try subtracting 5 from both sides of x + 5 = 12.');
    });

    it('should handle hints without LaTeX', () => {
      const hint = 'Think about what operation you need to do.';
      const result = formatHintWithKaTeX(hint);

      expect(result.hasLatex).toBe(false);
      expect(result.latexExpressions).toEqual([]);
      expect(result.plainText).toBe(hint);
    });

    it('should handle empty string', () => {
      const result = formatHintWithKaTeX('');

      expect(result.hasLatex).toBe(false);
      expect(result.latexExpressions).toEqual([]);
      expect(result.plainText).toBe('');
    });

    it('should handle multiple LaTeX expressions', () => {
      const hint = 'Solve $2x + 3 = 11$ by first subtracting $3$ then dividing by $2$.';
      const result = formatHintWithKaTeX(hint);

      expect(result.hasLatex).toBe(true);
      expect(result.latexExpressions).toEqual(['2x + 3 = 11', '3', '2']);
    });
  });

  describe('shouldShowInactivityHint', () => {
    it('should return false if not enough incorrect attempts', () => {
      const lastActivityTime = Date.now() - 15000; // 15s ago
      const result = shouldShowInactivityHint(1, lastActivityTime, 10000, 2);

      expect(result).toBe(false);
    });

    it('should return false if no last activity time', () => {
      const result = shouldShowInactivityHint(3, null, 10000, 2);

      expect(result).toBe(false);
    });

    it('should return false if not enough time passed', () => {
      const now = Date.now();
      jest.setSystemTime(now);
      const lastActivityTime = now - 5000; // 5s ago

      const result = shouldShowInactivityHint(3, lastActivityTime, 10000, 2);

      expect(result).toBe(false);
    });

    it('should return true when conditions met', () => {
      const now = Date.now();
      jest.setSystemTime(now);
      const lastActivityTime = now - 12000; // 12s ago

      const result = shouldShowInactivityHint(3, lastActivityTime, 10000, 2);

      expect(result).toBe(true);
    });

    it('should use default thresholds', () => {
      const now = Date.now();
      jest.setSystemTime(now);
      const lastActivityTime = now - 11000; // 11s ago

      const result = shouldShowInactivityHint(2, lastActivityTime);

      expect(result).toBe(true);
    });
  });

  describe('isHintSafe', () => {
    it('should return true if no solution provided', () => {
      const hint = 'Try subtracting 5 from both sides.';
      const result = isHintSafe(hint);

      expect(result).toBe(true);
    });

    it('should return false if hint contains full solution', () => {
      const hint = 'The equation simplifies to x=7';
      const solution = 'x = 7';
      const result = isHintSafe(hint, solution);

      expect(result).toBe(false);
    });

    it('should return false if hint contains forbidden phrase "the answer is"', () => {
      const hint = 'The answer is x = 7';
      const solution = 'x = 7';
      const result = isHintSafe(hint, solution);

      expect(result).toBe(false);
    });

    it('should return false if hint contains "x equals"', () => {
      const hint = 'x equals 7';
      const solution = 'x = 7';
      const result = isHintSafe(hint, solution);

      expect(result).toBe(false);
    });

    it('should return true for safe conceptual hint', () => {
      const hint = 'Think about what operation isolates the variable.';
      const solution = 'x = 7';
      const result = isHintSafe(hint, solution);

      expect(result).toBe(true);
    });

    it('should allow hints that mention solution partially', () => {
      const hint = 'You need to get x by itself on one side.';
      const solution = 'x = 7';
      const result = isHintSafe(hint, solution);

      expect(result).toBe(true);
    });

    it('should be case insensitive', () => {
      const hint = 'THE ANSWER IS X = 7';
      const solution = 'x = 7';
      const result = isHintSafe(hint, solution);

      expect(result).toBe(false);
    });
  });

  describe('getNextEscalationLevel', () => {
    it('should escalate from concept to direction', () => {
      const result = getNextEscalationLevel('concept');
      expect(result).toBe('direction');
    });

    it('should escalate from direction to micro', () => {
      const result = getNextEscalationLevel('direction');
      expect(result).toBe('micro');
    });

    it('should stay at micro when already at max', () => {
      const result = getNextEscalationLevel('micro');
      expect(result).toBe('micro');
    });
  });

  describe('getPreviousEscalationLevel', () => {
    it('should de-escalate from micro to direction', () => {
      const result = getPreviousEscalationLevel('micro');
      expect(result).toBe('direction');
    });

    it('should de-escalate from direction to concept', () => {
      const result = getPreviousEscalationLevel('direction');
      expect(result).toBe('concept');
    });

    it('should stay at concept when already at min', () => {
      const result = getPreviousEscalationLevel('concept');
      expect(result).toBe('concept');
    });
  });

  describe('getHintLevelDisplayText', () => {
    it('should return "Concept Cue" for concept level', () => {
      expect(getHintLevelDisplayText('concept')).toBe('Concept Cue');
    });

    it('should return "Directional Hint" for direction level', () => {
      expect(getHintLevelDisplayText('direction')).toBe('Directional Hint');
    });

    it('should return "Specific Hint" for micro level', () => {
      expect(getHintLevelDisplayText('micro')).toBe('Specific Hint');
    });
  });

  describe('getHintLevelIcon', () => {
    it('should return light bulb emoji for concept level', () => {
      expect(getHintLevelIcon('concept')).toBe('💡');
    });

    it('should return compass emoji for direction level', () => {
      expect(getHintLevelIcon('direction')).toBe('🧭');
    });

    it('should return target emoji for micro level', () => {
      expect(getHintLevelIcon('micro')).toBe('🎯');
    });
  });

  describe('getTimeSinceLastHint', () => {
    it('should return null if no last hint timestamp', () => {
      const result = getTimeSinceLastHint(null);
      expect(result).toBeNull();
    });

    it('should calculate time difference in seconds', () => {
      const now = Date.now();
      jest.setSystemTime(now);
      const lastHintTime = now - 5000; // 5s ago

      const result = getTimeSinceLastHint(lastHintTime);
      expect(result).toBe(5);
    });

    it('should round down to nearest second', () => {
      const now = Date.now();
      jest.setSystemTime(now);
      const lastHintTime = now - 5999; // 5.999s ago

      const result = getTimeSinceLastHint(lastHintTime);
      expect(result).toBe(5);
    });
  });

  describe('formatHintForAccessibility', () => {
    it('should format hint with level text for screen readers', () => {
      const hint = createTestHint('concept', 'Think about subtraction.');
      const result = formatHintForAccessibility(hint);

      expect(result).toBe('Concept Cue: Think about subtraction.');
    });

    it('should work for all hint levels', () => {
      const conceptHint = createTestHint('concept', 'What operation?');
      const directionHint = createTestHint('direction', 'Subtract from both sides.');
      const microHint = createTestHint('micro', 'Subtract 5 from both sides.');

      expect(formatHintForAccessibility(conceptHint)).toBe('Concept Cue: What operation?');
      expect(formatHintForAccessibility(directionHint)).toBe('Directional Hint: Subtract from both sides.');
      expect(formatHintForAccessibility(microHint)).toBe('Specific Hint: Subtract 5 from both sides.');
    });
  });

  describe('extractMathExpressions', () => {
    it('should extract LaTeX expressions from hint text', () => {
      const hint = 'Solve $2x + 3 = 11$ by subtracting $3$.';
      const result = extractMathExpressions(hint);

      expect(result).toEqual(['2x + 3 = 11', '3']);
    });

    it('should return empty array if no expressions', () => {
      const hint = 'Think about what to do next.';
      const result = extractMathExpressions(hint);

      expect(result).toEqual([]);
    });

    it('should handle multiple expressions', () => {
      const hint = 'Start with $x + 5 = 12$, subtract $5$, and simplify to $x = 7$.';
      const result = extractMathExpressions(hint);

      expect(result).toEqual(['x + 5 = 12', '5', 'x = 7']);
    });
  });

  describe('hintReferencesVariable', () => {
    it('should detect variable in plain text', () => {
      const hint = 'Isolate x on the left side.';
      expect(hintReferencesVariable(hint, 'x')).toBe(true);
    });

    it('should detect variable in LaTeX', () => {
      const hint = 'Solve for $x$ by isolating it.';
      expect(hintReferencesVariable(hint, 'x')).toBe(true);
    });

    it('should be case insensitive for plain text', () => {
      const hint = 'Isolate X on the left side.';
      expect(hintReferencesVariable(hint, 'x')).toBe(true);
    });

    it('should return false if variable not present', () => {
      const hint = 'Solve the problem.';
      expect(hintReferencesVariable(hint, 'z')).toBe(false);
    });

    it('should work for different variables', () => {
      const hint = 'Find the value of $y$ in the equation.';
      expect(hintReferencesVariable(hint, 'y')).toBe(true);
      expect(hintReferencesVariable(hint, 'x')).toBe(false);
    });
  });

  describe('getHintUrgency', () => {
    it('should return "low" for 1 incorrect attempt', () => {
      const result = getHintUrgency(1, null);
      expect(result).toBe('low');
    });

    it('should return "medium" for 2 incorrect attempts', () => {
      const result = getHintUrgency(2, 5);
      expect(result).toBe('medium');
    });

    it('should return "high" for 3+ attempts and long wait', () => {
      const result = getHintUrgency(3, 20);
      expect(result).toBe('high');
    });

    it('should return "medium" for 3+ attempts but short wait', () => {
      const result = getHintUrgency(3, 5);
      expect(result).toBe('medium');
    });

    it('should handle null time for high urgency', () => {
      const result = getHintUrgency(5, null);
      expect(result).toBe('medium');
    });
  });

  describe('formatHintForLogging', () => {
    it('should format hint with error type and level', () => {
      const hint = createTestHint(
        'concept',
        'This is a very long hint that will be truncated in the logging output.',
        ValidationErrorType.METHOD
      );
      const result = formatHintForLogging(hint);

      expect(result).toContain('[method/concept]');
      expect(result).toContain('This is a very long hint that will be truncated');
    });

    it('should truncate long hints at 50 characters', () => {
      const hint = createTestHint(
        'direction',
        'A'.repeat(100),
        ValidationErrorType.ARITHMETIC
      );
      const result = formatHintForLogging(hint);

      expect(result).toMatch(/\[arithmetic\/direction\] A{50}\.\.\./);
    });
  });

  describe('areHintsSimilar', () => {
    it('should detect identical hints', () => {
      const hint1 = 'Try subtracting 5 from both sides.';
      const hint2 = 'Try subtracting 5 from both sides.';

      expect(areHintsSimilar(hint1, hint2)).toBe(true);
    });

    it('should detect similar hints with different wording', () => {
      const hint1 = 'Subtract 5 from both sides of the equation.';
      const hint2 = 'Subtract 5 from both sides to simplify.';

      expect(areHintsSimilar(hint1, hint2, 0.6)).toBe(true);
    });

    it('should detect different hints', () => {
      const hint1 = 'Subtract 5 from both sides.';
      const hint2 = 'Multiply both sides by 2.';

      expect(areHintsSimilar(hint1, hint2, 0.7)).toBe(false);
    });

    it('should be case insensitive', () => {
      const hint1 = 'SUBTRACT 5 FROM BOTH SIDES.';
      const hint2 = 'subtract 5 from both sides.';

      expect(areHintsSimilar(hint1, hint2)).toBe(true);
    });

    it('should respect custom threshold', () => {
      const hint1 = 'Try subtracting 5.';
      const hint2 = 'Try multiplying by 2.';

      // Common word is "try" = 1/4 = 0.25 similarity
      // Low threshold (0.2) - should be similar
      expect(areHintsSimilar(hint1, hint2, 0.2)).toBe(true);

      // High threshold - should be different
      expect(areHintsSimilar(hint1, hint2, 0.7)).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(areHintsSimilar('', '', 0.7)).toBe(true);
      expect(areHintsSimilar('some hint', '', 0.7)).toBe(false);
    });
  });
});

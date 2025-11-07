/**
 * Hint Library
 *
 * Progressive hints for common linear equation errors.
 * Organized by error type with three escalation levels:
 * - concept: Abstract thinking cue
 * - direction: Intermediate guidance
 * - micro: Specific next step (never reveals full solution)
 *
 * All hints support LaTeX with $ delimiters for KaTeX rendering.
 */

import { HintEntry } from '../app/types/Hint';
import { ValidationErrorType } from '../app/types/Validation';
import { ProblemCategory } from '../app/types/Problem';

/**
 * Hint library organized by error type and category
 */
export const HINT_LIBRARY: HintEntry[] = [
  // ==========================================
  // SYNTAX ERRORS - LINEAR EQUATIONS
  // ==========================================
  {
    id: 'syntax_le_concept_1',
    errorType: ValidationErrorType.SYNTAX,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'concept',
    text: 'Check that your equation is balanced - both sides should have an equals sign with expressions on each side.',
    plainText: 'Check that your equation is balanced - both sides should have an equals sign with expressions on each side.',
    tags: ['equation', 'syntax', 'format'],
    priority: 10,
  },
  {
    id: 'syntax_le_concept_2',
    errorType: ValidationErrorType.SYNTAX,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'concept',
    text: 'Make sure you\'re using proper mathematical notation. Variables and numbers should be clearly written.',
    plainText: 'Make sure you\'re using proper mathematical notation. Variables and numbers should be clearly written.',
    tags: ['notation', 'syntax', 'format'],
    priority: 9,
  },
  {
    id: 'syntax_le_direction_1',
    errorType: ValidationErrorType.SYNTAX,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'direction',
    text: 'Double-check that you have an $=$ sign separating the left and right sides of your equation.',
    plainText: 'Double-check that you have an equals sign separating the left and right sides of your equation.',
    tags: ['equals', 'syntax', 'structure'],
    priority: 10,
  },
  {
    id: 'syntax_le_direction_2',
    errorType: ValidationErrorType.SYNTAX,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'direction',
    text: 'Verify that all your terms are properly written. For example, $2x$ means $2 \\times x$.',
    plainText: 'Verify that all your terms are properly written. For example, 2x means 2 times x.',
    tags: ['terms', 'syntax', 'notation'],
    priority: 9,
  },
  {
    id: 'syntax_le_micro_1',
    errorType: ValidationErrorType.SYNTAX,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'micro',
    text: 'Rewrite your equation with the format: [left side] $=$ [right side]. Make sure both sides are complete.',
    plainText: 'Rewrite your equation with the format: [left side] = [right side]. Make sure both sides are complete.',
    tags: ['format', 'syntax', 'structure'],
    priority: 10,
  },

  // ==========================================
  // ARITHMETIC ERRORS - LINEAR EQUATIONS
  // ==========================================
  {
    id: 'arithmetic_le_concept_1',
    errorType: ValidationErrorType.ARITHMETIC,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'concept',
    text: 'Double-check your arithmetic. Did you add, subtract, multiply, or divide correctly?',
    plainText: 'Double-check your arithmetic. Did you add, subtract, multiply, or divide correctly?',
    tags: ['calculation', 'arithmetic', 'compute'],
    priority: 10,
  },
  {
    id: 'arithmetic_le_concept_2',
    errorType: ValidationErrorType.ARITHMETIC,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'concept',
    text: 'Review the rules for working with negative numbers and signed operations.',
    plainText: 'Review the rules for working with negative numbers and signed operations.',
    tags: ['negative', 'arithmetic', 'signs'],
    priority: 8,
  },
  {
    id: 'arithmetic_le_direction_1',
    errorType: ValidationErrorType.ARITHMETIC,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'direction',
    text: 'Carefully recalculate the numbers in your step. Check addition and subtraction with negative numbers.',
    plainText: 'Carefully recalculate the numbers in your step. Check addition and subtraction with negative numbers.',
    tags: ['calculation', 'arithmetic', 'negative'],
    priority: 10,
  },
  {
    id: 'arithmetic_le_direction_2',
    errorType: ValidationErrorType.ARITHMETIC,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'direction',
    text: 'When combining like terms, make sure to add or subtract the coefficients correctly.',
    plainText: 'When combining like terms, make sure to add or subtract the coefficients correctly.',
    tags: ['combine', 'arithmetic', 'terms'],
    priority: 9,
  },
  {
    id: 'arithmetic_le_micro_1',
    errorType: ValidationErrorType.ARITHMETIC,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'micro',
    text: 'Go through your calculation step-by-step. Write out $a + b$ or $a - b$ and compute the result carefully.',
    plainText: 'Go through your calculation step-by-step. Write out a + b or a - b and compute the result carefully.',
    tags: ['calculation', 'arithmetic', 'step'],
    priority: 10,
  },
  {
    id: 'arithmetic_le_micro_2',
    errorType: ValidationErrorType.ARITHMETIC,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'micro',
    text: 'Remember: when you have $a - (-b)$, this becomes $a + b$ because subtracting a negative is the same as adding.',
    plainText: 'Remember: when you have a - (-b), this becomes a + b because subtracting a negative is the same as adding.',
    tags: ['negative', 'arithmetic', 'signs'],
    priority: 9,
  },

  // ==========================================
  // LOGIC ERRORS - LINEAR EQUATIONS
  // ==========================================
  {
    id: 'logic_le_concept_1',
    errorType: ValidationErrorType.LOGIC,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'concept',
    text: 'Think about what operation would help isolate the variable $x$ on one side of the equation.',
    plainText: 'Think about what operation would help isolate the variable x on one side of the equation.',
    tags: ['isolate', 'logic', 'variable'],
    priority: 10,
  },
  {
    id: 'logic_le_concept_2',
    errorType: ValidationErrorType.LOGIC,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'concept',
    text: 'Remember: whatever you do to one side of the equation, you must do to the other side to keep it balanced.',
    plainText: 'Remember: whatever you do to one side of the equation, you must do to the other side to keep it balanced.',
    tags: ['balance', 'logic', 'both-sides'],
    priority: 10,
  },
  {
    id: 'logic_le_concept_3',
    errorType: ValidationErrorType.LOGIC,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'concept',
    text: 'Is your step moving you closer to having $x$ by itself? Or are you making the equation more complicated?',
    plainText: 'Is your step moving you closer to having x by itself? Or are you making the equation more complicated?',
    tags: ['progress', 'logic', 'simplify'],
    priority: 9,
  },
  {
    id: 'logic_le_direction_1',
    errorType: ValidationErrorType.LOGIC,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'direction',
    text: 'Try to move all terms with $x$ to one side and all constant numbers to the other side.',
    plainText: 'Try to move all terms with x to one side and all constant numbers to the other side.',
    tags: ['collect', 'logic', 'organize'],
    priority: 10,
  },
  {
    id: 'logic_le_direction_2',
    errorType: ValidationErrorType.LOGIC,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'direction',
    text: 'To move a term to the other side, apply the inverse operation. For example, to remove $+5$, subtract $5$ from both sides.',
    plainText: 'To move a term to the other side, apply the inverse operation. For example, to remove +5, subtract 5 from both sides.',
    tags: ['inverse', 'logic', 'move'],
    priority: 10,
  },
  {
    id: 'logic_le_direction_3',
    errorType: ValidationErrorType.LOGIC,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'direction',
    text: 'If you have $2x$ and want just $x$, what operation would "undo" the multiplication by $2$?',
    plainText: 'If you have 2x and want just x, what operation would "undo" the multiplication by 2?',
    tags: ['coefficient', 'logic', 'division'],
    priority: 9,
  },
  {
    id: 'logic_le_micro_1',
    errorType: ValidationErrorType.LOGIC,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'micro',
    text: 'Look at the constant term on the same side as $x$. Try adding or subtracting it from both sides to move it.',
    plainText: 'Look at the constant term on the same side as x. Try adding or subtracting it from both sides to move it.',
    tags: ['constant', 'logic', 'move'],
    priority: 10,
  },
  {
    id: 'logic_le_micro_2',
    errorType: ValidationErrorType.LOGIC,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'micro',
    text: 'After moving constants, if you have something like $2x = 10$, divide both sides by the coefficient of $x$.',
    plainText: 'After moving constants, if you have something like 2x = 10, divide both sides by the coefficient of x.',
    tags: ['coefficient', 'logic', 'division'],
    priority: 10,
  },

  // ==========================================
  // METHOD ERRORS - LINEAR EQUATIONS
  // ==========================================
  {
    id: 'method_le_concept_1',
    errorType: ValidationErrorType.METHOD,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'concept',
    text: 'Are you working towards solving for $x$? Make sure each step gets you closer to $x = $ [number].',
    plainText: 'Are you working towards solving for x? Make sure each step gets you closer to x = [number].',
    tags: ['goal', 'method', 'solve'],
    priority: 10,
  },
  {
    id: 'method_le_concept_2',
    errorType: ValidationErrorType.METHOD,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'concept',
    text: 'For linear equations, the typical approach is: combine like terms, move constants, then divide by the coefficient.',
    plainText: 'For linear equations, the typical approach is: combine like terms, move constants, then divide by the coefficient.',
    tags: ['strategy', 'method', 'process'],
    priority: 9,
  },
  {
    id: 'method_le_direction_1',
    errorType: ValidationErrorType.METHOD,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'direction',
    text: 'Start by simplifying each side of the equation separately. Combine any like terms first.',
    plainText: 'Start by simplifying each side of the equation separately. Combine any like terms first.',
    tags: ['simplify', 'method', 'combine'],
    priority: 10,
  },
  {
    id: 'method_le_direction_2',
    errorType: ValidationErrorType.METHOD,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'direction',
    text: 'Once simplified, use inverse operations to isolate $x$. Remember to work on both sides equally.',
    plainText: 'Once simplified, use inverse operations to isolate x. Remember to work on both sides equally.',
    tags: ['isolate', 'method', 'inverse'],
    priority: 9,
  },
  {
    id: 'method_le_micro_1',
    errorType: ValidationErrorType.METHOD,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'micro',
    text: 'First, combine any $x$ terms on the left side, and any constant numbers on the right side.',
    plainText: 'First, combine any x terms on the left side, and any constant numbers on the right side.',
    tags: ['combine', 'method', 'organize'],
    priority: 10,
  },
  {
    id: 'method_le_micro_2',
    errorType: ValidationErrorType.METHOD,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'micro',
    text: 'After combining, look at what\'s "attached" to $x$ (like $+5$ or $\\times 2$) and apply the inverse operation.',
    plainText: 'After combining, look at what\'s "attached" to x (like +5 or times 2) and apply the inverse operation.',
    tags: ['inverse', 'method', 'operation'],
    priority: 10,
  },

  // ==========================================
  // UNKNOWN ERRORS - LINEAR EQUATIONS
  // ==========================================
  {
    id: 'unknown_le_concept_1',
    errorType: ValidationErrorType.UNKNOWN,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'concept',
    text: 'Take a moment to review your work. What are you trying to accomplish with this step?',
    plainText: 'Take a moment to review your work. What are you trying to accomplish with this step?',
    tags: ['review', 'unknown', 'general'],
    priority: 5,
  },
  {
    id: 'unknown_le_direction_1',
    errorType: ValidationErrorType.UNKNOWN,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'direction',
    text: 'Check your step carefully for any mathematical errors or unclear notation.',
    plainText: 'Check your step carefully for any mathematical errors or unclear notation.',
    tags: ['check', 'unknown', 'general'],
    priority: 5,
  },
  {
    id: 'unknown_le_micro_1',
    errorType: ValidationErrorType.UNKNOWN,
    category: ProblemCategory.LINEAR_EQUATIONS,
    level: 'micro',
    text: 'Try simplifying the current equation and think about what operation would help isolate $x$.',
    plainText: 'Try simplifying the current equation and think about what operation would help isolate x.',
    tags: ['simplify', 'unknown', 'general'],
    priority: 5,
  },
];

/**
 * Get all hints for a specific error type and category
 */
export function getHintsByErrorType(
  errorType: ValidationErrorType,
  category: ProblemCategory = ProblemCategory.LINEAR_EQUATIONS
): HintEntry[] {
  return HINT_LIBRARY.filter(
    (hint) => hint.errorType === errorType && hint.category === category
  );
}

/**
 * Get hints by escalation level
 */
export function getHintsByLevel(
  errorType: ValidationErrorType,
  level: 'concept' | 'direction' | 'micro',
  category: ProblemCategory = ProblemCategory.LINEAR_EQUATIONS
): HintEntry[] {
  return HINT_LIBRARY.filter(
    (hint) =>
      hint.errorType === errorType &&
      hint.category === category &&
      hint.level === level
  ).sort((a, b) => (b.priority || 0) - (a.priority || 0)); // Sort by priority descending
}

/**
 * Get a single hint matching criteria
 * Returns the highest priority hint if multiple match
 */
export function getHint(
  errorType: ValidationErrorType,
  level: 'concept' | 'direction' | 'micro',
  category: ProblemCategory = ProblemCategory.LINEAR_EQUATIONS
): HintEntry | null {
  const hints = getHintsByLevel(errorType, level, category);
  return hints.length > 0 ? hints[0] : null;
}

/**
 * Get total hint count
 */
export function getHintCount(): number {
  return HINT_LIBRARY.length;
}

/**
 * Get hint statistics
 */
export function getHintStats() {
  const byErrorType = HINT_LIBRARY.reduce((acc, hint) => {
    acc[hint.errorType] = (acc[hint.errorType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byLevel = HINT_LIBRARY.reduce((acc, hint) => {
    acc[hint.level] = (acc[hint.level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    total: HINT_LIBRARY.length,
    byErrorType,
    byLevel,
  };
}

/**
 * Problem Data Library
 *
 * Hardcoded problem library for MVP.
 * Contains 25 linear equation problems with varying difficulty.
 */

import { Problem, ProblemCategory, ProblemDifficulty } from '../types/Problem';

/**
 * Linear equation problems library
 * 5 easy + 10 medium + 10 hard = 25 total problems
 */
export const LINEAR_EQUATION_PROBLEMS: Problem[] = [
  // ==================== EASY - One-step equations (5 problems) ====================
  {
    id: 'le_easy_01',
    category: ProblemCategory.LINEAR_EQUATIONS,
    difficulty: ProblemDifficulty.EASY,
    text: 'Solve for x: x + 5 = 12',
    latex: 'x + 5 = 12',
    answer: '7',
    answerLatex: 'x = 7',
    expectedSteps: [
      {
        stepNumber: 1,
        description: 'Subtract 5 from both sides',
        expression: 'x + 5 - 5 = 12 - 5',
        operation: 'subtract 5 from both sides',
      },
      {
        stepNumber: 2,
        description: 'Simplify',
        expression: 'x = 7',
        operation: 'simplify',
      },
    ],
    tags: ['one-step', 'addition'],
  },
  {
    id: 'le_easy_02',
    category: ProblemCategory.LINEAR_EQUATIONS,
    difficulty: ProblemDifficulty.EASY,
    text: 'Solve for x: x - 8 = 3',
    latex: 'x - 8 = 3',
    answer: '11',
    answerLatex: 'x = 11',
    expectedSteps: [
      {
        stepNumber: 1,
        description: 'Add 8 to both sides',
        expression: 'x - 8 + 8 = 3 + 8',
        operation: 'add 8 to both sides',
      },
      {
        stepNumber: 2,
        description: 'Simplify',
        expression: 'x = 11',
        operation: 'simplify',
      },
    ],
    tags: ['one-step', 'subtraction'],
  },
  {
    id: 'le_easy_03',
    category: ProblemCategory.LINEAR_EQUATIONS,
    difficulty: ProblemDifficulty.EASY,
    text: 'Solve for x: 3x = 15',
    latex: '3x = 15',
    answer: '5',
    answerLatex: 'x = 5',
    expectedSteps: [
      {
        stepNumber: 1,
        description: 'Divide both sides by 3',
        expression: '\\frac{3x}{3} = \\frac{15}{3}',
        operation: 'divide both sides by 3',
      },
      {
        stepNumber: 2,
        description: 'Simplify',
        expression: 'x = 5',
        operation: 'simplify',
      },
    ],
    tags: ['one-step', 'multiplication'],
  },
  {
    id: 'le_easy_04',
    category: ProblemCategory.LINEAR_EQUATIONS,
    difficulty: ProblemDifficulty.EASY,
    text: 'Solve for x: x/4 = 2',
    latex: '\\frac{x}{4} = 2',
    answer: '8',
    answerLatex: 'x = 8',
    expectedSteps: [
      {
        stepNumber: 1,
        description: 'Multiply both sides by 4',
        expression: '4 \\cdot \\frac{x}{4} = 2 \\cdot 4',
        operation: 'multiply both sides by 4',
      },
      {
        stepNumber: 2,
        description: 'Simplify',
        expression: 'x = 8',
        operation: 'simplify',
      },
    ],
    tags: ['one-step', 'division'],
  },
  {
    id: 'le_easy_05',
    category: ProblemCategory.LINEAR_EQUATIONS,
    difficulty: ProblemDifficulty.EASY,
    text: 'Solve for x: 2x = 18',
    latex: '2x = 18',
    answer: '9',
    answerLatex: 'x = 9',
    expectedSteps: [
      {
        stepNumber: 1,
        description: 'Divide both sides by 2',
        expression: '\\frac{2x}{2} = \\frac{18}{2}',
        operation: 'divide both sides by 2',
      },
      {
        stepNumber: 2,
        description: 'Simplify',
        expression: 'x = 9',
        operation: 'simplify',
      },
    ],
    tags: ['one-step', 'multiplication'],
  },

  // ==================== MEDIUM - Two-step equations (10 problems) ====================
  {
    id: 'le_medium_01',
    category: ProblemCategory.LINEAR_EQUATIONS,
    difficulty: ProblemDifficulty.MEDIUM,
    text: 'Solve for x: 2x + 3 = 11',
    latex: '2x + 3 = 11',
    answer: '4',
    answerLatex: 'x = 4',
    expectedSteps: [
      {
        stepNumber: 1,
        description: 'Subtract 3 from both sides',
        expression: '2x + 3 - 3 = 11 - 3',
        operation: 'subtract 3 from both sides',
      },
      {
        stepNumber: 2,
        description: 'Simplify',
        expression: '2x = 8',
        operation: 'simplify',
      },
      {
        stepNumber: 3,
        description: 'Divide both sides by 2',
        expression: '\\frac{2x}{2} = \\frac{8}{2}',
        operation: 'divide both sides by 2',
      },
      {
        stepNumber: 4,
        description: 'Simplify',
        expression: 'x = 4',
        operation: 'simplify',
      },
    ],
    tags: ['two-step', 'addition', 'multiplication'],
  },
  {
    id: 'le_medium_02',
    category: ProblemCategory.LINEAR_EQUATIONS,
    difficulty: ProblemDifficulty.MEDIUM,
    text: 'Solve for x: 5x - 7 = 18',
    latex: '5x - 7 = 18',
    answer: '5',
    answerLatex: 'x = 5',
    expectedSteps: [
      {
        stepNumber: 1,
        description: 'Add 7 to both sides',
        expression: '5x - 7 + 7 = 18 + 7',
        operation: 'add 7 to both sides',
      },
      {
        stepNumber: 2,
        description: 'Simplify',
        expression: '5x = 25',
        operation: 'simplify',
      },
      {
        stepNumber: 3,
        description: 'Divide both sides by 5',
        expression: '\\frac{5x}{5} = \\frac{25}{5}',
        operation: 'divide both sides by 5',
      },
      {
        stepNumber: 4,
        description: 'Simplify',
        expression: 'x = 5',
        operation: 'simplify',
      },
    ],
    tags: ['two-step', 'subtraction', 'multiplication'],
  },
  {
    id: 'le_medium_03',
    category: ProblemCategory.LINEAR_EQUATIONS,
    difficulty: ProblemDifficulty.MEDIUM,
    text: 'Solve for x: 3x + 4 = 19',
    latex: '3x + 4 = 19',
    answer: '5',
    answerLatex: 'x = 5',
    expectedSteps: [
      {
        stepNumber: 1,
        description: 'Subtract 4 from both sides',
        expression: '3x + 4 - 4 = 19 - 4',
        operation: 'subtract 4 from both sides',
      },
      {
        stepNumber: 2,
        description: 'Simplify',
        expression: '3x = 15',
        operation: 'simplify',
      },
      {
        stepNumber: 3,
        description: 'Divide both sides by 3',
        expression: '\\frac{3x}{3} = \\frac{15}{3}',
        operation: 'divide both sides by 3',
      },
      {
        stepNumber: 4,
        description: 'Simplify',
        expression: 'x = 5',
        operation: 'simplify',
      },
    ],
    tags: ['two-step', 'addition', 'multiplication'],
  },
  {
    id: 'le_medium_04',
    category: ProblemCategory.LINEAR_EQUATIONS,
    difficulty: ProblemDifficulty.MEDIUM,
    text: 'Solve for x: x/2 + 5 = 9',
    latex: '\\frac{x}{2} + 5 = 9',
    answer: '8',
    answerLatex: 'x = 8',
    expectedSteps: [
      {
        stepNumber: 1,
        description: 'Subtract 5 from both sides',
        expression: '\\frac{x}{2} + 5 - 5 = 9 - 5',
        operation: 'subtract 5 from both sides',
      },
      {
        stepNumber: 2,
        description: 'Simplify',
        expression: '\\frac{x}{2} = 4',
        operation: 'simplify',
      },
      {
        stepNumber: 3,
        description: 'Multiply both sides by 2',
        expression: '2 \\cdot \\frac{x}{2} = 4 \\cdot 2',
        operation: 'multiply both sides by 2',
      },
      {
        stepNumber: 4,
        description: 'Simplify',
        expression: 'x = 8',
        operation: 'simplify',
      },
    ],
    tags: ['two-step', 'division', 'addition'],
  },
  {
    id: 'le_medium_05',
    category: ProblemCategory.LINEAR_EQUATIONS,
    difficulty: ProblemDifficulty.MEDIUM,
    text: 'Solve for x: 4x - 9 = 7',
    latex: '4x - 9 = 7',
    answer: '4',
    answerLatex: 'x = 4',
    expectedSteps: [
      {
        stepNumber: 1,
        description: 'Add 9 to both sides',
        expression: '4x - 9 + 9 = 7 + 9',
        operation: 'add 9 to both sides',
      },
      {
        stepNumber: 2,
        description: 'Simplify',
        expression: '4x = 16',
        operation: 'simplify',
      },
      {
        stepNumber: 3,
        description: 'Divide both sides by 4',
        expression: '\\frac{4x}{4} = \\frac{16}{4}',
        operation: 'divide both sides by 4',
      },
      {
        stepNumber: 4,
        description: 'Simplify',
        expression: 'x = 4',
        operation: 'simplify',
      },
    ],
    tags: ['two-step', 'subtraction', 'multiplication'],
  },
  {
    id: 'le_medium_06',
    category: ProblemCategory.LINEAR_EQUATIONS,
    difficulty: ProblemDifficulty.MEDIUM,
    text: 'Solve for x: 6x + 2 = 20',
    latex: '6x + 2 = 20',
    answer: '3',
    answerLatex: 'x = 3',
    expectedSteps: [
      {
        stepNumber: 1,
        description: 'Subtract 2 from both sides',
        expression: '6x + 2 - 2 = 20 - 2',
        operation: 'subtract 2 from both sides',
      },
      {
        stepNumber: 2,
        description: 'Simplify',
        expression: '6x = 18',
        operation: 'simplify',
      },
      {
        stepNumber: 3,
        description: 'Divide both sides by 6',
        expression: '\\frac{6x}{6} = \\frac{18}{6}',
        operation: 'divide both sides by 6',
      },
      {
        stepNumber: 4,
        description: 'Simplify',
        expression: 'x = 3',
        operation: 'simplify',
      },
    ],
    tags: ['two-step', 'addition', 'multiplication'],
  },
  {
    id: 'le_medium_07',
    category: ProblemCategory.LINEAR_EQUATIONS,
    difficulty: ProblemDifficulty.MEDIUM,
    text: 'Solve for x: x/3 - 4 = 2',
    latex: '\\frac{x}{3} - 4 = 2',
    answer: '18',
    answerLatex: 'x = 18',
    expectedSteps: [
      {
        stepNumber: 1,
        description: 'Add 4 to both sides',
        expression: '\\frac{x}{3} - 4 + 4 = 2 + 4',
        operation: 'add 4 to both sides',
      },
      {
        stepNumber: 2,
        description: 'Simplify',
        expression: '\\frac{x}{3} = 6',
        operation: 'simplify',
      },
      {
        stepNumber: 3,
        description: 'Multiply both sides by 3',
        expression: '3 \\cdot \\frac{x}{3} = 6 \\cdot 3',
        operation: 'multiply both sides by 3',
      },
      {
        stepNumber: 4,
        description: 'Simplify',
        expression: 'x = 18',
        operation: 'simplify',
      },
    ],
    tags: ['two-step', 'division', 'subtraction'],
  },
  {
    id: 'le_medium_08',
    category: ProblemCategory.LINEAR_EQUATIONS,
    difficulty: ProblemDifficulty.MEDIUM,
    text: 'Solve for x: 7x - 5 = 16',
    latex: '7x - 5 = 16',
    answer: '3',
    answerLatex: 'x = 3',
    expectedSteps: [
      {
        stepNumber: 1,
        description: 'Add 5 to both sides',
        expression: '7x - 5 + 5 = 16 + 5',
        operation: 'add 5 to both sides',
      },
      {
        stepNumber: 2,
        description: 'Simplify',
        expression: '7x = 21',
        operation: 'simplify',
      },
      {
        stepNumber: 3,
        description: 'Divide both sides by 7',
        expression: '\\frac{7x}{7} = \\frac{21}{7}',
        operation: 'divide both sides by 7',
      },
      {
        stepNumber: 4,
        description: 'Simplify',
        expression: 'x = 3',
        operation: 'simplify',
      },
    ],
    tags: ['two-step', 'subtraction', 'multiplication'],
  },
  {
    id: 'le_medium_09',
    category: ProblemCategory.LINEAR_EQUATIONS,
    difficulty: ProblemDifficulty.MEDIUM,
    text: 'Solve for x: 8x + 1 = 25',
    latex: '8x + 1 = 25',
    answer: '3',
    answerLatex: 'x = 3',
    expectedSteps: [
      {
        stepNumber: 1,
        description: 'Subtract 1 from both sides',
        expression: '8x + 1 - 1 = 25 - 1',
        operation: 'subtract 1 from both sides',
      },
      {
        stepNumber: 2,
        description: 'Simplify',
        expression: '8x = 24',
        operation: 'simplify',
      },
      {
        stepNumber: 3,
        description: 'Divide both sides by 8',
        expression: '\\frac{8x}{8} = \\frac{24}{8}',
        operation: 'divide both sides by 8',
      },
      {
        stepNumber: 4,
        description: 'Simplify',
        expression: 'x = 3',
        operation: 'simplify',
      },
    ],
    tags: ['two-step', 'addition', 'multiplication'],
  },
  {
    id: 'le_medium_10',
    category: ProblemCategory.LINEAR_EQUATIONS,
    difficulty: ProblemDifficulty.MEDIUM,
    text: 'Solve for x: x/5 + 3 = 7',
    latex: '\\frac{x}{5} + 3 = 7',
    answer: '20',
    answerLatex: 'x = 20',
    expectedSteps: [
      {
        stepNumber: 1,
        description: 'Subtract 3 from both sides',
        expression: '\\frac{x}{5} + 3 - 3 = 7 - 3',
        operation: 'subtract 3 from both sides',
      },
      {
        stepNumber: 2,
        description: 'Simplify',
        expression: '\\frac{x}{5} = 4',
        operation: 'simplify',
      },
      {
        stepNumber: 3,
        description: 'Multiply both sides by 5',
        expression: '5 \\cdot \\frac{x}{5} = 4 \\cdot 5',
        operation: 'multiply both sides by 5',
      },
      {
        stepNumber: 4,
        description: 'Simplify',
        expression: 'x = 20',
        operation: 'simplify',
      },
    ],
    tags: ['two-step', 'division', 'addition'],
  },

  // ==================== HARD - Multi-step with variables on both sides (10 problems) ====================
  {
    id: 'le_hard_01',
    category: ProblemCategory.LINEAR_EQUATIONS,
    difficulty: ProblemDifficulty.HARD,
    text: 'Solve for x: 3x + 7 = 2x + 15',
    latex: '3x + 7 = 2x + 15',
    answer: '8',
    answerLatex: 'x = 8',
    expectedSteps: [
      {
        stepNumber: 1,
        description: 'Subtract 2x from both sides',
        expression: '3x - 2x + 7 = 2x - 2x + 15',
        operation: 'subtract 2x from both sides',
      },
      {
        stepNumber: 2,
        description: 'Simplify',
        expression: 'x + 7 = 15',
        operation: 'simplify',
      },
      {
        stepNumber: 3,
        description: 'Subtract 7 from both sides',
        expression: 'x + 7 - 7 = 15 - 7',
        operation: 'subtract 7 from both sides',
      },
      {
        stepNumber: 4,
        description: 'Simplify',
        expression: 'x = 8',
        operation: 'simplify',
      },
    ],
    tags: ['multi-step', 'variables-both-sides'],
  },
  {
    id: 'le_hard_02',
    category: ProblemCategory.LINEAR_EQUATIONS,
    difficulty: ProblemDifficulty.HARD,
    text: 'Solve for x: 5x - 4 = 3x + 10',
    latex: '5x - 4 = 3x + 10',
    answer: '7',
    answerLatex: 'x = 7',
    expectedSteps: [
      {
        stepNumber: 1,
        description: 'Subtract 3x from both sides',
        expression: '5x - 3x - 4 = 3x - 3x + 10',
        operation: 'subtract 3x from both sides',
      },
      {
        stepNumber: 2,
        description: 'Simplify',
        expression: '2x - 4 = 10',
        operation: 'simplify',
      },
      {
        stepNumber: 3,
        description: 'Add 4 to both sides',
        expression: '2x - 4 + 4 = 10 + 4',
        operation: 'add 4 to both sides',
      },
      {
        stepNumber: 4,
        description: 'Simplify',
        expression: '2x = 14',
        operation: 'simplify',
      },
      {
        stepNumber: 5,
        description: 'Divide both sides by 2',
        expression: '\\frac{2x}{2} = \\frac{14}{2}',
        operation: 'divide both sides by 2',
      },
      {
        stepNumber: 6,
        description: 'Simplify',
        expression: 'x = 7',
        operation: 'simplify',
      },
    ],
    tags: ['multi-step', 'variables-both-sides'],
  },
  {
    id: 'le_hard_03',
    category: ProblemCategory.LINEAR_EQUATIONS,
    difficulty: ProblemDifficulty.HARD,
    text: 'Solve for x: 4x + 9 = x + 24',
    latex: '4x + 9 = x + 24',
    answer: '5',
    answerLatex: 'x = 5',
    expectedSteps: [
      {
        stepNumber: 1,
        description: 'Subtract x from both sides',
        expression: '4x - x + 9 = x - x + 24',
        operation: 'subtract x from both sides',
      },
      {
        stepNumber: 2,
        description: 'Simplify',
        expression: '3x + 9 = 24',
        operation: 'simplify',
      },
      {
        stepNumber: 3,
        description: 'Subtract 9 from both sides',
        expression: '3x + 9 - 9 = 24 - 9',
        operation: 'subtract 9 from both sides',
      },
      {
        stepNumber: 4,
        description: 'Simplify',
        expression: '3x = 15',
        operation: 'simplify',
      },
      {
        stepNumber: 5,
        description: 'Divide both sides by 3',
        expression: '\\frac{3x}{3} = \\frac{15}{3}',
        operation: 'divide both sides by 3',
      },
      {
        stepNumber: 6,
        description: 'Simplify',
        expression: 'x = 5',
        operation: 'simplify',
      },
    ],
    tags: ['multi-step', 'variables-both-sides'],
  },
  {
    id: 'le_hard_04',
    category: ProblemCategory.LINEAR_EQUATIONS,
    difficulty: ProblemDifficulty.HARD,
    text: 'Solve for x: 6x - 8 = 2x + 12',
    latex: '6x - 8 = 2x + 12',
    answer: '5',
    answerLatex: 'x = 5',
    expectedSteps: [
      {
        stepNumber: 1,
        description: 'Subtract 2x from both sides',
        expression: '6x - 2x - 8 = 2x - 2x + 12',
        operation: 'subtract 2x from both sides',
      },
      {
        stepNumber: 2,
        description: 'Simplify',
        expression: '4x - 8 = 12',
        operation: 'simplify',
      },
      {
        stepNumber: 3,
        description: 'Add 8 to both sides',
        expression: '4x - 8 + 8 = 12 + 8',
        operation: 'add 8 to both sides',
      },
      {
        stepNumber: 4,
        description: 'Simplify',
        expression: '4x = 20',
        operation: 'simplify',
      },
      {
        stepNumber: 5,
        description: 'Divide both sides by 4',
        expression: '\\frac{4x}{4} = \\frac{20}{4}',
        operation: 'divide both sides by 4',
      },
      {
        stepNumber: 6,
        description: 'Simplify',
        expression: 'x = 5',
        operation: 'simplify',
      },
    ],
    tags: ['multi-step', 'variables-both-sides'],
  },
  {
    id: 'le_hard_05',
    category: ProblemCategory.LINEAR_EQUATIONS,
    difficulty: ProblemDifficulty.HARD,
    text: 'Solve for x: 7x + 3 = 4x + 18',
    latex: '7x + 3 = 4x + 18',
    answer: '5',
    answerLatex: 'x = 5',
    expectedSteps: [
      {
        stepNumber: 1,
        description: 'Subtract 4x from both sides',
        expression: '7x - 4x + 3 = 4x - 4x + 18',
        operation: 'subtract 4x from both sides',
      },
      {
        stepNumber: 2,
        description: 'Simplify',
        expression: '3x + 3 = 18',
        operation: 'simplify',
      },
      {
        stepNumber: 3,
        description: 'Subtract 3 from both sides',
        expression: '3x + 3 - 3 = 18 - 3',
        operation: 'subtract 3 from both sides',
      },
      {
        stepNumber: 4,
        description: 'Simplify',
        expression: '3x = 15',
        operation: 'simplify',
      },
      {
        stepNumber: 5,
        description: 'Divide both sides by 3',
        expression: '\\frac{3x}{3} = \\frac{15}{3}',
        operation: 'divide both sides by 3',
      },
      {
        stepNumber: 6,
        description: 'Simplify',
        expression: 'x = 5',
        operation: 'simplify',
      },
    ],
    tags: ['multi-step', 'variables-both-sides'],
  },
  {
    id: 'le_hard_06',
    category: ProblemCategory.LINEAR_EQUATIONS,
    difficulty: ProblemDifficulty.HARD,
    text: 'Solve for x: 2x + 11 = 5x - 7',
    latex: '2x + 11 = 5x - 7',
    answer: '6',
    answerLatex: 'x = 6',
    expectedSteps: [
      {
        stepNumber: 1,
        description: 'Subtract 2x from both sides',
        expression: '2x - 2x + 11 = 5x - 2x - 7',
        operation: 'subtract 2x from both sides',
      },
      {
        stepNumber: 2,
        description: 'Simplify',
        expression: '11 = 3x - 7',
        operation: 'simplify',
      },
      {
        stepNumber: 3,
        description: 'Add 7 to both sides',
        expression: '11 + 7 = 3x - 7 + 7',
        operation: 'add 7 to both sides',
      },
      {
        stepNumber: 4,
        description: 'Simplify',
        expression: '18 = 3x',
        operation: 'simplify',
      },
      {
        stepNumber: 5,
        description: 'Divide both sides by 3',
        expression: '\\frac{18}{3} = \\frac{3x}{3}',
        operation: 'divide both sides by 3',
      },
      {
        stepNumber: 6,
        description: 'Simplify',
        expression: '6 = x',
        operation: 'simplify',
      },
    ],
    tags: ['multi-step', 'variables-both-sides'],
  },
  {
    id: 'le_hard_07',
    category: ProblemCategory.LINEAR_EQUATIONS,
    difficulty: ProblemDifficulty.HARD,
    text: 'Solve for x: 8x - 5 = 3x + 20',
    latex: '8x - 5 = 3x + 20',
    answer: '5',
    answerLatex: 'x = 5',
    expectedSteps: [
      {
        stepNumber: 1,
        description: 'Subtract 3x from both sides',
        expression: '8x - 3x - 5 = 3x - 3x + 20',
        operation: 'subtract 3x from both sides',
      },
      {
        stepNumber: 2,
        description: 'Simplify',
        expression: '5x - 5 = 20',
        operation: 'simplify',
      },
      {
        stepNumber: 3,
        description: 'Add 5 to both sides',
        expression: '5x - 5 + 5 = 20 + 5',
        operation: 'add 5 to both sides',
      },
      {
        stepNumber: 4,
        description: 'Simplify',
        expression: '5x = 25',
        operation: 'simplify',
      },
      {
        stepNumber: 5,
        description: 'Divide both sides by 5',
        expression: '\\frac{5x}{5} = \\frac{25}{5}',
        operation: 'divide both sides by 5',
      },
      {
        stepNumber: 6,
        description: 'Simplify',
        expression: 'x = 5',
        operation: 'simplify',
      },
    ],
    tags: ['multi-step', 'variables-both-sides'],
  },
  {
    id: 'le_hard_08',
    category: ProblemCategory.LINEAR_EQUATIONS,
    difficulty: ProblemDifficulty.HARD,
    text: 'Solve for x: 9x + 2 = 6x + 17',
    latex: '9x + 2 = 6x + 17',
    answer: '5',
    answerLatex: 'x = 5',
    expectedSteps: [
      {
        stepNumber: 1,
        description: 'Subtract 6x from both sides',
        expression: '9x - 6x + 2 = 6x - 6x + 17',
        operation: 'subtract 6x from both sides',
      },
      {
        stepNumber: 2,
        description: 'Simplify',
        expression: '3x + 2 = 17',
        operation: 'simplify',
      },
      {
        stepNumber: 3,
        description: 'Subtract 2 from both sides',
        expression: '3x + 2 - 2 = 17 - 2',
        operation: 'subtract 2 from both sides',
      },
      {
        stepNumber: 4,
        description: 'Simplify',
        expression: '3x = 15',
        operation: 'simplify',
      },
      {
        stepNumber: 5,
        description: 'Divide both sides by 3',
        expression: '\\frac{3x}{3} = \\frac{15}{3}',
        operation: 'divide both sides by 3',
      },
      {
        stepNumber: 6,
        description: 'Simplify',
        expression: 'x = 5',
        operation: 'simplify',
      },
    ],
    tags: ['multi-step', 'variables-both-sides'],
  },
  {
    id: 'le_hard_09',
    category: ProblemCategory.LINEAR_EQUATIONS,
    difficulty: ProblemDifficulty.HARD,
    text: 'Solve for x: 4x + 13 = x + 28',
    latex: '4x + 13 = x + 28',
    answer: '5',
    answerLatex: 'x = 5',
    expectedSteps: [
      {
        stepNumber: 1,
        description: 'Subtract x from both sides',
        expression: '4x - x + 13 = x - x + 28',
        operation: 'subtract x from both sides',
      },
      {
        stepNumber: 2,
        description: 'Simplify',
        expression: '3x + 13 = 28',
        operation: 'simplify',
      },
      {
        stepNumber: 3,
        description: 'Subtract 13 from both sides',
        expression: '3x + 13 - 13 = 28 - 13',
        operation: 'subtract 13 from both sides',
      },
      {
        stepNumber: 4,
        description: 'Simplify',
        expression: '3x = 15',
        operation: 'simplify',
      },
      {
        stepNumber: 5,
        description: 'Divide both sides by 3',
        expression: '\\frac{3x}{3} = \\frac{15}{3}',
        operation: 'divide both sides by 3',
      },
      {
        stepNumber: 6,
        description: 'Simplify',
        expression: 'x = 5',
        operation: 'simplify',
      },
    ],
    tags: ['multi-step', 'variables-both-sides'],
  },
  {
    id: 'le_hard_10',
    category: ProblemCategory.LINEAR_EQUATIONS,
    difficulty: ProblemDifficulty.HARD,
    text: 'Solve for x: 10x - 6 = 7x + 12',
    latex: '10x - 6 = 7x + 12',
    answer: '6',
    answerLatex: 'x = 6',
    expectedSteps: [
      {
        stepNumber: 1,
        description: 'Subtract 7x from both sides',
        expression: '10x - 7x - 6 = 7x - 7x + 12',
        operation: 'subtract 7x from both sides',
      },
      {
        stepNumber: 2,
        description: 'Simplify',
        expression: '3x - 6 = 12',
        operation: 'simplify',
      },
      {
        stepNumber: 3,
        description: 'Add 6 to both sides',
        expression: '3x - 6 + 6 = 12 + 6',
        operation: 'add 6 to both sides',
      },
      {
        stepNumber: 4,
        description: 'Simplify',
        expression: '3x = 18',
        operation: 'simplify',
      },
      {
        stepNumber: 5,
        description: 'Divide both sides by 3',
        expression: '\\frac{3x}{3} = \\frac{18}{3}',
        operation: 'divide both sides by 3',
      },
      {
        stepNumber: 6,
        description: 'Simplify',
        expression: 'x = 6',
        operation: 'simplify',
      },
    ],
    tags: ['multi-step', 'variables-both-sides'],
  },
];

/**
 * Get problem by ID
 *
 * @param id - Problem ID
 * @returns Problem or undefined if not found
 */
export const getProblemById = (id: string): Problem | undefined => {
  return LINEAR_EQUATION_PROBLEMS.find(p => p.id === id);
};

/**
 * Get problems by difficulty
 *
 * @param difficulty - Difficulty level to filter by
 * @returns Array of problems matching the difficulty
 */
export const getProblemsByDifficulty = (
  difficulty: ProblemDifficulty
): Problem[] => {
  return LINEAR_EQUATION_PROBLEMS.filter(p => p.difficulty === difficulty);
};

/**
 * Get random problem
 *
 * @param difficulty - Optional difficulty filter
 * @returns Random problem from the library
 */
export const getRandomProblem = (
  difficulty?: ProblemDifficulty
): Problem => {
  const problems = difficulty
    ? getProblemsByDifficulty(difficulty)
    : LINEAR_EQUATION_PROBLEMS;

  const randomIndex = Math.floor(Math.random() * problems.length);
  return problems[randomIndex];
};

/**
 * Get next problem in sequence
 *
 * @param currentId - ID of current problem
 * @returns Next problem or null if at end
 */
export const getNextProblem = (currentId: string): Problem | null => {
  const currentIndex = LINEAR_EQUATION_PROBLEMS.findIndex(p => p.id === currentId);
  if (currentIndex === -1 || currentIndex === LINEAR_EQUATION_PROBLEMS.length - 1) {
    return null;
  }
  return LINEAR_EQUATION_PROBLEMS[currentIndex + 1];
};

/**
 * Get previous problem in sequence
 *
 * @param currentId - ID of current problem
 * @returns Previous problem or null if at beginning
 */
export const getPreviousProblem = (currentId: string): Problem | null => {
  const currentIndex = LINEAR_EQUATION_PROBLEMS.findIndex(p => p.id === currentId);
  if (currentIndex <= 0) {
    return null;
  }
  return LINEAR_EQUATION_PROBLEMS[currentIndex - 1];
};

/**
 * Get total number of problems
 *
 * @returns Total problem count
 */
export const getTotalProblems = (): number => {
  return LINEAR_EQUATION_PROBLEMS.length;
};

/**
 * Get problem statistics
 *
 * @returns Statistics about the problem library
 */
export const getProblemStats = () => {
  const easy = getProblemsByDifficulty(ProblemDifficulty.EASY).length;
  const medium = getProblemsByDifficulty(ProblemDifficulty.MEDIUM).length;
  const hard = getProblemsByDifficulty(ProblemDifficulty.HARD).length;

  return {
    total: LINEAR_EQUATION_PROBLEMS.length,
    easy,
    medium,
    hard,
  };
};

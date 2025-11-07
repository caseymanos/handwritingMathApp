# Problem Data Format

This document describes the structure and format of problem data in the Handwriting Math App.

## Overview

The problem library for MVP contains 25 linear equation problems stored in `app/utils/problemData.ts`. Problems are hardcoded for MVP but structured to easily migrate to a database in future versions.

## Problem Interface

### Core Fields

```typescript
interface Problem {
  id: string;                    // Unique identifier (e.g., "le_easy_01")
  category: ProblemCategory;     // Problem category enum
  difficulty: ProblemDifficulty; // Easy, medium, or hard
  text: string;                   // Plain text version for accessibility
  latex: string;                  // LaTeX formatted version for rendering
  answer: string;                 // Final answer (plain text)
  answerLatex: string;           // LaTeX formatted answer
  expectedSteps: ExpectedStep[]; // Solution steps for validation
  hints?: string[];              // Optional hints (used in PR6)
  tags?: string[];               // Tags for categorization
}
```

### Expected Steps

Each step includes:

```typescript
interface ExpectedStep {
  stepNumber: number;   // Sequential step number
  description: string;  // What this step does
  expression: string;   // LaTeX mathematical expression
  operation: string;    // Operation performed (e.g., "add 5 to both sides")
}
```

## LaTeX Formatting Guidelines

### Basic Syntax

- **Fractions**: `\\frac{numerator}{denominator}`
- **Display mode**: Use `\\displaystyle` prefix for larger rendering
- **Multiplication**: Use implicit (`2x`) or explicit (`2 \\cdot x`)
- **Division**: Use fraction notation or `\\div`

### Example Problems

**Easy (one-step):**
```typescript
{
  text: 'Solve for x: x + 5 = 12',
  latex: 'x + 5 = 12',
}
```

**Medium (two-step with fraction):**
```typescript
{
  text: 'Solve for x: x/2 + 3 = 7',
  latex: '\\frac{x}{2} + 3 = 7',
}
```

**Hard (variables both sides):**
```typescript
{
  text: 'Solve for x: 3x + 7 = 2x + 15',
  latex: '3x + 7 = 2x + 15',
}
```

## Problem Categories (MVP)

- **LINEAR_EQUATIONS**: Linear equations (MVP focus - all 25 problems)
- **BASIC_ALGEBRA**: Basic algebraic expressions (future)
- **QUADRATIC**: Quadratic equations (future)
- **GEOMETRY**: Geometric problems (future)

## Difficulty Levels

### EASY (5 problems)
One-step equations requiring a single operation:
- Addition: `x + 5 = 12`
- Subtraction: `x - 8 = 3`
- Multiplication: `3x = 15`
- Division: `x/4 = 2`

### MEDIUM (10 problems)
Two-step equations requiring two operations:
- `2x + 3 = 11`
- `5x - 7 = 18`
- `x/2 + 5 = 9`

### HARD (10 problems)
Multi-step equations with variables on both sides:
- `3x + 7 = 2x + 15`
- `5x - 4 = 3x + 10`
- `4x + 9 = x + 24`

## ID Convention

Problem IDs follow the pattern: `{category}_{difficulty}_{number}`

Examples:
- `le_easy_01` - Linear Equations, Easy, Problem 1
- `le_medium_05` - Linear Equations, Medium, Problem 5
- `le_hard_10` - Linear Equations, Hard, Problem 10

## Adding New Problems

1. Open `app/utils/problemData.ts`
2. Add new problem object to `LINEAR_EQUATION_PROBLEMS` array
3. Follow ID convention
4. Include all expected solution steps
5. Test LaTeX rendering with ProblemDisplay component
6. Verify accessibility text alternative

## Helper Functions

### getProblemById(id: string)
Retrieve a specific problem by ID.

### getProblemsByDifficulty(difficulty: ProblemDifficulty)
Filter problems by difficulty level.

### getRandomProblem(difficulty?: ProblemDifficulty)
Get a random problem, optionally filtered by difficulty.

### getNextProblem(currentId: string)
Get the next problem in sequence.

### getProblemStats()
Get statistics about the problem library:
```typescript
{
  total: 25,
  easy: 5,
  medium: 10,
  hard: 10
}
```

## Expected Steps Format

Expected steps are used in PR5 for validation. Each step should represent a logical operation in solving the equation.

Example for `2x + 3 = 11`:

```typescript
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
]
```

## Accessibility Considerations

- Always include plain text version (`text` field)
- LaTeX should be properly formatted for screen readers
- ProblemDisplay component includes `accessibilityLabel` with text version
- Consider adding audio descriptions for future enhancements

## Future Enhancements

- Dynamic problem generation
- Custom problem sets from teachers
- Problem randomization with constraints
- Difficulty progression based on student performance
- Multi-variable equations
- Systems of equations
- Support for other problem categories (quadratic, geometry, etc.)

## Testing

When adding or modifying problems:

1. **LaTeX Rendering**: Verify math renders correctly in ProblemDisplay
2. **Accessibility**: Test with VoiceOver (iOS) or TalkBack (Android)
3. **Expected Steps**: Ensure steps are logically correct
4. **Answer Validation**: Verify the answer field is correct
5. **Difficulty**: Confirm difficulty classification is appropriate

## Related Files

- `app/types/Problem.ts` - TypeScript type definitions
- `app/utils/problemData.ts` - Problem library implementation
- `app/components/ProblemDisplay.tsx` - Problem rendering component
- `app/components/FormattedStep.tsx` - Step rendering component

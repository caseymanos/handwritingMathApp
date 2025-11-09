# Contributing Guidelines

Welcome to the Handwriting Math App project! This document provides team guidelines for contributing code, maintaining quality, and following established patterns.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Code Quality Standards](#code-quality-standards)
4. [Testing Requirements](#testing-requirements)
5. [Documentation Standards](#documentation-standards)
6. [Pull Request Process](#pull-request-process)
7. [Common Patterns](#common-patterns)
8. [Troubleshooting](#troubleshooting)
9. [Getting Help](#getting-help)

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

1. ✅ Read [docs/SETUP.md](docs/SETUP.md) for environment setup
2. ✅ Reviewed [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system design
3. ✅ Explored [docs/FILE_STRUCTURE.md](docs/FILE_STRUCTURE.md) for project organization
4. ✅ Understood [docs/STATE_MANAGEMENT.md](docs/STATE_MANAGEMENT.md) for Zustand patterns

### Development Environment

- **Node.js:** 20.0.0+
- **Xcode:** 15.0+ (for iOS development)
- **CocoaPods:** 1.12+
- **Git:** 2.30+

See [docs/SETUP.md](docs/SETUP.md) for complete setup instructions.

---

## Development Workflow

### Branch Strategy

```bash
# Feature branches
git checkout -b feature/short-description
# Example: git checkout -b feature/voice-hints

# Bug fixes
git checkout -b fix/issue-description
# Example: git checkout -b fix/canvas-lag

# Documentation
git checkout -b docs/what-youre-documenting
# Example: git checkout -b docs/api-integration

# Refactoring
git checkout -b refactor/what-youre-refactoring
# Example: git checkout -b refactor/validation-store
```

**Branch Naming Rules:**
- Use kebab-case (lowercase, hyphenated)
- Start with type prefix: `feature/`, `fix/`, `docs/`, `refactor/`, `test/`, `chore/`
- Keep names short and descriptive (max 50 chars)

---

### Commit Message Format

We follow **Conventional Commits** specification:

```
type(scope): brief description

- Detailed change 1
- Detailed change 2

Refs: #issue-number (if applicable)
```

#### Types

| Type | Purpose | Example |
|------|---------|---------|
| `feat` | New feature | `feat(hints): add voice hint support` |
| `fix` | Bug fix | `fix(canvas): resolve lag on iPad 9th gen` |
| `docs` | Documentation | `docs(api): update MyScript setup guide` |
| `style` | Code style (formatting, semicolons) | `style(components): apply Prettier formatting` |
| `refactor` | Code refactoring (no behavior change) | `refactor(stores): simplify validation logic` |
| `test` | Add/update tests | `test(validation): add edge case tests` |
| `chore` | Maintenance (deps, config) | `chore(deps): upgrade React Native to 0.77` |
| `perf` | Performance improvement | `perf(canvas): optimize stroke rendering` |

#### Scopes

Use domain-specific scopes:

- **Components:** `canvas`, `validation`, `hints`, `ui`
- **Stores:** `canvasStore`, `validationStore`, `hintStore`, `progressStore`, `uiStore`
- **Utils:** `recognition`, `mathValidation`, `storage`, `sync`
- **Screens:** `home`, `training`, `review`, `settings`
- **Navigation:** `navigation`, `routes`
- **API:** `myScript`, `upStudy`, `cameraMath`, `supabase`
- **Build:** `ios`, `android`, `deps`, `config`

#### Examples

**Good:**
```
feat(hints): implement progressive hint escalation

- Add per-error-type escalation tracking
- Create hint level state in hintStore
- Integrate with ValidationFeedback component

Refs: #42
```

**Bad:**
```
Added some stuff
```

---

### Code Review Checklist

Before requesting review:

- [ ] All tests pass (`npm test`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Code linted (`npm run lint`)
- [ ] Code formatted (`npm run format`)
- [ ] No console.log statements (use Sentry for production logging)
- [ ] Documentation updated (if adding features)
- [ ] CHANGELOG.md updated (if user-facing change)

---

## Code Quality Standards

### TypeScript

**Strict Mode Enabled:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Rules:**
- ✅ Explicit return types for functions
- ✅ Interface over type (for consistency)
- ✅ No `any` type (use `unknown` if truly unknown)
- ✅ Use optional chaining (`?.`) and nullish coalescing (`??`)

**Good:**
```typescript
// Explicit types
interface ValidationResult {
  isCorrect: boolean;
  feedback: string;
}

function validateStep(input: string): ValidationResult {
  // ...
  return { isCorrect: true, feedback: 'Correct!' };
}

// Optional chaining
const userName = user?.profile?.name ?? 'Guest';
```

**Bad:**
```typescript
// Implicit any
function processData(data) {
  return data.map((item) => item.value);
}

// No return type
function calculate(x: number, y: number) {
  return x + y;
}
```

---

### Component Patterns

**Functional Components with TypeScript:**

```typescript
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, styles[variant]]}
    >
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: Spacing.md,
    borderRadius: 8,
  },
  primary: {
    backgroundColor: Colors.primary.main,
  },
  secondary: {
    backgroundColor: Colors.secondary.main,
  },
  label: {
    ...TextStyles.button,
    color: Colors.text.inverse,
  },
});
```

**Key Points:**
- Use `React.FC<Props>` for component typing
- Default prop values in destructuring
- Import styles from centralized system (`app/styles/`)
- Accessibility labels for interactive elements

---

### Store Patterns

See [docs/STATE_MANAGEMENT.md](docs/STATE_MANAGEMENT.md) for complete guide.

**Example Store:**

```typescript
import { create } from 'zustand';
import { storage } from '../utils/storage';

interface ExampleStoreState {
  count: number;
  increment: () => void;
  reset: () => void;
}

const STORAGE_KEY = '@example:count';

function saveToStorage(count: number) {
  storage.set(STORAGE_KEY, count.toString());
}

function loadFromStorage(): number {
  const saved = storage.getString(STORAGE_KEY);
  return saved ? parseInt(saved, 10) : 0;
}

export const useExampleStore = create<ExampleStoreState>((set, get) => ({
  count: loadFromStorage(),

  increment: () => set((state) => {
    const newCount = state.count + 1;
    saveToStorage(newCount);
    return { count: newCount };
  }),

  reset: () => set(() => {
    saveToStorage(0);
    return { count: 0 };
  }),
}));
```

---

### Styling

**Centralized Style System:**

```typescript
import { StyleSheet } from 'react-native';
import { Colors, Spacing, TextStyles } from '../styles';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,  // Use spacing constants
    backgroundColor: Colors.ui.background,  // Use color constants
  },
  title: {
    ...TextStyles.h1,  // Use typography styles
    color: Colors.text.primary,
  },
});
```

**No Magic Numbers:**

```typescript
// ❌ Bad
const styles = StyleSheet.create({
  container: {
    padding: 16,  // Magic number
    borderRadius: 8,  // Magic number
  },
});

// ✅ Good
const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,  // Named constant
    borderRadius: 8,  // OK for standard border radius
  },
});
```

---

## Testing Requirements

See [docs/TESTING.md](docs/TESTING.md) for complete guide.

### Test Coverage Target

**Minimum Coverage:** 70% for critical paths

**Current Status:** 139 passing tests across 4 test suites

### Unit Tests Required For

- ✅ All utility functions (`app/utils/*.ts`)
- ✅ Store actions and state updates
- ✅ Business logic (validation, recognition, hints)
- ⚠️ Complex calculations or algorithms

### Component Tests (Deferred to Post-MVP)

- Component rendering
- User interactions
- Prop changes
- Accessibility

### E2E Tests (Deferred to Post-MVP)

- Complete user workflows
- Multi-screen navigation
- API integration

---

### Writing Tests

**Unit Test Example:**

```typescript
// tests/unit/mathValidation.test.ts
import { validateAnswer } from '../../app/utils/mathValidation';

describe('mathValidation', () => {
  describe('validateAnswer', () => {
    it('should validate correct answer', async () => {
      const result = await validateAnswer('x + 5 = 12', 'x = 7');

      expect(result.isCorrect).toBe(true);
      expect(result.isUseful).toBe(true);
    });

    it('should detect incorrect answer', async () => {
      const result = await validateAnswer('x + 5 = 12', 'x = 10');

      expect(result.isCorrect).toBe(false);
      expect(result.errorType).toBe('ARITHMETIC');
    });
  });
});
```

**Running Tests:**

```bash
# All tests
npm test

# Specific test file
npm test -- mathValidation

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage
```

---

## Documentation Standards

### Code Comments

**JSDoc for Public Functions:**

```typescript
/**
 * Validates a user's solution step against the expected answer.
 *
 * @param problem - The math problem being solved
 * @param userInput - The user's solution step
 * @returns ValidationResult containing correctness and feedback
 * @throws {Error} If API call fails after retries
 *
 * @example
 * const result = await validateStep('x + 5 = 12', 'x = 7');
 * console.log(result.isCorrect); // true
 */
export async function validateStep(
  problem: string,
  userInput: string
): Promise<ValidationResult> {
  // Implementation...
}
```

---

### Inline Comments

**When to Comment:**
- ✅ Complex logic that isn't immediately obvious
- ✅ Workarounds for library bugs
- ✅ Performance optimizations
- ✅ TODO items with context

**When NOT to Comment:**
```typescript
// ❌ Bad: Obvious comment
// Increment counter
count++;

// ✅ Good: Explains why
// Force re-render to update Skia canvas reference
count++;
```

---

### Updating Documentation

**When to Update Docs:**

- **README.md** - Feature list changes, setup process changes
- **CHANGELOG.md** - Every user-facing change
- **ARCHITECTURE.md** - System design changes
- **API Integration Docs** - API endpoint or authentication changes
- **TASK_LIST.md** - PR completion status

---

## Pull Request Process

### Before Creating PR

1. **Rebase on main:**
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run full test suite:**
   ```bash
   npm test
   npm run typecheck
   npm run lint
   ```

3. **Update documentation:**
   - Update relevant docs if architecture changed
   - Update CHANGELOG.md in "Unreleased" section

4. **Verify code quality:**
   - No console.log statements
   - No commented-out code
   - No temporary files (test.ts, etc.)

---

### PR Template

```markdown
## Description
Brief summary of changes

## Related Issue
Closes #issue-number

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed on iPad Pro simulator
- [ ] Tested on physical device (if UI/UX change)
- [ ] No regressions in existing functionality

## Screenshots (if UI change)
[Add screenshots or screen recordings]

## Checklist
- [ ] Code follows project style guidelines
- [ ] Tests pass (`npm test`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Code linted (`npm run lint`)
- [ ] Documentation updated
- [ ] CHANGELOG.md updated

## Additional Notes
[Any additional context, considerations, or follow-up items]
```

---

### PR Review Guidelines

**As a Reviewer:**

1. **Check functionality:**
   - Pull branch and test locally
   - Verify changes work as described

2. **Review code quality:**
   - TypeScript types are correct
   - No obvious bugs or edge cases
   - Follows project patterns

3. **Verify tests:**
   - New functionality has tests
   - Tests are meaningful (not just for coverage)

4. **Check documentation:**
   - Code is self-documenting or has comments
   - User-facing changes reflected in docs

5. **Provide constructive feedback:**
   - Suggest improvements, don't just criticize
   - Link to project patterns or documentation
   - Mark non-blocking suggestions as "nit:"

**Example Feedback:**

```markdown
**Approval with suggestions:**
✅ Functionality looks good, tested on iPad Pro simulator

**Minor suggestions (non-blocking):**
- nit: Consider extracting validation logic to separate utility function
- nit: Add JSDoc comment for `calculateHintLevel` function

**Blocking:**
- 🚨 Missing unit tests for new `escalateHint` action
- 🚨 TypeScript error in `hintStore.ts:45`

Great work overall! Just address the blocking items and this is ready to merge.
```

---

## Common Patterns

### API Integration

**Pattern: Debounced API Calls with Caching**

```typescript
import { storage } from './storage';

const CACHE_PREFIX = '@api:validation:';
const DEBOUNCE_MS = 500;

let debounceTimer: NodeJS.Timeout | null = null;

export async function validateWithCache(input: string): Promise<ValidationResult> {
  // Check cache first
  const cacheKey = `${CACHE_PREFIX}${normalizeInput(input)}`;
  const cached = storage.getString(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Debounce API calls
  return new Promise((resolve, reject) => {
    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(async () => {
      try {
        const result = await apiClient.validate(input);

        // Cache result
        storage.set(cacheKey, JSON.stringify(result));

        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, DEBOUNCE_MS);
  });
}
```

---

### Error Handling

**Pattern: Try-Catch with Sentry Logging**

```typescript
import * as Sentry from '@sentry/react-native';

export async function validateStep(input: string): Promise<ValidationResult> {
  try {
    const result = await apiClient.validate(input);
    return result;
  } catch (error) {
    // Log to Sentry
    Sentry.captureException(error, {
      tags: { api: 'validation' },
      extra: { input },
    });

    // Provide user-friendly fallback
    return {
      isCorrect: false,
      feedback: 'Validation failed. Please try again.',
      errorType: 'NETWORK',
    };
  }
}
```

---

### MMKV Persistence

**Pattern: Serialize/Deserialize Complex Objects**

```typescript
import { storage } from './storage';

const STORAGE_KEY = '@store:attempts';

interface Attempt {
  id: string;
  steps: Map<string, Step>;  // Map structure
  tags: Set<string>;          // Set structure
}

function saveAttempt(attempt: Attempt) {
  const serialized = {
    id: attempt.id,
    steps: Array.from(attempt.steps.entries()),  // Map → Array
    tags: Array.from(attempt.tags),              // Set → Array
  };

  storage.set(STORAGE_KEY, JSON.stringify(serialized));
}

function loadAttempt(): Attempt | null {
  const saved = storage.getString(STORAGE_KEY);
  if (!saved) return null;

  try {
    const data = JSON.parse(saved);
    return {
      id: data.id,
      steps: new Map(data.steps),  // Array → Map
      tags: new Set(data.tags),    // Array → Set
    };
  } catch {
    return null;
  }
}
```

---

### Navigation

**Pattern: Type-Safe Navigation**

```typescript
// app/navigation/types.ts
export type RootStackParamList = {
  Home: undefined;
  TrainingMode: { problemId: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD' };
  Review: undefined;
};

// In component
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type TrainingModeProps = NativeStackScreenProps<RootStackParamList, 'TrainingMode'>;

export const TrainingModeScreen: React.FC<TrainingModeProps> = ({ route, navigation }) => {
  const { problemId, difficulty } = route.params;

  const goHome = () => {
    navigation.navigate('Home');
  };

  // ...
};
```

---

## Troubleshooting

See [docs/SETUP.md](docs/SETUP.md) "Common Setup Issues" section for:

- npm install failures
- CocoaPods errors
- Metro bundler cache issues
- Xcode build failures
- Environment variable loading
- MMKV native module linking

---

## Getting Help

### Project Documentation

- **Setup:** [docs/SETUP.md](docs/SETUP.md)
- **Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **File Structure:** [docs/FILE_STRUCTURE.md](docs/FILE_STRUCTURE.md)
- **State Management:** [docs/STATE_MANAGEMENT.md](docs/STATE_MANAGEMENT.md)
- **Testing:** [docs/TESTING.md](docs/TESTING.md)
- **Deployment:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **Task List:** [docs/TASK_LIST.md](docs/TASK_LIST.md)

### API Documentation

- **MyScript:** [docs/MYSCRIPT_SETUP.md](docs/MYSCRIPT_SETUP.md)
- **UpStudy:** [docs/UPSTUDY_API_INTEGRATION.md](docs/UPSTUDY_API_INTEGRATION.md)
- **CameraMath:** [docs/CAMERAMATH_SETUP.md](docs/CAMERAMATH_SETUP.md)
- **Supabase:** [docs/CLOUD_SYNC.md](docs/CLOUD_SYNC.md)

### Community & Support

- **Team Slack:** Gauntlet Slack workspace (for urgent issues)
- **Project Lead:** Rafal Szulejko (rafal.szulejko@superbuilders.school, UTC+1)
- **GitHub Issues:** For bug reports and feature requests
- **Pull Requests:** For code reviews and discussions

---

## Code of Conduct

### Be Respectful

- Provide constructive feedback
- Assume good intentions
- Celebrate wins and learning moments
- Ask questions without judgment

### Be Professional

- Respond to PRs within 2 business days
- Keep discussions focused on code, not individuals
- Escalate conflicts to project lead if needed

### Be Collaborative

- Share knowledge and best practices
- Help onboard new team members
- Document learnings and solutions

---

**Thank you for contributing to Handwriting Math App!** 🎉

Your contributions help students learn math more effectively through innovative technology.

---

**Last Updated:** PR11 (November 2024)

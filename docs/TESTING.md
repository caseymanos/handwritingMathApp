# Testing Guide

This document provides a comprehensive guide to testing the Handwriting Math App, including unit tests, component tests, E2E tests, and error tracking.

## Table of Contents

- [Overview](#overview)
- [Testing Stack](#testing-stack)
- [Running Tests](#running-tests)
- [Unit Tests](#unit-tests)
- [Component Tests](#component-tests)
- [E2E Tests](#e2e-tests)
- [Error Tracking](#error-tracking)
- [Writing Tests](#writing-tests)
- [Coverage Requirements](#coverage-requirements)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Overview

The Handwriting Math App uses a comprehensive testing strategy to ensure quality and reliability:

- **Unit Tests**: Test individual functions and utilities in isolation
- **Component Tests**: Test React components and their interactions
- **E2E Tests**: Test complete user workflows on actual devices
- **Error Tracking**: Monitor errors in production with Sentry

**Current Test Coverage**: 139+ unit tests across core utilities

## Testing Stack

### Unit & Component Testing
- **Jest**: Test runner and assertion library
- **React Native Testing Library**: Component testing utilities
- **@testing-library/jest-native**: Additional React Native matchers

### E2E Testing (Planned)
- **Detox**: End-to-end testing framework for React Native
- Supports both iOS and Android
- Runs on simulators and real devices

### Error Tracking
- **Sentry**: Error tracking and performance monitoring
- Automatic crash reporting
- Performance transaction tracking

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test File
```bash
npm test -- mathValidation.test.ts
```

### Watch Mode
```bash
npm test -- --watch
```

### Coverage Report
```bash
npm test -- --coverage
```

### Unit Tests Only
```bash
npm test -- tests/unit/
```

### Component Tests Only (When Implemented)
```bash
npm test -- tests/component/
```

### E2E Tests (When Implemented)
```bash
# iOS
npm run test:e2e:ios

# Android
npm run test:e2e:android
```

## Unit Tests

Unit tests validate individual functions and utilities in isolation. They are fast, focused, and easy to debug.

### Test Files Location
```
tests/unit/
├── mathValidation.test.ts      # Validation logic tests (21 tests)
├── recognitionUtils.test.ts    # Recognition utilities tests (29 tests)
├── hintUtils.test.ts           # Hint system tests (54 tests)
└── storage.test.ts             # MMKV storage tests (35 tests)
```

### What's Tested

#### mathValidation.ts (21 tests)
- LaTeX normalization
- Final answer detection
- Hint generation
- Step validation with API mocking
- Caching behavior
- Error classification (SYNTAX, ARITHMETIC, METHOD)
- Tautology detection
- Batch validation
- Debounced validation

#### recognitionUtils.ts (29 tests)
- RecognitionManager class
  - Pause detection
  - Debouncing
  - Stroke validation
  - Configuration management
- Helper functions
  - splitStrokesIntoLines
  - shouldTriggerRecognition
  - formatRecognitionResult
  - getConfidenceLevel
  - getStrokeAverageTimestamp

#### hintUtils.ts (54 tests)
- LaTeX formatting and extraction
- Inactivity hint detection
- Hint safety validation
- Escalation level management
- Display text and icons
- Accessibility formatting
- Variable reference detection
- Hint urgency calculation
- Hint similarity detection

#### storage.ts (35 tests)
- Validation cache (MMKV)
  - Cache key generation
  - Cache hit/miss tracking
  - TTL expiration
  - Cache statistics
- Attempt storage
  - Save/retrieve attempts
  - Filter by problem ID
  - Sorting by time
  - Deletion and clearing
- App state management
  - Set/get/delete values
  - Type handling (string, number, boolean, object, array)
  - Default values

### Running Unit Tests
```bash
# All unit tests
npm test -- tests/unit/

# Specific file
npm test -- mathValidation.test.ts

# With coverage
npm test -- tests/unit/ --coverage
```

### Expected Output
```
Test Suites: 4 passed, 4 total
Tests:       139 passed, 139 total
Snapshots:   0 total
Time:        ~0.3-0.5s
```

## Component Tests

Component tests validate React components in isolation, testing rendering, user interactions, and state changes.

### Planned Component Tests

#### HandwritingCanvas
- Renders correctly
- Handles touch/stylus input
- Updates stroke state
- Clears canvas
- Undo/redo functionality
- Color and width changes

#### HintDisplay
- Shows hints at correct escalation level
- Displays LaTeX properly
- Handles hint dismissal
- Animates hint appearance
- Accessibility labels

#### ProblemDisplay
- Renders problem text
- Renders LaTeX with KaTeX
- Shows step progression
- Displays validation feedback

### Writing Component Tests

```typescript
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { HandwritingCanvas } from '../app/components/HandwritingCanvas';

describe('HandwritingCanvas', () => {
  it('should render canvas', () => {
    const { getByTestId } = render(<HandwritingCanvas />);
    expect(getByTestID('handwriting-canvas')).toBeTruthy();
  });

  it('should handle touch events', () => {
    const onStroke = jest.fn();
    const { getByTestId } = render(
      <HandwritingCanvas onStrokeComplete={onStroke} />
    );

    const canvas = getByTestId('handwriting-canvas');
    fireEvent(canvas, 'touchStart', { /* touch data */ });
    fireEvent(canvas, 'touchMove', { /* touch data */ });
    fireEvent(canvas, 'touchEnd');

    expect(onStroke).toHaveBeenCalled();
  });
});
```

## E2E Tests

End-to-end tests validate complete user workflows on actual devices/simulators.

### Planned E2E Tests

#### Complete Training Flow
1. App launches
2. User selects a problem
3. User draws solution steps
4. System validates each step
5. User receives hints (if needed)
6. User completes problem
7. Success screen appears

#### Multi-Step Problem Solving
1. User starts complex problem (2+ steps)
2. Draws first step correctly
3. Receives positive feedback
4. Draws second step incorrectly
5. Receives hint
6. Corrects mistake
7. Completes problem

### Detox Setup (To Be Implemented)

```bash
# Install Detox
npm install detox --save-dev

# Configure for iOS
detox init -r jest

# Build app for testing
detox build --configuration ios.sim.debug

# Run E2E tests
detox test --configuration ios.sim.debug
```

## Error Tracking

### Sentry Integration

Sentry is integrated for production error tracking and performance monitoring.

#### Configuration

```typescript
// app/utils/sentry.ts
import { initSentry } from './app/utils/sentry';

// Initialize at app startup
initSentry();
```

#### Environment Variables

Create a `.env` file:
```env
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
ENABLE_SENTRY=true
NODE_ENV=production
```

#### Usage

**Capture Exceptions:**
```typescript
import { captureException } from '@/utils/sentry';

try {
  // Your code
} catch (error) {
  captureException(error, {
    context: 'validation',
    problemId: 'prob1',
  });
}
```

**Capture Messages:**
```typescript
import { captureMessage } from '@/utils/sentry';

captureMessage('User completed 10 problems', 'info', {
  userId: '123',
  count: 10,
});
```

**Track Performance:**
```typescript
import { startTransaction } from '@/utils/sentry';

const transaction = startTransaction('validation', 'http');
// ... perform validation
transaction?.finish();
```

**Add Breadcrumbs:**
```typescript
import { addBreadcrumb } from '@/utils/sentry';

addBreadcrumb('User started problem', 'navigation', {
  problemId: 'prob1',
});
```

#### Performance Tracking

The Sentry integration automatically tracks:
- Slow validations (>2 seconds)
- Slow recognitions (>500ms)
- API errors with endpoint context
- Navigation timing

### ErrorBoundary Component

The `ErrorBoundary` component catches React errors and prevents app crashes.

#### Usage

**Wrap your app:**
```typescript
import { ErrorBoundary } from './app/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <YourApp />
    </ErrorBoundary>
  );
}
```

**With custom fallback:**
```typescript
<ErrorBoundary fallback={<CustomErrorScreen />}>
  <YourApp />
</ErrorBoundary>
```

**With error callback:**
```typescript
<ErrorBoundary onError={(error, errorInfo) => {
  console.log('Error occurred:', error);
}}>
  <YourApp />
</ErrorBoundary>
```

#### Features
- Catches all React component errors
- Logs to Sentry automatically
- Shows user-friendly error UI
- "Try Again" button to reset state
- Shows error details in development mode

## Writing Tests

### General Best Practices

1. **Test Behavior, Not Implementation**
   ```typescript
   // Good
   expect(result.isCorrect).toBe(true);

   // Bad
   expect(internalFunction).toHaveBeenCalled();
   ```

2. **Use Descriptive Test Names**
   ```typescript
   // Good
   it('should validate correct step and mark as useful', () => {});

   // Bad
   it('test1', () => {});
   ```

3. **Arrange-Act-Assert Pattern**
   ```typescript
   it('should cache validation result', () => {
     // Arrange
     const result = createValidationResult();

     // Act
     cacheValidationResult('prob1', 1, 'x = 7', result);

     // Assert
     const cached = getCachedValidationResult('prob1', 1, 'x = 7');
     expect(cached).toBeTruthy();
   });
   ```

4. **Mock External Dependencies**
   ```typescript
   // Mock API calls
   global.fetch = jest.fn().mockResolvedValue({
     ok: true,
     json: async () => ({ data: {} }),
   });
   ```

5. **Clean Up After Tests**
   ```typescript
   beforeEach(() => {
     jest.clearAllMocks();
     storage.clearAll();
   });
   ```

### Unit Test Example

```typescript
import { validateMathStep } from '@/utils/mathValidation';

describe('validateMathStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return cached result if available', async () => {
    // Arrange
    const cachedResult = {
      isCorrect: true,
      isUseful: true,
      feedback: 'Cached!',
    };
    mockStorage.getCachedValidationResult.mockReturnValue(cachedResult);

    // Act
    const result = await validateMathStep({
      problemId: 'prob1',
      stepNumber: 1,
      latex: 'x = 7',
    });

    // Assert
    expect(result).toEqual(cachedResult);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
```

### Mocking Strategy

#### MMKV Storage
```typescript
// tests/jest.setup.js
jest.mock('react-native-mmkv', () => {
  const store = {};
  return {
    MMKV: jest.fn().mockImplementation(() => ({
      set: jest.fn((key, value) => { store[key] = value; }),
      getString: jest.fn((key) => store[key]),
      delete: jest.fn((key) => { delete store[key]; }),
      clearAll: jest.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
      getAllKeys: jest.fn(() => Object.keys(store)),
    })),
  };
});
```

#### API Calls
```typescript
// Mock fetch
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    data: { solving_steps: [] },
    err_msg: null,
  }),
});
```

#### Timers
```typescript
// Use fake timers
jest.useFakeTimers();

// Advance time
jest.advanceTimersByTime(500);

// Cleanup
jest.useRealTimers();
```

## Coverage Requirements

### Targets
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Critical Paths (Target: 90%+)
- Validation logic (mathValidation.ts)
- Storage operations (storage.ts)
- Error handling

### Checking Coverage
```bash
npm test -- --coverage
```

### Coverage Report Location
```
coverage/
├── lcov-report/index.html  # HTML report
└── lcov.info              # LCOV format
```

### View HTML Report
```bash
open coverage/lcov-report/index.html
```

## CI/CD Integration

### GitHub Actions (Recommended)

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Pre-commit Hook

```bash
# .husky/pre-commit
#!/bin/sh
npm test
```

## Troubleshooting

### Common Issues

#### 1. Tests Failing on CI but Passing Locally
**Cause**: Timing issues, environment differences

**Solution**:
```typescript
// Use fake timers
jest.useFakeTimers();

// Or increase timeout
jest.setTimeout(10000);
```

#### 2. Mock Not Working
**Cause**: Mock defined after import

**Solution**:
```typescript
// Move mock to tests/jest.setup.js
// Or use jest.doMock() instead of jest.mock()
```

#### 3. MMKV Storage Errors
**Cause**: Storage not cleared between tests

**Solution**:
```typescript
beforeEach(() => {
  validationStorage.clearAll();
  attemptStorage.clearAll();
  appStorage.clearAll();
});
```

#### 4. Snapshot Mismatch
**Cause**: Component output changed

**Solution**:
```bash
# Update snapshots
npm test -- -u
```

#### 5. Slow Tests
**Cause**: Too many real API calls, large test suites

**Solution**:
- Mock all external calls
- Use `test.only()` during development
- Split large test files

### Debug Mode

```bash
# Run tests with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Then attach debugger in Chrome:
# chrome://inspect
```

### Verbose Output

```bash
npm test -- --verbose
```

## Best Practices Summary

1. ✅ **Write tests first** (TDD approach)
2. ✅ **Test one thing per test**
3. ✅ **Use descriptive test names**
4. ✅ **Mock external dependencies**
5. ✅ **Clean up after tests**
6. ✅ **Aim for 70%+ coverage**
7. ✅ **Test edge cases**
8. ✅ **Keep tests fast** (<5s total for unit tests)
9. ✅ **Don't test implementation details**
10. ✅ **Use meaningful assertions**

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Detox Documentation](https://wix.github.io/Detox/)
- [Sentry React Native](https://docs.sentry.io/platforms/react-native/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Next Steps

1. ✅ Implement component tests for UI components
2. ✅ Set up Detox for E2E testing
3. ✅ Add E2E tests for critical user flows
4. ✅ Integrate with CI/CD pipeline
5. ✅ Set up code coverage reporting
6. ✅ Configure Sentry DSN for production

---

For questions or issues, please contact the development team or create an issue in the repository.

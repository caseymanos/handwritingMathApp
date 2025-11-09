# State Management Guide

Complete guide to Zustand state management patterns, MMKV persistence, and store architecture in the Handwriting Math App.

---

## Table of Contents

1. [State Architecture Overview](#state-architecture-overview)
2. [Store Pattern Template](#store-pattern-template)
3. [Store-by-Store Breakdown](#store-by-store-breakdown)
4. [Selector Optimization](#selector-optimization)
5. [Persistence Strategy](#persistence-strategy)
6. [Testing Stores](#testing-stores)
7. [Common Patterns](#common-patterns)
8. [Best Practices](#best-practices)

---

## State Architecture Overview

### Why Zustand?

**Performance Benefits:**
- 10x better performance than Context API (no unnecessary re-renders)
- Minimal boilerplate (1/3 the code of Redux)
- No Provider wrapper needed
- Selective subscriptions via selectors

**Developer Experience:**
- TypeScript-first design
- Simple API: `create()`, `set()`, `get()`
- No actions, reducers, or middleware (unless needed)
- Works seamlessly with React DevTools

**Comparison:**

| Feature | Zustand | Context API | Redux |
|---------|---------|-------------|-------|
| Bundle size | 1.2KB | Built-in | 11KB+ |
| Re-renders | Selective | All consumers | Selective |
| Boilerplate | Minimal | Low | High |
| Async support | Native | Manual | Middleware |
| Persistence | Manual/Plugin | Manual | Middleware |

---

### 5-Store Domain Separation

The app uses **5 independent Zustand stores**, each owning a specific domain:

```
┌─────────────────────────────────────────────────────────────┐
│                      Application State                       │
└─────────────────────────────────────────────────────────────┘
           │
           ├─ canvasStore        (drawing state)
           ├─ validationStore    (math validation)
           ├─ hintStore          (hint system)
           ├─ progressStore      (user progress)
           └─ uiStore            (UI state)
```

**Domain Boundaries:**
- Each store owns its data and actions
- No direct store-to-store imports
- Communication via component composition or shared utilities

---

### Persistence Strategy

**MMKV vs AsyncStorage:**

| Feature | MMKV | AsyncStorage |
|---------|------|--------------|
| Speed | 20x faster | Baseline |
| API | Synchronous | Promise-based |
| Encryption | Built-in | None |
| Size limit | ~100MB | ~6MB |
| Storage type | mmap file | SQLite |

**Decision:** Use MMKV for all persistence (better performance, simpler API)

**Persistence Pattern:**
- Manual `saveToStorage()` / `loadFromStorage()` functions
- Stores decide what to persist (not all state is persisted)
- Called after every state mutation (within action functions)

---

## Store Pattern Template

### Minimal Zustand Store

```typescript
import { create } from 'zustand';
import { storage } from '../utils/storage';

// 1. Define state interface
interface ExampleStoreState {
  // State properties
  count: number;
  items: string[];

  // Action functions
  increment: () => void;
  addItem: (item: string) => void;
  reset: () => void;
}

// 2. Storage keys (MMKV)
const STORAGE_KEY = '@example:state';

// 3. Persistence helpers
function saveToStorage(state: ExampleStoreState) {
  const data = {
    count: state.count,
    items: state.items,
  };
  storage.set(STORAGE_KEY, JSON.stringify(data));
}

function loadFromStorage(): Partial<ExampleStoreState> {
  const saved = storage.getString(STORAGE_KEY);
  if (!saved) return {};
  try {
    return JSON.parse(saved);
  } catch {
    return {};
  }
}

// 4. Create store with initial state + actions
export const useExampleStore = create<ExampleStoreState>((set, get) => ({
  // Initial state (with persistence restore)
  count: 0,
  items: [],
  ...loadFromStorage(), // Restore persisted state

  // Actions
  increment: () => set((state) => {
    const newState = { count: state.count + 1 };
    saveToStorage({ ...state, ...newState });
    return newState;
  }),

  addItem: (item) => set((state) => {
    const newState = { items: [...state.items, item] };
    saveToStorage({ ...state, ...newState });
    return newState;
  }),

  reset: () => set(() => {
    const initialState = { count: 0, items: [] };
    saveToStorage({ ...get(), ...initialState });
    return initialState;
  }),
}));
```

### Key Elements

1. **TypeScript Interface:** Define complete state shape and actions
2. **Storage Keys:** Namespace MMKV keys with `@domain:key` pattern
3. **Persistence Helpers:** `saveToStorage()` and `loadFromStorage()` functions
4. **Initial State Restore:** Spread `...loadFromStorage()` over defaults
5. **Action Pattern:** `set()` returns new state, calls `saveToStorage()`

---

## Store-by-Store Breakdown

### 1. canvasStore (5.3KB)

**File:** `app/stores/canvasStore.ts`

**Domain:** Drawing canvas state (ephemeral, not persisted)

**State:**
```typescript
{
  strokes: Stroke[];             // All drawn strokes
  currentStroke: Stroke | null;  // Active stroke being drawn
  recognizedText: string;        // MyScript recognition result
  isRecognizing: boolean;        // Recognition in progress
  strokeCount: number;           // Total strokes drawn
}
```

**Key Actions:**
- `addStroke(stroke)` - Add completed stroke to canvas
- `updateCurrentStroke(stroke)` - Update active stroke during drawing
- `undoLastStroke()` - Remove most recent stroke
- `undoLastLine()` - Remove all strokes from last line (PR16 enhancement)
- `clearCanvas()` - Clear all strokes and reset state
- `setRecognizedText(text)` - Update recognition result from MyScript
- `setRecognizing(isRecognizing)` - Toggle recognition state

**Persistence:** ❌ None (canvas is ephemeral - strokes cleared when problem changes)

**Usage:**
- `HandwritingCanvas.tsx` - Stroke management
- `FloatingToolbar.tsx` - Undo controls
- `RecognitionIndicator.tsx` - Display recognized text
- `useRecognition.ts` hook - Recognition trigger

**Performance Notes:**
- Large stroke arrays (100+ strokes) - no performance issues with Zustand
- Selective subscriptions prevent canvas re-renders on recognition state changes

---

### 2. validationStore (9.6KB)

**File:** `app/stores/validationStore.ts`

**Domain:** Math validation and problem state

**State:**
```typescript
{
  currentProblem: Problem | null;            // Active problem
  userSteps: Step[];                         // Solution steps
  validationResults: Map<string, ValidationResult>;  // Step validations
  isValidating: boolean;                     // API call in progress
  lastValidationTime: number;                // Timestamp of last validation
  cacheHits: number;                         // MMKV cache statistics
}
```

**Key Actions:**
- `setProblem(problem)` - Load new problem, clear previous state
- `addStep(step)` - Add user solution step
- `validateStep(stepId, userInput)` - Call UpStudy API for validation
- `getValidationResult(stepId)` - Retrieve cached validation result
- `clearValidation()` - Reset all validation state
- `updateStats()` - Update cache hit/miss statistics

**Persistence:** ✅ Validation results cached in MMKV (via `storage.ts`)

**Integration:**
- Uses `mathValidation.ts` utility for UpStudy API calls
- Caches validation results to avoid duplicate API calls
- Triggers hint system via `hintStore` (component-level integration)

**Usage:**
- `TrainingModeScreen.tsx` - Main validation flow
- `ValidationFeedback.tsx` - Display validation results
- `ProblemDisplay.tsx` - Problem rendering

**Caching Strategy:**
```typescript
// Before API call, check cache
const cacheKey = `validation:${problemId}:${normalizedInput}`;
const cached = storage.getString(cacheKey);
if (cached) {
  return JSON.parse(cached);
}

// After API call, cache result
storage.set(cacheKey, JSON.stringify(validationResult));
```

---

### 3. hintStore (11KB)

**File:** `app/stores/hintStore.ts`

**Domain:** Hint escalation and history

**State:**
```typescript
{
  hintLevels: Map<ErrorType, HintLevel>;  // Per-error-type escalation
  hintHistory: HintHistory[];             // All hints shown
  hintsUsedCount: number;                 // Total hints requested
  inactivityTimer: number | null;         // Auto-hint countdown
  lastHintTime: number;                   // Timestamp of last hint
  incorrectAttemptCount: number;          // Triggers auto-hints
}
```

**Hint Levels:**
```typescript
type HintLevel = 'CONCEPT' | 'DIRECTION' | 'MICRO';

// Escalation path:
// CONCEPT → "Think about inverse operations"
// DIRECTION → "Try adding 5 to both sides"
// MICRO → "Add 5 to the left side of the equation"
```

**Key Actions:**
- `requestHint(errorType, problemId)` - Get next hint for error type
- `escalateHint(errorType)` - Move to next level
- `resetEscalation()` - Reset all hint levels (on problem change)
- `addToHistory(hint)` - Track hint in history
- `startInactivityTimer()` - Begin 10-second auto-hint countdown
- `clearInactivityTimer()` - Cancel auto-hint timer

**Persistence:** ✅ Hint history and levels saved to MMKV

**Integration:**
- Uses `hintUtils.ts` for hint selection from `hint-library/hints.ts`
- Triggered by `ValidationFeedback.tsx` on incorrect steps
- Auto-hints after 10s inactivity + 2+ incorrect attempts

**Usage:**
- `ValidationFeedback.tsx` - Display hints
- `HintReveal.tsx` - Hint animation component
- `TrainingModeScreen.tsx` - Inactivity timer management

**Escalation Logic:**
```typescript
// Per-error-type tracking (independent escalation)
const levels = new Map([
  ['SYNTAX', 'CONCEPT'],
  ['ARITHMETIC', 'DIRECTION'],  // Different error types at different levels
  ['LOGIC', 'CONCEPT'],
  ['METHOD', 'MICRO'],
]);

// Escalate when same error type repeated
if (errorType === lastErrorType) {
  escalateHint(errorType); // CONCEPT → DIRECTION → MICRO
}
```

---

### 4. progressStore (17KB)

**File:** `app/stores/progressStore.ts`

**Domain:** User progress and attempt tracking (most critical persisted data)

**State:**
```typescript
{
  currentAttempt: Attempt | null;         // Active attempt
  currentSessionId: string;               // Session UUID
  attempts: Attempt[];                    // Complete attempt history
  completedProblems: Set<string>;         // Solved problem IDs
  problemProgress: Record<string, ProblemProgress>;  // Per-problem stats

  // Analytics
  totalCorrectSteps: number;
  totalIncorrectSteps: number;
  totalHintsRequested: number;
  totalTime: number;
  averageStepTime: number;
  lastActivityTime: number;
}
```

**Attempt Structure:**
```typescript
interface Attempt {
  id: string;                    // attempt_1234567890_xyz
  problemId: string;             // Problem reference
  timestamp: number;             // Start time
  steps: Step[];                 // All solution steps
  validationResults: ValidationResult[];
  hintsUsed: HintHistory[];
  solved: boolean;               // Completion status
  abandonedAt: number | null;    // Abandonment timestamp
  sessionId: string;             // Session reference
  metadata: Record<string, any>; // Custom data
}
```

**Key Actions:**
- `startAttempt(problemId)` - Begin new attempt, save to MMKV + Supabase
- `endAttempt(solved)` - Mark attempt complete/abandoned
- `addStepToAttempt(step)` - Track step within current attempt
- `getAttemptHistory(problemId?)` - Retrieve past attempts
- `getStudentProgress()` - Full progress summary
- `exportData()` / `importData(json)` - Data portability
- `clearHistory()` - Delete all attempt data

**Persistence:** ✅ ALL state persisted to MMKV (critical user data)

**Integration:**
- Syncs to Supabase via `app/utils/sync/syncClient.ts` (PR12)
- Uses `app/utils/sync/serializer.ts` for stroke compression (70-90% reduction)
- Write-through pattern: MMKV first, then background Supabase sync

**Usage:**
- `TrainingModeScreen.tsx` - Attempt lifecycle management
- `ReviewScreen.tsx` - Attempt history display
- `SettingsScreen.tsx` - Data export/import
- Cloud sync utilities - Supabase integration

**Cloud Sync Pattern:**
```typescript
startAttempt: (problemId) => set((state) => {
  const newAttempt = createAttempt(problemId);
  const newState = { currentAttempt: newAttempt, attempts: [...state.attempts, newAttempt] };

  // 1. Save to MMKV (synchronous, guaranteed)
  saveToStorage(newState);

  // 2. Queue for Supabase sync (async, background)
  syncClient.upsertAttempt(newAttempt);

  return newState;
});
```

---

### 5. uiStore (10KB)

**File:** `app/stores/uiStore.ts`

**Domain:** UI state and app settings

**State:**
```typescript
{
  theme: 'light' | 'dark';                 // Theme mode (light only for MVP)
  activeModal: ModalType | null;           // Current modal
  isLoading: boolean;                      // Global loading
  notifications: Notification[];           // Toast messages
  settings: {
    soundEnabled: boolean;
    hapticEnabled: boolean;
    showLineGuides: boolean;
    canvasColor: string;
    // ... other preferences
  };
  toolbarPosition: ToolbarPosition;        // Toolbar snap position
  hasSeenWelcome: boolean;                 // First launch flag
}
```

**Modal Types:**
```typescript
type ModalType =
  | 'WELCOME'         // First launch tutorial
  | 'SETTINGS'        // App settings
  | 'REVIEW'          // Attempt history
  | 'HELP'            // Help documentation
  | 'EXPORT'          // Data export dialog
  | 'RESET_CONFIRM'   // Reset confirmation
  | 'CLOUD_SYNC';     // Cloud sync status
```

**Key Actions:**
- `showModal(type, data?)` - Display modal
- `hideModal()` - Close active modal
- `showNotification(message, type)` - Display toast (auto-hide after 3s)
- `updateSettings(settings)` - Update user preferences
- `setToolbarPosition(position)` - Save toolbar position
- `setTheme(theme)` - Toggle light/dark mode

**Persistence:** ✅ Theme and settings saved to MMKV

**Usage:**
- All screens - Modal management
- `WelcomeModal.tsx` - First launch tutorial
- `FloatingToolbar.tsx` - Position persistence
- `SettingsScreen.tsx` - Settings management

**Notification Pattern:**
```typescript
// Auto-dismiss notifications after 3 seconds
showNotification: (message, type = 'info') => set((state) => {
  const notification = {
    id: generateId(),
    message,
    type,
    timestamp: Date.now(),
  };

  // Auto-remove after 3s
  setTimeout(() => {
    get().removeNotification(notification.id);
  }, 3000);

  return { notifications: [...state.notifications, notification] };
});
```

---

## Selector Optimization

### Anti-Pattern: Full Store Subscription

```typescript
// ❌ BAD: Re-renders on ANY store change
function MyComponent() {
  const store = useCanvasStore();

  return <Text>{store.strokeCount}</Text>;
}
```

**Problem:** Component re-renders even when `strokeCount` hasn't changed.

---

### Best Practice: Selective Subscription

```typescript
// ✅ GOOD: Only re-renders when strokeCount changes
function MyComponent() {
  const strokeCount = useCanvasStore((state) => state.strokeCount);

  return <Text>{strokeCount}</Text>;
}
```

**How it works:** Zustand uses shallow equality check on selector return value.

---

### Advanced: Multiple Selectors

```typescript
// ✅ Separate subscriptions for independent values
function MyComponent() {
  const strokeCount = useCanvasStore((state) => state.strokeCount);
  const isRecognizing = useCanvasStore((state) => state.isRecognizing);

  return (
    <View>
      <Text>{strokeCount} strokes</Text>
      {isRecognizing && <Spinner />}
    </View>
  );
}
```

---

### Advanced: Memoized Object Selector

```typescript
// ✅ Memoize selector for complex derived state
function StatsDisplay() {
  const stats = useProgressStore(
    React.useMemo(
      () => (state) => ({
        accuracy: state.calculateAccuracyRate(),
        avgTime: state.calculateAverageTime(),
        totalAttempts: state.attempts.length,
      }),
      [] // Empty deps - selector function never changes
    )
  );

  return <Text>Accuracy: {stats.accuracy}%</Text>;
}
```

**Why memoize?** Prevents new selector function on every render.

---

### Advanced: Equality Function

```typescript
// ✅ Custom equality for complex objects
import shallow from 'zustand/shallow';

function AttemptList() {
  const attempts = useProgressStore(
    (state) => state.attempts,
    shallow  // Shallow comparison of array elements
  );

  return <FlatList data={attempts} ... />;
}
```

**When to use:** Arrays, objects, or computed values where identity changes but content doesn't.

---

## Persistence Strategy

### What to Persist

| Store | Persisted | Not Persisted | Reason |
|-------|-----------|---------------|--------|
| canvasStore | ❌ Nothing | All state | Ephemeral (cleared per problem) |
| validationStore | ✅ Validation results | Problem state | Cache API responses |
| hintStore | ✅ History, levels | Timer state | Learning data |
| progressStore | ✅ Everything | Nothing | Critical user data |
| uiStore | ✅ Settings, theme | Modals, loading | User preferences |

---

### Serialization Approach

**JSON.stringify/parse:**
```typescript
function saveToStorage(state: StoreState) {
  const data = {
    count: state.count,
    items: state.items,
    // Serialize Maps and Sets
    mapData: Array.from(state.mapData.entries()),
    setData: Array.from(state.setData),
  };
  storage.set(STORAGE_KEY, JSON.stringify(data));
}

function loadFromStorage(): Partial<StoreState> {
  const saved = storage.getString(STORAGE_KEY);
  if (!saved) return {};

  try {
    const data = JSON.parse(saved);
    return {
      count: data.count,
      items: data.items,
      // Deserialize Maps and Sets
      mapData: new Map(data.mapData),
      setData: new Set(data.setData),
    };
  } catch (error) {
    console.error('Failed to load from storage:', error);
    return {};
  }
}
```

---

### Migration Strategy

**Version-Based Migrations:**
```typescript
const STORAGE_VERSION = 2;
const VERSION_KEY = '@store:version';

function loadFromStorage(): Partial<StoreState> {
  const version = storage.getNumber(VERSION_KEY) || 1;
  const saved = storage.getString(STORAGE_KEY);

  if (!saved) return {};

  let data = JSON.parse(saved);

  // Migrate from v1 to v2
  if (version < 2) {
    data = migrateV1toV2(data);
    storage.set(VERSION_KEY, 2);
  }

  return data;
}

function migrateV1toV2(oldData: any) {
  return {
    ...oldData,
    newField: 'default value',
    // Transform old structure to new
  };
}
```

---

### Cloud Sync Integration

**Local-First Pattern (PR12):**
```typescript
// Write-through: MMKV first, then Supabase
addStepToAttempt: (step) => set((state) => {
  const updatedAttempt = {
    ...state.currentAttempt!,
    steps: [...state.currentAttempt!.steps, step],
  };

  // 1. Update local state
  const newState = { currentAttempt: updatedAttempt };

  // 2. Save to MMKV (synchronous, guaranteed)
  saveToStorage({ ...state, ...newState });

  // 3. Queue for cloud sync (async, background with retry)
  syncQueue.enqueue({
    operation: 'UPDATE_ATTEMPT',
    data: updatedAttempt,
    timestamp: Date.now(),
  });

  return newState;
});
```

**Hydration on App Launch:**
```typescript
// app/utils/sync/hydrate.ts restores cloud data
import { hydrateFromCloud } from './utils/sync/hydrate';

// In App.tsx or root component
useEffect(() => {
  const restoreCloudData = async () => {
    const cloudData = await hydrateFromCloud();
    if (cloudData) {
      useProgressStore.getState().importData(cloudData);
    }
  };

  restoreCloudData();
}, []);
```

---

## Testing Stores

### Mock MMKV

**File:** `tests/jest.setup.js`

```typescript
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(() => null),
    getNumber: jest.fn(() => 0),
    getBoolean: jest.fn(() => false),
    delete: jest.fn(),
    clearAll: jest.fn(),
  })),
}));
```

---

### Test Store Actions

```typescript
import { useProgressStore } from '../app/stores/progressStore';

describe('progressStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useProgressStore.getState().reset();
  });

  it('should start a new attempt', () => {
    const { startAttempt, currentAttempt } = useProgressStore.getState();

    startAttempt('problem_123');

    const attempt = useProgressStore.getState().currentAttempt;
    expect(attempt).not.toBeNull();
    expect(attempt?.problemId).toBe('problem_123');
  });

  it('should add step to current attempt', () => {
    const { startAttempt, addStepToAttempt } = useProgressStore.getState();

    startAttempt('problem_123');
    addStepToAttempt({ id: 'step_1', text: 'x = 5' });

    const attempt = useProgressStore.getState().currentAttempt;
    expect(attempt?.steps).toHaveLength(1);
  });
});
```

---

### Test Persistence

```typescript
it('should persist and restore state', () => {
  const { startAttempt, saveToStorage, loadFromStorage } = useProgressStore.getState();

  // 1. Create state
  startAttempt('problem_123');

  // 2. Save to storage
  saveToStorage();

  // 3. Reset store
  useProgressStore.setState({ currentAttempt: null, attempts: [] });

  // 4. Restore from storage
  loadFromStorage();

  // 5. Verify restored state
  const attempt = useProgressStore.getState().currentAttempt;
  expect(attempt?.problemId).toBe('problem_123');
});
```

---

## Common Patterns

### 1. Loading Initial State from Persistence

```typescript
export const useMyStore = create<MyStoreState>((set, get) => ({
  // Default state
  count: 0,
  items: [],

  // Restore persisted state (overrides defaults)
  ...loadFromStorage(),

  // Actions...
}));
```

---

### 2. Optimistic Updates

```typescript
// Update UI immediately, sync in background
addItem: (item) => set((state) => {
  const newState = { items: [...state.items, item] };

  // 1. Update UI
  saveToStorage({ ...state, ...newState });

  // 2. Sync to server (don't await)
  syncToServer(item).catch((error) => {
    // Revert on error
    set({ items: state.items });
    showNotification('Sync failed, reverted change');
  });

  return newState;
});
```

---

### 3. Error Handling in Async Actions

```typescript
validateStep: async (stepId, input) => {
  set({ isValidating: true });

  try {
    const result = await validateWithAPI(input);
    set((state) => ({
      validationResults: new Map(state.validationResults).set(stepId, result),
      isValidating: false,
    }));
    return result;
  } catch (error) {
    set({ isValidating: false });
    showErrorNotification('Validation failed');
    throw error;
  }
};
```

---

### 4. Resetting Store State

```typescript
// Full reset (logout, new game)
reset: () => set(() => {
  const initialState = {
    count: 0,
    items: [],
    lastUpdate: null,
  };
  saveToStorage(initialState);
  return initialState;
});
```

---

### 5. Cross-Store Communication

**Pattern: Component Composition (Recommended)**
```typescript
function TrainingMode() {
  const setProblem = useValidationStore((state) => state.setProblem);
  const resetHints = useHintStore((state) => state.resetEscalation);
  const startAttempt = useProgressStore((state) => state.startAttempt);

  const loadProblem = (problem: Problem) => {
    // Coordinate multiple stores
    setProblem(problem);
    resetHints();
    startAttempt(problem.id);
  };

  return <Button onPress={() => loadProblem(newProblem)} />;
}
```

**Pattern: Shared Utility (When Needed)**
```typescript
// app/utils/problemLoader.ts
export function loadNewProblem(problem: Problem) {
  useValidationStore.getState().setProblem(problem);
  useHintStore.getState().resetEscalation();
  useProgressStore.getState().startAttempt(problem.id);
}
```

**Anti-Pattern: Direct Store Import (Avoid)**
```typescript
// ❌ DON'T: Store imports store
import { useHintStore } from './hintStore';

export const useValidationStore = create((set) => ({
  setProblem: (problem) => {
    set({ currentProblem: problem });
    useHintStore.getState().resetEscalation(); // Tight coupling!
  },
}));
```

---

## Best Practices

### 1. Naming Conventions

```typescript
// Stores: camelCase with "Store" suffix
useCanvasStore
useValidationStore

// State: descriptive nouns
currentAttempt, isValidating, strokeCount

// Actions: imperative verbs
addStroke(), clearCanvas(), startAttempt()
```

---

### 2. Action Granularity

```typescript
// ✅ GOOD: Specific actions
addStroke(stroke)
undoLastStroke()
clearCanvas()

// ❌ BAD: Generic setter
updateState(key, value)
```

---

### 3. Avoid Derived State

```typescript
// ❌ BAD: Storing computed value
{
  strokes: Stroke[];
  strokeCount: number;  // Duplicate data!
}

// ✅ GOOD: Compute on-the-fly or use getter
{
  strokes: Stroke[];
  getStrokeCount: () => get().strokes.length;
}

// ✅ BETTER: Use selector in component
const strokeCount = useCanvasStore((state) => state.strokes.length);
```

---

### 4. Action Return Values

```typescript
// ✅ Return useful data from actions
addStroke: (stroke) => {
  set((state) => ({
    strokes: [...state.strokes, stroke],
  }));
  return stroke.id; // Return ID for reference
};

// Usage
const strokeId = useCanvasStore.getState().addStroke(newStroke);
```

---

### 5. Document State Shape

```typescript
/**
 * Canvas Store State
 *
 * Manages drawing canvas state including strokes, recognition results,
 * and drawing metadata. Does NOT persist (ephemeral state).
 *
 * @property strokes - All drawn strokes on canvas
 * @property currentStroke - Active stroke being drawn (null when idle)
 * @property recognizedText - Latest MyScript recognition result
 * @property isRecognizing - True during API call
 */
interface CanvasStoreState {
  strokes: Stroke[];
  currentStroke: Stroke | null;
  recognizedText: string;
  isRecognizing: boolean;

  // Actions...
}
```

---

### 6. Use TypeScript Strictly

```typescript
// ✅ Explicit types
interface MyStoreState {
  count: number;  // Not 'any'
  items: Item[];  // Not 'any[]'
  getData: () => Item[];  // Not '() => any'
}

// ✅ Type-safe actions
addItem: (item: Item) => void;  // Not (item: any) => void
```

---

### 7. Performance Monitoring

```typescript
// Log slow operations (>100ms)
validateStep: async (stepId, input) => {
  const startTime = Date.now();

  const result = await validateWithAPI(input);

  const duration = Date.now() - startTime;
  if (duration > 100) {
    console.warn(`Slow validation: ${duration}ms`);
    Sentry.captureMessage(`Slow validation: ${duration}ms`);
  }

  return result;
};
```

---

## Related Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - System design and data flows
- [FILE_STRUCTURE.md](FILE_STRUCTURE.md) - Project organization
- [TESTING.md](TESTING.md) - Store testing patterns
- [CLOUD_SYNC.md](CLOUD_SYNC.md) - Supabase integration and sync patterns

---

## Quick Reference

### Create New Store

```bash
# 1. Create store file
touch app/stores/myStore.ts

# 2. Copy template from this doc

# 3. Add to exports
# (No exports file needed - import directly)

# 4. Test in component
import { useMyStore } from '../stores/myStore';
```

### Debug Store State

```typescript
// Log entire store state
console.log(useCanvasStore.getState());

// Subscribe to all changes (debugging only)
useCanvasStore.subscribe((state) => {
  console.log('State changed:', state);
});

// Get state outside React
const currentStrokes = useCanvasStore.getState().strokes;
```

### Reset All Stores

```typescript
// Clear all app data (logout, factory reset)
export function resetAllStores() {
  useCanvasStore.getState().clearCanvas();
  useValidationStore.getState().clearValidation();
  useHintStore.getState().reset();
  useProgressStore.getState().reset();
  useUiStore.getState().reset();
}
```

---

**Last Updated:** PR11 (November 2024)

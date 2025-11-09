# How to Use RepoPrompt for Tutorial Mode Implementation

## Quick Start

1. **Open RepoPrompt** in your handwritingMath workspace

2. **Copy the prompt** from `REPOPROMPT_TUTORIAL_MODE.md`:
   ```bash
   cat REPOPROMPT_TUTORIAL_MODE.md | pbcopy
   ```

3. **In RepoPrompt**, use the prompt command:
   - Click the prompt icon or use the prompt command
   - Paste the entire contents of `REPOPROMPT_TUTORIAL_MODE.md`
   - This sets the context for an agent to implement Tutorial Mode

4. **Select relevant files** (optional but recommended):
   ```
   app/stores/progressStore.ts
   app/screens/TrainingModeScreen.tsx
   app/components/HandwritingCanvas.tsx
   app/utils/sync/tutorialSync.ts
   app/types/Tutorial.ts
   app/styles/
   tests/unit/storage.test.ts
   ```

5. **Start implementation**:
   - The agent will follow the 11-step plan in the prompt
   - It will reference the selected files for patterns
   - It will create all necessary components

## What the Agent Will Build

### 11 Components (3-4 days):
1. ✅ tutorialStore.ts - Zustand store
2. ✅ VideoPlayer.tsx - YouTube integration
3. ✅ TutorialScreen.tsx - Lesson viewing
4. ✅ TutorialLibraryScreen.tsx - Browse lessons
5. ✅ LessonCard.tsx - Lesson display
6. ✅ Navigation updates
7. ✅ HomeScreen integration
8. ✅ Seed data SQL
9. ✅ Unit tests
10. ✅ SettingsScreen updates (optional)
11. ✅ Documentation

## Alternative: Manual Copy-Paste

If you can't use the RepoPrompt prompt command:

1. Open RepoPrompt interface
2. Look for "Set Prompt" or similar option
3. Paste the entire contents of `REPOPROMPT_TUTORIAL_MODE.md`
4. Start asking the agent to implement components

## What's Already Done (Phase 1)

✅ Infrastructure complete:
- TypeScript types
- Sync client functions
- Database schema
- Dependencies installed
- Environment variables configured

❌ Not yet done:
- Actual UI components
- Zustand store
- Screens
- Tests

## Next Steps After Setting Prompt

Ask the agent:
- "Start implementing tutorialStore.ts following the prompt"
- "Create the VideoPlayer component"
- "Build TutorialScreen"
- etc.

The agent will follow the detailed requirements in the prompt and reference the existing code patterns.

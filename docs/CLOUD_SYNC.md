# Cloud Sync Documentation

## Overview

The Handwriting Math app implements **local-first cloud sync** with Supabase. All data is stored locally in MMKV as the source of truth, with cloud sync providing backup, cross-device sync, and analytics.

## Architecture

### Local-First Design

- **Zustand stores** remain the source of truth
- **MMKV** provides instant local persistence
- **Cloud** is an eventually-consistent mirror
- All sync operations are **idempotent** using client-generated UUIDs

### Sync Flow

```
User Action (e.g., completes step)
  ↓
Zustand store updates
  ↓
MMKV saves locally (instant)
  ↓
Cloud sync triggered (async)
  ↓
Success → Done
Failure → Enqueue for retry
```

### Components

1. **supabaseClient.ts** - Supabase initialization and auth
2. **syncClient.ts** - Idempotent upsert methods
3. **queue.ts** - Retry queue with exponential backoff
4. **serializer.ts** - Stroke compression (delta + gzip)
5. **hydrate.ts** - Restore data on app launch

## Database Schema

See `docs/DB_SCHEMA.sql` for full schema.

### Tables

- **sessions** - App sessions with device metadata
- **attempts** - Problem-solving attempts
- **steps** - Solution steps with validation results
- **strokes** - Compressed stroke data (delta+gzip+base64)
- **hints** - Hint history with escalation tracking

### Row-Level Security (RLS)

All tables have RLS policies enforcing `user_id = auth.uid()` for complete user isolation.

## Authentication

### Phase 1: Email Magic Link (Current)

Passwordless authentication using Supabase Auth:

```typescript
import { signInWithMagicLink } from './utils/sync/supabaseClient';

// Send magic link
await signInWithMagicLink('user@example.com');

// User clicks link in email, session established
```

### Phase 2: Anonymous Accounts (Future)

Device-bound anonymous accounts for frictionless onboarding, with optional email linking.

## Compression

### Stroke Serialization

Achieves 70-90% bandwidth reduction:

1. **Delta encoding** - Store relative differences vs absolute coordinates
2. **Quantization** - Reduce precision to 1 decimal place
3. **Binary packing** - Compact binary format (16 bytes/point)
4. **Gzip compression** - Standard compression
5. **Base64 encoding** - Text transport

Average: 5KB → 1KB per stroke

## Sync Triggers

### Automatic Sync

- **startAttempt()** → sync session + attempt
- **addStepToAttempt()** → sync step + enqueue strokes
- **endAttempt()** → update attempt with final state
- **requestHint()** → sync hint entry

### Manual Sync

Settings → Cloud Sync → Manual Sync

Triggers:
1. Hydrate from cloud (fetch latest data)
2. Process queue (upload pending items)

## Retry Logic

### Queue Configuration

- Max attempts: 8
- Initial delay: 1000ms
- Backoff multiplier: 2x
- Max delay: 128 seconds

### Retry Schedule

```
Attempt 1: Immediate
Attempt 2: +1s
Attempt 3: +2s
Attempt 4: +4s
Attempt 5: +8s
Attempt 6: +16s
Attempt 7: +32s
Attempt 8: +64s (final)
```

### Priority Queue

Items processed in order:
1. Sessions (highest priority)
2. Attempts
3. Steps
4. Strokes
5. Hints (lowest priority)

## Hydration

### App Launch

On app start, the hydration process:

1. Fetch attempts modified since `last_sync` timestamp
2. For each attempt, fetch steps and strokes
3. Deserialize compressed strokes
4. Merge with local MMKV data using **last-write-wins**
5. Update `last_sync` timestamp

### Conflict Resolution

- Uses `updated_at` timestamps
- Last write wins (simple, predictable)
- Local changes always persist (local-first)

## Telemetry

### Sentry Integration

All sync operations are instrumented:

```typescript
// Success breadcrumbs
addBreadcrumb('Attempt synced', 'sync', { attemptId });

// Failures captured
captureException(error, { attemptId, stepId });
```

### Monitored Events

- Enqueue operations
- Sync successes
- Retry attempts
- Final failures
- Compression ratios

## Testing

### Unit Tests

- Serializer round-trip
- Queue retry logic
- Idempotent upserts

### Integration Tests

- Sign in flow
- Sync after network recovery
- Hydration with merge

### RLS Verification

Test that users cannot access each other's data:

```sql
-- Should return 0 rows
SELECT * FROM attempts WHERE user_id != auth.uid();
```

## Environment Variables

Required in `.env`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
ENABLE_CLOUD_SYNC=true
SYNC_RETRY_MAX_ATTEMPTS=8
SYNC_RETRY_DELAY_MS=1000
```

## Settings UI

### Cloud Sync Section

- **Sign In** - Email magic link
- **Manual Sync** - Trigger sync now
- **Status** - Current auth state
- **Sign Out** - Clear session

## Future Enhancements

### Phase 2 Features

- Real-time sync with WebSocket subscriptions
- Conflict resolution UI for diverged data
- Selective sync (choose what to sync)
- Export/import for backup

### Phase 3: Teacher Dashboard

- Admin access to student data
- Progress analytics
- Live monitoring during sessions

## Troubleshooting

### Sync not working

1. Check `ENABLE_CLOUD_SYNC=true` in `.env`
2. Verify Supabase URL and anon key
3. Ensure user is authenticated
4. Check queue stats in Settings

### Data not appearing

1. Trigger manual sync in Settings
2. Check last hydration timestamp
3. Verify RLS policies allow access
4. Check Sentry for sync errors

### Performance issues

1. Monitor compression ratios (should be <30%)
2. Check queue size (should be <100 items)
3. Verify retry backoff is working
4. Use Sentry performance tracking

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [Row-Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Schema](./DB_SCHEMA.sql)
- [Architecture Overview](./ARCHITECTURE.md)
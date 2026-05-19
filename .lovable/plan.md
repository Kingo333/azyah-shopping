
## Lovable side — final fixes

Three additive changes. Worker is already deployed and verified.

### 1. Fix Worker endpoint paths (plural)
- `supabase/functions/live-cam-session-start/index.ts`: change `/session/start` → `/sessions/start`
- `supabase/functions/live-cam-session-end/index.ts`: change `/session/end` → `/sessions/end`

Auth header, content-type, and body `{ user_id, garment_id }` already correct.

### 2. Persist and surface new Worker response shape

**Migration** on `public.live_cam_sessions`:
```sql
alter table public.live_cam_sessions
  add column if not exists gpu_used text,
  add column if not exists cloud_used text,
  add column if not exists attempts jsonb;
```

**In `live-cam-session-start/index.ts`:**
- On success: write `gpu_used`, `cloud_used`, `attempts` to the session row alongside `pod_id`, `ws_url`, `status='running'`.
- On `error === "runpod_no_capacity"` (HTTP 503): return `{ error: 'All GPUs are temporarily unavailable, please try again in a minute', attempts }` with status 503.
- On `error === "runpod_create_failed"` (HTTP 502): log `upstream_body` + `attempts`, persist `attempts` and `error_message` on the failed session row, return generic 502 to client.
- Keep existing behavior for non-JSON / unexpected upstream responses.

### 3. WebSocket cold-start retry-with-backoff

**In `src/components/ai-studio/live-cam/useLiveCamSession.ts`:**
- Bump `STARTING_TIMEOUT_MS` from `90_000` → `180_000`.
- Replace the single-shot WS open with a retry loop:
  - First retry after 3s, subsequent retries every 5s.
  - Retry on both `error` and on `close` that fires before `open`.
  - Abort retries when the overall 180s budget elapses (already handled by `startTimeoutRef`); on abort, set `failed` with a clear message.
- Add a new status value `'warming'` (or reuse `'starting'`) and expose a user-facing string "Warming up GPU… this can take up to 3 minutes" while retrying.

**In `src/components/ai-studio/live-cam/liveCamTypes.ts`:** add `'warming'` to `LiveCamStatus` if introduced.

**In `LiveCamCameraView.tsx` (or wherever status is rendered):** show the warming copy for that status.

### Out of scope
Worker, RunPod config, DB RLS, storage buckets, Picture/Video tabs, auth, edge function `verify_jwt` settings.

### Files touched
- `supabase/migrations/<new>.sql` (3 columns)
- `supabase/functions/live-cam-session-start/index.ts`
- `supabase/functions/live-cam-session-end/index.ts`
- `src/components/ai-studio/live-cam/useLiveCamSession.ts`
- `src/components/ai-studio/live-cam/liveCamTypes.ts` (if status added)
- `src/components/ai-studio/live-cam/LiveCamCameraView.tsx` (warming copy)

Approve to implement.

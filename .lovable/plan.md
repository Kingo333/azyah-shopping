## Audit vs spec — what's already done

- ✅ Migration columns `gpu_used`, `cloud_used`, `attempts` exist on `live_cam_sessions`.
- ✅ `live-cam-session-start` UPDATEs the existing row (not INSERT) on success and failure, persists `gpu_used`/`cloud_used`/`attempts`, returns 503 for `runpod_no_capacity`, 502 for `runpod_create_failed`.
- ✅ `STARTING_TIMEOUT_MS` bumped to 180_000; WS cold-start retry loop with ref-tracked timers, cancellable, with deadline.
- ✅ `LiveCamStatus` includes `'warming'`; warming copy shown in `LiveCamTab` button.
- ✅ `beforeunload` cleanup with keepalive fetch + auth call to `/live-cam-session-end`.
- ✅ Stop button, unmount, auth SIGNED_OUT all call `cleanupLocal` + `callEnd`.

## What's still missing

### Fix 1 — `supabase/functions/live-cam-session-start/index.ts`
Worker now returns canonical `ws_url`. Stop constructing client-side and stop reading the old `ws_url_hint`.
- Line 139: replace
  ```
  wsUrl = (parsed.ws_url_hint as string) ?? (podId ? `wss://${podId}-8765.proxy.runpod.net/ws` : null);
  ```
  with
  ```
  wsUrl = (parsed.ws_url as string) ?? null;
  ```
- If `wsUrl` is missing from a successful worker response, treat as upstream failure: UPDATE row to `status='failed'`, return 502.

Redeploy this function.

### Fix 2 — `src/components/ai-studio/live-cam/useLiveCamSession.ts`
Add `visibilitychange` (when `document.hidden`) and `pagehide` listeners that mirror the `beforeunload` path. Use `navigator.sendBeacon` for `pagehide` (survives page close better than keepalive fetch on iOS Safari); keep keepalive fetch as the auth-bearing path because `sendBeacon` cannot set an `Authorization` header.

Concretely, in the existing `useEffect` (around line 328):
- Extract the unload-cleanup logic into a local `endViaKeepalive()` helper (auth-bearing keepalive fetch — already implemented).
- Add `endViaBeacon()` helper: build same URL + JSON body, call `navigator.sendBeacon(url, new Blob([...], {type:'application/json'}))` as a best-effort fallback.
- Listeners:
  - `beforeunload` → `cleanupLocal()` + `endViaKeepalive()` + `endViaBeacon()`
  - `pagehide` → same
  - `visibilitychange` → if `document.hidden`, call `void stop()` (full path, including DB update to ended)
- Add `removeEventListener` for all three in cleanup return.

### Fix 3 — `src/components/ai-studio/live-cam/LiveCamCameraView.tsx`
Render warming copy inside the try-on pane (small overlay) when a new optional prop `status === 'warming'` is passed. Add prop `status?: LiveCamStatus`. `LiveCamTab` passes `status` through. Keep button copy as-is.

## Out of scope
- Worker, RunPod image, DB schema (already done), Picture/Video tabs, auth, verify_jwt, RLS.

## Files touched
- `supabase/functions/live-cam-session-start/index.ts` — read `ws_url` only; treat missing as failure.
- `src/components/ai-studio/live-cam/useLiveCamSession.ts` — add `pagehide` + `visibilitychange` handlers, sendBeacon fallback.
- `src/components/ai-studio/live-cam/LiveCamCameraView.tsx` — warming overlay.
- `src/components/ai-studio/live-cam/LiveCamTab.tsx` — pass `status` prop down.



# Fix AR Loading Failures + Improve Error Handling

## Root Cause Analysis

The AR gets stuck on "Starting AR... Preparing camera and tracking" and then shows "AR scene failed to initialize" because of a **sceneReadyPromise race condition with early rejection**:

1. `initPipeline()` runs camera + pose in parallel
2. If **either** fails (camera denied, WASM timeout, no camera on desktop), the function returns early at lines 245-264 **without resolving** `sceneReadyPromiseRef`
3. Effect 2 (model loading) awaits `sceneReadyPromiseRef.current`, which has a 20-second timeout (line 60)
4. After 20s, the timeout fires and shows "AR scene failed to initialize" — even though the actual error was "camera denied" or "pose init failed" and was already displayed

Additionally, the console shows **JWT expired errors** across all Supabase queries, meaning the auth session expired. The product fetch in Effect 1 (line 151) likely fails silently, setting `isValidContext = false` and showing "AR Experience Unavailable" instead of refreshing the session.

## Plan

### File 1: `src/pages/ARExperience.tsx`

**Fix A — Reject sceneReadyPromise on pipeline failure (prevents 20s hang)**
When `initPipeline` exits early due to camera/pose error (lines 245-264), immediately reject the sceneReadyPromise so Effect 2 doesn't wait 20 seconds before showing the error. Store the reject function alongside the resolve function in a ref, and call it in every early-return path.

**Fix B — Effect 2 should not overwrite specific error states**
Currently line 450-452 always sets `camera_error` + "AR scene failed to initialize" when the scene promise rejects. Instead, check if `trackingState` is already set to a specific error (like `camera_denied` or `pose_init_failed`) and skip overwriting it.

**Fix C — Add session refresh before product fetch**
Before the Supabase query at line 151, call `supabase.auth.getSession()` to auto-refresh an expired JWT. This prevents the "JWT expired" errors that cause the product fetch to fail.

### File 2: `src/ar/guidance/TrackingGuidance.tsx`

**Fix D — Show loadStage during model_loading too**
Line 74 shows `loadProgress` but not `loadStage`. Add `loadStage` display so users see "Downloading 3D model…" with progress underneath.

## Technical Details

```text
Current failure flow:
  Camera fails → setTrackingState('camera_denied') → return
  [20 seconds pass...]
  sceneReadyPromise rejects → overwrites to 'camera_error' + wrong message

Fixed flow:
  Camera fails → setTrackingState('camera_denied') → reject sceneReadyPromise → return
  Effect 2 catches rejection → sees trackingState already has error → skips overwrite
```

### Changes Summary
- `ARExperience.tsx`: Store sceneReady reject ref, reject on early returns, guard Effect 2 overwrite, add session refresh
- `TrackingGuidance.tsx`: Show loadStage in model_loading state


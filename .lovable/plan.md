

# Fix Retailer Portal Loading Error + AR Loading Issues

## Two Issues Found

### Issue 1: Retailer Portal Stuck on Loading
**Root cause:** In `RetailerPortal.tsx`, `loading` starts as `true` and is only set to `false` inside `fetchProducts()` (line 265). But `fetchRetailer()` (lines 85-166) can throw an error — when it does, it shows a toast ("Failed to load your retailer portal") but **never sets `loading = false`**. The page stays stuck on the "Setting up your Retailer Portal..." spinner forever.

**Fix:** Add `setLoading(false)` in the catch block of `fetchRetailer()` (after line 164). Also set `setSetupError(error.message)` so the retry UI appears instead of an eternal spinner.

### Issue 2: AR Experience — Long Loading + Potential Stuck States
The AR page flow is: fetch products → init camera + pose in parallel → load 3D model. Several issues remain:

**A. Effect 2 (model loading) has a race condition with Effect 1 (pipeline init).** Effect 2 checks `if (!sceneManagerRef.current) return;` — but Effect 1 is async. If the product selection resolves before the pipeline finishes initializing SceneManager, Effect 2 silently bails out and never retries. The model never loads, and the user sees "Downloading 3D model…" forever.

**B. `loadStage` gets stuck.** During the `initializing` state, `loadStage` shows "Starting camera & body tracking…". But once the pipeline finishes, if Effect 2 hasn't fired yet (because SceneManager wasn't ready), there's a gap where `trackingState` becomes `model_loading` but `loadStage` may be stale.

**C. No error boundary for WASM download failures.** If the MediaPipe WASM CDN is slow or blocked (common on restricted networks), `createPoseProcessor()` can hang for 30+ seconds before timing out. There's no timeout wrapper on this promise.

## Plan

### File 1: `src/pages/RetailerPortal.tsx`
- In `fetchRetailer()` catch block (~line 159): add `setLoading(false)` and `setSetupError(error.message || 'Unknown error')` so the page shows the retry UI instead of spinning forever.

### File 2: `src/pages/ARExperience.tsx`
- **Fix the Effect 2 race condition:** Instead of bailing when `sceneManagerRef.current` is null, wait for it. Add a small polling interval or use a ref-based signal that Effect 1 sets when SceneManager is ready, so Effect 2 can await it.
- **Add a timeout to `createPoseProcessor()`:** Wrap the pose promise with a 15-second timeout so users aren't stuck if the WASM CDN is unreachable.
- **Ensure `loadStage` stays accurate:** Clear `loadStage` transitions so no stale messages persist between states.

### File 3: `src/ar/core/PoseProcessor.ts`
- No changes needed — the timeout is applied at the call site in ARExperience.

## Technical Details

**Effect 2 race fix approach:** Create a `sceneReadyPromise` ref that Effect 1 resolves when SceneManager is initialized. Effect 2 awaits this promise before checking `sceneManagerRef.current`, ensuring the model load always proceeds once the scene is ready.

```text
Effect 1 (mount):
  startCamera + createPoseProcessor (parallel)
  → SceneManager created
  → resolve sceneReadyPromise  ← NEW
  → start render loop

Effect 2 (product change):
  → await sceneReadyPromise    ← NEW (ensures SceneManager exists)
  → load model (reuse prefetch if available)
  → swapModel into scene
```

**Pose processor timeout:** Wrap `createPoseProcessor()` with `Promise.race([createPoseProcessor(), timeout(15000)])` in `initPipeline`. If it times out, show `pose_init_failed` state with a retry button.


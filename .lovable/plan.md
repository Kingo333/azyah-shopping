
Do I know what the issue is? Yes.

What I found
- This is not a missing 2D/3D camera connection and not a shopper-side camera toggle problem. Both 2D and 3D already share the same camera/video feed.
- The real break is in `src/pages/ARExperience.tsx`:
  - `Effect 2` waits on `sceneReadyPromiseRef`.
  - That promise is only resolved after camera + pose init complete and `SceneManager` is created.
  - `Effect 2` also hard-fails after 15s.
- Your evidence proves the race:
  - screenshot debug panel: `pref: 2d`, overlay URL exists, `mode: none`, `status: error`, `Scene init failed: AR scene loading timed out after 15s`
  - console logs: timeout fires at `16:31:57`, but `PoseProcessor` finishes at `16:31:58`
- So the app aborts one second too early, never reaches mode/asset loading, and leaves `arMode` stuck at its default `'none'`.

Secondary code bugs I found
- `arMode` is set too late. It is assigned only after the scene wait, so a slow init leaves the UI stuck on `(NONE)` even for a valid 2D product.
- The 3D branch can still set `partial_tracking` / `tracking_active` even when no model is loaded, which creates misleading shopper guidance.
- Product switching does not fully clear 3D state (`modelRef.current` / scene swap), so stale model state can leak into 2D or failed loads.
- `TrackingGuidance` always says “3D model” on `model_error`, even when the failing asset is a 2D overlay.

Implementation plan
1. Fix the init race in `src/pages/ARExperience.tsx`
   - Remove the fatal 15s `Promise.race` timeout.
   - Resolve scene readiness earlier: create `SceneManager` and resolve the scene-ready signal before waiting for slow pose/model downloads.
   - Keep real failure handling on camera/WebGL/pose errors instead of the artificial timeout.

2. Set AR mode immediately on product selection
   - Move `resolveARMode(selectedProduct)` + `setArMode(...)` + `arModeRef.current = ...` to the start of the load flow.
   - This makes valid 2D products show `2d` right away instead of falling back to `'none'` while init is still running.

3. Decouple 2D asset loading from slow pose init
   - Let the 2D overlay load as soon as the video/canvas prerequisites are ready.
   - Keep pose detection initializing in parallel so the garment appears as soon as landmarks start arriving.

4. Stop fake tracking states
   - In the animation loop, only allow 3D tracking states when `arModeRef.current === '3d'` and `modelRef.current` exists.
   - If no asset is loaded yet, keep the shopper in loading/waiting instead of `partial_tracking` or `tracking_active`.

5. Fully clear stale assets on product switch
   - Dispose the old 2D overlay.
   - Clear `modelRef.current`.
   - Call `sceneManagerRef.current?.swapModel(null)`.
   - Reset debug/loading state before loading the new asset.

6. Fix shopper messaging
   - Update `src/ar/guidance/TrackingGuidance.tsx` so `model_error` becomes a generic AR asset error message, not always a 3D-model message.
   - Keep the debug panel, but make it reflect “resolved mode” vs “loaded asset” more clearly.

7. Add regression tests
   - Extend `src/ar/__tests__/arSystem.test.ts` for:
     - valid 2D products not getting stuck at `none`
     - slow pose init not aborting asset load
     - no tracking-active/partial state when no asset is actually loaded
     - stale 3D model state clearing on switch to 2D

Files to edit
- `src/pages/ARExperience.tsx`
- `src/ar/guidance/TrackingGuidance.tsx`
- `src/ar/__tests__/arSystem.test.ts`

Expected result
- For this shopper flow, the debug panel should show `mode: 2d` immediately.
- The overlay should load after camera/video readiness, even if MediaPipe is slower on iPhone Safari.
- The UI should stop showing `(NONE)` for products that already have a valid 2D overlay.
- If something still fails after that, the remaining error will point to the actual asset load step, not a false scene timeout.

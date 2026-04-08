

# Camera + AR Mode Connection Audit Results

## Finding: Both 2D and 3D ARE connected to the same camera — no toggle needed

The architecture is correct. Here's the proof:

```text
Pipeline Flow:
  1 camera (startCamera) → 1 video element → 1 PoseProcessor
                                                    ↓
                                            animate() loop
                                                    ↓
                              imageOverlayRef.current exists?
                              ├─ YES → 2D path (ImageOverlay.updateFrame)
                              └─ NO  → 3D path (SceneManager + model)
```

- **One `<video>` element** (line 891) with `playsInline muted autoPlay`
- **One `startCamera()` call** (line 311) — shared by both modes
- **One `PoseProcessor`** (line 312) — shared by both modes
- **Mode branching** happens at line 407: if `imageOverlayRef.current` exists, the 2D path runs; otherwise the 3D path runs
- **Mode is set** in Effect 2 (line 692-695) via `resolveARMode(product)` which checks `ar_overlay_url` vs `ar_model_url`

## Why "nothing is working" — likely root causes

The camera and pose pipeline initialize correctly, but the problem is probably one of these:

### 1. The product has no AR assets uploaded
If `ar_overlay_url` is null AND `ar_model_url` is null, `resolveARMode()` returns `'none'` — the render loop runs but neither path activates (no `imageOverlayRef`, no model loaded). The user sees just the camera feed with "Waiting for pose" forever.

### 2. The `sceneReadyPromise` blocks Effect 2
Effect 2 (model/overlay loading) awaits `sceneReadyPromiseRef.current` before loading anything. If the camera or pose init fails silently, this promise never resolves and the overlay/model never loads. The user sees the camera feed but no garment.

### 3. 2D overlay image fails to load (CORS or 404)
If the `ar_overlay_url` points to a deleted or inaccessible Supabase file, `ImageOverlay.loadGarment()` fails, setting `model_error` state — but the camera keeps running with no garment visible.

## What to fix

### A. Add visible AR mode indicator in the UI
Show the user which mode is active (2D/3D/none) so they know the system detected their product's assets correctly. Currently there's no visible indicator of which mode was selected.

### B. Add console logging for mode selection
Add a `console.log('[AR] Mode resolved:', resolvedMode)` in Effect 2 so we can diagnose what mode is being chosen.

### C. Handle `arMode === 'none'` gracefully
When `resolveARMode` returns `'none'`, show a message like "No AR assets found for this product" instead of silently running the camera with no overlay.

## Changes needed

### File: `src/pages/ARExperience.tsx`

1. **Effect 2 (line 692)**: Add logging after mode resolution:
   ```typescript
   console.log('[AR] Mode resolved:', resolvedMode, {
     overlay: selectedProduct.ar_overlay_url,
     model: selectedProduct.ar_model_url,
     pref: selectedProduct.ar_preferred_mode,
   });
   ```

2. **After line 695**: Handle `none` mode — if `resolvedMode === 'none'`, set an error state:
   ```typescript
   if (resolvedMode === 'none') {
     setTrackingState('model_error');
     setTrackingMessage('No AR assets found for this product. Ask the retailer to upload a 2D overlay or 3D model.');
     return;
   }
   ```

3. **UI (around line 947)**: Add AR mode badge next to tracking indicator so users/developers can see which mode is active:
   ```typescript
   <span className="text-xs text-white/60 ml-1">({arMode.toUpperCase()})</span>
   ```

4. **Effect 2, 2D load error**: Add more specific error logging when overlay image fails to load (line 722-727) — log the URL that failed so we can check if it's a CORS/404 issue.

These are diagnostic + UX changes. No camera toggle is needed — the camera is already shared. The real issue is likely that the product's AR assets are missing or the mode resolved to `'none'`.


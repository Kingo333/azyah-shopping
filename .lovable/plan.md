

# Fix AR System for Real Devices — Implementation Plan

## Proven Root Causes

### Bug 1: 2D canvas freezes when pose drops
**File**: `src/pages/ARExperience.tsx`, lines 399-431
The 2D overlay repaints ONLY inside the `if (result && result.landmarks.length > 0)` block (line 404). When pose detection returns no landmarks (common on mobile due to throttling/occlusion), the 2D canvas stops repainting entirely — the user sees a frozen image. The rAF still schedules, but the visible canvas is never touched.

### Bug 2: 2D occlusion allocates a canvas every frame
**File**: `src/ar/core/ImageOverlay.ts`, line 309
`document.createElement('canvas')` + full-resolution `getImageData`/`putImageData` every frame. On a 1280×720 canvas that's ~3.7M pixels × 4 bytes = ~14.7MB of pixel copying per frame. This will stall mobile browsers.

### Bug 3: No `garment_type` selector on 2D overlay tab
**File**: `src/components/BrandProductManager.tsx`, lines 654-798
The garment type selector only exists in Tab 3 (3D model, line 802-833). 2D-only products default to `'shirt'`, causing wrong anchor placement for abayas/pants.

### Bug 4: No iOS Safari resilience
**File**: `src/ar/core/CameraManager.ts` — no `visibilitychange` handler. iOS Safari pauses video when backgrounded and may not resume `play()`. Also no `loadedmetadata` re-check for late video dimensions.

### Bug 5: Debug panel always visible in production
**File**: `src/pages/ARExperience.tsx`, lines 976-983. The debug panel is unconditionally rendered for all users.

## Implementation Plan

### 1. Add BUILD_ID + debug HUD with runtime counters
**File**: `src/pages/ARExperience.tsx`

- Add `const BUILD_ID = '2026-04-09T...'` constant at top of file
- Add refs for counters: `rafTicks`, `poseCalls`, `overlayDraws`, `segCalls`, each with a per-second snapshot
- In `animate()`, increment `rafTicks` every frame, `poseCalls` when pose runs, `overlayDraws` when 2D canvas draws, `segCalls` when segmentation runs
- Every 1s, compute rates and store in state (only when `?debug=true`)
- Gate debug panel render on `isDebug` flag from URL params
- Show: BUILD_ID, rafTicks/s, poseCalls/s, overlayDraws/s, segCalls/s, camera status, arMode, video dimensions, garment loaded, model loaded, tier, last error

### 2. Fix 2D freeze — repaint video every rAF regardless of pose
**File**: `src/pages/ARExperience.tsx`, lines 394-615

Restructure `animate()`:
- **Always** repaint the 2D canvas with the live video feed every frame (not just when pose arrives)
- Only draw garment overlay when `lastLandmarksRef.current` exists
- Move rAF scheduling to a single `finally`-style location at the end — no early returns before it
- Specifically: remove the `return` at line 430, move all post-pose code (tier management, debug, rAF scheduling) outside the pose-conditional block

```
animate(time):
  // 2D: always repaint video
  if (imageOverlayRef.current && video.readyState >= 2) {
    imageOverlay.drawVideoFrame(video)   // new method: just video, no garment
    overlayDraws++
  }

  // Pose detection (throttled)
  if (time - lastPoseTime > interval && video.readyState >= 2) {
    result = pp.detectForVideo(...)
    poseCalls++
    if (result.landmarks) {
      lastLandmarksRef = result.landmarks[0]
      if (imageOverlayRef.current) {
        imageOverlay.drawGarmentAndOcclusion(lastLandmarks)
      } else {
        // 3D path...
      }
    }
  }
  // 2D with stale landmarks: still draw garment
  else if (imageOverlayRef.current && lastLandmarksRef.current) {
    imageOverlay.drawGarmentOnly(lastLandmarks)
  }

  // tier management, debug, rAF — always runs
  animFrameRef.current = requestAnimationFrame(animate)
```

### 3. Refactor ImageOverlay to separate video draw from garment draw
**File**: `src/ar/core/ImageOverlay.ts`

Split `updateFrame()` into:
- `drawVideo(video)` — draws cover-cropped mirrored video only (called every rAF)
- `drawGarment(landmarks)` — extracts landmarks, smooths, dispatches to renderer, applies occlusion (called only when landmarks available)
- Keep `updateFrame(video, landmarks)` as a convenience wrapper that calls both

### 4. Fix 2D occlusion performance
**File**: `src/ar/core/ImageOverlay.ts`

A. Cache temp canvas as class fields (`this.tempCanvas`, `this.tempCtx`) — create once in constructor, resize when canvas resizes
B. Downscale: use a 256px-wide occlusion buffer instead of full resolution
C. Use `globalCompositeOperation: 'destination-over'` approach: draw mask-shaped body region, then composite — avoids per-pixel JS loop entirely
D. Throttle: add `lastOcclusionTime` field, only run every 100-125ms (~8-10fps)
E. Wrap in try/catch; on error, set `this.occlusionDisabled = true` and continue

### 5. Add garment type selector to 2D overlay tab
**File**: `src/components/BrandProductManager.tsx`

Insert the same garment type `<Select>` component (currently at lines 803-833) into the overlay tab (before the upload input at line 665). Persist `garment_type` alongside the overlay upload at line 738-745.

### 6. iOS Safari hardening
**File**: `src/pages/ARExperience.tsx`

- Add `visibilitychange` listener in Effect 1: on resume, check `video.paused` and call `video.play()`, re-check `videoWidth`
- Add `loadedmetadata` listener on video element: when fired, recompute `coverCropRef` and call `imageOverlayRef.current?.updateCoverCrop()`
- These ensure late dimension availability and backgrounding don't break the pipeline

### 7. Gate debug panel behind `?debug=true`
**File**: `src/pages/ARExperience.tsx`

- `const isDebug = searchParams.get('debug') === 'true'`
- Wrap debug panel JSX (lines 976-983) in `{isDebug && (...)}`

### 8. Segmentation hardening
**Files**: `src/pages/ARExperience.tsx`, `src/ar/core/ImageOverlay.ts`

Wrap all segmentation calls in try/catch. On failure, log error to debug HUD, disable segmentation for the session, continue rendering.

## Files Changed

| File | Changes |
|------|---------|
| `src/pages/ARExperience.tsx` | BUILD_ID, debug HUD with counters (gated), fix animate() 2D freeze, iOS handlers, segmentation try/catch |
| `src/ar/core/ImageOverlay.ts` | Split updateFrame, cache occlusion canvas, downscale occlusion, throttle, try/catch |
| `src/components/BrandProductManager.tsx` | Add garment_type selector to 2D overlay tab |

## Verification

After deploying, open `?debug=true` on each platform and confirm:

| Metric | Desktop Chrome | Android Chrome | iOS Safari |
|--------|---------------|----------------|------------|
| BUILD_ID matches | PASS | PASS | PASS |
| rafTicks/s > 30 | PASS | PASS | PASS |
| overlayDraws/s > 20 (2D) | PASS | PASS | PASS |
| poseCalls/s ~ 10-15 | PASS | PASS | PASS |
| segCalls/s ~ 8-10 (Tier A) | PASS | PASS | PASS |
| 2D canvas stays live when hands cover face | PASS | PASS | PASS |
| Capture includes garment | PASS | PASS | PASS |
| No freeze after 10s | PASS | PASS | PASS |


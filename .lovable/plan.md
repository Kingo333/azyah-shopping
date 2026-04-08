

# AR System Overhaul: 10-Fix Implementation Plan

## Patch Sequencing (ordered by dependency + impact)

### Fix 1: 2D Capture — Mode-Aware Photo Export
**File**: `src/pages/ARExperience.tsx` (handleCapture, lines 162-176)

**Current**: Always uses `compositeCapture(video, canvasRef)` which composites the Three.js canvas. In 2D mode, Three.js canvas is hidden — photos show no garment.

**Change**: Check `arMode`. If `'2d'`, export directly from `overlayCanvasRef.current` (which already contains video+garment composite). If `'3d'`, keep existing compositor path. Add iOS Safari fallback using `canvas.toDataURL` if `toBlob` fails.

```typescript
// Before
const blob = await compositeCapture(videoRef.current, canvasRef.current);

// After
if (arMode === '2d' && overlayCanvasRef.current) {
  blob = await new Promise((resolve, reject) => {
    overlayCanvasRef.current!.toBlob(b => b ? resolve(b) : reject(...), 'image/png');
  });
} else {
  blob = await compositeCapture(videoRef.current, canvasRef.current);
}
```

---

### Fix 2: 2D Cover-Crop Alignment
**File**: `src/ar/core/ImageOverlay.ts`

**Current**: `ctx.drawImage(video, 0, 0, w, h)` stretches video to fill canvas. `toPixel()` maps landmarks to full-video space. Result: 5-15% offset on phones where video aspect != display aspect.

**Changes**:
1. Add `coverCrop` state to ImageOverlay class (srcX, srcY, srcW, srcH fields)
2. Add `updateCoverCrop(videoW, videoH, canvasW, canvasH)` method — computes source rect using same math as `captureCompositor.ts`
3. Replace `ctx.drawImage(video, 0, 0, w, h)` with `ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, w, h)`
4. Replace `toPixel()` with cover-crop-aware mapping:
   - `vx = lm.x * videoW` (raw video pixel)
   - `cx = (vx - srcX) * (canvasW / srcW)` (canvas pixel)
   - Mirror once: `cx = canvasW - cx`
5. Call `updateCoverCrop()` from ARExperience on init and resize

**Note**: Mirror is applied once in the coordinate conversion (not via `ctx.scale(-1,1)` AND in `toPixel`). The video draw uses `ctx.scale(-1,1)` for display mirroring; landmark mapping mirrors separately.

---

### Fix 3: 2D Segmentation-Based Occlusion
**Files**: `src/ar/core/ImageOverlay.ts` + `src/pages/ARExperience.tsx`

**Current**: Segmentation only runs in 3D branch (line 478-484). 2D returns early at line 383.

**Changes to ImageOverlay**:
1. Add `occlusionMask: { data: Float32Array, width: number, height: number } | null` field
2. Add `updateOcclusionMask(mask)` method
3. In `updateFrame()`, after drawing garment overlay, if `occlusionMask` exists:
   - Create temporary ImageData from the video frame (cover-cropped)
   - For each pixel where mask confidence > 0.5, draw the original video pixel OVER the garment
   - This makes body parts (arms/hands) appear in front of the garment
   - Optimization: only process in the bounding box around the garment, not the full canvas

**Changes to ARExperience** (animate loop, after the 2D early return at line 383):
1. Remove the early return — let segmentation run for 2D too
2. After `imageOverlayRef.current.updateFrame(video, landmarks)`, run segmentation with same throttle/budget logic as 3D
3. Feed mask to `imageOverlayRef.current.updateOcclusionMask(mask)`

---

### Fix 4: 2D Smoothing Upgrade (OneEuroFilter)
**File**: `src/ar/core/ImageOverlay.ts`

**Current**: Uses `ema()` with fixed `SMOOTH_ALPHA = 0.70` and `MAX_POINT_JUMP = 90px` guard.

**Change**: Import `OneEuroFilter` and `OutlierFilter` from existing utils. Create filter instances for each smoothed landmark (shoulders, hips, wrists) and for the garment transform (x, y, w, h, angle). Replace `emaPt()` calls with `outlierFilter.filter() → oneEuroFilter.filter()` chain. Add `reset()` method to clear filters on product switch.

Filters needed: ~14 OneEuroFilter instances (7 landmarks × 2 axes) + 5 for garment transform + 7 OutlierFilter instances.

---

### Fix 5: Full Performance Tiers with Recovery
**Files**: `src/pages/ARExperience.tsx`, `src/ar/core/SceneManager.ts`

**Current**: Single action — disable segmentation at FPS < 20, never re-enables.

**New 3-tier system**:
- **Tier A** (FPS ≥ 22): segmentation ON, shadows ON, 15fps pose
- **Tier B** (FPS 15-22): segmentation OFF, shadows ON
- **Tier C** (FPS < 15): segmentation OFF, shadows OFF, 10fps pose rate

**Recovery**: If FPS > 25 for 5 continuous seconds, step up one tier.

**SceneManager changes**: Add `setShadowsEnabled(enabled: boolean)` method that toggles `renderer.shadowMap.enabled` and shadow plane visibility.

**ARExperience changes**: Replace current FPS check block (lines 526-535) with tier state machine. Store `currentTier` ref. On tier change, toggle segmenter, call `sm.setShadowsEnabled()`, adjust pose interval (`66ms` for A/B, `100ms` for C). Track "time at high FPS" for recovery.

**2D path**: Skip segmentation under Tier B/C. Under Tier C, skip every other pose frame.

---

### Fix 6: Camera Error Mapping
**File**: `src/pages/ARExperience.tsx` (lines 304-315)

**Current**: Only maps `NotAllowedError`/`PermissionDeniedError`. Others show raw `err.message`.

**Change**: Add specific error mappings:
- `NotFoundError` → "No camera found. Please check your device has a camera."
- `NotReadableError` → "Camera is in use by another app. Close other apps and try again."
- `OverconstrainedError` → Retry with relaxed constraints `{ video: { facingMode: 'user' } }` (no resolution ideal), then show message if still fails
- `AbortError` → "Camera initialization was interrupted. Please try again."

---

### Fix 7: Remove Dead Code — GarmentRenderer.ts
**Action**: Delete `src/ar/core/GarmentRenderer.ts`

Rationale: Wiring ARExperience to use GarmentRenderer would be a large refactor that risks breaking the working 3D path. The file is 221 lines of duplicated logic. Delete it and remove any unused imports. The 3D pipeline in ARExperience is battle-tested and should remain the source of truth.

---

### Fix 8: WebGL powerPreference
**File**: `src/ar/core/SceneManager.ts` (line 70)

**Change**: Add `powerPreference: 'high-performance'` to WebGLRenderer options:
```typescript
new THREE.WebGLRenderer({ canvas, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
```

---

### Fix 9: Resize Handler for 2D Cover Crop
**File**: `src/pages/ARExperience.tsx` (Effect 3, lines 728-745)

**Change**: In the resize handler, if `imageOverlayRef.current` exists and video is ready, call `imageOverlayRef.current.updateCoverCrop(videoW, videoH, newW, newH)` to recalculate the cover-crop source rect.

---

### Fix 10: Regression Protection
**File**: New file `src/ar/__tests__/arSystem.test.ts`

Minimal vitest tests:
1. `resolveARMode()` — test all combinations (2d only, 3d only, both, none, with preferences)
2. Cover-crop math — verify `computeCoverCrop()` returns expected values for common aspect ratios (16:9 on portrait phone, 4:3 on landscape desktop)
3. Capture path assertion — verify that 2D mode would use overlay canvas (mock-based)
4. `ImageOverlay.computeCoverCrop()` sanity check

---

## Files Modified Summary

| File | Changes |
|------|---------|
| `src/pages/ARExperience.tsx` | Fix 1 (capture), Fix 3 (2D segmentation), Fix 5 (tiers), Fix 6 (errors), Fix 9 (resize) |
| `src/ar/core/ImageOverlay.ts` | Fix 2 (cover-crop), Fix 3 (occlusion), Fix 4 (smoothing) |
| `src/ar/core/SceneManager.ts` | Fix 5 (shadow toggle), Fix 8 (powerPreference) |
| `src/ar/core/GarmentRenderer.ts` | Fix 7 (delete) |
| `src/ar/__tests__/arSystem.test.ts` | Fix 10 (new test file) |

---

## Verification Checklist

**Desktop Chrome**:
- [ ] 2D mode: garment aligns with shoulders (no 5% offset)
- [ ] 2D mode: cross arms in front of shirt → arms appear in front
- [ ] 2D mode: take photo → garment visible in captured image
- [ ] 3D mode: occlusion works, capture works
- [ ] Switch products → no stale garment/filters

**Android Chrome**:
- [ ] Same alignment/occlusion/capture tests
- [ ] FPS tier transitions: artificially stress → segmentation disables → recover → re-enables
- [ ] Cover-crop correct on portrait phone (most critical test)

**iOS Safari**:
- [ ] Camera permission prompt appears and works
- [ ] Video plays inline (no fullscreen takeover)
- [ ] Capture works (toBlob or toDataURL fallback)
- [ ] No WASM loading failures (check console)

**Debug overlay** (`?debug=true`):
- [ ] Shows current FPS, tier (A/B/C), AR mode (2d/3d), segmentation status


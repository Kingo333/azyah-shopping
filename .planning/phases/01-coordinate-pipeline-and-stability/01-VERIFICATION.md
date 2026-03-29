---
phase: 01-coordinate-pipeline-and-stability
verified: 2026-03-29T00:00:00Z
status: human_needed
score: 5/5 must-haves verified
re_verification: false
human_verification:
  - test: "Raise your right hand and wave left/right in the AR camera view"
    expected: "The 3D model responds on the correct side with no left/right inversion. Right hand lift moves the overlay in the correct direction."
    why_human: "Mirror correctness is a visual/directional property — cannot be asserted from static code alone."
  - test: "Resize the browser window to several aspect ratios (narrow/tall, wide/short, square) while body tracking is active"
    expected: "The garment overlay stays centered on the body at each aspect ratio with no systematic offset or drift."
    why_human: "Cover-crop math correctness is geometry; whether it *looks* correct on a real camera feed requires visual confirmation."
  - test: "Move toward and away from the camera slowly and quickly while tracking is active"
    expected: "Slow movement: model tracks smoothly with minimal jitter. Fast movement: model follows with low lag. No 'swimming' effect."
    why_human: "One Euro Filter adaptive behavior is a perceptual quality that requires live observation."
  - test: "Resize the browser window while body tracking is active"
    expected: "Model re-centers immediately on resize with no drift or misplacement."
    why_human: "Resize handler recalculation correctness must be confirmed with a real video feed and live tracking session."
  - test: "Confirm the video element shows a selfie-mirror view (your right hand appears on the right side of the video)"
    expected: "The video feed appears mirrored as expected. The 3D overlay is NOT mirrored (canvas has no CSS scaleX(-1))."
    why_human: "The combination of video mirror + canvas non-mirror is a visual pairing that needs human eyes to confirm it looks natural."
---

# Phase 1: Coordinate Pipeline and Stability — Verification Report

**Phase Goal:** The coordinate pipeline produces correct, stable landmark-to-screen mappings on all devices
**Verified:** 2026-03-29
**Status:** human_needed (all automated checks pass; 5 items require visual confirmation)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Success Criteria from ROADMAP.md

| # | Success Criterion | Status | Evidence |
|---|-------------------|--------|----------|
| 1 | A 3D model placed at landmark positions appears at the correct body location — no left/right inversion, no systematic offset | ? HUMAN | Canvas has no `scaleX(-1)`. Mirror is applied once in `landmarkToWorld(mirror=true)`. Visual confirmation needed. |
| 2 | Model positioning remains consistent across devices with different aspect ratios — no 5-15% drift | ? HUMAN | `computeCoverCrop` called on init (line 171) and in resize handler (lines 413-416). Math is correct. Live test needed. |
| 3 | The 3D model tracks the user's body smoothly without visible jitter or frame-rate-dependent swimming lag | ? HUMAN | Six `OneEuroFilter` instances replace LERP. Timestamps passed as `performance.now() / 1000` (seconds). Filter behavior must be observed live. |
| 4 | The AR system does not silently break when MediaPipe publishes a new WASM version | VERIFIED | `WASM_URL` pinned to `@mediapipe/tasks-vision@0.10.34` (line 12 of ARExperience.tsx). `@latest` is gone. |
| 5 | Resizing the browser window or rotating the device does not break model placement | ? HUMAN | Resize handler recalculates `visibleDimsRef` and `coverCropRef` (lines 405-416). Code is correct. Live resize test needed. |

**Score:** 1/5 fully automated; 4/5 pass code checks and require human visual confirmation

---

## Observable Truths (from PLAN must_haves)

### From 01-01-PLAN.md

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | OneEuroFilter produces smoothed output that adapts to signal speed | VERIFIED | Class implements standard algorithm: derivative estimate `dxHat`, adaptive cutoff `minCutoff + beta * |dxHat|`, then EMA with that cutoff. Fast movement raises cutoff (less smoothing). Slow movement leaves cutoff low (more smoothing). Lines 64-74 of OneEuroFilter.ts. |
| 2 | `landmarkToWorld()` applies mirror transform exactly once and maps normalized landmark coordinates to Three.js world coordinates | VERIFIED | Function does: (1) `nx = mirror ? 1 - landmark.x : landmark.x`, (2) cover-crop offset/scale, (3) `(nx - 0.5) * visibleDims.w` and `-(ny - 0.5) * visibleDims.h`. No other mirroring exists in ARExperience.tsx (grep for `mirrorX` returns zero matches). |
| 3 | `computeCoverCrop()` correctly calculates crop offsets for video-wider-than-display and video-taller-than-display cases | VERIFIED | Wide video branch: `scaleX = displayAspect / videoAspect`, `offsetX = (1 - scaleX) / 2`, `scaleY = 1`, `offsetY = 0`. Tall video branch: `scaleY = videoAspect / displayAspect`, `offsetY = (1 - scaleY) / 2`, `scaleX = 1`, `offsetX = 0`. Zero-dimension guard returns identity. Lines 65-83 of coordinateUtils.ts. |
| 4 | WASM URL is pinned to `@0.10.34`, not `@latest` | VERIFIED | `const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm';` — ARExperience.tsx line 12. |

### From 01-02-PLAN.md

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 5 | The Three.js canvas does NOT have CSS `scaleX(-1)` | VERIFIED | Canvas element JSX (lines 461-466): `<canvas ref={canvasRef} className="absolute inset-0 w-full h-full" .../>` — no style prop, no transform. |
| 6 | The video element STILL has CSS `scaleX(-1)` for selfie mirror effect | VERIFIED | Video element JSX (lines 453-458): `style={{ transform: 'scaleX(-1)' }}` is present. |
| 7 | Landmarks are mapped through `landmarkToWorld()` which accounts for object-fit:cover crop offset | VERIFIED | All four key landmarks (ls, rs, lh, rh) are mapped via `landmarkToWorld(landmark, crop, visDims, true)` — lines 319-326. No inline coordinate math remains. |
| 8 | Z-depth is a constant (0), body-turn rotation uses shoulder Z difference only | VERIFIED | `const targetZ = 0;` (line 350). Body-turn: `shoulderZDiff = landmarks[12].z - landmarks[11].z` and `Math.atan2(shoulderZDiff, shoulderWidthWorld / visDims.w)` — lines 361-365. |
| 9 | Resizing recalculates both `visibleDims` and `coverCrop` | VERIFIED | Resize handler (lines 397-421): updates renderer size, camera aspect, `visibleDimsRef.current`, and `coverCropRef.current` via `computeCoverCrop(videoRef.current.videoWidth, videoRef.current.videoHeight, w, h)`. |
| 10 | Smoothing uses `OneEuroFilter` instances (one per axis) with timestamp in seconds, not frame-rate-dependent LERP | VERIFIED | Six filter refs (lines 66-71). Timestamps passed as `performance.now() / 1000` (line 368). No references to old `lerp` function or `SMOOTHING` constant remain. |

**Automated truth score: 10/10**

---

## Required Artifacts

| Artifact | Expected | Level 1: Exists | Level 2: Substantive | Level 3: Wired | Status |
|----------|----------|-----------------|---------------------|----------------|--------|
| `src/ar/utils/OneEuroFilter.ts` | Adaptive low-pass filter with minCutoff, beta, dCutoff | FOUND | 104 lines; exports `OneEuroFilter` class and `FILTER_PRESETS`; full algorithm implementation | Imported and used in ARExperience.tsx line 10, 66-71 | VERIFIED |
| `src/ar/utils/coordinateUtils.ts` | Canonical coordinate transform utilities | FOUND | 124 lines; exports `CoverCropInfo`, `computeCoverCrop`, `landmarkToWorld`; complete implementations | Imported line 9 ARExperience.tsx; `computeCoverCrop` called lines 171, 413; `landmarkToWorld` called lines 319, 320, 325, 326 | VERIFIED |
| `src/pages/ARExperience.tsx` | Pinned WASM version URL | FOUND | Substantial (563 lines); full AR pipeline | Contains `@mediapipe/tasks-vision@0.10.34` at line 12 | VERIFIED |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/pages/ARExperience.tsx` | `src/ar/utils/coordinateUtils.ts` | `import { landmarkToWorld, computeCoverCrop, CoverCropInfo }` | WIRED | Line 9: import present. Functions called at lines 171, 319, 320, 325, 326, 413. |
| `src/pages/ARExperience.tsx` | `src/ar/utils/OneEuroFilter.ts` | `import { OneEuroFilter, FILTER_PRESETS }` | WIRED | Line 10: import present. Six filter refs instantiated lines 66-71. All six `filter()` calls at lines 369-374. All six `reset()` calls at lines 128-133. |
| `updateModel()` | `landmarkToWorld` | All landmark-to-world conversions go through this function | WIRED | 4 calls to `landmarkToWorld()` in `updateModel()`. No inline `(x - 0.5) * visW` or similar math remains. `mirrorX` helper is fully absent. |
| `handleResize` | `computeCoverCrop` + `visibleDims` recalculation | Resize handler updates both values | WIRED | Lines 405-416: `visibleDimsRef.current` updated; `computeCoverCrop(...)` called conditionally when `videoRef.current.videoWidth > 0`. |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| COORD-01 | 01-01, 01-02 | Fix double-mirror bug — resolve CSS scaleX(-1) and programmatic mirrorX() conflict | SATISFIED | Canvas has no `scaleX(-1)`. `mirrorX()` helper absent. Mirror applied once in `landmarkToWorld(mirror=true)`. |
| COORD-02 | 01-01, 01-02 | Fix renderer/video aspect ratio mismatch — align Three.js camera with video feed + object-fit:cover | SATISFIED | `computeCoverCrop` on init (line 171) and resize (lines 413-416). Camera uses `displayAspect` not video aspect (line 176-177). |
| COORD-03 | 01-01, 01-02 | Fix Z-depth formula — correct avgZ * 2 - 1 mapping | SATISFIED | `targetZ = 0` (line 350). Old `avgZ * 2 - 1` formula is absent. |
| COORD-04 | 01-01 | Pin MediaPipe WASM version — replace @latest with specific version | SATISFIED | `WASM_URL` contains `@0.10.34` (line 12). |
| COORD-05 | 01-02 | Fix resize handler — recalculate visible world dimensions on resize | SATISFIED | Resize handler at lines 397-421 recalculates both `visibleDimsRef` and `coverCropRef`. |
| ARCH-02 | 01-01, 01-02 | Implement One Euro Filter for adaptive landmark smoothing | SATISFIED | Six `OneEuroFilter` instances (lines 66-71), used in `updateModel()` (lines 369-374), reset on product change (lines 128-133), timestamps in seconds (line 368). |

All 6 phase requirements are SATISFIED. No orphaned requirements detected.

---

## Anti-Patterns Scan

Files modified in this phase: `src/ar/utils/OneEuroFilter.ts`, `src/ar/utils/coordinateUtils.ts`, `src/pages/ARExperience.tsx`

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/pages/ARExperience.tsx` | 222 | `console.log('Model normalized dims:', modelDimsRef.current)` | Info | Debug logging left in; not a correctness issue |

No TODO/FIXME/placeholder markers, no empty implementations, no stub returns found in the three modified files. The `console.log` on line 222 is informational debug output, not a blocker.

---

## Human Verification Required

### 1. Mirror Correctness (COORD-01)

**Test:** Open the AR experience in a browser. Allow camera access. Raise your right hand.
**Expected:** The 3D garment model responds on the correct side. Left/right body movements map to correct left/right directions in the overlay. The video feed shows a selfie-mirror view (your right hand appears on the right of the video).
**Why human:** Directional correctness of mirror behavior requires visual inspection with a live camera feed.

### 2. Aspect Ratio Consistency (COORD-02)

**Test:** While body tracking is active, resize the browser window to several extreme aspect ratios: very narrow/tall (portrait phone), very wide/short (landscape tablet), near-square.
**Expected:** The garment overlay remains centered on the body at each aspect ratio. No systematic left/right or up/down drift as dimensions change.
**Why human:** Cover-crop geometry correctness depends on the actual video feed dimensions vs. display dimensions — a live test is the only way to confirm the math produces visually correct placement.

### 3. Smoothing Quality (ARCH-02)

**Test:** While tracking is active, move slowly (small adjustments) then quickly (full arm sweeps). Observe garment motion.
**Expected:** Slow movement: model stays nearly still (no jitter). Fast movement: model follows with low lag (no excessive rubber-banding). Transition between slow and fast is smooth.
**Why human:** One Euro Filter adaptive behavior is a perceptual quality. The algorithm is correctly implemented but tuning adequacy (minCutoff=1.0, beta=0.007 for position) can only be validated by feel.

### 4. Resize During Active Tracking (COORD-05)

**Test:** Start the AR experience, get into an active tracking state, then resize the browser window.
**Expected:** Model immediately re-centers on the body after resize. No drift or misplacement that requires re-acquiring pose.
**Why human:** The resize handler has a conditional guard (`videoRef.current.videoWidth > 0`) — correct behavior under edge cases (resize before video metadata loads, etc.) requires live testing.

### 5. Combined Mirror + Canvas/Video Split (COORD-01)

**Test:** Observe that the video layer shows a mirrored selfie view AND the 3D overlay moves in the correct matching direction (not double-mirrored, not un-mirrored).
**Expected:** The overall effect feels like a standard AR try-on: you see yourself mirrored in the video, and the garment sits naturally on your body.
**Why human:** The visual combination of video `scaleX(-1)` + programmatic mirror in `landmarkToWorld` is what produces the correct UX. Code verifies each piece exists; only a human can confirm they combine correctly.

---

## Summary

All 10 observable truths verified from code inspection. All 3 required artifacts exist, are substantive, and are fully wired. All 6 phase requirements (COORD-01 through COORD-05, ARCH-02) are satisfied by the implementation. No blocking anti-patterns found.

The phase is code-complete. The remaining 5 items all require a live camera session to confirm the visual/perceptual correctness of the coordinate transforms. These cannot be verified programmatically because they depend on the actual relationship between the physical camera feed, the display dimensions at runtime, and the perceived position of the 3D model overlay.

The implementation is structurally sound — no stubs, no placeholders, no broken wiring. Human sign-off is the only remaining gate.

---

_Verified: 2026-03-29_
_Verifier: Claude (gsd-verifier)_

# Phase 1: Coordinate Pipeline and Stability - Research

**Researched:** 2026-03-29
**Domain:** MediaPipe PoseLandmarker coordinate transformation, Three.js camera projection, real-time signal filtering
**Confidence:** HIGH

## Summary

Phase 1 fixes six foundational issues in the AR coordinate pipeline that, if left unresolved, would corrupt every subsequent phase's garment positioning. The bugs are all concentrated in a single file (`src/pages/ARExperience.tsx`, 535 lines) and interact with each other: the double-mirror bug (COORD-01) affects horizontal placement, the aspect ratio mismatch (COORD-02) creates systematic drift on non-standard screens, the Z-depth formula (COORD-03) produces incorrect depth, the `@latest` WASM URL (COORD-04) risks silent breakage, and the resize handler (COORD-05) fails to update visible dimensions on orientation change. ARCH-02 replaces the frame-rate-dependent LERP smoothing with the One Euro Filter, the established standard for real-time pose signal filtering.

All six issues are well-understood, code-verified, and have clear fixes. The research confirms that MediaPipe's normalized landmark `z` coordinate represents depth relative to the hip midpoint (not a [0,1] range), that `object-fit: cover` crops symmetrically from center by default, and that the One Euro Filter algorithm is approximately 30 lines of TypeScript with two intuitive tuning parameters. No new dependencies are required.

**Primary recommendation:** Fix all bugs in the existing `ARExperience.tsx` file without decomposing the monolith (decomposition is Phase 2). Introduce the One Euro Filter as a standalone utility class alongside the bug fixes. Establish a single canonical `landmarkToWorld()` coordinate transform function that all subsequent phases will use.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COORD-01 | Fix double-mirror bug -- resolve CSS scaleX(-1) and programmatic mirrorX() conflict | Lines 299/429/436 verified: both CSS flip on video+canvas AND programmatic `1-x` applied. Fix: remove CSS scaleX(-1) from canvas, keep only on video. Handle all mirroring in the coordinate transform function. |
| COORD-02 | Fix renderer/video aspect ratio mismatch -- align Three.js camera dimensions with actual video feed accounting for object-fit:cover crop | Lines 158-169 verified: camera uses video aspect, renderer uses window dimensions. Fix: compute object-fit:cover crop offset and apply to landmark mapping. |
| COORD-03 | Fix Z-depth formula -- correct the avgZ * 2 - 1 mapping | Line 326 verified: formula maps [0,1] to [-1,1] but MediaPipe z is centered at hip midpoint and NOT in [0,1] range. Fix: use constant Z for positioning, use Z differences only for body-turn rotation. |
| COORD-04 | Pin MediaPipe WASM version -- replace @latest with specific version | Line 10 verified: uses `@latest`. Fix: pin to `@0.10.34` matching package.json dependency. |
| COORD-05 | Fix resize handler -- recalculate visible world dimensions when window resizes | Lines 382-392 verified: handler updates renderer and camera.aspect but NOT visibleDimsRef. Fix: recalculate visibleDims in resize handler. |
| ARCH-02 | Implement One Euro Filter for adaptive landmark smoothing | Lines 34-35/344-356 verified: uses frame-rate-dependent LERP with constant factor 0.3. Fix: replace with One Euro Filter, one filter instance per smoothed axis (position.x/y, scale.x/y/z, rotation). |
</phase_requirements>

## Standard Stack

### Core (Already Installed -- No Changes)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @mediapipe/tasks-vision | ^0.10.34 | Pose landmark detection | Already installed. PoseLandmarker API is stable. Provides both normalized and world landmarks. |
| three | ^0.160.1 | 3D rendering overlay | Already installed. WebGLRenderer with alpha for transparent overlay on video feed. |
| React | 18.x | UI framework | Already the project's framework. ARExperience.tsx is a React component. |

### Supporting (New Utility -- No New Dependencies)

| Utility | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| OneEuroFilter class | Custom (~30 LOC) | Adaptive low-pass filtering for landmark smoothing | Apply to every smoothed output axis (position x/y, scale x/y/z, rotation) |
| `landmarkToWorld()` utility | Custom | Canonical coordinate transform (mirror + cover-crop + NDC-to-world) | Every frame when converting MediaPipe landmarks to Three.js world coordinates |
| `computeCoverCrop()` utility | Custom | Calculate object-fit:cover visible sub-rectangle | On init and on resize, to map landmarks correctly when video aspect differs from display aspect |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom OneEuroFilter | npm `1eurofilter` package | Adds dependency for 30 lines of code; custom is simpler and avoids bundle bloat |
| Perspective camera with FOV | Orthographic camera | Orthographic avoids FOV-to-world math entirely but is a larger architectural change; defer to Phase 2+ if needed |
| Frame-based LERP | Kalman Filter | Kalman requires tuning covariance matrices; One Euro has 2 intuitive params (minCutoff, beta) for same result |

**Installation:**
```bash
# No new packages needed. All fixes use existing dependencies.
# Only change: pin WASM URL from @latest to @0.10.34
```

## Architecture Patterns

### Current File (Single File -- Phase 1 Does NOT Decompose)

Phase 1 modifies `src/pages/ARExperience.tsx` in place. The monolith decomposition into separate modules (CameraManager, PoseProcessor, LandmarkSmoother, etc.) is Phase 2's scope. Phase 1 introduces the key utility functions that Phase 2 will extract into modules.

```
src/
  pages/
    ARExperience.tsx          # Modified: fix bugs, add One Euro Filter
  utils/                      # or src/ar/utils/ -- location TBD
    OneEuroFilter.ts          # NEW: reusable filter class
    coordinateUtils.ts        # NEW: landmarkToWorld(), computeCoverCrop()
```

### Pattern 1: Single Canonical Coordinate Transform

**What:** All landmark-to-world mapping goes through ONE function that handles mirroring, cover-crop offset, and NDC-to-world conversion.

**When to use:** Every frame, for every landmark that needs to be placed in Three.js world space.

**Example:**
```typescript
// Source: Derived from codebase analysis + MediaPipe docs
interface CoverCropInfo {
  scaleX: number;   // how much the video is scaled to fill container
  scaleY: number;
  offsetX: number;  // how much of the video is cropped on each side (normalized 0-1)
  offsetY: number;
}

function computeCoverCrop(
  videoWidth: number, videoHeight: number,
  displayWidth: number, displayHeight: number
): CoverCropInfo {
  const videoAspect = videoWidth / videoHeight;
  const displayAspect = displayWidth / displayHeight;

  let scaleX: number, scaleY: number, offsetX = 0, offsetY = 0;

  if (videoAspect > displayAspect) {
    // Video is wider than display: crop sides
    scaleY = 1;
    scaleX = displayAspect / videoAspect;
    offsetX = (1 - scaleX) / 2;  // cropped from each side
  } else {
    // Video is taller than display: crop top/bottom
    scaleX = 1;
    scaleY = videoAspect / displayAspect;
    offsetY = (1 - scaleY) / 2;
  }

  return { scaleX, scaleY, offsetX, offsetY };
}

function landmarkToWorld(
  landmark: { x: number; y: number },
  coverCrop: CoverCropInfo,
  visibleDims: { w: number; h: number },
  mirror: boolean = true
): { x: number; y: number } {
  // 1. Mirror X for selfie camera (handle ONCE here, nowhere else)
  let nx = mirror ? 1 - landmark.x : landmark.x;
  let ny = landmark.y;

  // 2. Apply cover-crop: map from full-video-normalized to visible-portion-normalized
  nx = (nx - coverCrop.offsetX) / coverCrop.scaleX;
  ny = (ny - coverCrop.offsetY) / coverCrop.scaleY;

  // 3. Convert from [0,1] to Three.js world units (centered at 0)
  const worldX = (nx - 0.5) * visibleDims.w;
  const worldY = -(ny - 0.5) * visibleDims.h;  // flip Y: screen Y is top-down, Three.js Y is bottom-up

  return { x: worldX, y: worldY };
}
```

### Pattern 2: One Euro Filter Per Axis

**What:** Each smoothed output gets its own filter instance with axis-appropriate parameters.

**When to use:** After computing target position/scale/rotation, before applying to Three.js model.

**Example:**
```typescript
// Source: 1 Euro Filter paper (Casiez et al., 2012) + official JS implementation
class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xPrev: number;
  private dxPrev: number;
  private tPrev: number;
  private initialized: boolean;

  constructor(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xPrev = 0;
    this.dxPrev = 0;
    this.tPrev = 0;
    this.initialized = false;
  }

  private alpha(tE: number, cutoff: number): number {
    const r = 2 * Math.PI * cutoff * tE;
    return r / (r + 1);
  }

  filter(x: number, timestamp: number): number {
    if (!this.initialized) {
      this.xPrev = x;
      this.dxPrev = 0;
      this.tPrev = timestamp;
      this.initialized = true;
      return x;
    }

    const tE = timestamp - this.tPrev;
    if (tE <= 0) return this.xPrev;

    // Derivative estimation with low-pass
    const aD = this.alpha(tE, this.dCutoff);
    const dx = (x - this.xPrev) / tE;
    const dxHat = aD * dx + (1 - aD) * this.dxPrev;

    // Adaptive cutoff: more smoothing at low speed, less at high speed
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const a = this.alpha(tE, cutoff);

    // Filtered value
    const xHat = a * x + (1 - a) * this.xPrev;

    this.xPrev = xHat;
    this.dxPrev = dxHat;
    this.tPrev = timestamp;

    return xHat;
  }

  reset(): void {
    this.initialized = false;
  }
}

// Recommended per-axis parameters for AR garment overlay:
// Position (x, y): minCutoff=1.0, beta=0.007 -- moderate smoothing, responsive to movement
// Scale (x, y, z): minCutoff=0.5, beta=0.001 -- heavy smoothing, scale should not jitter
// Rotation (y):    minCutoff=0.8, beta=0.004 -- moderate smoothing
```

### Pattern 3: Constant Z-Depth with Rotation from Z-Difference

**What:** Set model Z position to a constant (e.g., 0), use landmark Z *differences* only for body-turn estimation.

**When to use:** Replace the current `avgZ * 2 - 1` formula.

**Example:**
```typescript
// Source: MediaPipe docs confirm z is "depth relative to hip midpoint,
// roughly same scale as x" -- NOT in [0,1] range

// WRONG (current code):
const targetZ = avgZ * 2 - 1;  // maps [0,1] to [-1,1], but z is NOT in [0,1]

// CORRECT: constant depth, body-turn from z-difference
const targetZ = 0;  // model sits at camera plane
const shoulderZDiff = landmarks[12].z - landmarks[11].z;  // positive = right shoulder closer
const bodyTurnY = Math.atan2(shoulderZDiff, shoulderWidthNorm);  // rotation for body turn
```

### Anti-Patterns to Avoid

- **Double-mirroring:** NEVER apply CSS `scaleX(-1)` to the Three.js canvas AND programmatic `mirrorX` to landmark coordinates. Choose ONE location for the mirror transform. Recommendation: mirror in code only, remove CSS flip from canvas.
- **Frame-rate-dependent smoothing:** NEVER use `lerp(current, target, constantFactor)` without delta-time. The One Euro Filter is inherently time-based and avoids this.
- **Using raw MediaPipe Z for positioning:** NEVER map MediaPipe's normalized `z` directly to a Three.js world Z coordinate. The `z` value is a relative depth hint, not an absolute position.
- **Computing visibleDims once and caching forever:** ALWAYS recalculate when the display dimensions change (resize, orientation change).
- **Mixing coordinate systems:** NEVER compute some landmarks with mirror and others without. The `landmarkToWorld()` function handles mirroring consistently for all landmarks.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Adaptive signal smoothing | Custom LERP with tuned constants | One Euro Filter (standard algorithm) | LERP is frame-rate dependent, One Euro adapts to signal speed automatically |
| Object-fit:cover crop math | Eyeballed offsets per device | `computeCoverCrop()` with proper aspect ratio geometry | The crop formula is deterministic geometry; guessing breaks on new device aspect ratios |
| WASM version management | Manual checking of CDN | Pin version in URL string to match package.json | `@latest` is a ticking time bomb; version pinning is trivial |
| Coordinate mirroring | Per-landmark ad-hoc `1-x` calls | Single `landmarkToWorld()` with mirror parameter | Scattered mirror logic is the root cause of the double-mirror bug |

**Key insight:** Every bug in this phase comes from ad-hoc math scattered across the `updateModel()` function. The fix is to centralize coordinate transforms into well-tested utility functions that all subsequent phases will reuse.

## Common Pitfalls

### Pitfall 1: Removing CSS scaleX(-1) from Video Breaks the Selfie Mirror

**What goes wrong:** If you remove CSS `scaleX(-1)` from the video element (instead of the canvas), users see themselves non-mirrored, which feels unnatural for a front-facing camera.

**Why it happens:** Users expect a selfie camera to behave like a mirror. The CSS flip on the video provides this.

**How to avoid:** Keep `scaleX(-1)` on the `<video>` element. Remove it ONLY from the `<canvas>` (Three.js overlay). Handle all coordinate mirroring in code via `landmarkToWorld()` with `mirror: true`.

**Warning signs:** The 3D model appears on the wrong side of the body, or arm movements are reversed relative to the user's actual movement.

### Pitfall 2: Cover Crop Formula Gets X/Y Offsets Backwards

**What goes wrong:** When the video is wider than the display (common with 16:9 video on 19.5:9 phones), the crop is horizontal. When the video is narrower, the crop is vertical. Getting the direction wrong causes landmarks to map to the wrong screen position.

**Why it happens:** `object-fit: cover` scales the video to fill the LARGER dimension, then crops the other dimension symmetrically (default `object-position: 50% 50%`).

**How to avoid:** Test the crop formula explicitly:
- 1280x720 video on 390x844 display: video aspect (1.78) > display aspect (0.46), so video is wider, horizontal crop applies
- Verify by placing a debug dot at landmark (0.5, 0.5) -- it should appear at screen center regardless of aspect ratio mismatch

**Warning signs:** Model is systematically offset in one direction on all devices with a particular aspect ratio.

### Pitfall 3: One Euro Filter Timestamps Must Be in Seconds

**What goes wrong:** The `requestAnimationFrame` callback provides timestamps in milliseconds. The One Euro Filter's `tE` (time elapsed) is used to compute cutoff frequencies in Hz. If milliseconds are passed as seconds, the filter computes absurdly small time deltas and breaks.

**Why it happens:** The algorithm uses `2 * PI * cutoff * tE` where tE should be in seconds. If tE is in milliseconds, the smoothing factor approaches 1.0 (no smoothing).

**How to avoid:** Convert timestamps to seconds before passing to the filter: `filter(value, timestamp / 1000)`.

**Warning signs:** The One Euro Filter produces no visible smoothing effect, or produces extreme lag.

### Pitfall 4: Resize Handler Creates New visibleDims But Camera Aspect Also Changes

**What goes wrong:** The resize handler updates `camera.aspect` (to `window.innerWidth / window.innerHeight`) and updates the renderer size, but forgets to also recompute `visibleDims` from the new camera parameters. Since `visibleDims` uses the camera's FOV and Z-distance, it must be recalculated when the aspect changes.

**Why it happens:** The visible height depends on FOV and Z-distance (which don't change), but the visible width depends on `visibleHeight * aspect` (which changes on resize).

**How to avoid:** In the resize handler, after updating camera.aspect, recalculate:
```typescript
const vFov = (camera.fov * Math.PI) / 180;
const visibleHeight = 2 * Math.tan(vFov / 2) * camera.position.z;
const visibleWidth = visibleHeight * camera.aspect;
visibleDimsRef.current = { w: visibleWidth, h: visibleHeight };
// Also recompute coverCrop with new display dimensions
coverCropRef.current = computeCoverCrop(vw, vh, w, h);
```

**Warning signs:** Model position is correct initially but drifts after rotating the phone or resizing the browser.

### Pitfall 5: Smoothing Applied Between Pose Updates Creates Drift

**What goes wrong:** The current code applies smoothing EVERY render frame (60fps), but pose updates arrive at ~15fps. Between pose updates, the model continues interpolating toward a stale target, creating uneven motion.

**Why it happens:** `updateModel()` is called inside the render loop but gated by the 66ms pose throttle. The smoothing in `updateModel()` runs only on pose frames, which is correct. But if someone moves smoothing to the render loop (a common refactoring mistake), it will drift.

**How to avoid:** Apply the One Euro Filter ONLY when new pose data arrives (inside the pose detection callback), NOT on every render frame. Between pose updates, hold the last filtered value.

## Code Examples

### Fix 1: COORD-01 -- Remove Double Mirror

```typescript
// BEFORE (current code, lines 429/436):
// <video style={{ transform: 'scaleX(-1)' }} />      -- CSS mirror on video
// <canvas style={{ transform: 'scaleX(-1)' }} />      -- CSS mirror on canvas
// const mirrorX = (x: number) => 1 - x;               -- code mirror on landmarks

// AFTER:
// <video style={{ transform: 'scaleX(-1)' }} />        -- KEEP: selfie mirror for user
// <canvas />                                            -- REMOVE scaleX(-1): no CSS flip
// landmarkToWorld() handles mirror internally            -- KEEP: one place for mirror logic
```

### Fix 2: COORD-02 -- Account for Object-Fit Cover Crop

```typescript
// Source: CSS object-fit:cover specification + geometry

// Compute once on init and on resize:
const crop = computeCoverCrop(video.videoWidth, video.videoHeight,
                               window.innerWidth, window.innerHeight);

// Use in every frame's landmark-to-world mapping:
const worldPos = landmarkToWorld(landmark, crop, visibleDimsRef.current, true);
```

### Fix 3: COORD-03 -- Replace Z-Depth Formula

```typescript
// BEFORE (line 326):
const targetZ = avgZ * 2 - 1;

// AFTER:
const targetZ = 0;  // constant depth -- the overlay is effectively 2D
// Use Z difference for body-turn rotation only:
const bodyTurnY = Math.atan2(
  landmarks[12].z - landmarks[11].z,   // right shoulder z - left shoulder z
  Math.abs(landmarkToWorld(landmarks[12], crop, visibleDims).x
         - landmarkToWorld(landmarks[11], crop, visibleDims).x) / visibleDims.w
);
```

### Fix 4: COORD-04 -- Pin WASM Version

```typescript
// BEFORE (line 10):
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

// AFTER:
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm';
```

### Fix 5: COORD-05 -- Recalculate visibleDims on Resize

```typescript
// BEFORE (lines 382-392): only updates renderer and camera aspect
// AFTER: also updates visibleDims and cover crop

const handleResize = () => {
  if (rendererRef.current && cameraObjRef.current) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    rendererRef.current.setSize(w, h);
    cameraObjRef.current.aspect = w / h;
    cameraObjRef.current.updateProjectionMatrix();

    // FIX: recalculate visible world dimensions
    const vFov = (cameraObjRef.current.fov * Math.PI) / 180;
    const visibleHeight = 2 * Math.tan(vFov / 2) * cameraObjRef.current.position.z;
    const visibleWidth = visibleHeight * cameraObjRef.current.aspect;
    visibleDimsRef.current = { w: visibleWidth, h: visibleHeight };

    // FIX: recalculate cover crop with new display dimensions
    if (videoRef.current) {
      coverCropRef.current = computeCoverCrop(
        videoRef.current.videoWidth, videoRef.current.videoHeight, w, h
      );
    }
  }
};
```

### Fix 6: ARCH-02 -- Replace LERP with One Euro Filter

```typescript
// BEFORE (lines 344-356):
smoothPos.current = {
  x: lerp(smoothPos.current.x, targetX, SMOOTHING),
  y: lerp(smoothPos.current.y, targetY, SMOOTHING),
  z: lerp(smoothPos.current.z, targetZ, SMOOTHING),
};

// AFTER: One filter instance per axis, created once in the component
// (initialized outside updateModel, stored in refs)
const filterPosX = useRef(new OneEuroFilter(1.0, 0.007));
const filterPosY = useRef(new OneEuroFilter(1.0, 0.007));
const filterScaleX = useRef(new OneEuroFilter(0.5, 0.001));
const filterScaleY = useRef(new OneEuroFilter(0.5, 0.001));
const filterScaleZ = useRef(new OneEuroFilter(0.5, 0.001));
const filterRotY = useRef(new OneEuroFilter(0.8, 0.004));

// In updateModel, pass timestamp in seconds:
const t = performance.now() / 1000;
const smoothX = filterPosX.current.filter(targetX, t);
const smoothY = filterPosY.current.filter(targetY, t);
const smoothScX = filterScaleX.current.filter(targetScaleX, t);
const smoothScY = filterScaleY.current.filter(targetScaleY, t);
const smoothScZ = filterScaleZ.current.filter(targetScaleZ, t);
const smoothRotY = filterRotY.current.filter(bodyTurnY, t);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MediaPipe Solutions API (`@mediapipe/pose`) | MediaPipe Tasks API (`@mediapipe/tasks-vision` PoseLandmarker) | 2023 | Legacy Solutions API is deprecated. Current code already uses Tasks API correctly. |
| `@latest` CDN URLs for WASM | Pinned version URLs | Industry best practice | Prevents silent breakage when MediaPipe publishes a new version |
| Frame-rate-dependent LERP smoothing | One Euro Filter (time-based adaptive smoothing) | 2012 paper, widely adopted by 2020 | Eliminates frame-rate-dependent behavior, adapts smoothing to motion speed |
| Direct Z-coordinate positioning | Constant Z with Z-difference rotation | Common AR overlay practice | MediaPipe normalized Z is not suitable for absolute positioning |

**Deprecated/outdated:**
- `@mediapipe/pose` (0.5.x): Legacy Solutions API, deprecated by Google in 2023. The project has it installed alongside `@mediapipe/tasks-vision` but does not use it. Should be removed in Phase 2.
- `LIVE_STREAM` running mode for PoseLandmarker Web: Research confirms this mode is NOT available in the JavaScript Tasks Vision API. Only `IMAGE` and `VIDEO` modes exist. The current code correctly uses `VIDEO` mode with `detectForVideo()`. The STACK.md recommendation to switch to LIVE_STREAM should be disregarded for Phase 1.

## Open Questions

1. **Camera FOV accuracy (63 degrees hardcode)**
   - What we know: The Three.js camera FOV is hardcoded to 63 degrees (line 159). Actual phone front cameras range 70-90 degrees. This creates a systematic scaling error.
   - What's unclear: Whether the FOV error is significant enough to notice in Phase 1 (it affects scale mapping between normalized coords and world coords).
   - Recommendation: Keep 63 degrees for Phase 1. The cover-crop fix will handle aspect ratio issues. FOV calibration is a Phase 3+ optimization that requires world landmarks (metric scale) for proper calibration.

2. **One Euro Filter parameter tuning**
   - What we know: The recommended parameters (minCutoff=1.0, beta=0.007 for position) are starting values from the filter's tuning guide.
   - What's unclear: Whether these values produce the best visual result for this specific AR overlay at this specific pose detection frame rate (~15fps).
   - Recommendation: Implement with recommended defaults, then tune empirically by visual inspection. The filter's two parameters are intuitive: increase minCutoff to reduce smoothing (more responsive), increase beta to reduce lag during fast movement.

3. **Camera aspect ratio on resize vs video aspect ratio**
   - What we know: The current code sets `camera.aspect = w / h` (display dimensions) in the resize handler, but the initial camera was created with `camera.aspect = vw / vh` (video dimensions).
   - What's unclear: Whether the camera aspect should match the display or the video for correct projection.
   - Recommendation: Set camera aspect to match the DISPLAY (window) dimensions. The camera frustum should match what the user sees on screen. The cover-crop calculation handles the mapping from video-space landmarks to display-space.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None installed -- no test framework exists in the project |
| Config file | none -- see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COORD-01 | Mirror applied once, model appears at correct horizontal position | unit | `npx vitest run src/ar/utils/coordinateUtils.test.ts -t "mirror"` | No -- Wave 0 |
| COORD-02 | Cover crop maps landmarks correctly for 16:9, 19.5:9, 4:3 aspect ratios | unit | `npx vitest run src/ar/utils/coordinateUtils.test.ts -t "cover crop"` | No -- Wave 0 |
| COORD-03 | Z-depth is constant, body-turn uses Z difference | unit | `npx vitest run src/ar/utils/coordinateUtils.test.ts -t "z-depth"` | No -- Wave 0 |
| COORD-04 | WASM URL contains pinned version @0.10.34 | unit (string check) | `npx vitest run src/ar/utils/constants.test.ts` | No -- Wave 0 |
| COORD-05 | visibleDims recalculated after simulated resize | unit | `npx vitest run src/ar/utils/coordinateUtils.test.ts -t "resize"` | No -- Wave 0 |
| ARCH-02 | One Euro Filter produces stable output, responds to speed changes | unit | `npx vitest run src/ar/utils/OneEuroFilter.test.ts` | No -- Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose` (quick run, pure utility functions)
- **Per wave merge:** Same (no integration tests feasible without browser environment)
- **Phase gate:** All unit tests green + manual visual verification on at least 2 aspect ratios

### Wave 0 Gaps

- [ ] Install vitest: `npm install -D vitest` (project uses Vite, vitest is the natural choice)
- [ ] Create `vitest.config.ts` with basic configuration
- [ ] `src/ar/utils/OneEuroFilter.test.ts` -- covers ARCH-02 (pure math, highly testable)
- [ ] `src/ar/utils/coordinateUtils.test.ts` -- covers COORD-01, COORD-02, COORD-03, COORD-05 (pure functions, no DOM needed)
- [ ] `src/ar/utils/constants.test.ts` -- covers COORD-04 (string assertion on pinned URL)

Note: The core coordinate utility functions (`landmarkToWorld`, `computeCoverCrop`, `OneEuroFilter`) are pure functions with no DOM or WebGL dependencies, making them highly amenable to unit testing. The actual integration (does the model appear correctly on screen?) requires manual visual testing.

## Sources

### Primary (HIGH confidence)

- [MediaPipe PoseLandmarker Web JS Guide](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js) -- Confirmed: z coordinate is "depth relative to hip midpoint, roughly same scale as x"; only IMAGE and VIDEO running modes documented for Web; WASM path format verified
- [1 Euro Filter official page](https://gery.casiez.net/1euro/) -- Algorithm parameters, tuning guide, official JS/TS implementations
- [MDN object-fit: cover](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/object-fit) -- Confirmed: cover maintains aspect ratio, fills container, clips excess; object-position defaults to 50% 50% (center crop)
- [Three.js PerspectiveCamera docs](https://threejs.org/docs/#api/cameras/PerspectiveCamera.aspect) -- Camera aspect ratio and projection matrix relationship
- [jsDelivr @mediapipe/tasks-vision CDN](https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm/) -- Confirmed: version pinning via `@0.10.34` in URL path works
- Codebase inspection of `src/pages/ARExperience.tsx` (535 lines) -- All six bugs verified at specific line numbers

### Secondary (MEDIUM confidence)

- [MediaPipe PoseLandmarker API reference](https://ai.google.dev/edge/mediapipe/api/solutions/js/tasks-vision.poselandmarker) -- Running modes confirmed as IMAGE/VIDEO only for web
- [npm @mediapipe/tasks-vision](https://www.npmjs.com/package/@mediapipe/tasks-vision) -- Latest version is 0.10.34
- [1 Euro Filter paper (Casiez et al., CHI 2012)](https://www.researchgate.net/publication/254005010_1_Filter_A_Simple_Speed-based_Low-pass_Filter_for_Noisy_Input_in_Interactive_Systems) -- Original algorithm specification
- [OneEuroFilter GitHub (casiez/OneEuroFilter)](https://github.com/casiez/OneEuroFilter) -- Reference implementations in multiple languages

### Tertiary (LOW confidence)

- None. All findings verified against primary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no changes needed, all libraries already installed and verified
- Architecture (coordinate fixes): HIGH -- all bugs verified at specific line numbers with clear fixes derived from geometry and official MediaPipe docs
- Architecture (One Euro Filter): HIGH -- well-documented algorithm from 2012, official implementations available, widely used in AR/VR pose smoothing
- Pitfalls: HIGH -- each pitfall directly corresponds to a verified code issue or a known coordinate math error
- Validation: MEDIUM -- no test framework exists, Wave 0 setup required; test strategy is sound but untested

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable domain -- coordinate math and filtering algorithms do not change)

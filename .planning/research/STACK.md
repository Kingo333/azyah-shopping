# Technology Stack: Garment-Type-Aware AR Anchoring

**Project:** Azyah AR System Improvement
**Researched:** 2026-03-29
**Focus:** MediaPipe pose landmark techniques, Three.js garment rendering, body-proportional scaling, garment-type-specific anchoring

## Important: What Is NOT Being Chosen

The core stack is already established (React, Three.js, MediaPipe, Supabase, Capacitor). This research covers **techniques, algorithms, and supporting utilities** needed to add garment-type-aware anchoring to the existing system. No new major frameworks are recommended.

---

## Recommended Stack Additions

### MediaPipe Enhancements

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @mediapipe/tasks-vision | 0.10.34 (keep current) | Pose detection | Already installed. The PoseLandmarker API is stable and sufficient. No version bump needed. | HIGH |
| PoseLandmarker `LIVE_STREAM` mode | (API mode switch) | Real-time callback-based detection | Current code uses `VIDEO` mode with manual timing (~15fps cap at 66ms interval). Switch to `LIVE_STREAM` mode with `resultListener` callback for better frame timing and letting MediaPipe manage its own scheduling. | HIGH |
| World landmarks (`result.worldLandmarks`) | (already available) | Metric-space body measurements | Current code only uses `result.landmarks` (normalized 0-1 screen coords). The `worldLandmarks` array provides coordinates in meters relative to hip midpoint, giving real-world body proportions without needing to reverse-engineer pixel distances. Critical for accurate garment scaling. | HIGH |

**Why NOT upgrade Three.js or MediaPipe versions:** The current Three.js 0.160.1 and @mediapipe/tasks-vision 0.10.34 are stable for this use case. Upgrading Three.js would require testing all GLTF loading paths. The MediaPipe Tasks Vision API has been stable since 0.10.x. Upgrade only if a specific bug is encountered.

**Why NOT switch to @mediapipe/pose (legacy):** The project already has `@mediapipe/pose 0.5.x` installed alongside `@mediapipe/tasks-vision`. The legacy package should be REMOVED -- it is the old Solution API, which is deprecated. The Tasks Vision API (`PoseLandmarker`) is the current recommended approach.

### Three.js Rendering Additions

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| three (keep 0.160.1) | 0.160.1 | 3D rendering | Already installed. Stable for GLB loading and real-time rendering. | HIGH |
| `SkeletonUtils` from three/examples | (bundled) | Bone-based garment deformation | If garment GLBs contain armatures/skeletons, SkeletonUtils.clone() properly clones skinned meshes. Needed for any future bone-driven garment deformation. | MEDIUM |
| `DRACOLoader` from three/examples | (bundled) | Compressed GLB loading | Retailers may upload Draco-compressed GLBs from tools like Meshy.ai. Adding DRACOLoader as a fallback prevents silent load failures. Decoder files served from CDN. | HIGH |
| `KTX2Loader` from three/examples | (bundled) | GPU-compressed textures | For mobile performance, KTX2 textures (basis universal) reduce GPU memory 4-6x. Add as optional path for optimized models. | LOW |

**Why NOT use @react-three/fiber for the AR scene:** The current ARExperience.tsx correctly uses raw Three.js with manual renderer/scene control. R3F adds React reconciliation overhead per frame, which is unacceptable for a real-time AR pipeline that must hit 15+ FPS on mid-range phones. Keep the imperative Three.js approach for the AR render loop. R3F is fine for non-AR 3D previews elsewhere in the app.

**Why NOT add physics libraries (cannon-es, rapier):** Real-time cloth physics is explicitly out of scope per PROJECT.md. The garment positioning is purely kinematic (driven by pose landmarks), not physics-simulated.

### Smoothing and Temporal Filtering

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| One Euro Filter (implement inline) | N/A | Adaptive landmark smoothing | Current code uses fixed linear interpolation (`lerp` with `SMOOTHING = 0.3`). The One Euro Filter is the standard approach for real-time pose smoothing -- it adapts: slow movements get more smoothing (less jitter), fast movements get less smoothing (less lag). MediaPipe's own documentation recommends this pattern. ~30 lines of TypeScript to implement. | HIGH |
| Exponential Moving Average (fallback) | N/A | Simpler alternative | If One Euro is too aggressive for some landmarks, per-landmark EMA with tunable alpha is the fallback. | HIGH |

**Why NOT use a smoothing library:** One Euro Filter is trivially implementable (~30 lines). Adding a dependency for this introduces bundle weight for no benefit. The algorithm is well-documented in the 2012 paper "1 Euro Filter: A Simple Speed-based Low-pass Filter for Noisy Input in Interactive Systems."

### Model Validation and Processing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| three (Box3, Vector3) | 0.160.1 | Model bounding box analysis | Already used. Extend to validate model origin, orientation, and proportions on upload. | HIGH |
| gltf-transform (CLI or library) | 4.x | Server-side GLB optimization | For a future Supabase Edge Function to validate/optimize uploaded GLBs: check normals, re-center origins, compress textures. Not needed for Phase 1 but is the standard tool. | MEDIUM |

**Why NOT use meshoptimizer in-browser:** Model validation should happen at upload time (server/edge function), not at render time. In-browser validation adds latency to the AR experience.

---

## Garment-Type-Specific Anchoring System

This is the core algorithmic contribution, not a library choice. Here is the recommended anchor mapping system.

### MediaPipe Pose Landmark Reference (33 Points)

```
LANDMARK INDEX MAP:
0  - nose              11 - left shoulder     23 - left hip
1  - left eye inner    12 - right shoulder    24 - right hip
2  - left eye          13 - left elbow        25 - left knee
3  - left eye outer    14 - right elbow       26 - right knee
4  - right eye inner   15 - left wrist        27 - left ankle
5  - right eye         16 - right wrist       28 - right ankle
6  - right eye outer   17 - left pinky        29 - left heel
7  - left ear          18 - right pinky       30 - right heel
8  - right ear         19 - left index        31 - left foot index
9  - mouth left        20 - right index       32 - right foot index
10 - mouth right       21 - left thumb
                       22 - right thumb
```

### Garment Type Anchor Configurations

| Garment Type | Primary Anchors | Secondary Anchors | Scale Reference | Position Anchor |
|-------------|-----------------|-------------------|-----------------|-----------------|
| **top/shirt** | Shoulders (11,12) | Hips (23,24), Elbows (13,14) | Shoulder width x shoulder-to-hip height | Shoulder-hip midpoint |
| **abaya/dress** | Shoulders (11,12) | Hips (23,24), Ankles (27,28) | Shoulder width x shoulder-to-ankle height | Shoulder-ankle midpoint |
| **pants/bottoms** | Hips (23,24) | Knees (25,26), Ankles (27,28) | Hip width x hip-to-ankle height | Hip-ankle midpoint |
| **jacket/outerwear** | Shoulders (11,12) | Elbows (13,14), Hips (23,24) | Shoulder width x 1.15 (padding) x shoulder-to-hip | Shoulder-hip midpoint, slight z-forward |
| **headwear** | Nose (0), Ears (7,8) | Eyes (2,5) | Ear-to-ear width | Head center |
| **necklace/accessory** | Shoulders (11,12) | Nose (0) | Shoulder width x 0.6 | Neck estimate (shoulder midpoint + offset toward nose) |

### World Landmarks vs Normalized Landmarks

**Critical architectural decision:** Use `result.worldLandmarks` instead of (or alongside) `result.landmarks`.

```typescript
// Current approach (normalized, requires FOV math):
const landmarks = result.landmarks[0]; // x,y in [0,1], z is depth
const shoulderWidth = Math.abs(landmarks[12].x - landmarks[11].x) * visibleWidth;

// Recommended approach (world coordinates in meters):
const worldLandmarks = result.worldLandmarks[0]; // x,y,z in meters from hip midpoint
const shoulderWidthMeters = Math.sqrt(
  Math.pow(worldLandmarks[12].x - worldLandmarks[11].x, 2) +
  Math.pow(worldLandmarks[12].y - worldLandmarks[11].y, 2) +
  Math.pow(worldLandmarks[12].z - worldLandmarks[11].z, 2)
);
```

**Why world landmarks matter:** Normalized landmarks change with camera distance (a person far away has smaller shoulder width in normalized coords). World landmarks give actual body proportions in meters regardless of distance. Use world landmarks for **scaling calculations** and normalized landmarks for **screen positioning**.

---

## Scaling Algorithms

### Per-Garment-Type Non-Uniform Scaling

```typescript
interface GarmentAnchorConfig {
  type: 'top' | 'abaya' | 'pants' | 'jacket' | 'headwear' | 'accessory';

  // Which landmarks define the bounding region
  widthLandmarks: [number, number];    // e.g., [11, 12] for shoulders
  heightTopLandmark: number;            // e.g., 11 for left shoulder
  heightBottomLandmark: number;         // e.g., 27 for left ankle

  // Padding multipliers (garment extends past body)
  widthPadding: number;   // 1.15 = 15% wider than body measurement
  heightPadding: number;  // 1.05 = 5% taller

  // Position offset from anchor midpoint (normalized)
  positionOffsetY: number; // vertical shift
  positionOffsetZ: number; // depth shift (closer to camera = positive)

  // Minimum visibility thresholds for required landmarks
  minVisibility: number;

  // Fallback behavior when secondary landmarks aren't visible
  fallbackHeightRatio: number; // e.g., 2.5 = height is 2.5x width if ankles not visible
}

// Preset configurations
const GARMENT_PRESETS: Record<string, GarmentAnchorConfig> = {
  top: {
    type: 'top',
    widthLandmarks: [11, 12],
    heightTopLandmark: 11,
    heightBottomLandmark: 23,  // hip
    widthPadding: 1.15,
    heightPadding: 1.05,
    positionOffsetY: 0,
    positionOffsetZ: 0.02,
    minVisibility: 0.5,
    fallbackHeightRatio: 1.3,
  },
  abaya: {
    type: 'abaya',
    widthLandmarks: [11, 12],
    heightTopLandmark: 11,
    heightBottomLandmark: 27,  // ankle
    widthPadding: 1.2,        // abayas are loose-fitting
    heightPadding: 1.08,      // slight extra at hem
    positionOffsetY: 0,
    positionOffsetZ: 0.03,    // slightly forward for drape clearance
    minVisibility: 0.3,       // lower threshold -- ankles often partially occluded
    fallbackHeightRatio: 3.5, // shoulder-to-ankle is ~3.5x shoulder width
  },
  pants: {
    type: 'pants',
    widthLandmarks: [23, 24],
    heightTopLandmark: 23,
    heightBottomLandmark: 27,
    widthPadding: 1.1,
    heightPadding: 1.02,
    positionOffsetY: 0,
    positionOffsetZ: 0.01,
    minVisibility: 0.4,
    fallbackHeightRatio: 2.2,
  },
  jacket: {
    type: 'jacket',
    widthLandmarks: [11, 12],
    heightTopLandmark: 11,
    heightBottomLandmark: 23,
    widthPadding: 1.25,       // jackets are wider than shirts
    heightPadding: 1.1,
    positionOffsetY: 0,
    positionOffsetZ: 0.04,    // jackets sit forward of body
    minVisibility: 0.5,
    fallbackHeightRatio: 1.4,
  },
};
```

### Proportional Scaling Algorithm

```typescript
function computeGarmentTransform(
  normalized: NormalizedLandmark[],   // result.landmarks[0]
  world: Landmark[],                   // result.worldLandmarks[0]
  config: GarmentAnchorConfig,
  modelDims: { w: number; h: number; d: number },
  visibleDims: { w: number; h: number },
  arScale: number
): { position: Vector3; scale: Vector3; rotation: number } {

  const mirrorX = (x: number) => 1 - x;

  // 1. Get width from world landmarks (actual body proportions)
  const [wl, wr] = config.widthLandmarks;
  const bodyWidth = euclideanDistance3D(world[wl], world[wr]);

  // 2. Get height from world landmarks
  const top = world[config.heightTopLandmark];
  const bot = world[config.heightBottomLandmark];
  const botVis = normalized[config.heightBottomLandmark].visibility ?? 0;

  let bodyHeight: number;
  if (botVis >= config.minVisibility) {
    bodyHeight = euclideanDistance3D(top, bot);
  } else {
    // Fallback: estimate from width ratio
    bodyHeight = bodyWidth * config.fallbackHeightRatio;
  }

  // 3. Scale model to match body with padding
  const scaleX = (bodyWidth * config.widthPadding) / modelDims.w * arScale;
  const scaleY = (bodyHeight * config.heightPadding) / modelDims.h * arScale;
  const scaleZ = (scaleX + scaleY) / 2; // average for depth

  // 4. Position from normalized landmarks (screen-space)
  const topNorm = normalized[config.heightTopLandmark];
  const botNorm = botVis >= config.minVisibility
    ? normalized[config.heightBottomLandmark]
    : { x: topNorm.x, y: topNorm.y + (bodyHeight / visibleDims.h) };

  const centerX = (mirrorX(topNorm.x) + mirrorX(botNorm.x)) / 2;
  const centerY = (topNorm.y + botNorm.y) / 2;

  const posX = (centerX - 0.5) * visibleDims.w;
  const posY = -(centerY - 0.5) * visibleDims.h + config.positionOffsetY;
  const posZ = config.positionOffsetZ;

  // 5. Rotation from shoulder angle
  const rotation = Math.atan2(
    normalized[12].z - normalized[11].z,
    mirrorX(normalized[12].x) - mirrorX(normalized[11].x)
  );

  return {
    position: new Vector3(posX, posY, posZ),
    scale: new Vector3(scaleX, scaleY, scaleZ),
    rotation,
  };
}
```

---

## One Euro Filter Implementation

```typescript
class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xPrev: number;
  private dxPrev: number;
  private tPrev: number;
  private initialized: boolean;

  constructor(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
    this.minCutoff = minCutoff;  // minimum cutoff frequency (lower = more smoothing)
    this.beta = beta;            // speed coefficient (higher = less lag during fast motion)
    this.dCutoff = dCutoff;      // cutoff for derivative
    this.xPrev = 0;
    this.dxPrev = 0;
    this.tPrev = 0;
    this.initialized = false;
  }

  private smoothingFactor(tE: number, cutoff: number): number {
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

    // Derivative
    const aD = this.smoothingFactor(tE, this.dCutoff);
    const dx = (x - this.xPrev) / tE;
    const dxHat = aD * dx + (1 - aD) * this.dxPrev;

    // Adaptive cutoff
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const a = this.smoothingFactor(tE, cutoff);

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

// Usage: one filter per axis per output value
// Recommended parameters for AR garment overlay:
//   Position: minCutoff=1.0, beta=0.007 (moderate smoothing, low lag)
//   Scale:    minCutoff=0.5, beta=0.001 (heavy smoothing -- scale shouldn't jitter)
//   Rotation: minCutoff=0.8, beta=0.004 (moderate smoothing)
```

---

## Lighting and Rendering Improvements

| Technique | Purpose | Implementation | Confidence |
|-----------|---------|----------------|------------|
| Environment map from camera | Approximate ambient lighting match | Sample dominant color from video frame center, set as scene ambient. Use `THREE.PMREMGenerator` with a procedural env map. | MEDIUM |
| Hemisphere light | Better ground-plane lighting | Replace single directional light with `THREE.HemisphereLight(skyColor, groundColor, intensity)`. Sky = slightly blue, ground = warm. More natural than flat directional. | HIGH |
| Material override for transparency | Garment edges blend with body | Set `material.transparent = true`, `material.alphaTest = 0.5` on garment meshes. Prevents hard edges where garment meets skin. | HIGH |
| Shadow contact plane | Grounding effect | Invisible `THREE.PlaneGeometry` at garment base with `THREE.ShadowMaterial`. Adds subtle shadow on body. Lightweight but effective. | MEDIUM |

---

## Performance Budget

| Component | Target | Current | Strategy |
|-----------|--------|---------|----------|
| Pose detection | <40ms/frame | ~66ms (manual throttle) | Switch to LIVE_STREAM mode, let MediaPipe optimize |
| Model rendering | <8ms/frame | Unknown | Limit models to <50K triangles, use LOD for mobile |
| Total frame time | <66ms (15fps) | Borderline | Combined pose + render must fit in 66ms budget |
| Model file size | <5MB | Uncontrolled | Validate on upload, compress textures to 1024x1024 max |
| GPU memory | <256MB | Unknown | KTX2 textures, dispose unused models, single-model limit |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Pose detection | MediaPipe PoseLandmarker (keep) | TensorFlow.js MoveNet | Project constraint: stay with MediaPipe. MoveNet only provides 17 keypoints (no wrists, ankles detail). |
| Pose detection | PoseLandmarker lite model (keep) | PoseLandmarker full model | Full model is 2x slower. Lite provides sufficient accuracy for garment anchoring. Only consider full if landmark jitter is unacceptable after implementing One Euro Filter. |
| 3D rendering | Raw Three.js (keep for AR) | @react-three/fiber | R3F adds per-frame reconciliation overhead unacceptable for real-time AR. Keep R3F for non-AR 3D previews only. |
| Smoothing | One Euro Filter | Kalman Filter | Kalman requires tuning process/measurement noise covariance matrices. One Euro has 2 intuitive parameters (min smoothing, speed sensitivity). Better DX for same result. |
| Smoothing | One Euro Filter | MediaPipe built-in smoothing | PoseLandmarker does not expose built-in smoothing controls. The legacy Solutions API had `smoothLandmarks` but Tasks API removed it. Smoothing must be done in application code. |
| Body segmentation | Not needed (Phase 1) | MediaPipe ImageSegmenter | Segmentation masks could enable occlusion (hiding garment behind arms). Adds significant GPU cost. Defer to later phase. |
| Garment deformation | Static mesh positioning | Skinned mesh with bone mapping | Requires garments to have compatible armatures. Retailers upload arbitrary GLBs. Bone mapping is fragile with inconsistent models. Only viable if model format is standardized. |

---

## Package Changes

### Remove
```bash
npm uninstall @mediapipe/pose
```
**Reason:** Legacy deprecated package. Conflicts conceptually with @mediapipe/tasks-vision which is the current API.

### No New Packages Required

All recommended improvements use:
- Existing `@mediapipe/tasks-vision` API features (world landmarks, LIVE_STREAM mode)
- Existing `three` built-in modules (SkeletonUtils, DRACOLoader, HemisphereLight)
- Custom implementations (One Euro Filter, garment anchor configs, scaling algorithms)

### Future Consideration (Not Phase 1)
```bash
# Only if server-side model validation is added:
npm install @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions
```

---

## Database Schema Addition

```sql
-- Add garment_type to event_brand_products
ALTER TABLE event_brand_products
ADD COLUMN garment_type TEXT DEFAULT 'top'
CHECK (garment_type IN ('top', 'abaya', 'pants', 'jacket', 'headwear', 'accessory'));
```

This column drives which `GarmentAnchorConfig` preset to use at runtime. Retailers select garment type during product upload. Default is `top` for backward compatibility with existing products.

---

## Sources and Confidence Assessment

| Claim | Confidence | Basis |
|-------|------------|-------|
| MediaPipe PoseLandmarker provides 33 landmarks with worldLandmarks | HIGH | Official documentation, widely verified, already used in codebase |
| LIVE_STREAM mode is preferable to VIDEO for real-time apps | HIGH | Official MediaPipe documentation pattern for camera-based detection |
| World landmarks provide metric-space coordinates (meters) | HIGH | MediaPipe official docs, consistent across multiple sources |
| One Euro Filter is the standard for real-time pose smoothing | HIGH | Original 2012 paper, used by MediaPipe internally, Google AR documentation |
| DRACOLoader needed for compressed GLBs from Meshy.ai/Tripo3D | MEDIUM | Based on knowledge that these tools often output Draco-compressed models; needs validation |
| @mediapipe/pose (legacy) is deprecated | HIGH | Google deprecated the Solutions API in favor of Tasks API in 2023 |
| Three.js 0.160.1 is sufficient (no upgrade needed) | MEDIUM | Stable for GLTF loading; cannot verify if critical bugs were fixed in later versions without web access |
| KTX2 texture compression 4-6x reduction | MEDIUM | Standard GPU compression ratios; actual savings depend on texture content |
| Performance budget of <66ms total frame time for 15fps | HIGH | Mathematical fact: 1000ms / 15fps = 66.67ms per frame |

**Overall confidence: MEDIUM-HIGH.** The core algorithms (landmark mapping, proportional scaling, One Euro smoothing) are well-established patterns from computer vision and real-time graphics literature. Version-specific claims about MediaPipe and Three.js APIs could not be verified against current official docs due to web access restrictions. The garment anchoring presets (padding values, fallback ratios) are educated starting points that will require empirical tuning.

---

*Stack research: 2026-03-29 -- Techniques and algorithms for garment-type-aware AR anchoring*

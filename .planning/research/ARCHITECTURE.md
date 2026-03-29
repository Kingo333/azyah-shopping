# Architecture Patterns: Garment-Type-Aware AR Anchoring System

**Domain:** Web-based AR garment try-on with MediaPipe pose tracking + Three.js
**Researched:** 2026-03-29
**Confidence:** MEDIUM (based on established MediaPipe/Three.js patterns; web search unavailable for 2026-specific verification)

## Current State Analysis

The existing `ARExperience.tsx` is a **single 535-line monolithic component** that handles camera, pose detection, model loading, anchoring math, rendering, and UI in one file. The `updateModel()` function uses only 4 of 33 available landmarks (shoulders 11/12 and hips 23/24) and applies a single "shirt-style" anchor strategy to every garment type.

**Current limitations driving this architecture:**
- No `garment_type` column in `event_brand_products` -- every product is anchored identically
- Single anchor strategy: shoulder-midpoint + hip-midpoint torso mapping
- No body segment hierarchy -- arms, legs, and full-body drape are ignored
- Non-uniform scaling uses only shoulder width and torso height -- no leg/ankle data
- No per-garment-type visibility requirements (which landmarks must be visible)

## Recommended Architecture

### High-Level System Diagram

```
+--------------------------------------------------+
|               ARExperience (Page)                 |
|  Orchestrates lifecycle, holds refs, renders UI   |
+-----+--------------------+-----------+-----------+
      |                    |           |
      v                    v           v
+------------+   +------------------+  +-----------------+
| CameraManager | PoseProcessor     |  | SceneManager    |
| - getUserMedia| - PoseLandmarker  |  | - Three.js scene|
| - stream mgmt| - detectForVideo  |  | - renderer      |
| - resolution | - raw landmarks   |  | - camera        |
+------+-------+ +--------+--------+  | - lighting      |
       |                   |           +--------+--------+
       v                   v                    |
  video element    +------------------+         |
                   | LandmarkSmoother |         |
                   | - temporal filter|         |
                   | - jitter removal |         |
                   +--------+---------+         |
                            |                   |
                            v                   |
                   +------------------+         |
                   | BodySkeleton     |         |
                   | - segments[]     |         |
                   | - proportions    |         |
                   | - confidence map |         |
                   +--------+---------+         |
                            |                   |
                            v                   v
                   +------------------------------+
                   |     AnchorResolver            |
                   | garmentType -> AnchorStrategy |
                   | - ShirtAnchor                 |
                   | - AbayaDressAnchor            |
                   | - PantsAnchor                 |
                   | - AccessoryAnchor             |
                   +-------------+----------------+
                                 |
                                 v
                   +------------------------------+
                   |     GarmentTransformer        |
                   | - position (x, y, z)          |
                   | - scale (sx, sy, sz)           |
                   | - rotation (rx, ry, rz)        |
                   | - bone deformation (optional)  |
                   +------------------------------+
                                 |
                                 v
                        Three.js model.position
                        model.scale, model.rotation
```

### Component Boundaries

| Component | Responsibility | Inputs | Outputs | Communicates With |
|-----------|---------------|--------|---------|-------------------|
| **ARExperience** (page) | Lifecycle orchestration, product fetching, UI chrome, state machine | Route params, Supabase data | Rendered page with overlays | All components below |
| **CameraManager** | Camera stream acquisition, resolution negotiation, stream cleanup | Device constraints | MediaStream, video dimensions | ARExperience |
| **PoseProcessor** | MediaPipe PoseLandmarker init, per-frame detection, frame throttling | Video element, timestamp | Raw NormalizedLandmark[33] per frame | LandmarkSmoother |
| **LandmarkSmoother** | Temporal smoothing, jitter removal, confidence-weighted filtering | Raw landmarks per frame | Smoothed landmarks with confidence | BodySkeleton |
| **BodySkeleton** | Computes body segments, proportions, and derived measurements from smoothed landmarks | Smoothed landmarks[33] | BodySegments object with measurements | AnchorResolver |
| **AnchorResolver** | Strategy pattern -- selects and executes the correct anchor strategy for the garment type | BodySegments, GarmentConfig | AnchorResult (position, scale, rotation) | GarmentTransformer |
| **GarmentTransformer** | Applies AnchorResult to the Three.js model with additional smoothing | AnchorResult, Three.js Object3D, model dims | Mutated model transform | SceneManager (indirectly) |
| **SceneManager** | Three.js scene setup, renderer, camera, lighting, model loading | Canvas element, model URL | Loaded model, render loop | ARExperience |
| **GarmentConfig** (data) | Static metadata defining garment type behavior | Database garment_type + presets | Anchor point definitions, visibility requirements | AnchorResolver |

### File Structure

```
src/
  ar/
    ARExperience.tsx              -- Page component (orchestrator, slimmed down)
    components/
      TrackingGuidance.tsx        -- UI overlay for tracking state
      ProductSelector.tsx         -- Product thumbnail strip
    core/
      CameraManager.ts            -- Camera stream lifecycle
      PoseProcessor.ts            -- MediaPipe wrapper
      SceneManager.ts             -- Three.js scene/renderer/lighting
    skeleton/
      LandmarkSmoother.ts         -- Temporal filtering
      BodySkeleton.ts             -- Body segment computation
      types.ts                    -- BodySegment, BodyProportions interfaces
    anchoring/
      AnchorResolver.ts           -- Strategy dispatch
      strategies/
        ShirtAnchor.ts            -- Upper-body garments
        AbayaDressAnchor.ts       -- Full-length garments (shoulder-to-ankle)
        PantsAnchor.ts            -- Lower-body garments
        AccessoryAnchor.ts        -- Head, wrist, neck accessories
      types.ts                    -- AnchorResult, AnchorStrategy interface
    config/
      garmentPresets.ts           -- Static garment type configuration
      landmarkMap.ts              -- MediaPipe landmark index constants
    transform/
      GarmentTransformer.ts       -- Applies anchoring output to Three.js model
    hooks/
      useARExperience.ts          -- Main hook composing all subsystems
      usePoseTracking.ts          -- Hook wrapping PoseProcessor + Smoother
      useGarmentAnchoring.ts      -- Hook wrapping AnchorResolver + Transformer
```

## MediaPipe 33-Landmark Reference and Body Segment Mapping

### Complete Landmark Index Map

This is the authoritative mapping from MediaPipe's PoseLandmarker (verified against the existing code which uses indices 11, 12, 23, 24):

```typescript
// src/ar/config/landmarkMap.ts

export const LANDMARK = {
  // Face
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,

  // Upper body
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,

  // Lower body
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;
```

**Coordinate system:** Each landmark provides `{ x, y, z, visibility }` where:
- `x`, `y`: Normalized 0-1 relative to image dimensions (origin top-left)
- `z`: Depth relative to hip midpoint (negative = closer to camera)
- `visibility`: 0-1 confidence that the landmark is visible (not occluded)

### Body Segment Hierarchy

The 33 landmarks decompose into a **hierarchical skeleton** that maps directly to garment coverage zones:

```typescript
// src/ar/skeleton/types.ts

export interface BodySegment {
  name: string;
  startLandmark: number;   // LANDMARK index
  endLandmark: number;      // LANDMARK index
  midpoint: Vec3;           // computed
  length: number;           // computed in world units
  angle: number;            // computed radians
  confidence: number;       // min visibility of start/end
}

export interface BodyProportions {
  // Primary measurements (world units)
  shoulderWidth: number;         // dist(11, 12)
  torsoHeight: number;           // dist(shoulderMid, hipMid)
  hipWidth: number;              // dist(23, 24)
  leftUpperArm: number;          // dist(11, 13)
  leftForearm: number;           // dist(13, 15)
  rightUpperArm: number;         // dist(12, 14)
  rightForearm: number;          // dist(14, 16)
  leftThigh: number;             // dist(23, 25)
  leftShin: number;              // dist(25, 27)
  rightThigh: number;            // dist(24, 26)
  rightShin: number;             // dist(26, 28)
  fullHeight: number;            // dist(noseMid, ankleMid) estimated

  // Derived
  shoulderToAnkle: number;       // full garment length (abayas)
  shoulderToKnee: number;        // mid-length dresses
  hipToAnkle: number;            // pants length
  waistWidth: number;            // estimated from shoulder/hip interpolation

  // Centers
  shoulderCenter: Vec3;          // midpoint(11, 12)
  hipCenter: Vec3;               // midpoint(23, 24)
  torsoCenter: Vec3;             // midpoint(shoulderCenter, hipCenter)
  kneeCenter: Vec3;              // midpoint(25, 26)
  ankleCenter: Vec3;             // midpoint(27, 28)

  // Rotation
  shoulderAngle: number;         // rotation from shoulder line
  hipAngle: number;              // rotation from hip line
  bodyTurnAngle: number;         // estimated Y-rotation from z-depth diff
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
```

**Segment tree (parent -> child):**
```
Torso (shoulders -> hips)
  +-- Left Arm: Shoulder(11) -> Elbow(13) -> Wrist(15) -> Hand(17,19,21)
  +-- Right Arm: Shoulder(12) -> Elbow(14) -> Wrist(16) -> Hand(18,20,22)
  +-- Left Leg: Hip(23) -> Knee(25) -> Ankle(27) -> Foot(29,31)
  +-- Right Leg: Hip(24) -> Knee(26) -> Ankle(28) -> Foot(30,32)
  +-- Head: Nose(0) + Eyes(1-6) + Ears(7,8) + Mouth(9,10)
```

## Garment Type Anchor Strategies

### Garment Type Configuration Data Model

```typescript
// src/ar/config/garmentPresets.ts

export type GarmentType = 'shirt' | 'abaya' | 'dress' | 'pants' | 'accessory_head' | 'accessory_wrist' | 'accessory_neck';

export interface GarmentConfig {
  type: GarmentType;
  displayName: string;

  // Which landmarks must be visible for this garment to render
  requiredLandmarks: number[];       // LANDMARK indices, all must have visibility > threshold
  optionalLandmarks: number[];       // Used if visible, fallback if not
  visibilityThreshold: number;       // e.g., 0.5

  // Anchor definition
  primaryAnchor: AnchorDefinition;   // Where the garment's origin maps to
  scaleBasis: ScaleBasis;            // How to compute scale from body
  rotationSource: RotationSource;    // How to compute rotation

  // Fitting
  widthPadding: number;              // multiplier, e.g., 1.15 = 15% wider than body measurement
  heightPadding: number;             // multiplier for vertical
  verticalOffset: number;            // normalized offset from anchor center (negative = up)

  // Model expectations
  expectedOrigin: 'center' | 'top' | 'bottom';  // where the model's local origin should be
  expectedUpAxis: 'y' | 'z';                      // which axis is "up" in the model
}

export interface AnchorDefinition {
  // The body point the garment's origin snaps to
  type: 'midpoint' | 'single' | 'weighted';
  landmarks: number[];        // indices
  weights?: number[];         // for weighted type
}

export interface ScaleBasis {
  widthReference: 'shoulder_width' | 'hip_width' | 'wrist_distance' | 'head_width';
  heightReference: 'torso_height' | 'shoulder_to_ankle' | 'shoulder_to_knee' | 'hip_to_ankle' | 'head_height';
}

export interface RotationSource {
  type: 'shoulder_line' | 'hip_line' | 'body_turn' | 'none';
}
```

### Per-Garment-Type Anchor Mapping

#### 1. Shirt / Top (upper body)

```
Required landmarks: LEFT_SHOULDER(11), RIGHT_SHOULDER(12), LEFT_HIP(23), RIGHT_HIP(24)
Optional landmarks: LEFT_ELBOW(13), RIGHT_ELBOW(14)

Anchor point: midpoint of shoulder center and hip center (torso center)
Width:  shoulder width * 1.15 (extend past shoulders)
Height: torso height (shoulder-mid to hip-mid) * 1.1
Depth:  average z of 4 core landmarks
Rotation: shoulder line angle (atan2 of shoulder z-diff)

Diagram:
     11 -------- 12     <- shoulders define width + rotation
      |  GARMENT  |
      |  ORIGIN   |     <- anchor = center of this box
      |           |
     23 -------- 24     <- hips define bottom edge
```

**Config:**
```typescript
const SHIRT_CONFIG: GarmentConfig = {
  type: 'shirt',
  displayName: 'Top / Shirt',
  requiredLandmarks: [11, 12],
  optionalLandmarks: [23, 24, 13, 14],
  visibilityThreshold: 0.5,
  primaryAnchor: { type: 'midpoint', landmarks: [11, 12, 23, 24] },
  scaleBasis: { widthReference: 'shoulder_width', heightReference: 'torso_height' },
  rotationSource: { type: 'shoulder_line' },
  widthPadding: 1.15,
  heightPadding: 1.1,
  verticalOffset: 0,
  expectedOrigin: 'center',
  expectedUpAxis: 'y',
};
```

#### 2. Abaya / Full-Length Dress (shoulder to ankle)

This is the **primary garment type** for the Azyah target market and the most complex anchor strategy.

```
Required landmarks: LEFT_SHOULDER(11), RIGHT_SHOULDER(12)
Optional landmarks: LEFT_HIP(23), RIGHT_HIP(24), LEFT_KNEE(25), RIGHT_KNEE(26),
                    LEFT_ANKLE(27), RIGHT_ANKLE(28)

Anchor point: midpoint between shoulder center and ankle center
              (falls roughly at hip level for a full-length garment)
Width:  MAX(shoulder width, hip width) * 1.2  (abayas flare out)
Height: shoulder-to-ankle distance * 1.05
Depth:  weighted average z (shoulders 40%, hips 30%, ankles 30%)
Rotation: shoulder line angle

Key challenge: Abayas extend FAR below the hip line. The current system
only goes shoulder-to-hip, cutting off 40%+ of the garment.

Diagram:
     11 -------- 12       <- shoulders (top of garment)
      |           |
      | SHOULDER  |
      | CENTER    |
      |           |
     23 -------- 24       <- hips (NOT the bottom!)
      |           |
      |  ORIGIN   |       <- anchor midway for full-length
      |           |
     25 -------- 26       <- knees
      |           |
      |           |
     27 -------- 28       <- ankles (bottom of garment)
```

**Graceful degradation:** When ankles are not visible (common when user is close to camera), estimate garment bottom from:
1. If knees visible: extrapolate ankle position from hip-knee vector
2. If only hips visible: estimate ankle at `hipY + 1.2 * torsoHeight` (approximate leg length from torso)
3. Fall back to shirt-style if only shoulders visible

**Config:**
```typescript
const ABAYA_CONFIG: GarmentConfig = {
  type: 'abaya',
  displayName: 'Abaya / Full Dress',
  requiredLandmarks: [11, 12],
  optionalLandmarks: [23, 24, 25, 26, 27, 28],
  visibilityThreshold: 0.4,  // lower threshold -- accept partial visibility
  primaryAnchor: {
    type: 'weighted',
    landmarks: [11, 12, 27, 28],  // shoulders + ankles
    weights: [0.25, 0.25, 0.25, 0.25],
  },
  scaleBasis: { widthReference: 'shoulder_width', heightReference: 'shoulder_to_ankle' },
  rotationSource: { type: 'shoulder_line' },
  widthPadding: 1.2,     // abayas are loose/flowing
  heightPadding: 1.05,
  verticalOffset: -0.05,  // slight upward shift (garment drapes from shoulders)
  expectedOrigin: 'top',  // abaya models should have origin at neckline
  expectedUpAxis: 'y',
};
```

#### 3. Pants / Bottoms (hip to ankle)

```
Required landmarks: LEFT_HIP(23), RIGHT_HIP(24)
Optional landmarks: LEFT_KNEE(25), RIGHT_KNEE(26), LEFT_ANKLE(27), RIGHT_ANKLE(28)

Anchor point: midpoint between hip center and ankle center
Width:  hip width * 1.1
Height: hip-to-ankle distance * 1.05
Rotation: hip line angle

Diagram:
     23 -------- 24       <- hips (waistband)
      |           |
      |  ORIGIN   |       <- anchor
      |           |
     25 -------- 26       <- knees
      |           |
     27 -------- 28       <- ankles (hem)
```

**Config:**
```typescript
const PANTS_CONFIG: GarmentConfig = {
  type: 'pants',
  displayName: 'Pants / Bottoms',
  requiredLandmarks: [23, 24],
  optionalLandmarks: [25, 26, 27, 28],
  visibilityThreshold: 0.4,
  primaryAnchor: { type: 'midpoint', landmarks: [23, 24, 27, 28] },
  scaleBasis: { widthReference: 'hip_width', heightReference: 'hip_to_ankle' },
  rotationSource: { type: 'hip_line' },
  widthPadding: 1.1,
  heightPadding: 1.05,
  verticalOffset: 0,
  expectedOrigin: 'top',  // pants models should have origin at waistband
  expectedUpAxis: 'y',
};
```

#### 4. Accessories (head/wrist/neck)

Accessories use single-landmark or narrow-pair anchoring:

```typescript
const HEADWEAR_CONFIG: GarmentConfig = {
  type: 'accessory_head',
  displayName: 'Headwear',
  requiredLandmarks: [0],       // NOSE as proxy for head center
  optionalLandmarks: [7, 8],    // ears for width
  visibilityThreshold: 0.6,
  primaryAnchor: { type: 'single', landmarks: [0] },
  scaleBasis: { widthReference: 'head_width', heightReference: 'head_height' },
  rotationSource: { type: 'none' },
  widthPadding: 1.3,
  heightPadding: 1.3,
  verticalOffset: -0.5,  // shift up above nose to crown
  expectedOrigin: 'bottom',
  expectedUpAxis: 'y',
};

const WRIST_ACCESSORY_CONFIG: GarmentConfig = {
  type: 'accessory_wrist',
  displayName: 'Bracelet / Watch',
  requiredLandmarks: [15],     // left wrist (or 16 for right)
  optionalLandmarks: [13],     // elbow for arm angle
  visibilityThreshold: 0.5,
  primaryAnchor: { type: 'single', landmarks: [15] },
  scaleBasis: { widthReference: 'wrist_distance', heightReference: 'head_height' },
  rotationSource: { type: 'none' },
  widthPadding: 1.0,
  heightPadding: 1.0,
  verticalOffset: 0,
  expectedOrigin: 'center',
  expectedUpAxis: 'y',
};

const NECKLACE_CONFIG: GarmentConfig = {
  type: 'accessory_neck',
  displayName: 'Necklace',
  requiredLandmarks: [11, 12],  // shoulders define neckline
  optionalLandmarks: [0],       // nose for neck center estimation
  visibilityThreshold: 0.5,
  primaryAnchor: {
    type: 'weighted',
    landmarks: [11, 12, 0],
    weights: [0.35, 0.35, 0.3],  // between shoulders, biased toward nose (neck)
  },
  scaleBasis: { widthReference: 'shoulder_width', heightReference: 'torso_height' },
  rotationSource: { type: 'shoulder_line' },
  widthPadding: 0.6,   // necklace is narrower than shoulders
  heightPadding: 0.3,
  verticalOffset: -0.15,
  expectedOrigin: 'center',
  expectedUpAxis: 'y',
};
```

## Data Model for Garment Type Metadata

### Database Schema Addition

```sql
-- Add garment_type to event_brand_products
ALTER TABLE event_brand_products
  ADD COLUMN garment_type TEXT DEFAULT 'shirt'
  CHECK (garment_type IN ('shirt', 'abaya', 'dress', 'pants', 'accessory_head', 'accessory_wrist', 'accessory_neck'));

-- Add ar_anchor_overrides for per-product fine-tuning (optional)
ALTER TABLE event_brand_products
  ADD COLUMN ar_anchor_overrides JSONB DEFAULT NULL;
```

### TypeScript Type Updates

```typescript
// Added to the existing event_brand_products type
export type GarmentType = 'shirt' | 'abaya' | 'dress' | 'pants' | 'accessory_head' | 'accessory_wrist' | 'accessory_neck';

export interface ARProduct {
  id: string;
  image_url: string;
  ar_model_url: string;
  ar_scale: number;
  ar_position_offset?: { x: number; y: number; z: number };
  garment_type: GarmentType;                  // NEW: determines anchor strategy
  ar_anchor_overrides?: Partial<GarmentConfig>; // NEW: per-product fine-tuning
  brand_name?: string;
  name?: string;
}
```

### Backward Compatibility

Products without `garment_type` default to `'shirt'` (the current behavior). The existing `ar_scale` and `ar_position_offset` continue to work as additional multipliers/offsets applied on top of the anchor strategy output.

## Patterns to Follow

### Pattern 1: Strategy Pattern for Anchor Resolution

**What:** Each garment type has its own anchor strategy class implementing a common interface. The AnchorResolver dispatches to the correct strategy based on garment_type.

**When:** Every frame when pose data is available.

**Example:**
```typescript
// src/ar/anchoring/types.ts
export interface AnchorStrategy {
  readonly garmentType: GarmentType;
  compute(skeleton: BodyProportions, config: GarmentConfig, modelDims: ModelDimensions): AnchorResult;
  canRender(skeleton: BodyProportions, config: GarmentConfig): boolean;
}

export interface AnchorResult {
  position: Vec3;       // world-space position for model
  scale: Vec3;          // non-uniform scale (x, y, z)
  rotation: Vec3;       // euler angles (x, y, z)
  confidence: number;   // 0-1, used for opacity fade
  degraded: boolean;    // true if using fallback estimation
}

// src/ar/anchoring/AnchorResolver.ts
export class AnchorResolver {
  private strategies: Map<GarmentType, AnchorStrategy>;

  constructor() {
    this.strategies = new Map([
      ['shirt', new ShirtAnchor()],
      ['abaya', new AbayaDressAnchor()],
      ['dress', new AbayaDressAnchor()],  // shares strategy, different config
      ['pants', new PantsAnchor()],
      ['accessory_head', new AccessoryAnchor()],
      ['accessory_wrist', new AccessoryAnchor()],
      ['accessory_neck', new AccessoryAnchor()],
    ]);
  }

  resolve(garmentType: GarmentType, skeleton: BodyProportions,
          config: GarmentConfig, modelDims: ModelDimensions): AnchorResult | null {
    const strategy = this.strategies.get(garmentType);
    if (!strategy) return null;
    if (!strategy.canRender(skeleton, config)) return null;
    return strategy.compute(skeleton, config, modelDims);
  }
}
```

**Why:** The current monolithic `updateModel()` function will become unmaintainable as garment types multiply. Strategy pattern isolates each type's math, making it testable and extensible.

### Pattern 2: Temporal Smoothing Pipeline

**What:** A dedicated smoother that filters landmark data over time before it reaches the anchor resolver, rather than smoothing the final position.

**When:** Every frame, before anchor computation.

**Example:**
```typescript
// src/ar/skeleton/LandmarkSmoother.ts
export class LandmarkSmoother {
  private history: NormalizedLandmark[][] = [];
  private readonly windowSize: number;
  private readonly alpha: number;  // EMA factor

  constructor(windowSize = 5, alpha = 0.3) {
    this.windowSize = windowSize;
    this.alpha = alpha;
  }

  smooth(rawLandmarks: NormalizedLandmark[]): NormalizedLandmark[] {
    this.history.push(rawLandmarks);
    if (this.history.length > this.windowSize) {
      this.history.shift();
    }

    // Confidence-weighted exponential moving average
    return rawLandmarks.map((landmark, i) => {
      if (this.history.length < 2) return landmark;

      const prev = this.history[this.history.length - 2][i];
      const weight = Math.max(landmark.visibility ?? 0, 0.1);
      const effectiveAlpha = this.alpha * weight;

      return {
        x: prev.x + (landmark.x - prev.x) * effectiveAlpha,
        y: prev.y + (landmark.y - prev.y) * effectiveAlpha,
        z: prev.z + (landmark.z - prev.z) * effectiveAlpha,
        visibility: landmark.visibility,
      };
    });
  }

  reset(): void {
    this.history = [];
  }
}
```

**Why:** Smoothing raw landmarks (instead of final model position) means every downstream computation benefits from stable data. The current approach smooths position/scale/rotation separately, which can cause desynchronization.

### Pattern 3: Graceful Degradation Chain

**What:** Each anchor strategy defines fallback behavior when preferred landmarks are not visible.

**When:** User is partially out of frame (very common on mobile).

**Example (AbayaDressAnchor):**
```typescript
compute(skeleton: BodyProportions, config: GarmentConfig, modelDims: ModelDimensions): AnchorResult {
  // Tier 1: Full body visible (shoulders + ankles)
  if (skeleton.ankleCenter && skeleton.ankleCenter.confidence > 0.4) {
    return this.computeFullBody(skeleton, config, modelDims);
  }

  // Tier 2: Shoulders + knees visible (estimate ankles)
  if (skeleton.kneeCenter && skeleton.kneeCenter.confidence > 0.4) {
    return this.computeFromKnees(skeleton, config, modelDims);
  }

  // Tier 3: Only shoulders + hips (estimate rest from torso ratio)
  if (skeleton.hipCenter && skeleton.hipCenter.confidence > 0.3) {
    return this.computeFromTorsoOnly(skeleton, config, modelDims);
  }

  // Tier 4: Only shoulders (minimal placement, flagged as degraded)
  return this.computeShoulderOnly(skeleton, config, modelDims);
}
```

**Why:** Mobile AR users constantly move in/out of frame. Hard cutoff ("hide model if hips not visible") creates a flickering experience. Graceful degradation keeps the garment visible with progressively less accurate placement.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Monolithic updateModel Function

**What:** Computing all garment types in a single function with if/else branches.
**Why bad:** The current `updateModel()` is already 100 lines for one garment type. Adding 4+ types with fallback tiers would create an unmaintainable 500+ line function. Impossible to unit test individual strategies.
**Instead:** Strategy pattern (described above). Each strategy is independently testable.

### Anti-Pattern 2: Smoothing Output Instead of Input

**What:** Applying `lerp()` to final model position/scale/rotation independently.
**Why bad:** Position and scale can drift out of sync. A sudden body turn might have position smoothed but scale snapped, creating a jarring mismatch. The current code does this.
**Instead:** Smooth the landmark data upstream, then compute position/scale/rotation from the already-smooth data in a single pass.

### Anti-Pattern 3: Hard-Coding Landmark Indices

**What:** Using magic numbers like `landmarks[11]`, `landmarks[23]` throughout the code.
**Why bad:** The current `updateModel()` does exactly this. Easy to misread indices, impossible to refactor, and error-prone when adding new garment types that reference many landmarks.
**Instead:** Use the `LANDMARK` constant map and the `BodySkeleton` abstraction that provides named segments.

### Anti-Pattern 4: One-Size Visibility Threshold

**What:** Using the same 0.5 threshold for all landmarks across all garment types.
**Why bad:** Ankle visibility is inherently lower than shoulder visibility (ankles are at the edge of frame, often partially occluded by furniture). A universal threshold either hides the model too aggressively (ankles fail threshold) or accepts low-confidence data for shoulders.
**Instead:** Per-landmark-role thresholds in the garment config (required vs optional, with different thresholds).

### Anti-Pattern 5: Rebuilding the Entire Pipeline on Product Switch

**What:** The current `useEffect` tears down camera, MediaPipe, Three.js, and rebuilds everything when `selectedProduct` changes.
**Why bad:** 2-5 second blackout while switching products. Camera stream restart is unnecessary.
**Instead:** Keep camera + pose pipeline running. Only swap the 3D model and anchor strategy when the product changes. The architecture above supports this because CameraManager and PoseProcessor are independent of the garment.

## Data Flow

### Per-Frame Data Flow (Render Loop)

```
1. Video frame available (readyState >= 2)
     |
2. PoseProcessor.detectForVideo(video, timestamp)
     |  Output: NormalizedLandmark[33] (raw)
     |
3. LandmarkSmoother.smooth(rawLandmarks)
     |  Output: NormalizedLandmark[33] (smoothed)
     |
4. BodySkeleton.compute(smoothedLandmarks, visibleDims)
     |  Output: BodyProportions (shoulder width, torso height, centers, etc.)
     |
5. AnchorResolver.resolve(garmentType, bodyProportions, garmentConfig, modelDims)
     |  Output: AnchorResult { position, scale, rotation, confidence }
     |  (or null if cannot render)
     |
6. GarmentTransformer.apply(model, anchorResult, arScale, arPositionOffset)
     |  Side effect: mutates model.position, model.scale, model.rotation, material.opacity
     |
7. SceneManager.render()
     |  Side effect: draws frame to canvas
```

### Product Load Data Flow

```
1. User selects product (or navigates with productId)
     |
2. ARExperience fetches from Supabase:
     |  event_brand_products { ar_model_url, ar_scale, ar_position_offset, garment_type }
     |
3. Look up GarmentConfig from garmentPresets[garment_type]
     |  Merge with ar_anchor_overrides if present
     |
4. SceneManager.loadModel(ar_model_url)
     |  Output: Three.js Object3D, ModelDimensions { w, h, d }
     |
5. AnchorResolver.setConfig(garmentConfig)
     |  Ready for per-frame anchoring
```

### Retailer Upload Data Flow

```
1. Retailer opens BrandProductManager
     |
2. Uploads .glb file (existing flow)
     |
3. NEW: Selects garment_type from dropdown
     |  Options: Shirt/Top, Abaya/Full Dress, Pants/Bottoms, Headwear, Bracelet, Necklace
     |
4. NEW: Optional model validation on upload:
     |  - Check bounding box proportions match garment type expectations
     |  - Warn if origin is not where the config expects
     |  - Warn if model exceeds polygon/size budget
     |
5. Save to Supabase: event_brand_products.garment_type = selected value
```

## Landmark-to-3D Coordinate Mapping

The existing code's approach is correct in principle but should be formalized:

```typescript
// src/ar/skeleton/BodySkeleton.ts

export class BodySkeleton {
  /**
   * Convert MediaPipe normalized coordinates to Three.js world coordinates.
   *
   * MediaPipe: x=0..1 (left to right), y=0..1 (top to bottom), z=depth
   * Three.js:  x=-w/2..w/2 (left to right), y=h/2..-h/2 (top to bottom), z=depth
   *
   * The visible dimensions (visW, visH) are computed from the Three.js camera FOV
   * and the camera's z-position, establishing the mapping scale.
   */
  static toWorld(
    landmark: NormalizedLandmark,
    visibleWidth: number,
    visibleHeight: number,
    mirrorX: boolean = true    // true for selfie/front camera
  ): Vec3 {
    const x = mirrorX ? (1 - landmark.x) : landmark.x;
    return {
      x: (x - 0.5) * visibleWidth,
      y: -(landmark.y - 0.5) * visibleHeight,
      z: landmark.z * 2 - 1,  // normalize depth to roughly -1..1
    };
  }

  /**
   * Compute all body proportions from 33 smoothed landmarks.
   * Returns measurements in world units (Three.js units).
   */
  static compute(
    landmarks: NormalizedLandmark[],
    visW: number,
    visH: number
  ): BodyProportions {
    const toW = (lm: NormalizedLandmark) => this.toWorld(lm, visW, visH);
    const dist = (a: Vec3, b: Vec3) =>
      Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
    const mid = (a: Vec3, b: Vec3): Vec3 => ({
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      z: (a.z + b.z) / 2,
    });

    const ls = toW(landmarks[LANDMARK.LEFT_SHOULDER]);
    const rs = toW(landmarks[LANDMARK.RIGHT_SHOULDER]);
    const lh = toW(landmarks[LANDMARK.LEFT_HIP]);
    const rh = toW(landmarks[LANDMARK.RIGHT_HIP]);
    const lk = toW(landmarks[LANDMARK.LEFT_KNEE]);
    const rk = toW(landmarks[LANDMARK.RIGHT_KNEE]);
    const la = toW(landmarks[LANDMARK.LEFT_ANKLE]);
    const ra = toW(landmarks[LANDMARK.RIGHT_ANKLE]);

    const shoulderCenter = mid(ls, rs);
    const hipCenter = mid(lh, rh);
    const kneeCenter = mid(lk, rk);
    const ankleCenter = mid(la, ra);
    const torsoCenter = mid(shoulderCenter, hipCenter);

    return {
      shoulderWidth: dist(ls, rs),
      torsoHeight: dist(shoulderCenter, hipCenter),
      hipWidth: dist(lh, rh),
      leftUpperArm: dist(ls, toW(landmarks[LANDMARK.LEFT_ELBOW])),
      leftForearm: dist(toW(landmarks[LANDMARK.LEFT_ELBOW]), toW(landmarks[LANDMARK.LEFT_WRIST])),
      rightUpperArm: dist(rs, toW(landmarks[LANDMARK.RIGHT_ELBOW])),
      rightForearm: dist(toW(landmarks[LANDMARK.RIGHT_ELBOW]), toW(landmarks[LANDMARK.RIGHT_WRIST])),
      leftThigh: dist(lh, lk),
      leftShin: dist(lk, la),
      rightThigh: dist(rh, rk),
      rightShin: dist(rk, ra),
      fullHeight: dist(toW(landmarks[LANDMARK.NOSE]), ankleCenter),
      shoulderToAnkle: dist(shoulderCenter, ankleCenter),
      shoulderToKnee: dist(shoulderCenter, kneeCenter),
      hipToAnkle: dist(hipCenter, ankleCenter),
      waistWidth: (dist(ls, rs) + dist(lh, rh)) / 2 * 0.85,  // estimated narrower than avg
      shoulderCenter,
      hipCenter,
      torsoCenter,
      kneeCenter,
      ankleCenter,
      shoulderAngle: Math.atan2(rs.z - ls.z, rs.x - ls.x),
      hipAngle: Math.atan2(rh.z - lh.z, rh.x - lh.x),
      bodyTurnAngle: Math.atan2(
        (rs.z + rh.z) / 2 - (ls.z + lh.z) / 2,
        (rs.x + rh.x) / 2 - (ls.x + lh.x) / 2
      ),
    };
  }
}
```

## Scalability Considerations

| Concern | Current (1 garment type) | Target (7 garment types) | Future (custom strategies) |
|---------|-------------------------|--------------------------|---------------------------|
| Anchor strategies | Inline in updateModel | 4-5 strategy classes (~50-80 lines each) | Plugin-style registry |
| Garment config | Hard-coded | Static presets + DB garment_type | DB-stored config per product |
| Model loading | Rebuild scene on switch | Swap model only, keep pipeline | Model pool with LRU cache |
| Smoothing | Per-output lerp | Input pipeline smoother | Configurable filter chain |
| Frame budget | ~66ms (15fps) | ~33ms target (30fps) | Web Worker for pose, main thread for render |

## Suggested Build Order (Dependencies)

Build order is dictated by dependency chain -- each step requires the previous:

```
Phase 1: Foundation (extract + restructure)
  1a. Extract landmarkMap.ts constants          -- no dependencies
  1b. Extract LandmarkSmoother                  -- no dependencies
  1c. Extract BodySkeleton                      -- depends on landmarkMap
  1d. Extract SceneManager                      -- no dependencies
  1e. Extract CameraManager                     -- no dependencies
      Result: ARExperience becomes a thin orchestrator calling these modules.
      Existing shirt behavior preserved exactly.

Phase 2: Anchor Strategy System
  2a. Define AnchorStrategy interface + types   -- depends on BodySkeleton types
  2b. Implement ShirtAnchor (port current logic)-- depends on 2a
  2c. Implement AnchorResolver                  -- depends on 2a, 2b
  2d. Wire into ARExperience (replace inline updateModel with AnchorResolver)
      Result: Same behavior as before, but through the strategy system.
      This is the critical "refactor without regression" step.

Phase 3: Garment Type Data Model
  3a. Add garment_type column to event_brand_products (DB migration)
  3b. Add garment_type to Supabase type generation
  3c. Add garment type selector to BrandProductManager
  3d. Update ARExperience product fetch to include garment_type
  3e. Create garmentPresets.ts with all GarmentConfig definitions
      Result: Data flows through, but only ShirtAnchor is used.

Phase 4: Additional Anchor Strategies
  4a. AbayaDressAnchor (highest priority -- primary market)
  4b. PantsAnchor
  4c. AccessoryAnchor (head, wrist, neck variants)
  4d. Register all in AnchorResolver
      Result: Full garment-type-aware anchoring live.
      Each strategy can be developed and tested independently.

Phase 5: Polish
  5a. Graceful degradation tiers in each strategy
  5b. Per-product ar_anchor_overrides support
  5c. Model validation on upload
  5d. Performance optimization (frame budget, model caching)
```

**Why this order:**
- Phase 1 is pure refactoring with zero behavior change -- safest to do first, enables everything else
- Phase 2 proves the strategy pattern works before adding complexity
- Phase 3 is the data layer that must exist before strategies can be selected per-product
- Phase 4 is the actual feature work, unblocked by the clean architecture
- Phase 5 is polish that requires all prior phases

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| MediaPipe landmark indices | HIGH | Verified against existing codebase (indices 11,12,23,24 match). MediaPipe pose landmark model has been stable since late 2022. |
| Body segment hierarchy | HIGH | Direct consequence of the 33-landmark topology, well-established in computer vision literature. |
| Strategy pattern for anchoring | HIGH | Standard software architecture pattern; directly addresses the documented scaling problem. |
| Garment-specific anchor points | MEDIUM | Based on training data from AR try-on systems and body proportion geometry. The specific padding multipliers (1.15, 1.2, etc.) will need empirical tuning. |
| Abaya degradation tiers | MEDIUM | The geometric estimation approach (extrapolating ankle from knee) is sound but the specific ratios need testing with real Middle Eastern fashion models. |
| Three.js coordinate mapping | HIGH | Verified against the existing working code in ARExperience.tsx lines 280-378. The FOV-to-world mapping is mathematically correct. |
| Performance implications | LOW | Claims about 30fps target and Web Worker potential need validation on actual target devices. Web search unavailable to verify current MediaPipe WASM performance benchmarks. |

## Sources

- **Primary:** Direct analysis of `src/pages/ARExperience.tsx` (existing implementation, 535 lines)
- **Primary:** Direct analysis of `src/components/ARGarmentOverlay.tsx` and `src/components/ARSmartFit.tsx`
- **Primary:** Database schema from `src/integrations/supabase/types.ts` (event_brand_products table)
- **Primary:** Project requirements from `.planning/PROJECT.md`
- **Training data:** MediaPipe PoseLandmarker documentation (33-landmark topology, coordinate system)
- **Training data:** Three.js perspective camera FOV-to-world-unit mapping
- **Training data:** AR virtual try-on architecture patterns (strategy-based garment anchoring)

**Note:** Web search tools were unavailable during this research session. Findings marked MEDIUM or LOW confidence should be verified against current MediaPipe and Three.js documentation during implementation.

# Phase 3: Garment Anchor System - Research

**Researched:** 2026-03-29
**Domain:** MediaPipe pose landmark anchoring strategies + Three.js garment positioning
**Confidence:** HIGH

## Summary

Phase 3 transforms the AR try-on system from a single "shirt-style" anchor strategy into a garment-type-aware system where shirts, abayas, pants, and accessories each use purpose-built anchor logic. The existing codebase provides a solid foundation: the coordinate pipeline is fixed (Phase 1), modules are decomposed (Phase 2), `garment_type` is in the database and fetched in ARExperience, and One Euro Filters handle smoothing. The current `updateModel()` function in ARExperience.tsx (lines 243-337) is the sole target for replacement -- it uses only shoulders (11,12) and hips (23,24) with hardcoded shirt-style math.

The core work is: (1) build a garment config data layer with per-type anchor definitions, (2) implement a strategy-pattern AnchorResolver that dispatches to ShirtAnchor, AbayaAnchor, PantsAnchor, and AccessoryAnchor strategies, (3) integrate MediaPipe `worldLandmarks` for metric-scale body measurement, (4) add landmark fallback chains for occluded landmarks, (5) implement visibility-weighted positioning and outlier rejection, and (6) improve depth-aware rendering. The architecture research (ARCHITECTURE.md) provides detailed blueprints for each component.

**Primary recommendation:** Build the anchor system as a strategy pattern with a BodyMeasurement computation layer, replacing `updateModel()` entirely. The PoseProcessor must be updated to expose `worldLandmarks` alongside `landmarks`. Each anchor strategy should be a pure function: landmarks in, transform out -- making them independently testable.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANCH-01 | Garment-type-aware anchor strategy pattern | Strategy pattern architecture with AnchorResolver dispatch (see Architecture Patterns) |
| ANCH-02 | Use MediaPipe world landmarks for metric-scale body measurement | PoseProcessor must expose `result.worldLandmarks[0]` -- verified available in @mediapipe/tasks-vision (see Standard Stack) |
| ANCH-03 | Per-garment anchor configuration (landmarks, width ref, height ref, padding, offsets) | GarmentConfig interface with presets per type (see Code Examples) |
| ANCH-04 | Shirt anchor strategy (shoulders 11,12 to hips 23,24) | Port and formalize current updateModel logic (see Architecture Patterns - ShirtAnchor) |
| ANCH-05 | Abaya/dress anchor strategy (shoulders 11,12 to ankles 27,28, wider drape) | New strategy with fallback chain, widthPadding 1.2 (see Architecture Patterns - AbayaAnchor) |
| ANCH-06 | Pants anchor strategy (hips 23,24 to ankles 27,28) | New strategy with hip-based rotation (see Architecture Patterns - PantsAnchor) |
| ANCH-07 | Accessory anchor strategies (headwear: nose 0, ears 7,8; necklace: shoulders 11,12) | Lightweight single-landmark/pair anchors (see Architecture Patterns - AccessoryAnchor) |
| ANCH-08 | Landmark fallback chain (estimate occluded landmarks) | Tiered degradation using body proportion ratios (see Don't Hand-Roll / Common Pitfalls) |
| ANCH-09 | Visibility-weighted positioning | Landmarks with low visibility contribute less via weighted averaging (see Code Examples) |
| ANCH-10 | Outlier rejection (discard jumps beyond N std dev) | Running statistics tracker with configurable sigma threshold (see Code Examples) |
| VIS-05 | Depth-aware rendering | Material depthWrite, renderOrder, and z-positioning from shoulder Z-diff (see Architecture Patterns) |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @mediapipe/tasks-vision | 0.10.34 | Pose detection with 33 landmarks + world landmarks | Pinned in PoseProcessor.ts; provides both normalized and world coordinate systems |
| three | (project version) | 3D rendering, model positioning, scene graph | Already used via SceneManager, ModelLoader |
| three/examples/jsm/loaders/GLTFLoader | (bundled) | GLB model loading | Already used in ModelLoader.ts |

### Existing AR Modules (from Phase 1-2)
| Module | Path | Purpose | Phase 3 Impact |
|--------|------|---------|----------------|
| PoseProcessor | `src/ar/core/PoseProcessor.ts` | MediaPipe wrapper | Must add worldLandmarks to return type |
| SceneManager | `src/ar/core/SceneManager.ts` | Three.js lifecycle | May need depthWrite control for VIS-05 |
| ModelLoader | `src/ar/core/ModelLoader.ts` | GLB loading + centering | No changes needed |
| coordinateUtils | `src/ar/utils/coordinateUtils.ts` | landmarkToWorld, computeCoverCrop | Still used for normalized -> screen mapping |
| OneEuroFilter | `src/ar/utils/OneEuroFilter.ts` | Adaptive smoothing | Reused for anchor output smoothing |
| types.ts | `src/ar/types.ts` | GarmentType, ARProduct, TrackingState | GarmentType already defined correctly |

### New Modules to Create
| Module | Path | Purpose |
|--------|------|---------|
| landmarkIndices | `src/ar/config/landmarkIndices.ts` | Named constants for all 33 MediaPipe landmarks |
| garmentPresets | `src/ar/config/garmentPresets.ts` | Static GarmentConfig per garment type |
| BodyMeasurement | `src/ar/anchoring/BodyMeasurement.ts` | Compute body proportions from landmarks |
| AnchorResolver | `src/ar/anchoring/AnchorResolver.ts` | Strategy dispatch: garment type -> anchor result |
| ShirtAnchor | `src/ar/anchoring/strategies/ShirtAnchor.ts` | Shoulder-to-hip strategy |
| AbayaAnchor | `src/ar/anchoring/strategies/AbayaAnchor.ts` | Shoulder-to-ankle with fallback chain |
| PantsAnchor | `src/ar/anchoring/strategies/PantsAnchor.ts` | Hip-to-ankle strategy |
| AccessoryAnchor | `src/ar/anchoring/strategies/AccessoryAnchor.ts` | Head/neck single-point anchors |
| anchorTypes | `src/ar/anchoring/types.ts` | AnchorStrategy interface, AnchorResult, GarmentConfig |
| OutlierFilter | `src/ar/utils/OutlierFilter.ts` | Running std-dev outlier rejection |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Strategy pattern (class-per-type) | Config-driven single function | Strategy classes are more testable and extensible; config-driven risks growing a monolithic function |
| BodyMeasurement class | Inline measurement in each strategy | Shared measurement avoids duplicate landmark math across strategies |
| Per-landmark OneEuroFilter | Smooth at BodyMeasurement level | Already have 6 filters; adding per-landmark would be 33*3=99 filters -- too many. Smooth measurements instead. |

## Architecture Patterns

### Recommended Project Structure
```
src/ar/
  core/
    CameraManager.ts        # (exists) Camera lifecycle
    PoseProcessor.ts         # (exists - MODIFY) Add worldLandmarks to output
    SceneManager.ts          # (exists - MODIFY) Add depthWrite control
    ModelLoader.ts           # (exists) No changes
  config/
    landmarkIndices.ts       # (NEW) Named landmark constants
    garmentPresets.ts        # (NEW) Per-type GarmentConfig objects
  anchoring/
    types.ts                 # (NEW) AnchorStrategy, AnchorResult, GarmentConfig, BodyMeasurements
    BodyMeasurement.ts       # (NEW) Landmark -> body proportions
    AnchorResolver.ts        # (NEW) Strategy dispatch
    strategies/
      ShirtAnchor.ts         # (NEW) ANCH-04
      AbayaAnchor.ts         # (NEW) ANCH-05
      PantsAnchor.ts         # (NEW) ANCH-06
      AccessoryAnchor.ts     # (NEW) ANCH-07
  utils/
    coordinateUtils.ts       # (exists) No changes
    OneEuroFilter.ts         # (exists) No changes
    OutlierFilter.ts         # (NEW) ANCH-10
  types.ts                   # (exists) No changes - GarmentType already defined
```

### Pattern 1: Strategy Pattern for Anchor Resolution (ANCH-01)
**What:** Each garment type implements a common `AnchorStrategy` interface. The `AnchorResolver` maps `GarmentType` to the correct strategy and invokes it.
**When to use:** Every frame when pose data is available. The resolver is called from ARExperience's render loop.
**Example:**
```typescript
// src/ar/anchoring/types.ts
export interface AnchorStrategy {
  compute(
    measurements: BodyMeasurements,
    config: GarmentConfig,
    modelDims: { w: number; h: number; d: number },
  ): AnchorResult | null;  // null = cannot render (insufficient landmarks)
}

export interface AnchorResult {
  position: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  rotationY: number;
  confidence: number;   // 0-1, drives opacity
  degraded: boolean;    // true if using fallback estimation
}
```

### Pattern 2: BodyMeasurement as Shared Computation Layer (ANCH-02, ANCH-03)
**What:** A pure function that takes raw landmarks (normalized + world) and produces a BodyMeasurements object with all distances, centers, and confidences. Each anchor strategy consumes this object rather than computing from raw landmarks.
**When to use:** Once per frame, before any strategy runs.
**Why:** Avoids duplicate distance calculations across strategies. Encapsulates the world-landmark usage (ANCH-02) in one place.
**Example:**
```typescript
// src/ar/anchoring/BodyMeasurement.ts
export interface BodyMeasurements {
  // World-space measurements (meters, from worldLandmarks)
  shoulderWidthMetric: number;       // dist(wl[11], wl[12])
  torsoHeightMetric: number;         // dist(shoulderMid, hipMid) in world
  hipWidthMetric: number;            // dist(wl[23], wl[24])
  shoulderToAnkleMetric: number;     // for abayas
  hipToAnkleMetric: number;          // for pants

  // Screen-space positions (Three.js world units, from normalized landmarks + cover crop)
  shoulderCenter: { x: number; y: number };
  hipCenter: { x: number; y: number };
  kneeCenter: { x: number; y: number } | null;   // null if not visible
  ankleCenter: { x: number; y: number } | null;   // null if not visible
  nosePosition: { x: number; y: number } | null;
  earMidpoint: { x: number; y: number } | null;

  // Per-landmark visibility (0-1)
  visibility: Record<number, number>;

  // Rotation
  bodyTurnY: number;               // from shoulder Z-diff
  shoulderTiltZ: number;           // shoulder line tilt

  // Derived flags
  hasShoulders: boolean;
  hasHips: boolean;
  hasKnees: boolean;
  hasAnkles: boolean;
  hasHead: boolean;
}

export function computeBodyMeasurements(
  normalizedLandmarks: any[],
  worldLandmarks: any[],
  coverCrop: CoverCropInfo,
  visibleDims: { w: number; h: number },
): BodyMeasurements { ... }
```

### Pattern 3: Fallback Chain for Occluded Landmarks (ANCH-08)
**What:** Each strategy defines a tiered degradation path when preferred landmarks are not visible.
**When to use:** Constantly on mobile -- users rarely show their entire body.
**Example for AbayaAnchor:**
```
Tier 1: Shoulders + Ankles visible -> full-body anchor (best quality)
Tier 2: Shoulders + Knees visible -> estimate ankles from knee extrapolation
Tier 3: Shoulders + Hips visible  -> estimate ankle at hipY + torsoHeight * 1.5
Tier 4: Shoulders only            -> use shirt-style, mark as degraded
```
**Body proportion ratios for fallback estimation:**
- Hip-to-ankle distance ~ 1.2x torso height (shoulder-to-hip)
- Knee-to-ankle ~ 0.5x hip-to-ankle
- Shoulder-to-ankle ~ 2.2x torso height

### Pattern 4: Visibility-Weighted Positioning (ANCH-09)
**What:** Instead of a binary "visible/not-visible" decision, weight each landmark's contribution by its visibility score.
**Example:**
```typescript
function weightedMidpoint(
  a: { x: number; y: number; visibility: number },
  b: { x: number; y: number; visibility: number },
): { x: number; y: number } {
  const wA = Math.max(a.visibility, 0.1);  // floor at 0.1 to avoid division issues
  const wB = Math.max(b.visibility, 0.1);
  const total = wA + wB;
  return {
    x: (a.x * wA + b.x * wB) / total,
    y: (a.y * wA + b.y * wB) / total,
  };
}
```

### Pattern 5: Depth-Aware Rendering (VIS-05)
**What:** Position the garment model at a slight negative Z offset so it appears to sit ON the body rather than floating in front. Use `depthWrite: false` on garment materials to prevent the garment from occluding itself unnaturally.
**Implementation:**
```typescript
// In SceneManager or during model swap:
model.traverse((child) => {
  if ((child as THREE.Mesh).isMesh) {
    const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
    mat.transparent = true;
    mat.depthWrite = true;    // Keep depth write for self-occlusion within the garment
    mat.side = THREE.DoubleSide;  // Render both sides for better visual quality
  }
});

// Z-positioning in anchor strategies:
// Use the shoulder Z-difference to compute body rotation depth offset
const depthOffset = -0.01;  // Slight offset behind camera plane
position.z = depthOffset;
```
**Key point:** The current system already sets Z to constant 0 (correct decision from Phase 1). VIS-05 is about ensuring proper render order, `depthWrite` settings, and potentially using `renderOrder` on the garment model for consistent results.

### Anti-Patterns to Avoid
- **Monolithic updateModel with if/else:** Do NOT add garment-type branches to the existing `updateModel()`. Replace it entirely with the AnchorResolver dispatch.
- **Magic landmark numbers:** Do NOT use `landmarks[11]` directly. Use `LANDMARK.LEFT_SHOULDER` from `landmarkIndices.ts`.
- **Smoothing outputs separately:** The existing approach smooths position, scale, and rotation independently with separate OneEuroFilters. This is acceptable but the filters should be applied to the AnchorResult output, not scattered throughout strategies.
- **Hard visibility cutoff without hysteresis:** Do NOT hide the model at exactly visibility 0.5 and show at 0.5. Use hysteresis: show at >0.5, hide at <0.3.
- **Computing world measurements from normalized landmarks:** Use `worldLandmarks` for all sizing/distance calculations. Use normalized `landmarks` only for screen-space positioning.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Landmark smoothing | Custom moving-average filter | OneEuroFilter (already in project) | One Euro is speed-adaptive; fixed-window averages add lag during fast motion |
| Body proportion estimation for fallbacks | Per-strategy ad-hoc ratios | Shared constants in garmentPresets.ts based on anthropometric standards | Ankle-to-hip ratio of 1.2x torso is well-established; scattering magic numbers across strategies causes inconsistency |
| Metric body dimensions | FOV-based world unit conversion from normalized landmarks | MediaPipe worldLandmarks (meters) | worldLandmarks are already metric-scale, camera-distance-independent. FOV-based conversion depends on hardcoded 63-degree FOV which varies across devices |
| Outlier rejection | Per-frame threshold checks | Running statistics with std-dev tracking | A rolling window of N samples with mean/std-dev adapts to the signal's natural variance instead of using a fixed threshold that works for some poses but not others |

**Key insight:** The biggest mistake would be trying to compute metric body dimensions from the normalized landmark positions and the Three.js camera FOV. MediaPipe already provides this via `worldLandmarks` in actual meters. The FOV-based approach has a known concern (Pitfall 13 in PITFALLS.md: camera FOV 63-degree hardcode may cause cross-device sizing errors).

## Common Pitfalls

### Pitfall 1: Abaya Ankles Not Visible
**What goes wrong:** Abayas require shoulder-to-ankle anchoring, but users hold phones at chest height, cutting off ankles. The model flickers or disappears.
**Why it happens:** Hard visibility threshold on ankle landmarks. Mobile selfie cameras have limited FOV.
**How to avoid:** Implement the fallback chain (ANCH-08). Estimate ankle position from hip/knee extrapolation using body proportions. Mark result as `degraded: true` so the UI can adapt.
**Warning signs:** Abaya model appears/disappears rapidly during use; model suddenly shortens when ankles leave frame.

### Pitfall 2: World Landmarks vs Normalized Landmarks Confusion
**What goes wrong:** Using worldLandmarks for screen positioning or normalized landmarks for body dimensions. The two coordinate systems serve different purposes.
**Why it happens:** Both are available in the same result object. Easy to mix up.
**How to avoid:** Strict separation: `worldLandmarks` for ALL distance/size calculations (shoulderWidth, torsoHeight, etc.). `landmarks` (normalized) for ALL screen-space position calculations (where to place the model in Three.js world units). BodyMeasurement function enforces this boundary.
**Warning signs:** Garment size changes when user moves closer/further from camera (means normalized coords used for sizing). Garment position offset from body (means world coords used for positioning).

### Pitfall 3: Outlier Rejection Too Aggressive on Legitimate Pose Changes
**What goes wrong:** Setting the sigma threshold too low (e.g., 1.5 std dev) rejects legitimate fast movements as outliers, causing the model to "freeze" during quick turns.
**Why it happens:** The standard deviation window is too short or the threshold too tight.
**How to avoid:** Use 3.0 sigma as the default rejection threshold with a window of 10-15 samples. This catches genuine spikes (MediaPipe detection failures) while allowing fast body movements through. Apply outlier rejection BEFORE the One Euro Filter (which handles residual smoothing).
**Warning signs:** Model freezes momentarily during quick body turns; model "catches up" with a snap after freezing.

### Pitfall 4: Visibility-Weighted Positioning Creates Asymmetric Drift
**What goes wrong:** When one shoulder has high visibility and the other low, the weighted midpoint drifts toward the high-visibility shoulder, pulling the garment off-center.
**Why it happens:** Direct visibility weighting on position without a floor.
**How to avoid:** Set a minimum visibility weight (e.g., 0.3) so low-visibility landmarks still contribute meaningfully. For garment positioning, use the MIDPOINT of the landmark pair and only use visibility for confidence/opacity, not position offset.
**Warning signs:** Garment slides left or right when user turns slightly (one shoulder partially occluded).

### Pitfall 5: ModelLoader Centering vs Garment Origin Convention
**What goes wrong:** ModelLoader centers models at bounding box center (line 49: `model.position.sub(center)`). But a shirt's natural anchor is the neckline, not the geometric center. The bounding box center of a shirt model is mid-torso, which is close to correct. But a pants model centered at bounding box center would have its anchor at mid-thigh, not the waistband.
**Why it happens:** Generic centering does not account for garment-type-specific origin conventions.
**How to avoid:** Keep the generic centering in ModelLoader (it works well enough for Phase 3). Each anchor strategy's position calculation already accounts for where the garment should be placed relative to body landmarks. If a pants model is centered at mid-thigh, the PantsAnchor strategy positions the model so that mid-thigh aligns with the actual mid-thigh on the body. The `verticalOffset` in GarmentConfig provides additional tuning.
**Warning signs:** Garments consistently appear too high or too low for a specific garment type. This is a tuning issue, not an architectural problem.

## Code Examples

### GarmentConfig Presets
```typescript
// src/ar/config/garmentPresets.ts
import { GarmentType } from '../types';

export interface GarmentConfig {
  type: GarmentType;
  requiredLandmarks: number[];    // Must have visibility > threshold
  optionalLandmarks: number[];    // Used if available
  visibilityThreshold: number;
  widthPadding: number;           // Multiplier on body width measurement
  heightPadding: number;          // Multiplier on body height measurement
  verticalOffset: number;         // Fraction of garment height to shift (negative = up)
  widthRef: 'shoulder' | 'hip' | 'ear';
  heightRef: 'torso' | 'shoulder_to_ankle' | 'hip_to_ankle' | 'head';
}

export const GARMENT_PRESETS: Record<GarmentType, GarmentConfig> = {
  shirt: {
    type: 'shirt',
    requiredLandmarks: [11, 12],
    optionalLandmarks: [23, 24],
    visibilityThreshold: 0.5,
    widthPadding: 1.15,
    heightPadding: 1.1,
    verticalOffset: 0,
    widthRef: 'shoulder',
    heightRef: 'torso',
  },
  abaya: {
    type: 'abaya',
    requiredLandmarks: [11, 12],
    optionalLandmarks: [23, 24, 25, 26, 27, 28],
    visibilityThreshold: 0.4,
    widthPadding: 1.2,
    heightPadding: 1.05,
    verticalOffset: -0.05,
    widthRef: 'shoulder',
    heightRef: 'shoulder_to_ankle',
  },
  pants: {
    type: 'pants',
    requiredLandmarks: [23, 24],
    optionalLandmarks: [25, 26, 27, 28],
    visibilityThreshold: 0.4,
    widthPadding: 1.1,
    heightPadding: 1.05,
    verticalOffset: 0,
    widthRef: 'hip',
    heightRef: 'hip_to_ankle',
  },
  jacket: {
    type: 'jacket',
    requiredLandmarks: [11, 12],
    optionalLandmarks: [23, 24, 13, 14],
    visibilityThreshold: 0.5,
    widthPadding: 1.25,
    heightPadding: 1.1,
    verticalOffset: 0,
    widthRef: 'shoulder',
    heightRef: 'torso',
  },
  headwear: {
    type: 'headwear',
    requiredLandmarks: [0],
    optionalLandmarks: [7, 8],
    visibilityThreshold: 0.6,
    widthPadding: 1.3,
    heightPadding: 1.5,
    verticalOffset: -0.5,
    widthRef: 'ear',
    heightRef: 'head',
  },
  accessory: {
    type: 'accessory',
    requiredLandmarks: [11, 12],
    optionalLandmarks: [0],
    visibilityThreshold: 0.5,
    widthPadding: 0.6,
    heightPadding: 0.3,
    verticalOffset: -0.15,
    widthRef: 'shoulder',
    heightRef: 'torso',
  },
};
```

### PoseProcessor WorldLandmarks Extension
```typescript
// Modify PoseProcessor.ts return type:
export interface PoseResult {
  landmarks: any[][];
  worldLandmarks: any[][];  // NEW: metric-scale coordinates
}

// In detectForVideo:
detectForVideo(video, timestamp): PoseResult | null {
  try {
    const result = landmarker.detectForVideo(video, timestamp);
    return {
      landmarks: result.landmarks,
      worldLandmarks: result.worldLandmarks,  // Already available from PoseLandmarker
    };
  } catch {
    return null;
  }
}
```

### Outlier Rejection Filter (ANCH-10)
```typescript
// src/ar/utils/OutlierFilter.ts
export class OutlierFilter {
  private window: number[] = [];
  private readonly maxSize: number;
  private readonly sigmaThreshold: number;

  constructor(maxSize = 15, sigmaThreshold = 3.0) {
    this.maxSize = maxSize;
    this.sigmaThreshold = sigmaThreshold;
  }

  /** Returns the value if within bounds, or null if outlier (use previous value). */
  filter(value: number): number | null {
    if (this.window.length < 3) {
      this.window.push(value);
      return value;
    }

    const mean = this.window.reduce((s, v) => s + v, 0) / this.window.length;
    const variance = this.window.reduce((s, v) => s + (v - mean) ** 2, 0) / this.window.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev > 0.0001 && Math.abs(value - mean) > this.sigmaThreshold * stdDev) {
      return null;  // Outlier -- caller should use last known good value
    }

    this.window.push(value);
    if (this.window.length > this.maxSize) this.window.shift();
    return value;
  }

  reset(): void {
    this.window = [];
  }
}
```

### AnchorResolver Dispatch
```typescript
// src/ar/anchoring/AnchorResolver.ts
import { AnchorStrategy, AnchorResult } from './types';
import { BodyMeasurements } from './BodyMeasurement';
import { GarmentConfig } from '../config/garmentPresets';
import { GarmentType } from '../types';

export class AnchorResolver {
  private strategies: Map<GarmentType, AnchorStrategy>;

  constructor() {
    this.strategies = new Map();
    // Strategies registered during initialization
  }

  register(type: GarmentType, strategy: AnchorStrategy): void {
    this.strategies.set(type, strategy);
  }

  resolve(
    garmentType: GarmentType,
    measurements: BodyMeasurements,
    config: GarmentConfig,
    modelDims: { w: number; h: number; d: number },
  ): AnchorResult | null {
    const strategy = this.strategies.get(garmentType);
    if (!strategy) {
      // Fallback to shirt for unknown types
      return this.strategies.get('shirt')?.compute(measurements, config, modelDims) ?? null;
    }
    return strategy.compute(measurements, config, modelDims);
  }
}
```

### Integration Point: ARExperience Render Loop
```typescript
// In ARExperience.tsx render loop, replace the updateModel call:
const result = pp.detectForVideo(video, time);
if (result && result.landmarks.length > 0) {
  const measurements = computeBodyMeasurements(
    result.landmarks[0],
    result.worldLandmarks[0],
    coverCropRef.current,
    sm.visibleDims,
  );
  const garmentType = selectedProductRef.current?.garment_type || 'shirt';
  const config = GARMENT_PRESETS[garmentType];
  const anchorResult = anchorResolver.resolve(garmentType, measurements, config, modelDimsRef.current);

  if (anchorResult) {
    // Apply via smoothing filters + product offset
    applyAnchorResult(modelRef.current, anchorResult, filters, offset);
    sm.updateOpacity(Math.min(1, anchorResult.confidence * 1.5));
    sm.dirty = true;
  } else {
    modelRef.current.visible = false;
    sm.dirty = true;
  }
}
```

## State of the Art

| Old Approach (current) | New Approach (Phase 3) | Impact |
|------------------------|----------------------|--------|
| Single updateModel function for all garments | Strategy pattern with per-type anchors | Each garment type positioned correctly |
| Only 4 landmarks used (11, 12, 23, 24) | Up to 14 landmarks per garment type | Full-body coverage for abayas, pants |
| Normalized landmarks for sizing | worldLandmarks (meters) for sizing | Camera-distance-independent scaling |
| Binary visibility threshold | Visibility-weighted + hysteresis + fallback chains | Smoother tracking, no flicker |
| No outlier rejection | Running std-dev filter before smoothing | Eliminates landmark jump artifacts |
| Single Z=0 constant | Z=0 with proper depthWrite and renderOrder | Better visual depth quality |
| Hard "hide model" on landmark loss | Tiered degradation with estimated positions | Garment stays visible during partial occlusion |

## Open Questions

1. **Abaya width padding value (1.2) is an educated guess**
   - What we know: Abayas are wider than body width, typically flowing/A-line
   - What's unclear: The exact multiplier for visually correct results
   - Recommendation: Start with 1.2, plan for tuning iteration with real abaya models

2. **Pants required landmarks -- shoulders or hips?**
   - What we know: Pants anchor from hips, but hips are often less reliably detected than shoulders
   - What's unclear: Whether to require shoulders visible (more reliable) and compute hip position, or require hips directly
   - Recommendation: Require hips directly (23, 24) as primary with fallback estimation from shoulders if hips occluded. Pants without visible hips should not render (too inaccurate).

3. **Jacket vs Shirt differentiation**
   - What we know: Jacket uses wider padding (1.25) and slightly taller height (1.1)
   - What's unclear: Whether a separate strategy is needed or just different config values for ShirtAnchor
   - Recommendation: Use ShirtAnchor with jacket-specific config values. Only create a separate JacketAnchor if testing reveals insufficient differentiation.

4. **Per-product ar_position_offset interaction with anchor system**
   - What we know: Products have optional `ar_position_offset` and `ar_scale` in the database
   - What's unclear: Whether these should multiply or add to the anchor result
   - Recommendation: Apply as additive offsets on TOP of the anchor result (current behavior preserved). `ar_scale` multiplies the anchor-computed scale. This maintains backward compatibility.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (not yet installed -- must add in Wave 0) |
| Config file | None -- needs creation (vitest.config.ts) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANCH-01 | AnchorResolver dispatches correct strategy per garment type | unit | `npx vitest run src/ar/anchoring/__tests__/AnchorResolver.test.ts` | Wave 0 |
| ANCH-02 | BodyMeasurement uses worldLandmarks for metric distances | unit | `npx vitest run src/ar/anchoring/__tests__/BodyMeasurement.test.ts` | Wave 0 |
| ANCH-03 | GarmentConfig presets have correct fields per type | unit | `npx vitest run src/ar/config/__tests__/garmentPresets.test.ts` | Wave 0 |
| ANCH-04 | ShirtAnchor returns correct position/scale for shoulder+hip landmarks | unit | `npx vitest run src/ar/anchoring/strategies/__tests__/ShirtAnchor.test.ts` | Wave 0 |
| ANCH-05 | AbayaAnchor returns shoulder-to-ankle positioning with wider width | unit | `npx vitest run src/ar/anchoring/strategies/__tests__/AbayaAnchor.test.ts` | Wave 0 |
| ANCH-06 | PantsAnchor returns hip-to-ankle positioning | unit | `npx vitest run src/ar/anchoring/strategies/__tests__/PantsAnchor.test.ts` | Wave 0 |
| ANCH-07 | AccessoryAnchor handles headwear (nose+ears) and necklace (shoulders) | unit | `npx vitest run src/ar/anchoring/strategies/__tests__/AccessoryAnchor.test.ts` | Wave 0 |
| ANCH-08 | AbayaAnchor falls back gracefully when ankles/knees occluded | unit | `npx vitest run src/ar/anchoring/strategies/__tests__/AbayaAnchor.test.ts` | Wave 0 |
| ANCH-09 | Visibility-weighted midpoints produce correct positions | unit | `npx vitest run src/ar/anchoring/__tests__/BodyMeasurement.test.ts` | Wave 0 |
| ANCH-10 | OutlierFilter rejects spikes beyond 3 sigma | unit | `npx vitest run src/ar/utils/__tests__/OutlierFilter.test.ts` | Wave 0 |
| VIS-05 | SceneManager sets depthWrite and renderOrder on garment materials | unit | `npx vitest run src/ar/core/__tests__/SceneManager.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before /gsd:verify-work

### Wave 0 Gaps
- [ ] Install vitest: `npm install -D vitest`
- [ ] Create `vitest.config.ts` with path aliases matching vite config
- [ ] `src/ar/anchoring/__tests__/AnchorResolver.test.ts` -- strategy dispatch
- [ ] `src/ar/anchoring/__tests__/BodyMeasurement.test.ts` -- landmark to measurements
- [ ] `src/ar/config/__tests__/garmentPresets.test.ts` -- preset validation
- [ ] `src/ar/anchoring/strategies/__tests__/ShirtAnchor.test.ts` -- shirt math
- [ ] `src/ar/anchoring/strategies/__tests__/AbayaAnchor.test.ts` -- abaya math + fallbacks
- [ ] `src/ar/anchoring/strategies/__tests__/PantsAnchor.test.ts` -- pants math
- [ ] `src/ar/anchoring/strategies/__tests__/AccessoryAnchor.test.ts` -- accessory math
- [ ] `src/ar/utils/__tests__/OutlierFilter.test.ts` -- outlier rejection
- [ ] Shared test fixtures: mock landmark arrays with known positions and visibility values

## Sources

### Primary (HIGH confidence)
- **Codebase analysis**: Direct examination of `ARExperience.tsx`, `PoseProcessor.ts`, `SceneManager.ts`, `ModelLoader.ts`, `coordinateUtils.ts`, `OneEuroFilter.ts`, `types.ts` -- all code verified in current working tree
- **ARCHITECTURE.md** (`.planning/research/ARCHITECTURE.md`): Detailed anchor strategy blueprints, BodySkeleton types, GarmentConfig interfaces, per-type anchor diagrams
- **FEATURES.md** (`.planning/research/FEATURES.md`): Garment anchor map table, scaling behavior per type, landmark utilization map
- **PITFALLS.md** (`.planning/research/PITFALLS.md`): 18 catalogued pitfalls including abaya full-body requirements, visibility threshold flickering, model origin inconsistency

### Secondary (MEDIUM confidence)
- [MediaPipe PoseLandmarker Web JS Guide](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js) -- worldLandmarks format confirmed as meters with hip midpoint origin
- [MediaPipe Pose Landmark Detection Guide](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker) -- 33-landmark model, landmarks vs worldLandmarks coordinate systems
- [Three.js WebGLRenderer docs](https://threejs.org/docs/pages/WebGLRenderer.html) -- Depth sorting, transparent object render order
- [Three.js Transparency forum discussion](https://discourse.threejs.org/t/easiest-way-to-set-rendering-order-for-transparent-objects/25372) -- depthWrite + renderOrder patterns

### Tertiary (LOW confidence)
- Outlier rejection sigma threshold (3.0) -- based on general statistical practice (3-sigma rule), not verified against AR-specific literature
- Abaya width padding (1.2) and body proportion ratios (hip-to-ankle = 1.2x torso) -- educated estimates flagged for tuning

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, versions pinned
- Architecture: HIGH -- detailed blueprints in ARCHITECTURE.md, verified against current codebase structure
- Pitfalls: HIGH -- 18 pitfalls catalogued from codebase analysis, most verified in code
- Anchor math/tuning values: MEDIUM -- proportions and padding multipliers are starting points that need real-model testing

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable domain -- MediaPipe 0.10.34 pinned, Three.js stable)

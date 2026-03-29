# Feature Landscape: AR Garment Try-On

**Domain:** Web-based AR garment try-on for fashion retail events
**Researched:** 2026-03-29
**Target market:** Middle Eastern fashion, especially abayas and traditional clothing
**Confidence:** MEDIUM (based on codebase analysis and domain knowledge; web search tools unavailable for live verification)

---

## Table Stakes

Features users expect from any AR try-on product. Missing = product feels broken or toylike.

### TS-1: Garment-Type-Aware Anchor Mapping

| Attribute | Detail |
|-----------|--------|
| **Why Expected** | Every serious AR try-on product (WANNA, Zeekit, Google Virtual Try-On) maps garments differently by type. A shirt that anchors shoulder-to-hip is fundamentally different from a dress that anchors shoulder-to-ankle. Without this, the system treats every garment as a rectangle pasted on the torso. |
| **Complexity** | Medium |
| **Current state** | Missing. `updateModel()` in ARExperience.tsx uses only shoulders (11,12) and hips (23,24) for ALL garments. ARGarmentOverlay.tsx has crude category-based sizing but no actual pose-driven anchoring. |

**Garment anchor map (what the system must know per type):**

| Garment Type | Primary Anchors (MediaPipe indices) | Extent | Width Reference | Height Reference |
|---|---|---|---|---|
| **Shirt/Top** | Shoulders (11,12), Hips (23,24) | Shoulder-line to hip-line | Shoulder width * 1.15 | Shoulder-to-hip distance |
| **Abaya/Dress** | Shoulders (11,12), Hips (23,24), Ankles (27,28) | Shoulder-line to ankle-line | Shoulder width * 1.2 (abayas are wider/flowing) | Shoulder-to-ankle distance |
| **Pants/Bottoms** | Hips (23,24), Knees (25,26), Ankles (27,28) | Hip-line to ankle-line | Hip width * 1.1 | Hip-to-ankle distance |
| **Jacket/Outerwear** | Shoulders (11,12), Elbows (13,14), Hips (23,24) | Shoulder-line to mid-hip, wider than shirt | Shoulder width * 1.25 | Shoulder-to-hip * 1.1 |
| **Headwear** | Nose (0), Ears (7,8) | Above shoulders | Ear-to-ear width * 1.3 | Nose-to-ear height * 1.5 |
| **Necklace/Accessory** | Shoulders (11,12) | Neckline area | Shoulder width * 0.5 | Shoulder midpoint offset upward |

**Notes:**
- This is the single most impactful feature for Azyah. The current system's biggest problem (per PROJECT.md) is treating everything as a shirt.
- Each garment type needs a preset configuration object: `{ anchorLandmarks, widthRef, heightRef, offsetRatios, paddingMultipliers }`.
- Abayas specifically need the full shoulder-to-ankle chain because they are floor-length garments. Using only shoulder-to-hip produces a truncated overlay.

---

### TS-2: Body-Proportional Scaling (Non-Uniform)

| Attribute | Detail |
|-----------|--------|
| **Why Expected** | Without proportional scaling, the garment either floats off the body or clips through it. Users immediately notice when a garment is "the wrong size" relative to their body. WANNA and Zeekit both scale garments to match detected body dimensions. |
| **Complexity** | Medium |
| **Current state** | Partially implemented. `updateModel()` already computes `targetScaleX` from shoulder width and `targetScaleY` from torso height, but only for the shirt case. Does not adapt for different garment types. |

**Required scaling behavior per garment type:**

| Garment Type | X-Scale Source | Y-Scale Source | Z-Scale Strategy |
|---|---|---|---|
| Shirt | shoulder width | shoulder-to-hip | average of X and Y |
| Abaya/Dress | shoulder width * 1.2 | shoulder-to-ankle | weighted toward X (wider drape) |
| Pants | hip width | hip-to-ankle | average of X and Y |
| Jacket | shoulder width * 1.25 | shoulder-to-hip * 1.1 | slightly larger than shirt |

**Key detail:** Non-uniform scaling must preserve the garment's aspect ratio within reasonable bounds. If the body's detected shoulder-to-hip ratio is 1:1.5 but the model's natural ratio is 1:2, clamping should prevent distortion beyond ~20% deviation from natural proportions.

---

### TS-3: Stable Pose Tracking (Anti-Jitter)

| Attribute | Detail |
|-----------|--------|
| **Why Expected** | Jittery overlays are the #1 reason users abandon AR try-on. If the garment shakes or jumps, the illusion is instantly broken. Every production AR try-on system uses temporal smoothing. |
| **Complexity** | Medium |
| **Current state** | Basic linear interpolation (lerp) with SMOOTHING = 0.3. This is a good start but insufficient for production quality. |

**Required improvements:**
- **One Euro Filter** -- replace simple lerp with a One Euro Filter (speed-adaptive low-pass filter). Low cutoff when stationary for stability, high cutoff when moving for responsiveness. This is the industry standard for landmark smoothing. ~30 lines of code, drop-in replacement.
- **Per-landmark smoothing before aggregation** -- current system smooths the final position but not individual landmarks. Per-landmark filtering before computing anchor points produces less jitter.
- **Outlier rejection** -- if a landmark jumps more than N standard deviations from its recent history, discard that frame's reading and use the predicted position instead.
- **Visibility-weighted interpolation** -- landmarks with low visibility scores should contribute less to position calculations. Current code does this for opacity but not for positioning.

---

### TS-4: Tracking State Machine with Garment-Aware Guidance

| Attribute | Detail |
|-----------|--------|
| **Why Expected** | Users need to know why the AR is not working. Without guidance, users assume the feature is broken. |
| **Complexity** | Low |
| **Current state** | Already implemented via `TrackingGuidance` component with states: initializing, camera_denied, camera_error, pose_init_failed, model_loading, model_error, waiting_for_pose, tracking_lost, tracking_active. |

**Needed enhancements for garment-type awareness:**
- Guidance should adapt to garment type: "Show your full body from shoulders to feet" for abayas vs. "Show your upper body" for shirts vs. "Step back so your legs are visible" for pants.
- Add a `partial_tracking` state for when some but not all required landmarks for the garment type are visible (e.g., shoulders visible but ankles not, when trying on an abaya).
- Display which landmarks are missing and what the user should do about it.

---

### TS-5: Screenshot/Capture with Composite

| Attribute | Detail |
|-----------|--------|
| **Why Expected** | The entire point of try-on is to evaluate and share. If users cannot capture the result, the feature has no lasting value. Every AR try-on app includes this. |
| **Complexity** | Medium |
| **Current state** | `ARTryOn.tsx` has `capturePhoto()` using canvas, but it only captures the video feed -- it does NOT composite the Three.js overlay. `ARExperience.tsx` (the actual working AR page) has no capture functionality at all. |

**Required implementation:**
- Create an offscreen canvas at video native resolution.
- Draw the video frame first, then render Three.js scene to the same canvas (using `renderer.render()` to a separate render target, then `drawImage` the result).
- Include a subtle "Try on at [event name]" watermark for brand attribution.
- Save to device via `<a download>` on web or `@capacitor/filesystem` on native.
- This feature is a prerequisite for Share (TS-6).

---

### TS-6: Share Functionality

| Attribute | Detail |
|-----------|--------|
| **Why Expected** | Social sharing drives organic discovery and is the primary viral loop for fashion try-on. |
| **Complexity** | Low |
| **Current state** | `ARTryOn.tsx` has `shareCapture()` using Web Share API, but only for the non-3D overlay page. `ARExperience.tsx` has no share. |

**Required implementation:**
- Use Web Share API (`navigator.share`) with file sharing.
- Fallback: download to device if Web Share API unavailable.
- Share payload: composite image + product name + event deep link URL.
- On Capacitor native: use `@capacitor/share` plugin for native share sheet.

---

### TS-7: World Landmarks for Distance-Independent Sizing

| Attribute | Detail |
|-----------|--------|
| **Why Expected** | Current system uses normalized landmarks (0-1 range relative to image). When the user steps further from the camera, their normalized landmark positions change -- making the garment scale incorrectly. World landmarks provide metric-scale positions independent of camera distance. |
| **Complexity** | Low |
| **Current state** | Not implemented. `updateModel()` uses `result.landmarks[0]` (normalized). MediaPipe also provides `result.worldLandmarks[0]` which gives real-world 3D coordinates in meters, centered at the hip midpoint. |

**Implementation:**
- Use `result.worldLandmarks[0]` for all scaling calculations (shoulder width, torso height, etc.).
- Continue using normalized `result.landmarks[0]` for screen-space positioning (mapping to Three.js viewport).
- This is a single-variable change in the render loop with major accuracy improvement.

---

### TS-8: Occluded Landmark Fallback Estimation

| Attribute | Detail |
|-----------|--------|
| **Why Expected** | Users rarely show their entire body to the camera. For abayas, ankles are frequently cut off by the camera frame. For pants, the full leg may not be visible. Without fallback estimation, the garment cannot be positioned when key anchors are missing. |
| **Complexity** | Medium |
| **Current state** | Partial. `updateModel()` has a fallback for missing hips (`hipCY = shoulderCY + 0.25`) but nothing for ankles, knees, or other landmarks. |

**Required approach:**
- Maintain body proportion ratios: ankle-y is typically ~2.5x the shoulder-to-hip distance below shoulders. Knee-y is ~1.5x.
- When ankles are not visible but hips are, estimate ankle position from hip position using standard body proportions.
- When hips are not visible but shoulders are, estimate hip position from shoulder position.
- Use exponential decay on confidence for estimated landmarks (reduce influence over time if actual landmark data has not been seen recently).

---

## Differentiators

Features that provide competitive advantage. Not expected, but valued -- especially for the Middle Eastern fashion market.

### D-1: Abaya-Specific Drape Approximation

| Attribute | Detail |
|-----------|--------|
| **Value Proposition** | Abayas are the PRIMARY product category for Azyah's market. Unlike Western fitted garments, abayas flow loosely from shoulders with fabric width exceeding body width. Getting abaya placement right is the #1 differentiator over generic try-on solutions that were designed for Western fitted clothing. |
| **Complexity** | High |
| **Notes** | Not full cloth physics (out of scope per PROJECT.md), but the anchor system should account for: (1) wider lateral extent than shoulder width, (2) full shoulder-to-ankle height, (3) gentle A-line taper from shoulders to hem, (4) slight sway offset tied to hip movement. |

**Implementation approach (rigid-body approximation):**
- Abaya preset: `{ widthMultiplier: 1.3, heightRef: 'shoulder-to-ankle', taperRatio: 0.85, swayFactor: 0.15 }`
- The `swayFactor` applies a small lateral offset to the model based on hip landmark velocity (side-to-side movement creates a subtle drift).
- The `taperRatio` represents the ratio of hem width to shoulder width (many abayas are A-line).
- This does NOT require cloth simulation -- it is a parameterized transform applied to the rigid 3D model. The .glb mesh itself should already contain the abaya's drape shape.

---

### D-2: Multi-Landmark Articulation (Beyond 4-Point)

| Attribute | Detail |
|-----------|--------|
| **Value Proposition** | Current system uses only 4 of 33 available MediaPipe landmarks. Using elbows, wrists, knees, and ankles enables: sleeve positioning for jackets, pant leg orientation, and full-body garment contour matching. This makes garments "follow" the body rather than float near it. |
| **Complexity** | High |

**Landmark utilization map:**

| Landmark | Index | Used By |
|---|---|---|
| Nose | 0 | Headwear, necklace vertical reference |
| Left/Right Ear | 7, 8 | Headwear width reference |
| Left/Right Shoulder | 11, 12 | ALL upper-body garments |
| Left/Right Elbow | 13, 14 | Jackets (sleeve mid-point), abayas (arm drape) |
| Left/Right Wrist | 15, 16 | Jackets (sleeve end), accessories |
| Left/Right Hip | 23, 24 | ALL garments except headwear |
| Left/Right Knee | 25, 26 | Pants, abayas/dresses (mid-length reference) |
| Left/Right Ankle | 27, 28 | Pants, abayas/dresses (full-length reference) |

**Articulation features per garment type:**
- **Shirt:** Shoulder angle for body rotation (already implemented). Add: elbow-based width adjustment when arms are raised.
- **Abaya/Dress:** Full spine line from shoulder midpoint through hip midpoint to ankle midpoint. Knee landmarks for walking/sitting detection to adjust hem.
- **Pants:** Hip rotation independent of shoulder rotation (twist detection). Knee landmarks for bend detection.
- **Jacket:** Elbow landmarks for sleeve curvature. Wrist landmarks for sleeve length validation.

---

### D-3: Depth-Aware 3D Placement (Z-Axis Realism)

| Attribute | Detail |
|-----------|--------|
| **Value Proposition** | Current system produces flat-looking overlays despite using Three.js 3D engine. Proper z-axis handling makes the garment appear to wrap around the body rather than float in front of it. |
| **Complexity** | Medium-High |
| **Notes** | MediaPipe provides z-coordinates for all landmarks (depth relative to hip midpoint). Current code uses `avgZ * 2 - 1` but does not use per-landmark depth to create a 3D envelope. |

**Required improvements:**
- Use shoulder z-difference for Y-axis body rotation (partially done via `shoulderAngle`).
- Use hip z-difference to detect lower-body twist (relevant for dresses/abayas -- upper and lower body may rotate differently).
- Position the garment model slightly behind the detected body plane so the user's actual body partially occludes it naturally.
- Use depth-dependent scaling: closer body parts appear slightly larger.

---

### D-4: Adaptive Lighting from Camera Feed

| Attribute | Detail |
|-----------|--------|
| **Value Proposition** | Current lighting is two fixed lights (ambient 0.6 + directional 0.8). The garment looks artificially bright in dark rooms and washed out in bright rooms. Matching scene lighting makes the 3D model look "present" in the real environment. |
| **Complexity** | Medium |

**Achievable improvements (without full PBR pipeline):**
- **Camera-feed luminance sampling**: Sample average brightness and dominant color from a small region of the video feed. Adjust ambient light intensity and tint to match.
- **Soft shadow plane**: Add a transparent shadow-receiving plane behind the model to create depth grounding.
- **Simple hemisphere light**: Replace or supplement directional light with a hemisphere light whose sky color comes from the upper video frame and ground color from the lower frame.

---

### D-5: Gesture Controls (Pinch-to-Zoom, Manual Adjust)

| Attribute | Detail |
|-----------|--------|
| **Value Proposition** | Allows users to fine-tune garment placement when automatic tracking is imperfect. Reduces frustration. |
| **Complexity** | Medium |

**Required gestures:**
- **Pinch-to-zoom**: Adjust garment scale (override the automatic body-proportional scale).
- **Two-finger drag**: Adjust garment position offset.
- **Single tap**: Reset to automatic tracking position.
- **Important**: Gesture overrides should be ADDITIVE to the tracking-based position. The garment should still follow body movement, with the user's offset applied on top.

---

### D-6: Model Caching and Progressive Loading

| Attribute | Detail |
|-----------|--------|
| **Value Proposition** | 3D models are typically 2-10MB. At fashion events with many products, repeated downloads kill the experience. |
| **Complexity** | Low-Medium |
| **Current state** | No caching. Models re-download on every product switch (full `useEffect` reinit). |

**Implementation approach:**
- Use Cache API (ServiceWorker cache) or IndexedDB to store .glb files by URL.
- On model load: check cache first, fall back to network.
- Implement LRU eviction at ~50MB total cache size.
- Show loading progress bar for first-time downloads.
- Pre-fetch the next 2-3 products in the selector while the user views the current one.

---

### D-7: Model Upload Validation (Retailer-Facing)

| Attribute | Detail |
|-----------|--------|
| **Value Proposition** | Garbage in, garbage out. If retailers upload models with wrong origins, inverted normals, or massive file sizes, the AR experience breaks. |
| **Complexity** | Medium |

**Validation checks on upload:**
- File size limit (10MB max for mobile web).
- Parse GLB header to verify valid format.
- Load in headless Three.js context: compute bounding box, check for degenerate geometry.
- Verify model has at least one mesh with vertices.
- Check that bounding box dimensions are reasonable (not microscopic or massive).
- Warn if model has >50k triangles (performance concern on mobile).
- Auto-detect orientation (if tallest axis is not Y, suggest rotation).
- Present a 3D preview to the retailer before saving.
- Suggest garment type based on bounding box aspect ratio (tall+narrow = dress, wide+short = top).

---

### D-8: Garment Type Metadata in Database

| Attribute | Detail |
|-----------|--------|
| **Value Proposition** | Prerequisite for all garment-type-aware features. Without this, the system cannot know whether a product is a shirt, abaya, or pair of pants. |
| **Complexity** | Low |

**Schema change:**
```sql
ALTER TABLE event_brand_products
ADD COLUMN garment_type TEXT DEFAULT 'shirt'
CHECK (garment_type IN ('shirt', 'dress_abaya', 'pants', 'jacket', 'headwear', 'accessory'));
```

**Retailer UI change:**
- Add garment type dropdown to BrandProductManager upload flow.
- Default to 'shirt' for backward compatibility (existing products without garment_type still work).
- Show visual guide explaining each garment type with example silhouettes.
- Required field when `ar_enabled` is true.

---

### D-9: Product Selector Fast Switching (Scene Persistence)

| Attribute | Detail |
|-----------|--------|
| **Value Proposition** | Currently, switching products triggers full reinit of Three.js scene + MediaPipe (entire `useEffect` dependency on `selectedProduct`). This causes 3-5 second delays and camera flicker. Users expect instant garment swaps. |
| **Complexity** | Medium |

**Required changes:**
- Separate the Three.js/MediaPipe initialization from the model loading.
- On product switch: only remove old model, load new .glb, add to existing scene.
- Preserve camera stream, landmarker instance, renderer, and scene across switches.
- Combined with D-6 (caching), this makes switching feel near-instant.

---

## Anti-Features

Features to explicitly NOT build. These are either out of scope, premature, or counterproductive.

### AF-1: Real-Time Cloth Physics Simulation

| **Why Avoid** | Computationally impossible on mobile web browsers at 15+ FPS. Even native AR apps (ARKit/ARCore) struggle with real-time cloth sim. The performance budget is already tight with MediaPipe + Three.js rendering. |
|---|---|
| **What to Do Instead** | Use garment-type-specific preset transforms (width multipliers, taper ratios, sway factors) to approximate drape behavior with rigid body transforms. The .glb mesh itself should contain the garment's shape including drape. |

### AF-2: Multi-Garment Simultaneous Try-On

| **Why Avoid** | Dramatically increases complexity: z-ordering between garments, occlusion handling, multiple anchor sets, doubled render cost. The single-garment experience is not yet good enough to compound. |
|---|---|
| **What to Do Instead** | Perfect single-garment try-on first. If multi-garment is ever needed, implement as "outfit presets" where multiple garments are pre-composed into a single combined .glb file by the retailer. |

### AF-3: AI-Based Body Measurement / Size Recommendation

| **Why Avoid** | The existing `ARSmartFit` component fakes this with mock data (`fitScore: Math.floor(Math.random() * 30) + 70`). Real body measurement from a single camera view requires depth estimation models and careful calibration that is a separate ML problem. Half-baked size recommendations erode trust. |
|---|---|
| **What to Do Instead** | Remove the fake "Smart Fit" analysis or clearly label it as "visual preview only, not a sizing tool." If real sizing is desired later, it is a separate milestone requiring its own ML pipeline. |

### AF-4: Custom 3D Model Creation Tool

| **Why Avoid** | Building a 3D modeling tool is a multi-year effort unrelated to the core AR try-on problem. Retailers already use external tools (Meshy.ai, Tripo3D, Blender). |
|---|---|
| **What to Do Instead** | Provide clear documentation on model requirements (.glb format, Y-up orientation, centered origin, <50k triangles). Consider a model spec guide specific to abayas. |

### AF-5: WebXR / ARCore / ARKit Native Integration

| **Why Avoid** | Per PROJECT.md constraints, the app must work in mobile web browsers via Capacitor webview. Native AR APIs require platform-specific code, are not available in all webviews, and would fragment the experience. |
|---|---|
| **What to Do Instead** | Stay with MediaPipe + Three.js. The markerless web-based approach has the broadest device compatibility. |

### AF-6: Full Body Mesh Reconstruction (SMPL/SMPL-X)

| **Why Avoid** | Body mesh fitting (SMPL, SMPL-X) is computationally expensive and research-grade for web. Used in offline virtual try-on research, not real-time web products. |
|---|---|
| **What to Do Instead** | Anchor garment to the landmark skeleton directly. The 33-point skeleton provides sufficient anchor points for positioning rigid garment meshes. |

### AF-7: Bone-Driven Garment Deformation

| **Why Avoid** | Requires all uploaded GLBs to have compatible armatures with consistent bone naming. Retailers cannot guarantee this when using diverse 3D modeling tools. |
|---|---|
| **What to Do Instead** | Position and scale the rigid mesh using landmark-based transforms. If a GLB happens to have bones/armature, ignore them. |

### AF-8: Per-Product Manual Offset Tuning as Primary Strategy

| **Why Avoid** | The current system relies on per-product `ar_scale` and `ar_position_offset` to compensate for the lack of garment-type awareness. This puts the burden on retailers to manually tweak every product. It does not scale. |
|---|---|
| **What to Do Instead** | Use garment-type presets as the primary positioning strategy. Keep per-product offsets as an optional fine-tuning escape hatch, applied ON TOP of the garment-type preset. |

---

## Feature Dependencies

```
D-8 (Garment Type DB) ─────> TS-1 (Anchor Mapping) ─────> TS-2 (Proportional Scaling)
        |                           |                              |
        v                           v                              v
  D-7 (Upload Validation)    TS-4 (Garment-Aware Guidance)   D-1 (Abaya Drape)
                                    |
                                    v
                              D-2 (Multi-Landmark) ──> D-3 (Depth Z-Axis)

TS-7 (World Landmarks) ─────> TS-2 (Proportional Scaling)  [world landmarks improve scaling accuracy]

TS-8 (Occluded Fallback) ───> TS-1 (Anchor Mapping)  [fallbacks needed when anchors not visible]
                          \──> D-1 (Abaya Drape)      [ankles often cut off for abayas]

TS-3 (Anti-Jitter) ──────────> Independent, apply to any tracking path

TS-5 (Screenshot) ──> TS-6 (Share)       [Screenshot is prerequisite for Share]

D-6 (Model Caching) ──> D-9 (Fast Switching)   [Caching enables instant switching]

D-4 (Lighting) ──────────> Independent, apply after core placement is solid
D-5 (Gestures) ──────────> Independent, apply after core placement is solid
```

**Critical path:** D-8 --> TS-1 --> TS-2 --> D-1. This chain addresses the project's core pain point: garments look wrong because the system treats everything as a shirt.

---

## MVP Recommendation

### Phase 1 -- Core AR Fix (addresses the "everything looks like a shirt" problem):

1. **D-8: Garment Type Metadata** -- Low complexity, prerequisite for everything. Add the column, update types, add UI dropdown.
2. **TS-7: World Landmarks** -- Low complexity, immediate accuracy improvement. Switch scaling calculations to `result.worldLandmarks`.
3. **TS-1: Garment-Type-Aware Anchor Mapping** -- Medium complexity, highest impact. Define anchor configs per garment type, route to correct config based on `garment_type`.
4. **TS-2: Body-Proportional Scaling per Type** -- Medium complexity, extends existing scaling logic. Apply garment-type-specific multipliers.
5. **TS-3: One Euro Filter** -- Low complexity, immediate quality improvement. Replace lerp smoothing with One Euro Filter.
6. **TS-8: Occluded Landmark Fallback** -- Medium complexity, critical for abayas (ankles often not visible).

### Phase 2 -- Abaya Excellence + User Value:

7. **D-1: Abaya-Specific Drape Approximation** -- High complexity, THE differentiator for the target market.
8. **D-2: Multi-Landmark Articulation** -- High complexity, makes garments follow the body naturally.
9. **TS-5 + TS-6: Screenshot and Share** -- Low-Medium complexity, unlocks the viral loop and gives users tangible output.
10. **D-3: Depth-Aware Placement** -- Medium-High complexity, upgrades from 2D-feeling to real 3D.
11. **TS-4: Garment-Aware Guidance** -- Low complexity, improves user experience for different garment types.

### Phase 3 -- Polish and Performance:

12. **D-4: Adaptive Lighting** -- Medium complexity. Noticeable but not blocking.
13. **D-5: Gesture Controls** -- Medium complexity. Escape hatch when auto-tracking is imperfect.
14. **D-6: Model Caching** -- Low-Medium complexity. Apply when model library grows.
15. **D-9: Fast Product Switching** -- Medium complexity. Scene persistence across product swaps.
16. **D-7: Upload Validation** -- Medium complexity. Data quality for new retailer onboarding.

### Remove / Rethink:

- **ARSmartFit component**: Currently displays fake data (random fit scores). Either remove it or clearly mark as "visual preview only" until real body measurement is a separate funded milestone.
- **ARGarmentOverlay component**: This 2D image overlay approach is superseded by the Three.js-based ARExperience. Consider deprecating or removing to avoid user confusion between two different AR experiences.
- **ARTryOn page**: Contains mock products and a separate camera/overlay system that duplicates ARExperience. Should be consolidated.

---

## Sources

- **Codebase analysis (HIGH confidence)**: Direct examination of `ARExperience.tsx` (536 lines), `ARGarmentOverlay.tsx` (183 lines), `ARSmartFit.tsx` (214 lines), `ARTryOn.tsx` (622 lines), and `supabase/types.ts` in the Azyah repository.
- **PROJECT.md (HIGH confidence)**: Project requirements, constraints, context, and out-of-scope items.
- **MediaPipe PoseLandmarker (MEDIUM confidence)**: 33-landmark model. Landmarks 11,12 (shoulders), 13,14 (elbows), 15,16 (wrists), 23,24 (hips), 25,26 (knees), 27,28 (ankles). Provides both normalized and world landmark coordinates. Based on training data; official docs were unavailable for live verification during this session.
- **One Euro Filter (MEDIUM confidence)**: Well-documented signal smoothing algorithm commonly used in AR/VR for landmark jitter reduction. Casiez et al., 2012. Standard recommendation across AR communities.
- **WANNA.fashion (LOW confidence)**: Market-leading AR try-on cited as inspiration in PROJECT.md. Known for garment-type-specific anchoring and material realism. Could not verify current feature set via web during this session.
- **Industry patterns (LOW confidence)**: Zeekit/Walmart, Google AR Shopping, Snap AR try-on lenses, Kivisense -- general knowledge that these all use garment-type-aware anchoring. Training data only, not independently verified.

---

*Feature landscape researched 2026-03-29. Supersedes prior version.*

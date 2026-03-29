# Project Research Summary

**Project:** Azyah AR System Improvement — Garment-Type-Aware AR Anchoring
**Domain:** Web-based AR garment try-on (MediaPipe + Three.js, mobile-first)
**Researched:** 2026-03-29
**Confidence:** MEDIUM-HIGH

## Executive Summary

Azyah's AR try-on system is built on a solid foundation (React, Three.js 0.160.1, MediaPipe tasks-vision 0.10.34, Supabase, Capacitor) but has one critical architectural flaw: every garment type is positioned using a single "shirt" anchor strategy that maps only to shoulder and hip landmarks. This produces visually broken placement for abayas (the primary product category), pants, and accessories. The fix is a strategy-pattern anchor system driven by a new `garment_type` database column, where each garment type carries its own landmark selection, scale references, padding multipliers, and fallback rules for occluded landmarks. No new major frameworks are needed — all improvements are algorithmic and use the existing installed stack.

The recommended approach decomposes the monolithic 535-line `ARExperience.tsx` into layered subsystems: CameraManager, PoseProcessor, LandmarkSmoother, BodySkeleton, AnchorResolver (strategy dispatch per garment type), GarmentTransformer, and SceneManager. This decomposition is a prerequisite to garment-type work — the current single-function architecture cannot accommodate per-type branching without collapsing into unmaintainable if/else chains. The critical data path is: MediaPipe world landmarks (metric-space, camera-distance-independent) feed per-type anchor configs, which produce position/scale/rotation transforms applied to Three.js models via One Euro Filter smoothing.

The primary risks are three code-verified bugs in the current coordinate pipeline: a double-mirror issue (CSS `scaleX(-1)` and code-level `mirrorX()` both present, cancelling correctly for shirts but breaking for any limb-anchored garment), a renderer/video aspect-ratio mismatch causing systematic 5-15% position offsets on most phones, and the full-body landmark visibility problem for abayas (users rarely capture ankle landmarks on a selfie camera). All three must be resolved before garment-type-specific anchoring can produce reliable results. These are fixable, line-number-cited issues — not speculative risks.

---

## Key Findings

### Recommended Stack

The existing stack requires no new major dependencies. Three algorithmic additions are needed: (1) switch MediaPipe from `VIDEO` mode to `LIVE_STREAM` mode for callback-based detection, (2) use `result.worldLandmarks` (metric-space, already available from PoseLandmarker) alongside `result.landmarks` for all scaling calculations, and (3) replace the frame-rate-dependent LERP smoothing with a One Euro Filter (~30 lines of TypeScript, no new dependency). The legacy `@mediapipe/pose` package should be removed — it is the deprecated Solutions API and creates conceptual confusion alongside `@mediapipe/tasks-vision`. DRACOLoader should be added to the Three.js scene setup to prevent silent load failures on Draco-compressed GLBs from common retailer tools like Meshy.ai.

**Core technologies:**
- `@mediapipe/tasks-vision 0.10.34`: Pose detection via PoseLandmarker — keep current version, switch to LIVE_STREAM mode, add world landmarks usage
- `three 0.160.1`: 3D rendering — keep current, add DRACOLoader and HemisphereLight, configure render-on-dirty optimization
- One Euro Filter (inline ~30-line implementation): Adaptive landmark smoothing — replaces frame-rate-dependent LERP with speed-adaptive low-pass filter
- `garment_type` column (Supabase migration): Routes each product to the correct anchor strategy at runtime; default 'shirt' for backward compatibility
- `@mediapipe/pose` legacy package: Remove — deprecated Solutions API, superseded by tasks-vision, creates naming confusion

### Expected Features

**Must have (table stakes) — all currently missing or broken:**
- Garment-type-aware anchor mapping — every serious AR try-on product does this; without it, abayas look like compressed shirts
- Body-proportional non-uniform scaling per garment type — prevents garments from floating or clipping regardless of user distance from camera
- Stable pose tracking with One Euro Filter — jitter is the #1 abandonment reason for AR try-on; current LERP is frame-rate-dependent
- World landmarks for distance-independent sizing — eliminates garment scaling errors when user steps toward or away from the camera
- Occluded landmark fallback estimation — abayas require ankle landmarks that are almost never fully visible on selfie cameras
- Tracking state machine with garment-aware user guidance — partially built; needs per-garment-type instruction strings (e.g., "show full body" for abayas)
- Screenshot capture with Three.js composite — current capture implementation misses the 3D overlay entirely
- Share functionality via Web Share API / Capacitor native share — prerequisite for any social viral loop

**Should have (differentiators for the Middle Eastern fashion market):**
- Garment type metadata in database (D-8) — low complexity, prerequisite for everything else; add dropdown to retailer upload UI
- Abaya-specific drape approximation with sway factor (D-1) — THE differentiator; abayas are the primary product and most challenging garment type
- Multi-landmark articulation using elbows, knees, wrists (D-2) — makes garments follow the body versus float near it
- Depth-aware 3D placement using shoulder/hip z-difference (D-3) — upgrades from flat overlay to spatial feel
- Adaptive lighting from camera feed luminance (D-4) — makes the 3D model feel present in the real environment
- Product selector fast-switching via scene persistence (D-9) — currently causes 3-5 second blackout and camera flicker per product switch

**Defer to v2+:**
- Gesture controls: pinch-to-zoom and two-finger drag (D-5) — useful escape hatch, not blocking
- Model caching with IndexedDB/LRU eviction (D-6) — important when model library grows large, not yet urgent
- Retailer model upload validation with 3D preview (D-7) — important for data quality at scale, not blocking MVP

**Explicitly avoid (anti-features):**
- Real-time cloth physics — mobile GPU cannot sustain MediaPipe + Three.js + cloth sim simultaneously
- Multi-garment simultaneous try-on — doubles all anchor complexity before single garment is reliable
- AI-based size recommendation — the existing ARSmartFit uses fake random data; remove or clearly label as "visual preview only"
- Bone-driven garment deformation — requires consistent armature naming across all retailer GLBs, which is unrealistic given diverse modeling tools

### Architecture Approach

The recommended architecture decomposes `ARExperience.tsx` into eight focused modules with a clean unidirectional data pipeline. Camera stream is managed by CameraManager. Raw landmark detection is handled by PoseProcessor (a MediaPipe wrapper). LandmarkSmoother applies One Euro Filter temporal filtering per landmark per axis. BodySkeleton computes metric-space proportions (shoulder width, torso height, shoulder-to-ankle, hip-to-ankle) from smoothed world landmarks. AnchorResolver dispatches to the correct strategy class (ShirtAnchor, AbayaDressAnchor, PantsAnchor, AccessoryAnchor) based on `garment_type`. GarmentTransformer applies the resulting position/scale/rotation to the Three.js model. SceneManager owns renderer, camera, and lighting lifecycle. The key architectural decision that enables fast product switching is separating the camera/pose initialization from model loading, so that product changes only swap the GLB without restarting MediaPipe or the camera stream.

**Major components:**
1. **AnchorResolver + strategy classes** — core deliverable; dispatches to per-type strategies driven by `GarmentConfig` data objects specifying required landmarks, fallback chains, padding multipliers, and model origin conventions
2. **LandmarkSmoother + BodySkeleton** — transforms raw MediaPipe output into smoothed metric-space body proportions; feeds all anchor strategies with consistent, camera-distance-independent measurements
3. **Coordinate pipeline utility (`toLandmarkWorldCoords`)** — single function encapsulating all mirroring and normalization, eliminating the double-mirror bug at its root
4. **SceneManager (decoupled from pipeline)** — Three.js renderer/camera/lighting lifecycle separated from product selection, enabling scene persistence across product switches

### Critical Pitfalls

1. **Double-mirror coordinate bug (Pitfall 1, HIGH confidence, code-verified)** — CSS `scaleX(-1)` on the canvas AND `1 - x` coordinate flip in code are both active. They cancel for the 4-landmark shirt case but will produce inverted sleeves and crossed anchor points for any garment using arm or leg landmarks. Fix: create a single `toLandmarkWorldCoords()` utility; remove CSS flip from the Three.js canvas; handle all mirroring in code.

2. **Renderer/video aspect-ratio mismatch (Pitfall 2, HIGH confidence, code-verified)** — renderer uses `window.innerWidth x window.innerHeight` while the camera FOV is set from the video's aspect ratio; `object-fit: cover` crops the video without corresponding landmark coordinate adjustment. Causes systematic 5-15% position offsets that vary by device. Fix: compute the cover-crop offset and apply it to normalized landmarks before world-space mapping; test on 16:9, 19.5:9, and 4:3 aspect ratios.

3. **One-size-fits-all anchoring breaks all non-shirt garments (Pitfall 3, HIGH confidence, code-verified)** — `updateModel()` has an explicit comment `// Shirt anchor points` and no branching for other types. Fix: implement the strategy pattern with a `GarmentConfig` registry before adding any garment type.

4. **Frame-rate-dependent smoothing causes swimming lag (Pitfall 7, HIGH confidence, code-verified)** — LERP factor 0.3 applied per render frame (60fps) against pose updates at 15fps; the model continues interpolating toward a stale target between pose updates. Fix: time-based delta smoothing or One Euro Filter, triggered only on pose update events.

5. **Mobile WebGL performance collapse (Pitfall 6, HIGH confidence)** — MediaPipe runs on the main thread blocking rendering; Three.js renders every frame even when nothing changed; DPR capped at 2 = 4x fill rate on modern 3x-DPR phones. Phase 1 quick wins: reduce pixel ratio to 1.0-1.5 on mobile, implement render-on-dirty flag. Phase 3 deep work: MediaPipe Web Worker offload, dynamic pose throttling.

6. **`@latest` WASM URL will break without warning (Pitfall 9, HIGH confidence, code-verified)** — line 10 of the init code fetches MediaPipe WASM from `@latest` CDN path. A CDN update can silently break the app. Fix: pin to the version string matching `package.json`.

---

## Implications for Roadmap

Based on combined research, three phases are recommended. The ordering is governed by hard dependency chains: coordinate bugs must be fixed before anchor strategies can produce trustworthy output; anchor strategies must exist before abaya-specific refinements are meaningful; performance optimization is most effective once the feature set is stable and profiling is grounded in real behavior.

### Phase 1: Coordinate Foundation and Architecture Decomposition

**Rationale:** Three code-verified bugs in the coordinate pipeline corrupt every position and scale calculation in the current system. These must be resolved first, or all subsequent garment-type work produces unique offset bugs per garment type. The monolithic component must also be decomposed in this phase — not because it is cosmetically bad, but because adding garment-type branching to the current structure will create unmanageable spaghetti. The `garment_type` database column belongs here too since it is a low-risk schema change (column with default value) that is prerequisite for all Phase 2 UI and strategy work.

**Delivers:** A working coordinate pipeline with verified mirroring, correct aspect-ratio handling, and stable One Euro Filter smoothing. The component architecture is split so camera/pose initialization is independent of model loading. Existing products continue working (backward compatible via `DEFAULT 'shirt'`). WASM URL pinned. Render-on-dirty and mobile pixel ratio configured as quick performance wins.

**Addresses:** TS-7 (world landmarks for scaling), TS-3 (One Euro Filter anti-jitter), D-8 (garment_type schema + retailer UI dropdown), TS-4 partial (browser capability detection + graceful degradation), Pitfalls 1, 2, 5, 7, 8, 9, 14, 18

**Avoids:** Building garment-type strategies on a broken coordinate system; compounding the full-reinit-on-product-switch problem with every new garment type added in Phase 2

### Phase 2: Garment-Type Anchor System and Abaya Excellence

**Rationale:** With a clean coordinate foundation, implement the full strategy-pattern AnchorResolver with configs for shirt, abaya/dress, pants, jacket, and accessories. The abaya config is the highest-value deliverable for the target market and is also the hardest — it requires a fallback estimation chain for occluded ankle landmarks (hips from shoulders, ankles from hips using proportion ratios). Screenshot and share complete the user value loop. Scene persistence for product switching (enabled by the Phase 1 architecture separation) eliminates the 3-5 second blackout.

**Delivers:** Correct garment placement for all supported garment types. Abayas render shoulder-to-ankle with fallback estimation when ankles are not visible. Users can capture composite screenshots and share them. Product switching is near-instant with no camera restart.

**Uses:** World landmarks (metric-space) for all scale calculations; strategy pattern scaffold from Phase 1; GarmentConfig presets for abaya (shoulder-to-ankle, widthPadding 1.2, swayFactor 0.15), pants (hip-to-ankle), jacket (shoulder-to-hip with arm articulation), accessories (head, wrist, neck)

**Implements:** AnchorResolver, AbayaDressAnchor, PantsAnchor, AccessoryAnchor, per-landmark LandmarkSmoother, BodySkeleton proportions, GarmentTransformer, occluded landmark fallback estimation chain, screenshot/share (TS-5/TS-6), scene persistence for product switching (D-9), garment-aware tracking guidance (TS-4)

**Avoids:** Pitfalls 3, 10, 12, 16

### Phase 3: Polish, Performance, and Retailer Quality

**Rationale:** With correct garment placement established, this phase adds perceptual quality and operational reliability. Depth-aware placement, adaptive lighting, and multi-landmark articulation improve the realism of already-correct garment positioning. Model caching, upload validation, and gesture controls address production-quality concerns. The fake ARSmartFit component and the redundant ARGarmentOverlay/ARTryOn pages should be deprecated here once the core AR experience is reliable.

**Delivers:** Visually polished AR with realistic depth and lighting. Fast model loading via IndexedDB caching and background preloading. Retailer self-service via upload validation with 3D preview. Gesture overrides as escape hatch when auto-tracking is imperfect. Cleanup of fake "Smart Fit" feature and legacy duplicate AR pages.

**Addresses:** D-1 (abaya drape refinement with sway and taper), D-2 (multi-landmark articulation), D-3 (depth-aware placement), D-4 (adaptive lighting), D-5 (gesture controls), D-6 (model caching), D-7 (upload validation), Pitfalls 4, 6 (deep), 11, 13, 15

### Phase Ordering Rationale

- Phase 1 before Phase 2: The double-mirror and aspect-ratio bugs will produce a different offset for every garment type if left in place. Fixing them on a shirt-only system is tractable; fixing them after 6 anchor strategies are built means regression-testing every strategy.
- Phase 2 before Phase 3: Depth effects, adaptive lighting, and multi-landmark articulation add perceptual value only when garments are positioned correctly. Adding 3D polish to incorrectly placed garments adds complexity without benefit and masks positioning bugs.
- Architecture decomposition in Phase 1, not Phase 2: The scene persistence refactor (separating camera/pose from model loading) must happen before Phase 2 adds garment-type strategies, because those strategies depend on a stable running scene to test against.
- Performance deep work in Phase 3, not Phase 1: Basic wins (pixel ratio, render-on-dirty) are cheap and belong in Phase 1. Deep work (MediaPipe Web Worker, dynamic throttling, model caching) changes the profiling baseline and is only meaningful once the algorithm is settled.

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 2 (abaya drape parameters):** The sway factor (0.15), taper ratio (0.85), and fallback proportion ratios (fallbackHeightRatio: 3.5 for shoulder-to-ankle) are educated starting points requiring empirical tuning with real abaya GLB files and actual users. Plan a tuning sprint after initial implementation.
- **Phase 3 (camera FOV calibration):** The hardcoded 63-degree FOV may be causing persistent cross-device sizing errors. Switching to an orthographic projection or self-calibrating FOV approach is a medium-complexity architectural change — needs investigation before committing to the approach.
- **Phase 3 (MediaPipe Web Worker offload):** MediaPipe Tasks Vision supports OffscreenCanvas in some configurations but iOS Safari / Capacitor WebView compatibility for this path is unverified. Needs a targeted spike before planning this as a deliverable.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (One Euro Filter):** Well-documented 2012 algorithm with trivial TypeScript implementation. No surprises.
- **Phase 1 (world landmarks):** Single variable swap (`result.worldLandmarks[0]`), the MediaPipe API already exposes this in the current codebase version.
- **Phase 1 (coordinate pipeline utilities):** Standard transform encapsulation. Canonical approach is unambiguous.
- **Phase 2 (screenshot composite):** Documented Canvas 2D + WebGL composite pattern used by every major AR try-on product. Well-understood implementation.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new frameworks. All recommendations use existing installed packages or inline implementations verified against the current codebase. Version-specific behavior confirmed by working code. |
| Features | MEDIUM-HIGH | Table stakes derived from direct codebase analysis (HIGH confidence). Competitive market comparisons (WANNA, Zeekit, Google AR) based on training data — could not verify live feature sets. Anti-features are well-justified by hard performance constraints. |
| Architecture | MEDIUM | Component decomposition and strategy pattern are standard React + Three.js patterns applied to a clear problem. Specific MediaPipe behaviors (LIVE_STREAM mode performance improvement, Web Worker support in Capacitor) need validation. |
| Pitfalls | HIGH | 14 of 18 pitfalls are code-verified with specific line numbers in PITFALLS.md. 4 are domain knowledge marked MEDIUM in source. The three critical pitfalls (1, 2, 3) are unambiguous bugs in the current implementation. |

**Overall confidence: MEDIUM-HIGH**

### Gaps to Address

- **Garment anchor padding values need empirical tuning:** The widthPadding, heightPadding, and fallbackHeightRatio values in garment presets are derived from body proportion knowledge, not user testing. Expect iteration in Phase 2. Plan a tuning sprint with real retailer GLB files.
- **Camera FOV calibration impact is unknown:** The 63-degree hardcoded FOV may or may not be causing visible sizing errors in practice. Needs device testing across iPhone front camera (~80 degrees) and common Android front cameras (70-90 degrees) before deciding whether Phase 3 FOV calibration work is worth the complexity.
- **Meshy.ai / Tripo3D Draco compression prevalence:** DRACOLoader is recommended as a preventive measure but it is not confirmed how many retailer-uploaded GLBs are actually Draco-compressed. Low-risk to add either way; flagging for validation.
- **ARSmartFit removal scope:** The fake "Smart Fit" component with random fit scores should be removed or clearly labelled "visual preview only," but the decision depends on whether any current retailer contracts or sales demos reference it. Requires product/stakeholder input before removal.
- **Model origin conventions alignment with retailer tools:** The "correct" origin point per garment type (neckline for shirts, waistband for pants, shoulder line for abayas) needs to be documented and communicated to retailers using Meshy.ai, Tripo3D, or Blender. Without this, per-product `ar_position_offset` tuning will remain necessary.

---

## Sources

### Primary (HIGH confidence)
- Azyah codebase — `ARExperience.tsx` (535 lines), `ARGarmentOverlay.tsx`, `ARSmartFit.tsx`, `ARTryOn.tsx`, `supabase/types.ts` — direct source for all pitfall line-number citations and current state analysis
- `PROJECT.md` — project requirements, constraints, out-of-scope items, target market definition (Middle Eastern fashion, abayas as primary garment)
- MediaPipe PoseLandmarker API (verified via codebase usage) — 33-landmark model, worldLandmarks output, landmark indices 11/12/23/24 confirmed working in production code

### Secondary (MEDIUM confidence)
- One Euro Filter (Casiez et al., 2012) — well-documented signal smoothing algorithm; standard approach in AR/VR landmark smoothing literature
- MediaPipe Tasks Vision documentation (training data, 2023-2024) — LIVE_STREAM mode, world landmarks behavior, deprecation of legacy `@mediapipe/pose` Solutions API
- Three.js documentation (training data) — DRACOLoader, SkeletonUtils, HemisphereLight, render loop patterns, SkinnedMesh handling

### Tertiary (LOW confidence)
- WANNA.fashion, Zeekit/Walmart, Google AR Shopping — cited as market comparisons in PROJECT.md; garment-type-aware anchoring claims based on training data, not verified live
- Garment anchor padding and proportion values (widthPadding: 1.2 for abayas, fallbackHeightRatio: 3.5) — derived from standard body proportion literature; require empirical validation with actual retailer garment models

---
*Research completed: 2026-03-29*
*Ready for roadmap: yes*

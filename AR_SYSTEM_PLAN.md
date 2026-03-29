# Azyah AR System — Full Plan & Gap Analysis

## Current State

The AR try-on system gets **stuck on "Starting AR... Preparing camera and tracking"** and never progresses. The camera feed never appears. This is the #1 blocker.

### What We Have (Built)
| Component | Status | Location |
|-----------|--------|----------|
| MediaPipe PoseLandmarker (33 landmarks) | Built | `src/ar/core/PoseProcessor.ts` |
| Three.js 3D scene with GLTFLoader | Built | `src/ar/core/SceneManager.ts`, `ModelLoader.ts` |
| DRACOLoader for compressed GLBs | Built | `src/ar/core/ModelLoader.ts` (singleton, WASM) |
| 4 garment anchor strategies | Built | `src/ar/anchoring/strategies/` (Shirt, Abaya, Pants, Accessory) |
| One Euro Filter + Outlier rejection | Built | `src/ar/utils/OneEuroFilter.ts`, `OutlierFilter.ts` |
| Adaptive lighting from camera | Built | `src/ar/core/SceneManager.ts` (updateLightingFromVideo) |
| Screenshot + Share | Built | `src/ar/capture/` (compositor + shareHandler) |
| Garment type in DB + retailer UI | Built | `event_brand_products.garment_type` + BrandProductManager dropdown |
| Pinch-to-zoom | Built | `src/pages/ARExperience.tsx` Effect 4 |
| Model caching | Built | `src/ar/core/ModelLoader.ts` (URL-keyed cache) |
| Parallel init (camera + pose) | Built | `src/pages/ARExperience.tsx` Promise.all |
| Model prefetch | Built | `src/pages/ARExperience.tsx` prefetchModel |

### What's Broken (Root Causes of "Stuck Loading")
1. **initPipeline() has NO try-catch** — if SceneManager constructor or any step throws, the exception is silently swallowed. State stays on 'initializing' forever.
2. **WebGL can fail silently** — `new THREE.WebGLRenderer()` can throw on devices without WebGL, or if canvas isn't ready. No error handling exists.
3. **sceneReadyPromise can hang** — if Effect 1 fails before resolving, Effect 2 waits forever with no timeout (the 20s timeout rejects but the error isn't caught in the .catch of loadWhenReady).
4. **No global error boundary** — any unhandled rejection in the async pipeline freezes the UI.

---

## Competitor Analysis

### ZERO10 (AR Mirror)
- **Hardware**: Dedicated supercomputer with GPU acceleration, renders in 4K
- **Body tracking**: Custom 3D body mesh reconstruction (not just 33 landmarks)
- **Cloth simulation**: Real-time physics-based fabric draping
- **Segmentation**: Multi-class segmentation (body, clothes, background)
- **Occlusion**: Body-aware (arms render in front of garment)
- **Rendering**: Physically Based Rendering (PBR) with custom shaders, fur simulation
- **Garment pipeline**: Team manually converts 3D items to AR-ready garments
- **Partners**: Coach, Tommy Hilfiger, Calvin Klein, Nike, JD Sports
- **SDK**: iOS-only native framework (no web)

### WANNA Fashion
- **Platform**: Mobile + Web (proprietary 2MB rendering engine)
- **Body tracking**: Neural network on compressed frames (2K/4K → 192px for inference)
- **Rendering**: Custom engine (not Unity/Three.js) — 2MB vs Unity's 20MB
- **Categories**: Shoes, bags, clothing, scarves, watches, jewelry — each with dedicated ML datasets
- **Dataset**: 6+ months per category to build representative training data
- **Integration**: 60-minute setup on any website, no app required
- **Performance**: Markerless tracking, real-time adjustment to user movement
- **Parent company**: Perfect Corp (AI/AR beauty and fashion leader since 2025)

### Key Insight
Both companies use **category-specific ML models** and **custom rendering engines**. They DON'T use generic pose estimation + static GLB overlay. Their garments are processed through specialized pipelines that understand fabric physics.

---

## Gap Analysis: What We Need

### TIER 1: Critical (Must Fix — AR Currently Broken)

| Gap | Impact | Difficulty |
|-----|--------|------------|
| initPipeline has no error handling | Camera stuck on loading | Easy — wrap in try-catch |
| WebGL failure not caught | Silent black screen | Easy — check WebGL support first |
| sceneReadyPromise hangs forever | Effect 2 never starts | Easy — add .catch handler |
| No fallback when camera denied on desktop | Dead end | Easy — show clear message |
| loadStage not updating in UI | User sees stale text | Easy — ensure state updates fire |

### TIER 2: Important (Makes AR Actually Usable)

| Gap | Impact | Difficulty |
|-----|--------|------------|
| GLB models are static rigid meshes | Garments look like cardboard cutouts | Hard — needs deformation |
| No body segmentation/occlusion | Arms always behind garment | Hard — needs ML model |
| No fabric-aware rendering | All materials look the same | Medium — PBR materials |
| No garment deformation on body movement | Garment doesn't bend with body | Hard — needs bone system |
| Pose detection at 15fps | Visible lag in tracking | Medium — raise to 30fps |

### TIER 3: Polish (Closes Gap to WANNA/ZERO10)

| Gap | Impact | Difficulty |
|-----|--------|------------|
| No cloth physics simulation | No draping/folding | Very Hard — needs physics engine |
| No dense body mesh | Garments float on landmarks | Very Hard — needs body reconstruction |
| No environment lighting matching | Garments glow in dark rooms | Medium — already have basic version |
| No shadow/ground plane | Garments have no shadow | Medium — add shadow plane |
| No multi-garment layering | Can only try one item | Medium — needs render order |

---

## Implementation Plan

### Phase A: Fix The Broken Loading (Priority: NOW)

**Goal**: Camera + AR actually works. No more stuck loading.

**File: `src/pages/ARExperience.tsx`**
1. Wrap entire `initPipeline()` in try-catch with error state
2. Add WebGL availability check before creating SceneManager
3. Add .catch to sceneReadyPromise in Effect 2's loadWhenReady
4. Add explicit error states for each failure mode
5. Add console.error logging at every failure point for debugging

**File: `src/ar/core/SceneManager.ts`**
6. Add WebGL context loss handler (listen for 'webglcontextlost' event)
7. Wrap constructor in validation (check canvas, check WebGL2 support)

**File: `src/ar/core/PoseProcessor.ts`**
8. Verify WASM_URL has correct format (test with fetch before loading)
9. Add retry logic (try once, if fails, retry with 5s delay)

### Phase B: Make Garments Look Wearable (Priority: HIGH)

**Goal**: GLB garments actually look like clothing on a person, not floating rigid objects.

**B1. PBR Material Enhancement**
- When loading GLB in ModelLoader, traverse meshes and enhance materials:
  - Enable `DoubleSide` rendering (already done)
  - Set appropriate `roughness` (0.6-0.8 for fabric)
  - Set `metalness` (0.0-0.05 for textiles)
  - Add environment map for subtle reflections
  - Enable `transmission` for thin/sheer fabrics

**B2. Garment Bone Deformation (Rigged GLBs)**
- Support GLB models with skeletons (bones)
- Map MediaPipe landmarks to bone transforms:
  - Shoulder bones → landmarks 11, 12
  - Elbow bones → landmarks 13, 14
  - Hip bones → landmarks 23, 24
  - Spine bone → derived from shoulder/hip midpoints
- This makes garments BEND with the body instead of staying rigid
- Requires: retailers upload rigged GLBs (Blender can auto-rig)

**B3. Per-Category Garment Behavior**

| Category | Anchor Points | Special Behavior |
|----------|--------------|-----------------|
| **Shirt/Top** | Shoulders → Hips | Slight deformation at elbows if rigged |
| **Abaya/Dress** | Shoulders → Ankles | Wider drape, gravity-like sway at bottom edge |
| **Pants** | Hips → Ankles | Leg separation using knee landmarks |
| **Jacket** | Shoulders → Hips (wider) | Collar follows neck angle, sleeves follow arms |
| **Headwear** | Head top (nose + ears) | Rotation follows head tilt |
| **Necklace** | Shoulder neckline | Hangs from midpoint, sways slightly |
| **Scarf/Hijab** | Shoulders + head | Drapes from head, falls over shoulders |
| **Watch** | Wrist (landmark 15/16) | Tiny scale, follows wrist rotation |

**B4. Garment Shadow and Depth**
- Add a transparent shadow-receiving plane at floor level
- Use `THREE.ContactShadow` or baked shadow below garment
- Gives visual grounding — garment looks "on" the person not floating

### Phase C: Body Segmentation for Occlusion (Priority: MEDIUM)

**Goal**: When user's arm moves in front of the garment, the arm shows, not the garment.

**Approach**: Use MediaPipe's Selfie Segmentation (already in the tasks-vision package):
1. Run segmentation on each frame alongside pose detection
2. Generate a body mask (which pixels are human body)
3. Use this mask as a Three.js stencil/depth texture
4. Render garment BEHIND body pixels where appropriate

**This is the single biggest realism improvement** — it's what makes ZERO10 and WANNA garments look "on" the person rather than "pasted over" them.

### Phase D: Performance Optimization (Priority: MEDIUM)

**Goal**: 30fps tracking on mobile, instant model switching.

1. Raise pose detection from 15fps to 30fps (change throttle from 66ms to 33ms)
2. Use `OffscreenCanvas` for Three.js rendering (frees main thread)
3. Pre-download MediaPipe WASM on app load (not just when AR page opens)
4. Compress all GLB models with Draco before upload (already supported)
5. Add Level of Detail (LOD) — show simplified mesh when far, detailed when close
6. Add loading skeleton animation (show body outline while loading)

### Phase E: Advanced Realism (Priority: LOW — Aspirational)

These close the final gap to ZERO10/WANNA but require significant R&D:

1. **Simple cloth simulation** — spring-mass system on garment vertices for sway/drape
2. **Dense body mesh reconstruction** — from MediaPipe landmarks, estimate full body surface
3. **Environment map from camera** — capture room lighting and apply to garment reflections
4. **Texture-aware rendering** — detect fabric type from GLB material and adjust rendering (silk = glossy, cotton = matte, denim = rough)

---

## Category-Specific GLB Requirements for Retailers

For AR to work well, retailers need to provide **properly prepared** GLB files:

| Category | Model Origin | Orientation | Scale | Rigging | Notes |
|----------|-------------|-------------|-------|---------|-------|
| Shirt/Top | Center of chest | Y-up, facing -Z | ~1m tall | Optional (better with) | Arms can be T-pose or relaxed |
| Abaya/Dress | Center of chest | Y-up, facing -Z | ~1.5m tall | Recommended | Must extend to ankle-length |
| Pants | Center of waist | Y-up, facing -Z | ~1m tall | Optional | Both legs modeled separately |
| Jacket | Center of chest | Y-up, facing -Z | ~1m tall | Recommended | Open front preferred |
| Headwear | Center of head | Y-up, facing -Z | ~0.3m | No | Should fit average head |
| Necklace | Center of neckline | Y-up, facing -Z | ~0.3m | No | Chain + pendant as one mesh |
| Watch | Center of wrist | Y-up, facing -Z | ~0.05m | No | Flat bottom for wrist contact |

**Optimization guidelines for retailers:**
- Compress with Draco at [gltf.report](https://gltf.report)
- Target under 5MB compressed (10MB max)
- Use PBR materials (metallic-roughness workflow)
- Texture resolution: 1024x1024 max (512x512 for mobile)
- Polygon count: under 50K triangles
- Test at [modelviewer.dev](https://modelviewer.dev) before uploading

---

## Priority Roadmap

```
Week 1:  Phase A — Fix broken loading (AR actually starts)
Week 2:  Phase B1-B3 — PBR materials + category behaviors
Week 3:  Phase B4 + D — Shadows + performance tuning
Week 4:  Phase C — Body segmentation/occlusion
Week 5+: Phase E — Advanced realism (ongoing R&D)
```

---

## What's Realistic vs What's Not

### CAN achieve in browser (with current stack):
- Garment-type-specific anchoring and scaling ✅ DONE
- Smooth adaptive tracking ✅ DONE
- Adaptive lighting ✅ DONE
- Screenshot/share ✅ DONE
- PBR materials for fabric realism ⬜ TODO
- Bone-based garment deformation ⬜ TODO
- Body segmentation/occlusion ⬜ TODO
- Shadow/ground plane ⬜ TODO
- 30fps pose tracking ⬜ TODO

### CANNOT achieve in browser (ZERO10/WANNA advantages):
- Real-time cloth physics simulation (needs dedicated GPU)
- Dense body mesh reconstruction (needs custom ML model)
- 4K rendering with complex shaders (mobile GPU limitation)
- Custom rendering engine (would need to replace Three.js entirely)
- Category-specific ML training datasets (needs 6+ months per category)

---

## Sources

- [ZERO10 AR Technology](https://fashinnovation.nyc/zero10-and-their-try-on-technology/)
- [ZERO10 Retail Partnerships](https://www.retail-insight-network.com/interviews/ar-shaping-future-fashion-try-on/)
- [WANNA Fashion VTO](https://wanna.fashion/)
- [WANNA Technical Architecture](https://wanna.fashion/blog/rocket-science-vto)
- [Three.js Virtual Try-On Implementation](https://dev.to/mpoiiii/building-high-performance-virtual-try-on-systems-with-webgl-and-threejs-technical-implementation-b19)
- [MediaPipe Pose Landmarker Web Guide](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js)

# Roadmap: Azyah AR System Improvement

## Overview

This milestone transforms the AR try-on system from a broken single-strategy "shirt" overlay into a garment-type-aware anchoring system that makes 3D garments look like the shopper is actually wearing them. The work follows a strict dependency chain: fix the coordinate pipeline bugs that corrupt all positioning, decompose the monolith so garment-type branching is possible, build the anchor strategy system with abaya as the highest-value target, add user-facing capture and guidance features, then polish with performance optimization, visual quality, and retailer tooling. Every phase delivers a verifiable improvement to the AR experience.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Coordinate Pipeline and Stability** - Fix the three verified coordinate bugs and stabilize the foundation so all subsequent positioning work produces correct results
- [ ] **Phase 2: Architecture Decomposition and Schema** - Break up the ARExperience monolith into bounded components and add garment_type to the database
- [ ] **Phase 3: Garment Anchor System** - Implement garment-type-aware anchor strategies for shirt, abaya, pants, and accessories with full-body landmark utilization
- [ ] **Phase 4: User Experience and Capture** - Add garment-aware tracking guidance, screenshot/share functionality, and scene persistence for fast product switching
- [ ] **Phase 5: Performance, Visual Quality, and Retailer Tools** - Optimize mobile performance, improve visual realism, add model validation, and gesture controls

## Phase Details

### Phase 1: Coordinate Pipeline and Stability
**Goal**: The coordinate pipeline produces correct, stable landmark-to-screen mappings on all devices
**Depends on**: Nothing (first phase)
**Requirements**: COORD-01, COORD-02, COORD-03, COORD-04, COORD-05, ARCH-02
**Success Criteria** (what must be TRUE):
  1. A 3D model placed at landmark positions appears at the correct body location in the camera feed -- no left/right inversion, no systematic offset
  2. Model positioning remains consistent across devices with different aspect ratios (16:9, 19.5:9, 4:3) -- no 5-15% drift
  3. The 3D model tracks the user's body smoothly without visible jitter or frame-rate-dependent swimming lag
  4. The AR system does not silently break when MediaPipe publishes a new WASM version
  5. Resizing the browser window or rotating the device does not break model placement
**Plans**: 2 plans

Plans:
- [ ] 01-01-PLAN.md -- Create coordinate utility functions (OneEuroFilter, landmarkToWorld, computeCoverCrop) and pin WASM version
- [ ] 01-02-PLAN.md -- Integrate all coordinate fixes into ARExperience.tsx and replace LERP smoothing with One Euro Filter

### Phase 2: Architecture Decomposition and Schema
**Goal**: The AR codebase is decomposed into bounded modules and the database supports garment-type metadata
**Depends on**: Phase 1
**Requirements**: ARCH-01, ARCH-03, ARCH-04, RETL-01, RETL-02, RETL-04, PERF-01, PERF-02, PERF-03
**Success Criteria** (what must be TRUE):
  1. Switching products in the AR view does not restart the camera or re-initialize MediaPipe -- the scene persists and only the 3D model swaps
  2. The retailer can select a garment type (shirt, abaya, pants, jacket, headwear, accessory) when uploading a product in BrandProductManager
  3. All existing AR products continue working without manual migration -- they default to garment type "shirt"
  4. The AR experience renders at a stable frame rate on mid-range phones without thermal throttle (DPR capped, render-on-dirty, no redundant material traversal)
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD
- [ ] 02-03: TBD

### Phase 3: Garment Anchor System
**Goal**: Each garment type is positioned on the user's body using its own anchor strategy with full-body landmark utilization
**Depends on**: Phase 2
**Requirements**: ANCH-01, ANCH-02, ANCH-03, ANCH-04, ANCH-05, ANCH-06, ANCH-07, ANCH-08, ANCH-09, ANCH-10, VIS-05
**Success Criteria** (what must be TRUE):
  1. A shirt model anchors from shoulders to hips and scales to match the user's shoulder width -- it does not extend below the waist
  2. An abaya model anchors from shoulders to ankles with a wider drape width, and still renders correctly when ankle landmarks are occluded (fallback estimation from hip-to-knee extrapolation)
  3. Pants anchor from hips to ankles with hip-width scaling -- they do not float above the waist or extend above the hips
  4. Accessories (headwear, necklace) anchor to the correct body region (head landmarks for headwear, shoulder neckline for necklace)
  5. Garment positioning uses metric-space world landmarks so the model scales correctly regardless of camera distance
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD
- [ ] 03-03: TBD

### Phase 4: User Experience and Capture
**Goal**: Users receive garment-appropriate tracking guidance and can capture and share their AR try-on
**Depends on**: Phase 3
**Requirements**: UX-01, UX-02, UX-03, VIS-03, VIS-04
**Success Criteria** (what must be TRUE):
  1. When trying on an abaya, the guidance says "Show full body" -- when trying on a shirt, it says "Show upper body" -- when trying on pants, it says "Show your legs"
  2. When some but not all required landmarks are visible, the user sees which body parts they need to show (partial_tracking state)
  3. The user can take a screenshot that composites the camera feed and the 3D model overlay into a single image
  4. The user can share the captured AR image via the device's native share sheet
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: Performance, Visual Quality, and Retailer Tools
**Goal**: The AR experience is visually polished, performant on mobile, and retailers can validate their 3D models on upload
**Depends on**: Phase 3 (Phase 4 not strictly required)
**Requirements**: PERF-04, VIS-01, VIS-02, RETL-03
**Success Criteria** (what must be TRUE):
  1. Previously loaded GLB models are cached -- switching back to a product the user already viewed loads near-instantly from cache
  2. The user can pinch-to-zoom to manually adjust garment scale as an escape hatch when auto-tracking is imperfect
  3. The 3D model lighting adapts to the camera feed brightness -- a model in a dark room does not glow unnaturally bright
  4. When a retailer uploads a .glb file, the system validates its structure, bounding box, normals, and scale -- and reports issues before publishing
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Coordinate Pipeline and Stability | 0/2 | Planning complete | - |
| 2. Architecture Decomposition and Schema | 0/3 | Not started | - |
| 3. Garment Anchor System | 0/3 | Not started | - |
| 4. User Experience and Capture | 0/2 | Not started | - |
| 5. Performance, Visual Quality, and Retailer Tools | 0/2 | Not started | - |

# Requirements: Azyah AR System Improvement

**Defined:** 2026-03-29
**Core Value:** When a shopper points their camera at themselves, the 3D garment must look like they're actually wearing it — properly anchored, proportional, and moving naturally.

## v1 Requirements

### Coordinate Foundation

- [x] **COORD-01**: Fix double-mirror bug — resolve CSS scaleX(-1) and programmatic mirrorX() conflict so left/right landmarks map correctly
- [x] **COORD-02**: Fix renderer/video aspect ratio mismatch — align Three.js camera dimensions with actual video feed dimensions accounting for object-fit:cover crop
- [x] **COORD-03**: Fix Z-depth formula — correct the avgZ * 2 - 1 mapping to use proper MediaPipe Z-coordinate interpretation
- [x] **COORD-04**: Pin MediaPipe WASM version — replace @latest with specific version to prevent silent breakage
- [x] **COORD-05**: Fix resize handler — recalculate visible world dimensions when window resizes, not just renderer size

### Architecture Decomposition

- [ ] **ARCH-01**: Decompose ARExperience.tsx monolith into bounded components (CameraManager, PoseProcessor, LandmarkSmoother, AnchorResolver, SceneManager)
- [x] **ARCH-02**: Implement One Euro Filter for adaptive landmark smoothing — per-landmark filtering before anchor computation
- [ ] **ARCH-03**: Implement scene persistence — reuse Three.js scene/renderer when switching products instead of full teardown/rebuild
- [ ] **ARCH-04**: Separate pose detection effect from model loading effect — prevent re-initializing camera when only the product changes

### Garment Anchor System

- [ ] **ANCH-01**: Implement garment-type-aware anchor strategy pattern — different anchor logic per garment type (shirt, abaya, pants, jacket, headwear, accessory)
- [ ] **ANCH-02**: Use MediaPipe world landmarks for metric-scale body measurement — replace normalized coordinates for sizing calculations
- [ ] **ANCH-03**: Implement per-garment anchor configuration: each type specifies primary landmarks, width reference, height reference, padding multipliers, and offset ratios
- [ ] **ANCH-04**: Shirt anchor strategy — shoulders (11,12) to hips (23,24), shoulder width * 1.15 horizontal, shoulder-to-hip vertical
- [ ] **ANCH-05**: Abaya/dress anchor strategy — shoulders (11,12) to ankles (27,28), shoulder width * 1.2 horizontal (wider drape), shoulder-to-ankle vertical
- [ ] **ANCH-06**: Pants anchor strategy — hips (23,24) to ankles (27,28), hip width * 1.1 horizontal, hip-to-ankle vertical
- [ ] **ANCH-07**: Accessory anchor strategies — headwear (nose 0, ears 7,8), necklace (shoulders 11,12 neckline offset)
- [ ] **ANCH-08**: Implement landmark fallback chain — graceful estimation when landmarks are occluded (e.g., estimate ankles from hip-to-knee extrapolation)
- [ ] **ANCH-09**: Implement visibility-weighted positioning — landmarks with low visibility scores contribute less to anchor calculations
- [ ] **ANCH-10**: Implement outlier rejection — discard landmark jumps beyond N standard deviations from recent history

### Garment-Aware UX Guidance

- [ ] **UX-01**: Adapt tracking guidance per garment type — "Show full body" for abayas vs "Show upper body" for shirts vs "Show your legs" for pants
- [ ] **UX-02**: Add partial_tracking state — when some but not all required landmarks for the garment type are visible
- [ ] **UX-03**: Display which body parts need to be visible for the selected garment type

### Retailer Tools

- [x] **RETL-01**: Add garment_type column to event_brand_products database table (enum: shirt, abaya, pants, jacket, headwear, accessory)
- [x] **RETL-02**: Add garment type dropdown selector in BrandProductManager upload UI
- [ ] **RETL-03**: Implement 3D model validation on upload — check file structure, bounding box, normals orientation, and reasonable scale
- [x] **RETL-04**: Migrate existing AR products — default garment_type to 'shirt' for backward compatibility

### Performance & Mobile

- [ ] **PERF-01**: Cap DPR at 1.0 on mobile devices to prevent thermal throttling
- [ ] **PERF-02**: Implement render-on-dirty — only render Three.js frame when pose data changes, not every animation frame
- [ ] **PERF-03**: Cache material traversal — avoid traversing model tree every frame for opacity updates
- [ ] **PERF-04**: Implement model caching — cache loaded GLB models for faster product switching

### Visual Quality

- [ ] **VIS-01**: Implement gesture support — pinch-to-zoom for manual scale adjustment
- [ ] **VIS-02**: Implement adaptive lighting — adjust Three.js scene lighting based on camera feed brightness
- [ ] **VIS-03**: Implement screenshot/capture — composite video feed + Three.js overlay into a single image
- [ ] **VIS-04**: Implement share functionality — native share API for captured AR images
- [ ] **VIS-05**: Improve depth-aware rendering — proper model sorting and depth placement relative to body

## v2 Requirements

### Advanced Rendering

- **ADV-01**: Multi-garment layering — try on multiple items simultaneously
- **ADV-02**: Real cloth physics simulation for flowing garments
- **ADV-03**: Texture/pattern customization within AR view

### Smart Fit

- **FIT-01**: Replace mock ARSmartFit with real ML body measurement
- **FIT-02**: Size recommendation based on detected body proportions

### Advanced UX

- **AUX-01**: AR model preview in retailer dashboard before publishing
- **AUX-02**: Side-by-side comparison of multiple garments
- **AUX-03**: Video recording of AR session

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time cloth physics | Too computationally expensive for mobile web |
| Custom 3D model creation | Retailers use external tools (Meshy.ai, Tripo3D) |
| WebXR/ARCore/ARKit native | Staying web-based for broadest compatibility |
| Replacing MediaPipe | Improve usage of current stack, not swap it |
| Multi-garment simultaneous | Focus single garment first; defer to v2 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| COORD-01 | Phase 1 | Complete |
| COORD-02 | Phase 1 | Complete |
| COORD-03 | Phase 1 | Complete |
| COORD-04 | Phase 1 | Complete |
| COORD-05 | Phase 1 | Complete |
| ARCH-01 | Phase 2 | Pending |
| ARCH-02 | Phase 1 | Complete |
| ARCH-03 | Phase 2 | Pending |
| ARCH-04 | Phase 2 | Pending |
| ANCH-01 | Phase 3 | Pending |
| ANCH-02 | Phase 3 | Pending |
| ANCH-03 | Phase 3 | Pending |
| ANCH-04 | Phase 3 | Pending |
| ANCH-05 | Phase 3 | Pending |
| ANCH-06 | Phase 3 | Pending |
| ANCH-07 | Phase 3 | Pending |
| ANCH-08 | Phase 3 | Pending |
| ANCH-09 | Phase 3 | Pending |
| ANCH-10 | Phase 3 | Pending |
| UX-01 | Phase 4 | Pending |
| UX-02 | Phase 4 | Pending |
| UX-03 | Phase 4 | Pending |
| RETL-01 | Phase 2 | Complete |
| RETL-02 | Phase 2 | Complete |
| RETL-03 | Phase 5 | Pending |
| RETL-04 | Phase 2 | Complete |
| PERF-01 | Phase 2 | Pending |
| PERF-02 | Phase 2 | Pending |
| PERF-03 | Phase 2 | Pending |
| PERF-04 | Phase 5 | Pending |
| VIS-01 | Phase 5 | Pending |
| VIS-02 | Phase 5 | Pending |
| VIS-03 | Phase 4 | Pending |
| VIS-04 | Phase 4 | Pending |
| VIS-05 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0

---
*Requirements defined: 2026-03-29*
*Last updated: 2026-03-29 after roadmap phase mapping*

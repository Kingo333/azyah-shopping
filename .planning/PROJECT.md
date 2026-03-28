# Azyah AR System Improvement

## What This Is

An upgrade to the AR try-on system in Azyah Style — a fashion/retail events platform. Shoppers at retail events can virtually try on clothes using their phone camera. The AR system uses MediaPipe pose tracking + Three.js to overlay 3D garment models onto the user's body in real-time. The current system fails to place garments naturally — it treats every item as a "shirt" and lacks garment-type awareness, realistic anchoring, and proper body-proportional fitting. This milestone focuses on making the AR placement look like the person is actually wearing the garment.

## Core Value

When a shopper points their camera at themselves, the 3D garment must look like they're actually wearing it — properly anchored to their body, fitting their proportions, and moving with them naturally.

## Requirements

### Validated

- ✓ Camera access and selfie-mode video feed — existing
- ✓ MediaPipe PoseLandmarker integration (33 landmarks) — existing
- ✓ Three.js 3D scene with GLTFLoader for .glb models — existing
- ✓ Basic shoulder+hip anchor mapping with smoothing — existing
- ✓ Model bounding box normalization on load — existing
- ✓ Per-product AR toggle and model URL in database — existing
- ✓ Per-product ar_scale and ar_position_offset configuration — existing
- ✓ QR code deep-linking for mobile AR handoff — existing
- ✓ Tracking state machine with user guidance — existing
- ✓ Product selector for switching garments — existing

### Active

- [ ] Garment-type-aware anchor system (shirt, abaya/dress, pants, accessories)
- [ ] Abaya-specific anchoring (shoulder-to-ankle, full drape, proper width)
- [ ] Full-body landmark utilization (not just 4 points — use all 33 MediaPipe landmarks)
- [ ] Per-landmark anchor mapping for each garment type (shoulders, elbows, wrists, hips, knees, ankles)
- [ ] Non-uniform scaling that matches actual body proportions per garment type
- [ ] Improved depth/z-axis handling for 3D realism (not flat overlay)
- [ ] Reduced jitter and drift via better smoothing and temporal filtering
- [ ] Garment type metadata in database + retailer UI to select garment type on upload
- [ ] 3D model validation on upload (check structure, normals, size, origin)
- [ ] Improved lighting (ambient occlusion, environment-aware)
- [ ] Mobile performance optimization (frame budget, model LOD, texture compression)
- [ ] Screenshot/capture and share functionality
- [ ] Gesture support (pinch-to-zoom for manual adjustment)
- [ ] Model caching for faster re-loads

### Out of Scope

- Real-time cloth physics/simulation — too computationally expensive for mobile web
- Custom 3D model creation tool — retailers use external tools (Meshy.ai, Tripo3D)
- Try-on for multiple garments simultaneously — focus on single garment first
- AR marker-based tracking — sticking with markerless MediaPipe approach
- WebXR/ARCore/ARKit native integration — staying web-based via Capacitor
- Replacing MediaPipe with a different pose detection library — improve usage of current stack

## Context

- **Target market**: Middle Eastern fashion, especially abayas and traditional clothing
- **Primary garment**: Abayas — long flowing garments from shoulder to ankle, need full-body anchoring
- **Inspiration**: wanna.fashion — markerless AR with garment-type-specific anchoring and material realism
- **Current pain**: 3D model placement looks wrong — doesn't match body shape, same anchoring for all garment types
- **Tech stack**: React + TypeScript + Vite, Three.js, MediaPipe Tasks Vision, Supabase, Capacitor
- **MediaPipe landmarks available**: 33 pose landmarks including shoulders (11,12), elbows (13,14), wrists (15,16), hips (23,24), knees (25,26), ankles (27,28)
- **Current anchoring**: Only uses 4 points (shoulders 11,12 + hips 23,24) — ignores arms, legs, and torso articulation
- **Database**: `event_brand_products` table has ar_model_url, ar_scale, ar_position_offset, ar_enabled — needs garment_type column
- **Retailer workflow**: Uploads .glb via BrandProductManager, currently no garment type selection or model validation

## Constraints

- **Platform**: Must work in mobile web browsers (Safari, Chrome) via Capacitor webview — no native AR APIs
- **Performance**: Must maintain 15+ FPS on mid-range phones during pose detection + 3D rendering
- **MediaPipe**: Using PoseLandmarker lite model — cannot switch to full/heavy without performance impact
- **3D Models**: Retailers upload .glb files from external tools — models may have inconsistent origins, scales, and orientations
- **Backward Compatibility**: Existing AR products with ar_scale and ar_position_offset must continue working
- **Storage**: 3D models stored in Supabase `event-ar-models` bucket — no CDN for model caching yet

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Add garment_type column to database | Different garments need different anchor strategies | — Pending |
| Use all 33 MediaPipe landmarks per garment type | Current 4-point anchoring is insufficient for full-body garments | — Pending |
| Keep web-based AR (no WebXR) | Broadest device compatibility, simpler deployment | — Pending |
| Garment-type presets over manual offset tuning | Reduces retailer burden, more consistent results | — Pending |

---
*Last updated: 2026-03-29 after initialization*

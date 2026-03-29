---
phase: 02-architecture-decomposition-and-schema
plan: 01
subsystem: ar
tags: [three.js, mediapipe, typescript, performance, module-extraction]

# Dependency graph
requires:
  - phase: 01-coordinate-pipeline-and-stability
    provides: OneEuroFilter, coordinateUtils, pinned WASM version
provides:
  - "src/ar/types.ts -- shared GarmentType, ARProduct, TrackingState types"
  - "src/ar/core/CameraManager.ts -- camera stream lifecycle (startCamera, stopCamera)"
  - "src/ar/core/PoseProcessor.ts -- MediaPipe pose init and per-frame detection"
  - "src/ar/core/SceneManager.ts -- persistent Three.js scene with PERF-01/02/03"
  - "src/ar/core/ModelLoader.ts -- GLB loading with bounding box normalization"
affects: [02-02-PLAN (orchestrator rewrite), 02-03-PLAN (schema/types), 03-anchor-system]

# Tech tracking
tech-stack:
  added: []
  patterns: [module-extraction, render-on-dirty, material-cache, dpr-cap]

key-files:
  created:
    - src/ar/types.ts
    - src/ar/core/CameraManager.ts
    - src/ar/core/PoseProcessor.ts
    - src/ar/core/SceneManager.ts
    - src/ar/core/ModelLoader.ts
  modified: []

key-decisions:
  - "CameraManager uses standalone functions (not class) since camera has no internal state"
  - "SceneManager uses class pattern since it manages persistent renderer/scene/camera state"
  - "Mobile DPR detection: innerWidth < 768 OR (maxTouchPoints > 0 AND screen.width < 1024)"
  - "ModelLoader returns wrapper Group with visible:false -- SceneManager.swapModel handles scene add"
  - "PoseProcessor.detectForVideo wraps in try-catch returning null on error to protect render loop"

patterns-established:
  - "Module extraction: core AR logic in src/ar/core/, shared types in src/ar/types.ts"
  - "Render-on-dirty: SceneManager.dirty flag, renderIfDirty() method"
  - "Material cache: swapModel traverses once, updateOpacity iterates cache"
  - "Clean interface pattern: PoseProcessor hides MediaPipe internals behind simple interface"

requirements-completed: [ARCH-01, PERF-01, PERF-02, PERF-03]

# Metrics
duration: 18min
completed: 2026-03-29
---

# Phase 2 Plan 01: Core AR Module Extraction Summary

**Five bounded AR modules extracted from monolith with DPR cap, render-on-dirty, and material cache performance optimizations**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-29T01:49:19Z
- **Completed:** 2026-03-29T02:07:25Z
- **Tasks:** 3
- **Files created:** 5

## Accomplishments
- Extracted five standalone modules from the 563-line ARExperience.tsx monolith with fully typed interfaces
- Embedded three performance requirements: PERF-01 (DPR cap at 1.0 on mobile), PERF-02 (render-on-dirty flag), PERF-03 (cached material array for O(1) opacity updates)
- GarmentType union type includes all six REQUIREMENTS.md values: shirt, abaya, pants, jacket, headwear, accessory
- All modules compile independently and the full build passes without errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared AR types and CameraManager module** - `408ff3cd` (feat)
2. **Task 2: Create SceneManager with PERF-01/02/03 and ModelLoader** - `28faa384` (feat)
3. **Task 3: Create PoseProcessor module** - `478e1342` (feat)

## Files Created/Modified
- `src/ar/types.ts` - Shared type definitions: GarmentType, ARProduct, TrackingState
- `src/ar/core/CameraManager.ts` - Camera stream lifecycle: startCamera(), stopCamera()
- `src/ar/core/SceneManager.ts` - Persistent Three.js scene with DPR cap, render-on-dirty, material cache
- `src/ar/core/ModelLoader.ts` - GLB model loading with bounding box normalization and Group wrapper
- `src/ar/core/PoseProcessor.ts` - MediaPipe PoseLandmarker lifecycle with error-safe detection

## Decisions Made
- CameraManager uses standalone functions (not class) since camera is stateless start/stop lifecycle
- SceneManager uses class pattern to encapsulate persistent renderer/scene/camera and material cache
- Mobile DPR detection combines innerWidth < 768 with maxTouchPoints + screen.width heuristic (avoids penalizing desktop retina)
- ModelLoader returns { wrapper, dims } without adding to scene -- SceneManager.swapModel handles scene integration
- PoseProcessor wraps detectForVideo in try-catch to prevent frame-level errors from crashing the render loop

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All five modules are ready for Plan 02-02 to import into the rewritten ARExperience.tsx orchestrator
- SceneManager.swapModel() accepts ModelResult.wrapper from ModelLoader -- the key_link defined in the plan
- Types in src/ar/types.ts are ready for import by all AR modules and the orchestrator
- Existing ARExperience.tsx is unchanged -- Plan 02-02 will rewrite it to use these modules

## Self-Check: PASSED

All 5 created files verified on disk. All 3 task commits verified in git log.

---
*Phase: 02-architecture-decomposition-and-schema*
*Completed: 2026-03-29*

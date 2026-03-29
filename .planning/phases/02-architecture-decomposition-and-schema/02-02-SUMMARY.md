---
phase: 02-architecture-decomposition-and-schema
plan: 02
subsystem: ar
tags: [react, three.js, mediapipe, orchestrator, module-composition, performance]

# Dependency graph
requires:
  - phase: 02-architecture-decomposition-and-schema
    plan: 01
    provides: CameraManager, PoseProcessor, SceneManager, ModelLoader, shared types
provides:
  - "Slim ARExperience.tsx orchestrator with three independent effects"
  - "Fast product switching without camera/pose restart"
  - "PERF-02 render-on-dirty active via SceneManager.renderIfDirty()"
  - "PERF-03 cached material opacity active via SceneManager.updateOpacity()"
affects: [03-anchor-system, 04-ux-capture-flow, 05-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: [three-effect-decomposition, ref-based-cross-effect-communication, render-on-dirty-in-raf-loop]

key-files:
  created: []
  modified:
    - src/pages/ARExperience.tsx

key-decisions:
  - "selectedProductRef pattern used to avoid stale closures in render loop without adding selectedProduct to Effect 1 deps"
  - "Model visibility toggled via modelRef.visible on tracking loss instead of swapModel(null) to avoid disposing the model"
  - "type-only import of Object3D from three keeps ARExperience free of runtime THREE dependency"

patterns-established:
  - "Three-effect decomposition: mount-only pipeline, product-change model swap, resize handler"
  - "Ref-based cross-effect communication: selectedProductRef bridges render loop (Effect 1) and model loading (Effect 2)"
  - "Dirty flag protocol: updateModel sets sm.dirty=true, render loop calls renderIfDirty()"

requirements-completed: [ARCH-01, ARCH-03, ARCH-04]

# Metrics
duration: 8min
completed: 2026-03-29
---

# Phase 2 Plan 02: ARExperience Orchestrator Rewrite Summary

**ARExperience.tsx rewritten from 563-line monolith to 477-line slim orchestrator with three independent effects, persistent camera/pose/scene, and product-switch-only model reloading**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-29T02:11:01Z
- **Completed:** 2026-03-29T02:19:52Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Replaced single monolithic useEffect (that restarted camera + pose + scene on every product switch) with three independent effects: mount-only pipeline, product-change model swap, and resize handler
- Activated PERF-02 (render-on-dirty via renderIfDirty()) and PERF-03 (cached material opacity via updateOpacity()) in the per-frame render loop
- Product switching now only reloads the 3D model -- camera stream, MediaPipe pose detector, and Three.js scene persist across switches
- Removed all inline Three.js and MediaPipe setup code, duplicate type definitions, and WASM/MODEL URL constants from the orchestrator

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite ARExperience.tsx with three independent effects** - `1f04d503` (feat)

## Files Created/Modified
- `src/pages/ARExperience.tsx` - Slim orchestrator importing from five AR modules with three independent effects

## Decisions Made
- Used `selectedProductRef` pattern (ref updated on every render) so the mount-only render loop can read current product without stale closures, avoiding adding `selectedProduct` to Effect 1's dependency array which would restart the entire pipeline
- Tracking-lost hides model via `modelRef.current.visible = false` instead of `swapModel(null)` to avoid disposing and re-loading the model when tracking resumes
- Used `import type { Object3D } from 'three'` to get the TypeScript type for modelRef without adding a runtime THREE import to the orchestrator

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added type-only import for Object3D**
- **Found during:** Task 1 (ARExperience rewrite)
- **Issue:** Removing `import * as THREE from 'three'` broke the `THREE.Object3D` type reference in modelRef
- **Fix:** Added `import type { Object3D } from 'three'` and changed ref type to `Object3D | null`
- **Files modified:** src/pages/ARExperience.tsx
- **Verification:** npm run build succeeds
- **Committed in:** 1f04d503 (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added selectedProductRef for stale closure prevention**
- **Found during:** Task 1 (ARExperience rewrite)
- **Issue:** The render loop in Effect 1 (empty deps) would capture a stale `selectedProduct` closure. The original monolith had `selectedProduct` in its deps array causing full restart; the new architecture needs the product data in the loop without restarting
- **Fix:** Added `selectedProductRef = useRef<ARProduct | null>(null)` updated on every render, read from the render loop and updateModel
- **Files modified:** src/pages/ARExperience.tsx
- **Verification:** npm run build succeeds; render loop reads current product via ref
- **Committed in:** 1f04d503 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both fixes are necessary for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ARExperience.tsx is now a clean orchestrator ready for Phase 3 anchor strategy integration
- Effect 2 (model loading) is the natural extension point for garment-type-specific anchor logic
- updateModel function is the natural extension point for garment-type-specific positioning/scaling
- All PERF-01/02/03 optimizations are active in production render loop

## Self-Check: PASSED

---
*Phase: 02-architecture-decomposition-and-schema*
*Completed: 2026-03-29*

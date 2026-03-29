---
phase: 01-coordinate-pipeline-and-stability
plan: 01
subsystem: ar
tags: [one-euro-filter, coordinate-transform, mediapipe, threejs, signal-processing]

# Dependency graph
requires: []
provides:
  - OneEuroFilter adaptive smoothing class with per-axis presets
  - landmarkToWorld canonical coordinate transform (mirror + cover-crop + NDC-to-world)
  - computeCoverCrop object-fit:cover geometry calculator
  - Pinned MediaPipe WASM URL at @0.10.34
affects: [01-02, phase-02-architecture-decomposition]

# Tech tracking
tech-stack:
  added: []
  patterns: [one-euro-filter-per-axis, single-canonical-coordinate-transform, cover-crop-geometry]

key-files:
  created:
    - src/ar/utils/OneEuroFilter.ts
    - src/ar/utils/coordinateUtils.ts
  modified:
    - src/pages/ARExperience.tsx

key-decisions:
  - "Implemented One Euro Filter as custom ~100 LOC class instead of npm dependency -- avoids bundle bloat for trivial algorithm"
  - "Pinned WASM to @0.10.34 matching package.json rather than latest stable -- prevents silent breakage"

patterns-established:
  - "OneEuroFilter: one filter instance per smoothed axis with axis-appropriate presets (position/scale/rotation)"
  - "landmarkToWorld: single canonical function for all landmark-to-world conversions -- mirror handled exactly once"
  - "computeCoverCrop: deterministic geometry for video-to-display aspect ratio mapping"

requirements-completed: [COORD-04, ARCH-02, COORD-01, COORD-02, COORD-03]

# Metrics
duration: 8min
completed: 2026-03-29
---

# Phase 1 Plan 01: Foundation Utilities Summary

**One Euro Filter smoothing class, canonical landmarkToWorld/computeCoverCrop coordinate utilities, and pinned MediaPipe WASM at @0.10.34**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-29T00:54:14Z
- **Completed:** 2026-03-29T01:02:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Created OneEuroFilter class implementing Casiez et al. 2012 algorithm with adaptive cutoff, reset capability, and documented presets for position/scale/rotation smoothing
- Created coordinateUtils module with computeCoverCrop (handles video-wider and video-taller cases with zero-dimension guard) and landmarkToWorld (mirror + cover-crop + NDC-to-world in one canonical function)
- Pinned WASM_URL from @latest to @0.10.34 in ARExperience.tsx to prevent silent breakage from upstream version changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Create OneEuroFilter utility class** - `1d894a19` (feat)
2. **Task 2: Create coordinateUtils with landmarkToWorld and computeCoverCrop** - `5dadd1b7` (feat)
3. **Task 3: Pin MediaPipe WASM version in ARExperience.tsx** - `00c1320e` (fix)

## Files Created/Modified
- `src/ar/utils/OneEuroFilter.ts` - Adaptive low-pass filter class with filter(), reset(), and FILTER_PRESETS export
- `src/ar/utils/coordinateUtils.ts` - CoverCropInfo interface, computeCoverCrop(), and landmarkToWorld() exports
- `src/pages/ARExperience.tsx` - WASM_URL pinned to @0.10.34 (one-line change)

## Decisions Made
- Implemented One Euro Filter as custom class (~100 LOC) rather than importing npm `1eurofilter` package -- the algorithm is ~30 lines of math, adding a dependency would be unnecessary bundle bloat
- Pinned WASM to @0.10.34 to match the package.json `@mediapipe/tasks-vision: ^0.10.34` dependency version

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing build failure due to missing `@capacitor/status-bar` module in main.tsx and missing type declarations for `three`/`@mediapipe/tasks-vision` -- these are out of scope for this plan. TypeScript type-checks pass for all new files (verified via `tsc --noEmit` filtering for our files).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- OneEuroFilter and coordinateUtils are ready for Plan 02 to integrate into ARExperience.tsx
- Plan 02 will use landmarkToWorld() to replace the scattered ad-hoc coordinate math in updateModel()
- Plan 02 will instantiate OneEuroFilter per axis to replace the frame-rate-dependent LERP smoothing
- Pre-existing build issues (missing @capacitor/status-bar types, missing three types) should be addressed separately

## Self-Check: PASSED

All files exist, all commits verified:
- src/ar/utils/OneEuroFilter.ts -- FOUND
- src/ar/utils/coordinateUtils.ts -- FOUND
- src/pages/ARExperience.tsx -- FOUND
- Commit 1d894a19 -- FOUND
- Commit 5dadd1b7 -- FOUND
- Commit 00c1320e -- FOUND

---
*Phase: 01-coordinate-pipeline-and-stability*
*Completed: 2026-03-29*

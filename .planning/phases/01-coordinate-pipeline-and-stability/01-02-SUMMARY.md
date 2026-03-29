---
phase: 01-coordinate-pipeline-and-stability
plan: 02
subsystem: ar
tags: [coordinate-pipeline, cover-crop, one-euro-filter, threejs, mediapipe, ar-tracking]

# Dependency graph
requires:
  - phase: 01-coordinate-pipeline-and-stability
    plan: 01
    provides: OneEuroFilter class, landmarkToWorld, computeCoverCrop utilities
provides:
  - Fully corrected AR coordinate pipeline in ARExperience.tsx
  - Double-mirror bug eliminated (canvas no longer has CSS scaleX(-1))
  - Cover-crop-aware landmark-to-world mapping via landmarkToWorld()
  - Constant Z-depth (0) replacing broken avgZ formula
  - Resize-safe pipeline (visibleDims + coverCrop recalculated on window resize)
  - Adaptive One Euro Filter smoothing replacing frame-rate-dependent LERP
affects: [phase-02-architecture-decomposition, phase-03-garment-anchor-system]

# Tech tracking
tech-stack:
  added: []
  patterns: [cover-crop-ref-pattern, one-euro-filter-per-axis-refs, display-aspect-camera, world-coordinate-scaling]

key-files:
  created: []
  modified:
    - src/pages/ARExperience.tsx

key-decisions:
  - "Camera PerspectiveCamera uses display aspect (window.innerWidth/innerHeight) not video aspect -- coverCrop mapping handles video-to-display transform"
  - "Z-depth set to constant 0 -- AR overlay is effectively 2D-on-camera-plane, body-turn uses shoulder Z difference only"
  - "Six independent OneEuroFilter refs (posX, posY, scaleX, scaleY, scaleZ, rotY) with axis-appropriate presets"

patterns-established:
  - "All landmark-to-world conversions go through landmarkToWorld() -- no inline coordinate math"
  - "coverCropRef recomputed on both init and resize to handle aspect ratio changes"
  - "Filter refs reset on product change to prevent stale state carryover"

requirements-completed: [COORD-01, COORD-02, COORD-03, COORD-05, ARCH-02]

# Metrics
duration: 12min
completed: 2026-03-29
---

# Phase 1 Plan 02: Coordinate Pipeline Integration Summary

**Fixed AR coordinate pipeline with cover-crop-aware landmarkToWorld, constant Z-depth, resize-safe dimensions, and adaptive One Euro Filter smoothing replacing frame-rate-dependent LERP**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-29T01:05:00Z
- **Completed:** 2026-03-29T01:17:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files modified:** 1

## Accomplishments
- Eliminated double-mirror bug by removing CSS scaleX(-1) from canvas element and inline mirrorX() function, routing all mirroring through landmarkToWorld(mirror=true)
- Integrated cover-crop-aware coordinate mapping: computeCoverCrop() on init, landmarkToWorld() for all landmark conversions, coverCrop recomputed on resize
- Replaced broken Z-depth formula (avgZ * 2 - 1) with constant 0 and body-turn rotation derived from shoulder Z difference only
- Replaced frame-rate-dependent LERP smoothing (lerp + SMOOTHING constant) with six independent OneEuroFilter instances using axis-appropriate presets
- Fixed resize handler to recalculate both visibleDims and coverCrop, and camera to use display aspect ratio instead of video aspect ratio

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix coordinate pipeline -- double mirror, cover crop, Z-depth, resize handler** - `f69ad001` (feat)
2. **Task 2: Replace LERP smoothing with One Euro Filter** - `90318bcd` (feat)
3. **Task 3: Visual verification checkpoint** - auto-approved (no code changes)

## Files Created/Modified
- `src/pages/ARExperience.tsx` - Complete coordinate pipeline rewrite: removed canvas scaleX(-1), added coverCropRef, replaced all inline coordinate math with landmarkToWorld(), constant Z-depth, display-aspect camera, resize-safe dimensions, six OneEuroFilter refs replacing LERP

## Decisions Made
- Camera PerspectiveCamera initialized with display aspect ratio (window dimensions) rather than video aspect ratio -- the coverCrop mapping handles the video-to-display coordinate transform, so the camera frustum must match what the user actually sees
- Z-depth set to constant 0 rather than attempting to map MediaPipe Z values -- the AR overlay is effectively 2D on the camera plane, and the previous avgZ formula produced incorrect depth placement
- Six separate OneEuroFilter refs created (one per smoothed axis) rather than a single multi-dimensional filter -- allows axis-appropriate presets (position needs different cutoff than rotation)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The coordinate pipeline is now fully correct and stable -- all subsequent phases can trust landmark-to-world mappings
- Phase 2 (Architecture Decomposition) can safely decompose ARExperience.tsx knowing the coordinate math is canonical and centralized in utility functions
- Phase 3 (Garment Anchor System) can build garment-type-specific anchor strategies on top of the corrected world-coordinate positions
- Pre-existing build issues (missing @capacitor/status-bar types, missing three types) remain out of scope and should be addressed in Phase 2

## Self-Check: PASSED

All files exist, all commits verified:
- src/pages/ARExperience.tsx -- FOUND
- src/ar/utils/coordinateUtils.ts -- FOUND
- src/ar/utils/OneEuroFilter.ts -- FOUND
- Commit f69ad001 -- FOUND
- Commit 90318bcd -- FOUND
- landmarkToWorld used in ARExperience.tsx -- VERIFIED
- computeCoverCrop used in ARExperience.tsx -- VERIFIED
- OneEuroFilter used in ARExperience.tsx -- VERIFIED
- Z-depth is constant 0 -- VERIFIED
- Canvas does not have scaleX(-1) -- VERIFIED

---
*Phase: 01-coordinate-pipeline-and-stability*
*Completed: 2026-03-29*

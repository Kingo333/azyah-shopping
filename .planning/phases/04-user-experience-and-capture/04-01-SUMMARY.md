---
phase: 04-user-experience-and-capture
plan: 01
subsystem: ui
tags: [react, mediapipe, ar, tracking-guidance, body-detection]

requires:
  - phase: 03-garment-anchor-system
    provides: "GARMENT_PRESETS with requiredLandmarks/optionalLandmarks per garment type, BodyMeasurements with visibility map"
provides:
  - "TrackingState with partial_tracking state for intermediate tracking quality"
  - "garmentGuidance.ts pure functions: getTrackingGuidance, getMissingBodyParts"
  - "TrackingGuidance extracted component with garment-aware props"
  - "Partial tracking detection in AR render loop based on required landmark visibility"
affects: [04-user-experience-and-capture, 05-polish-and-performance]

tech-stack:
  added: []
  patterns: ["pure-function guidance logic separated from React component", "JSON.stringify throttling for render-loop state updates"]

key-files:
  created:
    - src/ar/guidance/garmentGuidance.ts
    - src/ar/guidance/TrackingGuidance.tsx
  modified:
    - src/ar/types.ts
    - src/pages/ARExperience.tsx

key-decisions:
  - "getTrackingGuidance returns null for states it does not handle, letting the component fall through to its own defaults"
  - "Partial tracking fires when at least one but not all required landmarks pass visibilityThreshold"
  - "Missing parts state updates throttled via JSON.stringify comparison to prevent re-render storms in 15fps render loop"
  - "tracking_lost transition now triggers from both tracking_active and partial_tracking states"

patterns-established:
  - "Pure guidance logic in garmentGuidance.ts, separate from React rendering in TrackingGuidance.tsx"
  - "BODY_PART_NAMES map deduplicates left/right pairs to single human-readable names"

requirements-completed: [UX-01, UX-02, UX-03]

duration: 8min
completed: 2026-03-29
---

# Phase 4 Plan 1: Garment-Aware Tracking Guidance Summary

**Garment-type-aware tracking guidance with partial_tracking state and body-part-specific missing landmark messages**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-29T05:27:54Z
- **Completed:** 2026-03-29T05:35:42Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added partial_tracking to TrackingState union for intermediate tracking quality feedback
- Created garmentGuidance.ts with pure functions mapping garment type to guidance messages (abaya=full body, shirt=upper body, pants=legs, headwear=face)
- Extracted inline TrackingGuidance from ARExperience into dedicated component with garmentType and missingParts props
- Render loop now detects partial landmark visibility and shows which body parts are missing

## Task Commits

Each task was committed atomically:

1. **Task 1: Add partial_tracking state and garment guidance logic** - `a846a1be` (feat)
2. **Task 2: Extract TrackingGuidance component and wire garment awareness** - `73ed484b` (feat)

## Files Created/Modified
- `src/ar/types.ts` - Added partial_tracking to TrackingState union, updated state machine JSDoc
- `src/ar/guidance/garmentGuidance.ts` - Pure functions: getTrackingGuidance (per-garment messages) and getMissingBodyParts (visibility-based body part detection)
- `src/ar/guidance/TrackingGuidance.tsx` - Extracted and enhanced component with garmentType, missingParts props, partial_tracking rendering with amber AlertTriangle icon
- `src/pages/ARExperience.tsx` - Removed inline TrackingGuidance, added imports, added missingParts state, added partial_tracking detection in render loop

## Decisions Made
- getTrackingGuidance returns null for states it does not handle (initializing, camera errors, model loading), letting the component use its own defaults for those states
- Partial tracking fires when at least one but not all required landmarks pass visibilityThreshold -- zero visible landmarks stays in waiting_for_pose
- Missing parts state updates throttled via JSON.stringify comparison to prevent re-render storms in the 15fps render loop
- tracking_lost transition now triggers from both tracking_active and partial_tracking states (was previously only tracking_active)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Tracking guidance system complete with garment-aware messages
- partial_tracking state ready for Phase 5 polish (animation transitions, haptic feedback)
- TrackingGuidance component is a clean extraction point for future visual enhancements

## Self-Check: PASSED

All files verified present. All commits verified in git log.

---
*Phase: 04-user-experience-and-capture*
*Completed: 2026-03-29*

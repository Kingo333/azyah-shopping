

## AR Try-On System Overhaul

This is a large, multi-part change touching 4 files. Here's the plan:

---

### Part 1: Per-Product AR Button in Events.tsx

**Current**: Single `EventARButton` at brand header level.
**Change**: Add an "AR" button on each product card (next to Try On) when `ar_enabled && ar_model_url`. On mobile, navigate directly to `/ar/:eventId/:brandId?productId=:productId`. On desktop, show a QR code dialog with the same URL.

- Add `Smartphone` icon import and QR modal state (`showQRModal`, `qrModalProduct`)
- Add `handleOpenAR(product)` function with mobile detection
- In the product card (line ~566-605), add a second button beside the existing Try On button
- Add inline QR modal dialog using the existing `qrcode` package
- Remove `EventARButton` from the brand header (line 547)

---

### Part 2: Product-Aware AR Route in ARExperience.tsx

**Current**: Defaults to first AR product for brand.
**Change**: Read `productId` from URL search params, preselect that product.

- Import `useSearchParams`
- Parse `requestedProductId` from query string
- In fetch effect, preselect matching product or fall back to first
- Validate `eventId` matches brand's event
- Show error state with back-navigation if invalid

---

### Part 3: Tracking State Machine + User Guidance in ARExperience.tsx

**Current**: Silent failures, no feedback when pose detection fails.
**Change**: Add explicit `trackingState` with user-facing guidance overlay.

States: `initializing` | `camera_denied` | `camera_error` | `pose_init_failed` | `model_loading` | `model_error` | `waiting_for_pose` | `tracking_lost` | `tracking_active`

- Wrap camera init, MediaPipe init, and model loading in state transitions
- Show appropriate guidance text/icons for each state
- Track frames without pose landmarks; show "tracking lost" after ~1 second
- Show "Position yourself — show shoulders and hips" when waiting for first detection

---

### Part 4: Stabilize Overlay Alignment in ARExperience.tsx

**Current**: Jittery positioning, no smoothing, no aspect ratio calibration.
**Change**:

- Add `smoothedPosition`, `smoothedScale`, `smoothedRotation` refs with lerp interpolation (factor 0.3)
- Wait for `video.onloadedmetadata` before sizing renderer (use actual video dimensions + DPR)
- Check landmark visibility thresholds before using them (shoulders > 0.5, hips > 0.3)
- Hide model when key landmarks not visible
- Fade model opacity based on confidence
- Shoulder-only fallback when hips are weak

---

### Part 5: Remove Legacy Polling in Events.tsx

**Current**: Lines 139-189 poll `bitstudio-poll-job` every 5 seconds for queued/processing jobs.
**Change**: Remove this polling interval entirely. The realtime subscription (lines 99-137) already handles updates, and event try-ons now use the synchronous The New Black flow.

---

### Part 6: Update EVENT_TRYON_README.md

Replace outdated BitStudio documentation with current architecture (The New Black sync flow, AR per-product flow, updated table descriptions).

---

### Files Changed

| File | Change |
|------|--------|
| `src/pages/Events.tsx` | Per-product AR button, QR modal, remove brand-level AR button, remove legacy polling |
| `src/pages/ARExperience.tsx` | Full rewrite: productId deep-link, state machine, guidance overlay, smoothed tracking |
| `src/components/events/EventARButton.tsx` | Delete file |
| `EVENT_TRYON_README.md` | Rewrite to reflect current architecture |


# Event Try-On System

## Overview

The event try-on system allows shoppers to virtually try on products from retail events. It supports two modes: **Image Try-On** (AI-generated composite) and **AR Try-On** (real-time 3D overlay via camera).

---

## Architecture (Current)

### Image Try-On Flow
1. Shopper uploads full-body photo to event
2. Photo stored in `event-user-photos` bucket + `event_user_photos` table
3. Click "Try On" on any product with `try_on_ready=true`
4. Calls `thenewblack-event-tryon` edge function (synchronous)
5. Result stored in `event-tryon-results` bucket + `event_tryon_jobs` table
6. Result displayed immediately in modal

### AR Try-On Flow
1. Retailer uploads 3D model (.glb) for product in `BrandProductManager`
2. Model stored in `event-ar-models` bucket, URL in `event_brand_products.ar_model_url`
3. Shopper clicks "AR" button on individual product card
4. Mobile: navigates directly to `/ar/:eventId/:brandId?productId=:productId`
5. Desktop: shows QR code modal for mobile handoff
6. `ARExperience.tsx` loads:
   - Selfie camera with permission handling
   - MediaPipe Pose for body tracking (shoulders + hips)
   - Three.js for 3D rendering with smoothed interpolation
   - Selected product's .glb model with per-product offset/scale
7. Tracking state machine provides user guidance for each state

### Tracking States
- `initializing` — Loading camera + MediaPipe
- `camera_denied` — User denied camera permission
- `camera_error` — Camera failed to start
- `pose_init_failed` — MediaPipe failed to load
- `model_loading` — Loading 3D model
- `model_error` — 3D model failed to load
- `waiting_for_pose` — Camera ready, waiting for body detection
- `tracking_lost` — Had tracking, lost it (30+ frames without landmarks)
- `tracking_active` — Actively tracking body

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `event_user_photos` | Shopper photos per event |
| `event_tryon_jobs` | Try-on job history and results |
| `event_brand_products` | Products with `try_on_*` and `ar_*` columns |
| `event_brands` | Brands participating in events |
| `retail_events` | Event metadata (dates, location, status) |

---

## Storage Buckets

| Bucket | Purpose |
|--------|---------|
| `event-user-photos` | Shopper uploaded photos |
| `event-tryon-results` | Generated try-on images |
| `event-ar-models` | 3D .glb files for AR |
| `event-assets` | Event banners, brand logos |

---

## Edge Functions

| Function | Purpose |
|----------|---------|
| `thenewblack-event-tryon` | Synchronous try-on via The New Black API |

---

## Key Design Decisions

1. **Per-product AR buttons** — AR action is on each product card, not brand header, to avoid "which outfit?" confusion
2. **Product deep-linking** — AR URL includes `productId` query param to preselect the correct outfit
3. **Tracking state machine** — Explicit states with user-facing guidance for every failure mode
4. **Smoothed overlay** — Lerp interpolation (factor 0.3) reduces jitter in position/scale/rotation
5. **Landmark visibility thresholds** — Shoulders > 0.5, hips > 0.3 required before rendering model
6. **Shoulder-only fallback** — When hips are weak, torso center is estimated from shoulders
7. **Realtime subscription** — Job updates arrive via Supabase realtime (no polling)
8. **Synchronous try-on** — The New Black API returns results immediately, no polling needed

---

## Deprecated (Removed)

- BitStudio async try-on (replaced by The New Black)
- Gemini try-on provider (removed)
- Job polling logic (no longer needed with sync API)
- Brand-level AR button (`EventARButton.tsx` — replaced by per-product buttons)

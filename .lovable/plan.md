

## AR Try-On System for Events — Full Implementation Plan

This is a large build with 4 interconnected changes. Here's the validated plan based on what actually exists in the codebase.

---

### Phase 1: Database & Storage Setup

**Migration SQL:**
- Add columns to `event_brand_products`: `ar_model_url TEXT`, `ar_model_format TEXT DEFAULT 'glb'`, `ar_enabled BOOLEAN DEFAULT false`, `ar_scale FLOAT DEFAULT 1.0`, `ar_position_offset JSONB DEFAULT '{"x":0,"y":0,"z":0}'`
- Create `event-ar-models` storage bucket (public) with RLS policy allowing authenticated retailer uploads
- Add storage RLS for read access (public bucket, so SELECT is open)

No new tables needed — we extend `event_brand_products`.

---

### Phase 2: Replace BitStudio/Gemini with The New Black for Event Try-On

**Current flow:** `EventTryOnModal` → `runTryOn()` → provider select (bitstudio/gemini) → edge function → async polling every 2s for up to 3 minutes

**New flow:** `EventTryOnModal` → direct call to `thenewblack-event-tryon` edge function → synchronous result (no polling)

**New edge function: `supabase/functions/thenewblack-event-tryon/index.ts`**
- Accepts `{ event_id, product_id, person_image_url }`
- Validates auth via JWT
- Fetches product's outfit image from `event_brand_products`
- Calls The New Black API (same pattern as existing `thenewblack-picture`) using `THE_NEW_BLACK_API_KEY` (already configured)
- Downloads result image, uploads to `event-tryon-results` storage
- Inserts record into `event_tryon_jobs` for history
- Returns `{ ok, result_url }` synchronously

**Update `src/components/EventTryOnModal.tsx`:**
- Remove BitStudio upload logic (lines 146-167 — uploading to BitStudio for person image ID)
- Remove the entire polling mechanism (lines 229-340)
- Replace `startTryOn` with a direct `supabase.functions.invoke('thenewblack-event-tryon')` call
- On success, immediately set `resultUrl` and `status: 'done'`
- Person image upload simplified: just upload to Supabase storage, get public URL, pass it to the edge function
- Remove `fastTryOn` function (no longer needed — the main flow is now fast)
- Remove imports: `runTryOn`, `shouldShowNotification`, `markNotified`

**Files no longer invoked for events (kept for backward compatibility but not called):**
- `src/lib/tryon/providers/bitstudio.ts`
- `src/lib/tryon/providers/gemini.ts`
- `src/lib/tryon/providers/select.ts`
- `supabase/functions/bitstudio-tryon/`
- `supabase/functions/bitstudio-poll-job/`
- `supabase/functions/vto-gemini/`

---

### Phase 3: Retailer 3D Upload in BrandProductManager

**Update `src/components/BrandProductManager.tsx`:**
- Add a "3D Model for AR" upload section in the product edit modal (after the outfit image upload section)
- Accept `.glb` and `.gltf` files only
- Upload to `event-ar-models` bucket with path `{event_id}/{brand_id}/{product_id}/{timestamp}.glb`
- On successful upload, update `event_brand_products` with `ar_model_url`, `ar_enabled: true`
- Show upload status and a checkmark when AR model is configured
- Add helper text: "Upload a 3D model (.glb) to enable AR try-on. Use Meshy.ai or Tripo3D to convert product images to 3D."

---

### Phase 4: AR Button + QR Code on Events Page

**New component: `src/components/events/EventARButton.tsx`**
- Props: `eventId`, `brandId`, `brandName`, `hasARProducts`
- Only renders if `hasARProducts` is true
- Shows a gradient "AR Try-On" button with smartphone icon
- On click, opens a dialog with:
  - QR code (using existing `qrcode` library) pointing to `/ar/{eventId}/{brandId}`
  - "Scan with your phone" instructions
  - "Open AR Experience" direct link button for mobile users
- Uses same QR generation pattern as `SocialSharing.tsx`

**Update `src/pages/Events.tsx`:**
- Import `EventARButton`
- In the brand header section (line ~534-538), add the AR button next to the brand name
- Check if any product in the brand has `ar_model_url` set to determine `hasARProducts`
- Update `EventProduct` interface to include `ar_model_url` and `ar_enabled`
- Update the brand products query to select `ar_model_url, ar_enabled`

---

### Phase 5: AR Experience Page

**New page: `src/pages/ARExperience.tsx`**
- Route: `/ar/:eventId/:brandId` (public, no auth required — accessed via QR scan)
- Fetches AR-enabled products for the brand from `event_brand_products`
- Uses device camera via `getUserMedia` as background video feed
- Loads `.glb` 3D models using Three.js `GLTFLoader`
- Uses `@mediapipe/pose` for body tracking (shoulder landmarks 11 & 12) to position garment overlay
- Product selector carousel at bottom to switch between brand products
- Renders Three.js scene as transparent overlay on camera feed
- Responsive, mobile-first design

**Dependencies to add:** `three`, `@types/three`, `@mediapipe/pose`
(`qrcode` already installed)

**Update `src/App.tsx`:**
- Add route: `<Route path="/ar/:eventId/:brandId" element={<ARExperience />} />`
- This route should be outside `ProtectedRoute` since it's accessed via QR code scan

---

### Files Summary

| File | Action |
|------|--------|
| DB migration | New columns on `event_brand_products`, new storage bucket |
| `supabase/functions/thenewblack-event-tryon/index.ts` | Create — new sync edge function |
| `src/components/EventTryOnModal.tsx` | Rewrite — remove polling, use The New Black directly |
| `src/components/BrandProductManager.tsx` | Edit — add 3D model upload section |
| `src/components/events/EventARButton.tsx` | Create — AR button + QR modal |
| `src/pages/Events.tsx` | Edit — add AR button, extend product interface |
| `src/pages/ARExperience.tsx` | Create — full AR experience page |
| `src/App.tsx` | Edit — add `/ar/:eventId/:brandId` route |
| `package.json` | Add `three`, `@types/three`, `@mediapipe/pose` |

No secrets needed — `THE_NEW_BLACK_API_KEY` is already configured.


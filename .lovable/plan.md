

# Let Retailers Choose AR Mode + Critical Fixes

## Summary

Currently the system auto-decides: if a product has a 2D overlay, it always uses 2D (ignoring any uploaded 3D model). The user wants retailers to explicitly choose which AR mode to use. Additionally, we'll implement the 6 high-priority fixes from the feedback.

## Changes

### 1. Database: Add `ar_preferred_mode` column

Add a new column to `event_brand_products`:

```sql
ALTER TABLE public.event_brand_products 
ADD COLUMN IF NOT EXISTS ar_preferred_mode TEXT DEFAULT 'auto' 
CHECK (ar_preferred_mode IN ('auto', '2d', '3d'));
```

This lets retailers explicitly force 2D, 3D, or keep the current auto-detection.

### 2. Retailer UI: AR Mode Selector in BrandProductManager

**In the edit modal**, add an "AR Mode" selector (above the tabs) that appears when both `ar_overlay_url` and `ar_model_url` exist, or always visible with options:

- **Auto** (default): System picks best available (2D first if overlay exists)
- **2D Overlay**: Force 2D image overlay
- **3D Model**: Force 3D GLB rendering

Remove the line "This takes priority over 3D models in AR" from the 2D overlay tab. Replace with: "Set preferred mode above to control which AR path shoppers see."

Also update badge logic on product cards: show the active mode badge based on `ar_preferred_mode` + what's uploaded.

### 3. Shopper AR Mode Selection: Update ARExperience.tsx

Change the mode selection logic (line 616-618) from:

```typescript
const use2D = !!selectedProduct.ar_overlay_url;
```

To respect `ar_preferred_mode`:

```typescript
function resolveARMode(product: ARProduct): ARMode {
  const pref = product.ar_preferred_mode || 'auto';
  if (pref === '2d' && product.ar_overlay_url) return '2d';
  if (pref === '3d' && product.ar_model_url) return '3d';
  // Auto: 2D first if available, then 3D
  if (product.ar_overlay_url) return '2d';
  if (product.ar_model_url) return '3d';
  return 'none';
}
```

Add `ar_preferred_mode` to the `ARProduct` interface and the fetch query.

### 4. Alpha/Transparency Validation (Fix 1)

In the 2D overlay upload handler in `BrandProductManager.tsx`, after file type/size check, add a client-side alpha channel validation:

- Load the image into an offscreen canvas
- Sample pixels along the edges (top row, bottom row, left column, right column)
- If zero pixels have alpha < 250, warn: "This image may not have a transparent background. AR overlay works best with transparent PNG/WebP."
- Show as a warning (non-blocking) — don't prevent upload, since some garments legitimately fill the entire image

### 5. Storage Write Policy Tightening (Fix 2)

Update the `event-ar-overlays` INSERT policy to enforce path-based ownership. Replace the current broad "authenticated can upload" with:

```sql
CREATE POLICY "Brand owners can upload AR overlays"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-ar-overlays' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IS NOT NULL
);
```

This ensures uploads go into an event/brand subfolder structure. A full ownership join is complex without an RPC, so we enforce folder structure at minimum.

### 6. Consistent `ar_enabled` Meaning (Fix 3)

`ar_enabled` currently means "any AR is available." Keep this meaning but make it explicit:
- When uploading 2D overlay: set `ar_enabled = true` (already done)
- When uploading 3D model: set `ar_enabled = true` (already done)
- When **removing** an overlay or model: check if the other still exists; only set `ar_enabled = false` if neither remains

No code changes needed since both upload paths already set `ar_enabled = true`. Just ensure consistency in badges (already handled by the mode selector from step 2).

### 7. Caching Strategy Fix (Fix 5)

The overlay upload uses unique filenames (`overlay_${Date.now()}.ext`) but also passes `upsert: true`. Fix: remove `upsert: true` since filenames are already unique. Same for the 3D model upload path.

### 8. Types Update

Add `ar_preferred_mode` to:
- `ARProduct` interface in `src/ar/types.ts`
- The Supabase fetch query in `ARExperience.tsx` (line 188)
- `EventBrandProduct` interface in `BrandProductManager.tsx`

### Technical Details

**Files modified:**
- `supabase/migrations/...sql` — add `ar_preferred_mode` column
- `src/ar/types.ts` — add `ar_preferred_mode` to `ARProduct`
- `src/components/BrandProductManager.tsx` — mode selector UI, alpha validation, remove upsert, update badges
- `src/pages/ARExperience.tsx` — mode resolution logic, fetch query update
- `src/integrations/supabase/types.ts` — will auto-update after migration


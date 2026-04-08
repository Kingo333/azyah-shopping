

# Add Delete Buttons for AR Assets (Try-On, 2D Overlay, 3D Model)

## Problem
Retailers can upload AR assets but cannot remove them. If they upload the wrong file or want to disable AR for a product, they're stuck. Removing assets also affects the shopper side — deleted overlays/models must clear `ar_enabled` and `ar_preferred_mode` appropriately so shoppers don't see broken AR buttons.

## Changes

### 1. BrandProductManager.tsx — Add "Remove" buttons in each tab

**Tab 1 (Image Try-On):** Below the outfit preview (line ~545), add a red "Remove" button that:
- Deletes the file from `event-assets` storage using the stored `try_on_data.outfit_image_path`
- Updates the product: `try_on_data = {}`, `try_on_ready = false`, `try_on_config = null`
- Updates local state

**Tab 2 (2D AR Overlay):** Below the overlay preview (line ~680), add a red "Remove" button that:
- Extracts the storage path from `ar_overlay_url` (after the bucket name in the URL)
- Deletes the file from `event-ar-overlays` storage
- Updates the product: `ar_overlay_url = null`
- If `ar_model_url` also doesn't exist, sets `ar_enabled = false`
- If `ar_preferred_mode` was `'2d'`, resets to `'auto'`
- Updates local state

**Tab 3 (3D AR Model):** Below the model status indicator (line ~738), add a red "Remove" button that:
- Extracts the storage path from `ar_model_url`
- Deletes the file from `event-ar-models` storage
- Updates the product: `ar_model_url = null`
- If `ar_overlay_url` also doesn't exist, sets `ar_enabled = false`
- If `ar_preferred_mode` was `'3d'`, resets to `'auto'`
- Updates local state

### 2. Shared helper function

Create a `handleRemoveAsset` function inside the component that takes parameters:
- `type`: `'tryon' | 'overlay' | 'model'`
- Handles the confirmation dialog, storage deletion, DB update, state refresh, and toast

### 3. Shopper-side impact (no code changes needed)

The existing `resolveARMode()` in `ARExperience.tsx` already handles missing URLs gracefully:
- If `ar_overlay_url` is null, it skips 2D
- If `ar_model_url` is null, it skips 3D
- If both are null and `ar_enabled` is false, no AR button shows

The key is ensuring the DB update in step 1 correctly nullifies URLs and adjusts `ar_enabled` — which the plan covers.

### 4. UI details

Each "Remove" button:
- Small, red/destructive variant, with Trash2 icon
- Positioned next to the preview of the uploaded asset
- Shows a confirm dialog before proceeding
- Shows a loading spinner during deletion

### Technical Details

**Single file modified:** `src/components/BrandProductManager.tsx`

**Storage path extraction:** Parse the public URL to get the path after `/object/public/{bucket}/` — this is the storage path needed for `supabase.storage.from(bucket).remove([path])`.

**DB fields updated per removal:**
| Removal | Fields set |
|---------|-----------|
| Try-on | `try_on_data: {}`, `try_on_ready: false`, `try_on_config: null` |
| 2D overlay | `ar_overlay_url: null`, maybe `ar_enabled: false`, maybe `ar_preferred_mode: 'auto'` |
| 3D model | `ar_model_url: null`, maybe `ar_enabled: false`, maybe `ar_preferred_mode: 'auto'` |


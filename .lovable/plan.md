

# Fix: AR Button Missing When Only 2D Overlay Exists

## Root Cause

In `src/pages/Events.tsx` line 442, the AR button visibility check is:
```typescript
{product.ar_enabled && product.ar_model_url && (
```

This requires `ar_model_url` to exist, so the button never shows for products that only have a 2D overlay. When you remove the 3D model, `ar_model_url` becomes null and the button disappears — even though the 2D overlay is still there and `ar_enabled` is still true.

## Fix

### File: `src/pages/Events.tsx` (line 442)

Change the condition to show the AR button when **any** AR asset exists:

```typescript
{product.ar_enabled && (product.ar_model_url || product.ar_overlay_url) && (
```

That's the only change needed. The rest of the pipeline already works:
- `ARExperience.tsx` fetches products with `ar_enabled = true` and runs `resolveARMode()` which correctly picks 2D if only an overlay exists
- The removal logic in `BrandProductManager.tsx` already sets `ar_enabled = false` only when **both** assets are gone (lines 107 and 111 check for the other asset before disabling)


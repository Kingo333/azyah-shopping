

# Fix: Retailer AR Mode Preference Not Reaching Shopper

## Bug Found

**Critical**: In `ARExperience.tsx` line 214-224, the product mapping omits `ar_preferred_mode` from the fetched data. Even though the column is fetched in the query (line 198) and `resolveARMode()` checks it (line 36), it's never assigned to the `ARProduct` object. Result: the retailer's mode choice is silently ignored — shoppers always get "auto" behavior.

## Fix

### File: `src/pages/ARExperience.tsx` (line 214-224)

Add the missing field to the mapped object:

```typescript
const mapped: ARProduct[] = data.map((p: any) => ({
  id: p.id,
  image_url: p.image_url,
  ar_model_url: p.ar_model_url,
  ar_scale: p.ar_scale || 1.0,
  ar_position_offset: p.ar_position_offset as any || { x: 0, y: 0, z: 0 },
  brand_name: p.event_brands?.brand_name,
  name: (p as any).name,
  garment_type: (p as any).garment_type || 'shirt',
  ar_overlay_url: (p as any).ar_overlay_url || undefined,
  ar_preferred_mode: p.ar_preferred_mode || 'auto',   // <-- ADD THIS
}));
```

That's the only change needed. The rest of the pipeline (resolveARMode, mode selector UI, badge logic) is already correctly wired.

## Verification Summary

- **Retailer side**: Mode selector UI saves `ar_preferred_mode` to DB correctly (line 411-419). Badges reflect the active mode. Upload paths for 2D and 3D work independently. Alpha validation is in place. All correct.
- **Shopper side**: `resolveARMode()` logic is correct. 2D/3D branching at line 626-658 is correct. The only issue was this missing field in the mapping.




# Fix Edge Function Build Errors + Apply Garment Type Migration

## Overview
Two things to do: (1) apply the garment_type SQL migration to your database, and (2) fix 31 TypeScript errors across ~20 edge functions that prevent the build from succeeding.

## 1. Apply Garment Type Migration
Run this SQL via the migration tool to add the `garment_type` column to `event_brand_products`:

```sql
ALTER TABLE public.event_brand_products
ADD COLUMN garment_type TEXT NOT NULL DEFAULT 'shirt'
CHECK (garment_type IN ('shirt', 'abaya', 'pants', 'jacket', 'headwear', 'accessory'));

COMMENT ON COLUMN public.event_brand_products.garment_type IS
  'Type of garment for AR anchor strategy selection.';
```

## 2. Fix Edge Function TypeScript Errors

There are three categories of errors:

### A. `'error' is of type 'unknown'` (25 errors across ~15 functions)
Every `catch (error)` block accesses `error.message` without type narrowing. Fix: change `catch (error)` to `catch (error: any)` in each affected function:
- admin-delete-user, auto-tag, beauty-consultation, bg-remove, bitstudio-health, bitstudio-status, bitstudio-upload, create-stripe-checkout, delete-account, enhance-wardrobe-item, extract-link-metadata, generate-toy-replica, moderation-flag, public-fits, realtime-session, render-fit, revenuecat-webhook, stripe-webhook, thenewblack-picture-free

### B. Missing properties on `PipelineLog` in `deals-from-image` (2 errors)
The `PipelineLog` interface (line 34-48) is missing `pattern_mode` and `visual_filtered_count`. Add them:
```typescript
pattern_mode?: boolean;
visual_filtered_count?: number;
```

### C. `deals-unified` `.catch()` issue (2 errors)
Line 1784: Supabase `.insert()` returns `PromiseLike<void>` which lacks `.catch()`. Fix by wrapping in `Promise.resolve()`:
```typescript
Promise.resolve(supabase.from('deals_search_runs').insert({...}))
  .then(() => {})
  .catch((err: any) => console.warn(...));
```

### D. `generate-toy-replica` undefined `toyReplicaId` (2 errors)
The outer `catch` at line 288 references `toyReplicaId` which is defined inside the `try` block (line 61) and not in scope. Fix: declare `let toyReplicaId: string | undefined;` before the try block, then assign inside. Guard usage in catch with `if (toyReplicaId)`.

## Files Modified
- ~20 edge function `index.ts` files (catch type annotations)
- `supabase/functions/deals-from-image/index.ts` (PipelineLog interface)
- `supabase/functions/deals-unified/index.ts` (Promise.resolve wrapper)
- `supabase/functions/generate-toy-replica/index.ts` (hoist variable)
- Database: new `garment_type` column on `event_brand_products`


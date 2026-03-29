

# Fix Retailer Portal: Loading Failures + Block Shopper Pages

## Problems

1. **Retailer portal loading failures**: The `fetchRetailer()` function at lines 140-148 has a path where auto-creation fails (`createError`) but doesn't set `setLoading(false)` — the page stays stuck on the loading spinner.

2. **Retailers can access shopper pages**: While the RBAC rules in `rbac.ts` correctly limit retailer routes, some routes like `/explore`, `/profile`, `/settings` are defined with `<ProtectedRoute>` **without role restrictions** in `App.tsx`. The `canAccessRoute` check catches `/explore` (not in retailer's ROUTE_ACCESS), but `/profile` and `/settings` ARE in the retailer's allowed routes — yet these render shopper-oriented UI (profile insights, shopper settings). Retailers should stay within `/retailer-portal` for everything.

3. **BottomNavigation still renders for retailers on some routes**: The `EXCLUDED_ROUTES` list hides it on `/retailer-portal`, but if a retailer somehow lands on `/profile` or `/settings`, they'd see the shopper bottom nav with Feed/Explore/UGC/Profile tabs.

## Plan

### File 1: `src/pages/RetailerPortal.tsx` (~line 148)
- Add `setLoading(false)` and `setSetupError(...)` in the `createError` block (line 142-148) — currently it returns early without clearing the loading state, causing an infinite spinner when auto-creation fails.

### File 2: `src/components/BottomNavigation.tsx`
- Hide the entire bottom navigation for `brand` and `retailer` users. Add a role check: if the user's metadata role is `brand` or `retailer`, return `null` early. These users have their own portal navigation and should never see the shopper bottom nav.

### File 3: `src/lib/rbac.ts`
- Remove `/settings` and `/profile` from the retailer and brand `ROUTE_ACCESS` lists. These users manage settings inside their portals. Keeping them in the allowed list lets retailers wander into shopper-oriented pages.
- Add `/explore` to retailer and brand `BLOCKED_ROUTES` to be explicit.

### File 4: `src/components/ProtectedRoute.tsx`
- No changes needed — the existing `canAccessRoute` check will automatically redirect retailers away from `/profile` and `/settings` once `ROUTE_ACCESS` is updated. They'll land on `/retailer-portal` (via `getRedirectRoute`).

## Summary
- Fix the create-error loading bug in RetailerPortal
- Hide shopper bottom nav entirely for retailer/brand users
- Tighten RBAC so retailers can only access `/retailer-portal` (+ its sub-routes), `/dashboard`, `/auth`, `/landing`


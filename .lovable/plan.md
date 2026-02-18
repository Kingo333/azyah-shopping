

## Update UGC Icon in Swipe Floating Nav

### Summary
The floating glassmorphism pill nav in the Feed/Swipe page still uses the old `Sparkles` icon for UGC. It needs to be updated to `Users` to match the main BottomNavigation (already done) and the Upgrade page.

### Changes

**File: `src/pages/Swipe.tsx`**

1. **Line 5 (imports):** Replace `Sparkles` with `Users` in the lucide-react import
2. **Line 377:** Change `{ path: '/ugc', Icon: Sparkles }` to `{ path: '/ugc', Icon: Users }`

### Already Done
- `src/components/BottomNavigation.tsx` -- already uses `Users` for UGC (confirmed)
- The floating pill on the Profile page is rendered by `BottomNavigation.tsx`, so it is also already correct

### No other changes needed
No backend or RevenueCat changes.

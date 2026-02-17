
# Premium Page Glass Redesign + Fix Nav Highlighting

## 1. Fix Navigation Active Highlighting (Critical Bug)

**File: `src/components/BottomNavigation.tsx`**

The `isActive` function for `/swipe` (Feed) currently matches against ALL `AUTO_HIDE_ROUTES`, which includes `/`, `/settings`, `/community`, `/trending`, etc. This means Feed is highlighted on almost every page.

**Fix**: Change the `isActive` logic so each nav item only highlights for its own route:
- Feed (`/swipe`): Only active when pathname is exactly `/swipe`
- Explore (`/explore`): Only active when pathname starts with `/explore`
- UGC (`/ugc`): Only active when pathname starts with `/ugc`
- Profile (`/profile`): Active on `/profile` or `/dashboard`

**File: `src/pages/Swipe.tsx`** (line 393)

The floating nav in list view hardcodes Feed as always highlighted. Apply the same fix: only highlight the icon matching the current route (which on `/swipe` will always be Feed, but this makes it consistent if the component is ever reused).

## 2. Upgrade Page Glass Redesign

**File: `src/pages/dashboard/Upgrade.tsx`**

Redesign the page with glassmorphism styling while keeping all content and backend logic untouched. Changes:

- **Background**: Add a subtle gradient background (`bg-gradient-to-br from-[hsl(var(--azyah-maroon))]/5 via-background to-primary/5`)
- **Header**: Make it glass (`bg-white/70 backdrop-blur-xl border-white/20`) instead of solid `bg-background border-b`
- **Hero section**: Add a glass card wrapper (`bg-white/50 backdrop-blur-xl rounded-2xl border border-white/20`) around the Crown icon and text
- **Feature pills**: Already styled nicely, keep as-is
- **Plan cards**: Replace the solid Card with glass cards (`bg-white/60 backdrop-blur-lg border-white/30`). Selected state uses `ring-2 ring-[hsl(var(--azyah-maroon))]` with `bg-white/80`
- **Comparison table**: Wrap in glass card (`bg-white/50 backdrop-blur-xl border-white/20`)
- **CTA button**: Keep as-is (solid primary button)
- **AI Try-On count**: Change `'4 total'` to `'5 total'` in the `comparisonFeatures` array (line 43)

All backend logic (IAP, Supabase calls, navigation) remains completely untouched.

## Files Changed Summary

| File | Changes |
|------|---------|
| `src/components/BottomNavigation.tsx` | Fix `isActive` to only match the exact route for each nav item |
| `src/pages/Swipe.tsx` | No change needed (already correct for `/swipe` context) |
| `src/pages/dashboard/Upgrade.tsx` | Glass redesign + update AI Try-On from "4 total" to "5 total" |

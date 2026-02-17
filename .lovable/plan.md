

# UI Refinements: AI Studio, Favorites, Upgrade Page, and Post-Login Upsell

## 1. Add "(AI generated)" compliance labels in AI Studio

In `src/components/AiStudioModal.tsx`, the subtitle currently reads "Virtual try-on & video" (line 547). This will be updated to **"Virtual try-on & video (AI generated)"** to satisfy App Store compliance requirements.

## 2. Fix AI Studio opening position and backdrop

Currently the AI Studio modal uses `flex items-end` on mobile (line 522), which makes it slide up from the bottom. The backdrop is `bg-black/40 backdrop-blur-sm`, but the inner sheet is `bg-white/70`, which can look washed out.

**Changes in `src/components/AiStudioModal.tsx`:**
- Change `flex items-end sm:items-center` to `flex items-center` so it opens centered on all screen sizes
- Change the backdrop from `bg-black/40 backdrop-blur-sm` to `bg-black/30 backdrop-blur-md` so the background content is still visible but softly blurred (not solid white)
- Keep `rounded-t-3xl sm:rounded-3xl` as `rounded-3xl` since it no longer anchors to the bottom

## 3. Remove product title from Favorites LikeCard

In `src/components/FavoritesLikesTab.tsx`, remove lines 110-113 (the `<h3>` showing `like.products.title`). This leaves only: brand name, price, Wish/Shop/Delete buttons.

## 4. Show Upgrade page automatically after login

Create a new component `src/components/PostLoginUpgradeModal.tsx` that:
- Uses a Radix Dialog to show the Upgrade page content as a modal overlay
- Only shows for non-premium users who just logged in
- Uses `sessionStorage` with a key like `upgrade_shown_this_session` so it only appears once per session
- Has an X button to dismiss easily

This modal will be placed in the main `Profile.tsx` page (since `/dashboard` redirects to `/profile`, and shoppers land on `/swipe` -- we can add it to the `Swipe.tsx` page instead since that's the post-login landing route per the memory). It will render the upgrade content inline (not navigate away) and can be closed freely.

**Integration in `src/pages/Swipe.tsx`:**
- Import and render `PostLoginUpgradeModal`
- It auto-opens if: user is authenticated, not premium, and `upgrade_shown_this_session` is not set in sessionStorage

## 5. Reduce Yearly/Monthly plan card sizes slightly

In `src/pages/dashboard/Upgrade.tsx`:
- Yearly card (line 305): reduce padding from `p-4 pt-6` to `p-3 pt-5`
- Monthly card (line 332): reduce padding from `p-4` to `p-3`
- Reduce font size of price from `text-lg` to `text-base`

## 6. Add check/X/star indicators to feature pills

In `src/pages/dashboard/Upgrade.tsx`, the 6 feature pills (lines 281-288) currently just show icon + name. Update them to include a small star or checkmark to indicate "Premium only":
- **AI Try-On, UGC Collabs, Redeem Points, Find Deals**: add a small star icon to indicate premium-exclusive
- **Height/Fit Check, Taste Learning**: these are available on free, so no star

Update the `features` array (lines 21-28) to include a `premiumOnly: boolean` flag, then conditionally render a small `Star` icon next to premium-exclusive features.

---

## Technical Summary

| File | Change |
|------|--------|
| `src/components/AiStudioModal.tsx` (line 547) | Add "(AI generated)" to subtitle |
| `src/components/AiStudioModal.tsx` (line 522) | Change `items-end` to `items-center` for centered modal |
| `src/components/AiStudioModal.tsx` (line 524) | Adjust backdrop opacity to `bg-black/30 backdrop-blur-md` |
| `src/components/AiStudioModal.tsx` (line 533) | Change `rounded-t-3xl sm:rounded-3xl` to `rounded-3xl` |
| `src/components/FavoritesLikesTab.tsx` (lines 110-113) | Remove product title `<h3>` element |
| `src/components/PostLoginUpgradeModal.tsx` | New component: dismissible upgrade modal shown once per session |
| `src/pages/Swipe.tsx` | Integrate `PostLoginUpgradeModal` for non-premium users |
| `src/pages/dashboard/Upgrade.tsx` (lines 293-345) | Reduce card padding slightly |
| `src/pages/dashboard/Upgrade.tsx` (lines 21-28, 281-288) | Add premium star indicators to feature pills |




# Fix Trending Buttons, Profile Navigation, and Post Viewing

## 1. Trending Looks: Replace Wishlist with Try-On Button

**Current**: Heart (always visible) + ShoppingBag/Wishlist (on hover) at top-right of each card.
**Change**: Heart (always visible) + Try-On/Shirt icon (always visible, below heart) -- matching the feed's SwipeCard layout.

**File: `src/components/TrendingStylesCarousel.tsx`**
- Replace the ShoppingBag hover button (lines 499-514) with an always-visible Try-On button using the `Shirt` icon
- On click, navigate to `/p/{productId}?tryon=true` (same behavior as the feed's Try-On button)
- Remove the `addToWishlistMutation` and related wishlist code since it's no longer needed here
- Import `Shirt` from lucide-react

## 2. Fix "User not found" When Clicking Own Name in People Tab

**Root cause**: The `UserProfile` page (`/profile/:userId`) queries the `public_profiles` table. RLS policy for anonymous users only shows profiles where `is_public = true`. The user "Sarah Fashion" has `is_public = false`, so when viewed without proper auth context (or as anon), it returns nothing.

**Fix (two-part):**

**File: `src/pages/UserProfile.tsx`**
- When `isOwnProfile` is true (the logged-in user is viewing their own profile), redirect to `/profile` (the main Profile page) instead of trying to load from `public_profiles`. This gives the user the full rich profile experience rather than the limited public view.
- Add a check: if `user?.id === id`, call `navigate('/profile', { replace: true })` and return early.

**File: `src/components/globe/CountryDrawer.tsx`**
- For the current user row, change `handleShopperClick(user.id)` to `navigate('/profile')` so it always goes to the main profile page (not the public profile view).

## 3. Post Cards Open Full Post View

**Current**: Clicking a post card in PostsSection navigates to `/profile/{userId}` -- which is useless (you're already on your profile).
**Change**: Open the post in a detail view.

**File: `src/components/profile/PostsSection.tsx`**
- Add a state variable `selectedPost` to track which post to view
- Create a simple full-screen post viewer dialog/drawer that shows:
  - The post image at full size
  - The tagged product circles (clickable, linking to product pages)
  - The caption text
  - The visibility badge
- Use a Radix Dialog or Drawer for the viewer
- On click of a post card, set `selectedPost` to that post's data and open the viewer

## 4. Drawer Swipe-to-Expand Improvements

The swipe gesture is already implemented (lines 91-103 in CountryDrawer.tsx), but the touch area may be too small or conflicting with the Drawer's own drag behavior.

**File: `src/components/globe/CountryDrawer.tsx`**
- Extend the touch target area beyond just the DrawerHeader -- add touch handlers to a visible "grab bar" area at the top of the drawer content
- Reduce the swipe threshold from 50px to 30px for more responsive feel
- Add `touch-action: none` CSS to the swipe area to prevent browser interference

## 5. Ensure Brand Follows Show on Profile

This is already working via `useFollowBrands` hook used in both `CountryDrawer.tsx` (Brands tab follow buttons) and `BrandsSection.tsx` (profile page). The `brand_follows` table is the single source of truth for both. No code change needed -- just confirming the link is intact.

---

## Files Changed

```
File                                          | Changes
----------------------------------------------|--------
src/components/TrendingStylesCarousel.tsx     | Replace wishlist button with Try-On (Shirt icon)
src/pages/UserProfile.tsx                     | Redirect own profile to /profile
src/components/globe/CountryDrawer.tsx        | Current user clicks go to /profile; improve swipe threshold
src/components/profile/PostsSection.tsx       | Add post detail viewer dialog on card click
```

## Technical Notes

- The Try-On button navigates to `/p/{productId}?tryon=true`, reusing existing product page try-on logic
- Own-profile redirect uses `navigate('/profile', { replace: true })` to avoid back-button loops
- The post viewer will use a Dialog component with the post image displayed at full width, tagged product circles overlaid, and caption below
- Swipe threshold reduced to 30px for better mobile responsiveness
- No database changes required



# Profile + Explore Enhancements

## Overview

Seven changes across the Profile page and Explore drawers: replace Settings button with New Post, fix post tapping, simplify People tab to names-only with follow buttons, add follow buttons to Brands tab, make Posts grid denser (5-6 per row), enable swipe-to-expand on drawers, and align Trending Looks card design with list view cards.

---

## 1. Replace "Settings" with "New Post" in Profile Summary

**Current**: Two buttons -- "Edit Profile" and "Settings" (both go to /settings).
**Change**: Replace "Settings" button with "New Post" button that opens the CreateStyleLinkPostModal.

**File: `src/components/profile/ProfileSummaryCard.tsx`**
- Replace Settings icon/label with Plus icon and "New Post" label
- Accept an `onNewPost` callback prop (triggered by parent)
- Parent (`Profile.tsx`) passes a handler that opens the create post modal

**File: `src/pages/Profile.tsx`**
- Add state for `showCreatePostModal`
- Pass `onNewPost` to ProfileSummaryCard
- Render `CreateStyleLinkPostModal` at the top level

---

## 2. Fix Posts Not Tappable / Not Editable

**Current**: Post cards in PostsSection have no `onClick` handler -- they are just display divs.
**Change**: Add `onClick` to each post card that navigates to the post detail or edit view.

**File: `src/components/profile/PostsSection.tsx`**
- Add `onClick={() => navigate(`/profile/${user.id}`)}` or a post detail route to each post card
- Since there may not be a dedicated post detail page, navigate to the user's own profile page where posts are visible, or open an edit modal
- Best approach: add `onClick` that navigates to `/community/post/${post.id}` if that route exists, or open a view/edit modal

*Need to check if a post detail route exists:*

If no post detail route exists, the simplest fix is to make tapping a post open the CreateStyleLinkPostModal in edit mode (passing the post data), or navigate to the user's profile. For now, we will navigate to the user profile which shows posts, and add a note that a dedicated post view can be added later.

---

## 3. Trending Looks Card Design -- Match List View

**Current**: Trending cards use a gradient overlay with hover-only action buttons (heart, shopping bag) and a "Shop Now" button. The heart and shopping bag appear on hover inside white circles at top-right.
**Change**: Make the heart icon always visible (not hover-only) and match the list view card style. Remove the triangular badge styling difference.

**File: `src/components/TrendingStylesCarousel.tsx`**
- Move the Heart button out of the hover-only container -- make it always visible at top-right
- Keep the "Shop Now" button in the hover overlay as-is
- Match the heart styling to the list view cards (smaller, always-visible, filled red when liked)
- Remove or simplify the `#{n} Trending` badge to be less prominent (optional, based on list view style)

---

## 4. People Tab -- Names Only, Content on Click

**Current**: The People tab shows each shopper with their avatar, name, AND their public outfits/items displayed inline (grid of 3 cards per person).
**Change**: Show only avatar + name + follow button. Content only appears after clicking the person's name (navigates to their profile).

**File: `src/components/globe/CountryDrawer.tsx`**
- **Current user section**: Remove the inline grids showing "Your public outfits" and "Your shared items". Keep only the avatar row with name, visibility toggle, and a follow indicator
- **Other shoppers**: Remove `userFits` grid display. Keep only the avatar + name row
- Add a **Follow button** next to each shopper name (using `useFollows` hook)
- Clicking the name still navigates to `/profile/{id}`

---

## 5. Follow Button on Brands in Explore

**Current**: Brand cards in the Brands tab show avatar + name only, clicking navigates to brand page.
**Change**: Add a small "Follow" button next to each brand name.

**File: `src/components/globe/CountryDrawer.tsx`**
- Import `useFollowBrands` hook
- Add a Follow/Following toggle button inside each brand card
- Keep the card still navigable to `/brand/{slug}` on avatar/name click
- The follow button stops propagation so it doesn't navigate

---

## 6. Posts Grid -- 5-6 Per Row

**Current**: Posts in the "Posts" sub-tab use `grid-cols-3` (3 per row).
**Change**: Switch to `grid-cols-5` on mobile and `grid-cols-6` on wider screens.

**File: `src/components/globe/CountryDrawer.tsx`**
- Change Shopper Posts grid from `grid-cols-3 gap-2` to `grid-cols-5 gap-1.5`
- Reduce card padding and text size to fit
- Same for Community Outfits and Shared Items grids in the Posts sub-tab
- Remove section headers or make them more compact (single line with icon + count)

---

## 7. Swipe-to-Expand Drawer

**Current**: The drawer only expands via the "View All" button click.
**Change**: Allow swiping up on the drawer header area to expand it.

**File: `src/components/globe/CountryDrawer.tsx`**
- Add touch event handlers (`onTouchStart`, `onTouchMove`, `onTouchEnd`) to the DrawerHeader
- Track swipe direction: if user swipes up more than 50px, set `isExpanded = true`
- If user swipes down more than 50px while expanded, set `isExpanded = false`
- This complements the existing button toggle

---

## Files Changed Summary

```
File                                               | Changes
---------------------------------------------------|--------
src/components/profile/ProfileSummaryCard.tsx      | Replace Settings with New Post button
src/pages/Profile.tsx                              | Add create post modal state, pass to summary card
src/components/profile/PostsSection.tsx            | Add onClick navigation to post cards
src/components/TrendingStylesCarousel.tsx           | Make heart always visible, match list view style
src/components/globe/CountryDrawer.tsx              | People: names only + follow; Brands: follow button; Posts: 5-col grid; Swipe-to-expand
```

---

## Technical Details

- **Follow hooks**: `useFollows()` for user-to-user follows (People tab), `useFollowBrands()` for brand follows (Brands tab). Both already exist with optimistic updates.
- **Swipe gesture**: Pure touch events on DrawerHeader -- `touchStartY` captured on `onTouchStart`, delta calculated on `onTouchEnd`. No external gesture library needed.
- **Posts grid**: `grid-cols-5` with `gap-1.5` fits ~5 small square thumbnails in the drawer width. Each card will be roughly 60-65px wide.
- **Post click**: Will navigate to `/profile/{userId}` as a fallback since no dedicated post detail route exists. A future enhancement can add a post detail/edit page.


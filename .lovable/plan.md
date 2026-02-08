

# Profile Layout Reorder + Wardrobe Cards + Carousel Sections + Public Posts on Explore

## Summary

Three areas of work:
1. **Profile page**: Reorder sections, convert Favorites and Posts to small horizontal carousels, bring back the Wardrobe (ClosetOutfitsSection) with its "Create & Earn" and "Add your items" cards
2. **Explore page (CountryDrawer)**: Add actual public shopper posts from the `posts` table to the "Posts" sub-tab, shown alongside existing community outfits and shared items

---

## 1. Profile Page Section Reorder

Current order:
```text
1. ProfileSummaryCard
2. YourFitPill
3. FavoritesSection (2x2 grid)
4. BrandsSection
5. Trending Looks
6. PostsSection (2-column grid)
7. Events
8. Benefits & Offers
```

New order:
```text
1. ProfileSummaryCard
2. YourFitPill
3. PostsSection (small horizontal carousel)    <-- moved UP, changed to carousel
4. FavoritesSection (small horizontal carousel) <-- changed to carousel
5. Trending Looks
6. Wardrobe / ClosetOutfitsSection (brought back) <-- RE-ADDED
7. BrandsSection                                <-- moved down
8. Events
9. Benefits & Offers
```

**File: `src/pages/Profile.tsx`**
- Import `ClosetOutfitsSection`
- Reorder the JSX sections to match the new order above

---

## 2. FavoritesSection: Convert to Small Horizontal Carousel

Currently shows a 2x2 grid of 4 liked products. Will be changed to a **small horizontal scroll carousel** (similar to trending but smaller cards).

**File: `src/components/profile/FavoritesSection.tsx`**
- Replace the 2x2 grid with a horizontal scrollable row
- Show up to 4 liked product cards as small square thumbnails (~28vw wide) in a scrollable strip
- Each card: rounded-xl, product image, tappable (navigates to `/p/{id}`)
- Keep the existing `useLikedProducts` hook (reads from `likes` table -- properly linked to hearts)
- Keep empty state as-is
- Keep "View all" link

---

## 3. PostsSection: Convert to Small Horizontal Carousel

Currently shows a 2-column grid. Will be changed to a **small horizontal scroll carousel** matching Favorites style.

**File: `src/components/profile/PostsSection.tsx`**
- Replace the 2-column grid with a horizontal scrollable row
- Each post card: small square thumbnail with `PostProductCircles` overlay
- Keep "+ New post" button in the header
- Keep empty state as-is
- Keep the `CreateStyleLinkPostModal` trigger

---

## 4. Bring Back Wardrobe / ClosetOutfitsSection

The existing `ClosetOutfitsSection` component has both the "Add your items" card (left -- shows wardrobe item thumbnails with a + button) and the "Create & Earn" card (right -- shows cycling community outfit images with creator info). This component is fully functional and just needs to be re-added to the Profile page.

**File: `src/pages/Profile.tsx`**
- Import `ClosetOutfitsSection` from `@/components/dashboard/ClosetOutfitsSection`
- Render it between Trending Looks and Brands sections

---

## 5. Public Posts on Explore (CountryDrawer)

The "Posts" sub-tab in the CountryDrawer currently shows only community outfits (from `fits` table) and shared wardrobe items. It does NOT show actual shopper posts from the `posts` table.

**File: `src/components/globe/CountryDrawer.tsx`**

Add a new section "Shopper Posts" at the top of the Posts sub-tab:
- New query: fetch posts from `posts` table where `visibility = 'public_explore'` and `user_id` is in the `shopperIds` array for the selected country
- Also fetch `post_images` (for thumbnails) and `post_products` (for product circle overlays)
- Render as a 3-column grid of post image cards, matching the existing community outfits style
- Each card shows the first post image with `PostProductCircles` overlay
- Section header: "Shopper Posts" with a Sparkles icon and count
- Appears above the existing "Community Outfits" and "Shared Items" sections
- If no shopper posts exist for that country, section is simply not shown

---

## Files Changed Summary

```text
File                                              | Action
--------------------------------------------------|--------
src/pages/Profile.tsx                             | Edit -- reorder sections, add ClosetOutfitsSection import
src/components/profile/FavoritesSection.tsx        | Edit -- convert 2x2 grid to horizontal scroll carousel
src/components/profile/PostsSection.tsx            | Edit -- convert 2-col grid to horizontal scroll carousel
src/components/globe/CountryDrawer.tsx             | Edit -- add public posts query + section to Posts sub-tab
```

No new files, no database changes needed. All queries use existing tables and RLS policies.

---

## Technical Notes

- **Favorites carousel** uses `useLikedProducts` hook which reads from the `likes` table -- this is the same source of truth as swipe hearts, so the sync is correct
- **Posts carousel** uses the existing `user-posts` query that fetches from the `posts` table with `post_images` and `post_products` joins
- **ClosetOutfitsSection** is already a complete component used on the RoleDashboard -- it includes wardrobe items preview, community outfit cycling, "Create & Earn" CTA, and guest mode handling
- **CountryDrawer posts** will query `posts` with `visibility = 'public_explore'` and filter by shopper IDs in the selected country, reusing the `PostProductCircles` component for product overlays
- Carousel styling: horizontal overflow-x-auto with `scrollbar-hide`, `snap-x`, small gap, cards sized at approximately 120-130px square to feel compact (smaller than trending cards)

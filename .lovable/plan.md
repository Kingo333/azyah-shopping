

# Redesign Azyah Profile (Phia-Inspired) + Follow Brands + Favorites + Posts + Like Sync Fix

This is a large feature set spanning 7 phases. Below is the complete implementation plan incorporating all the tweaks from your review.

---

## Current State Analysis

**Likes bug root cause confirmed:** `SwipeDeck` writes to both `swipes` (for ML) AND `likes` (for favorites). But `ProductMasonryGrid` reads liked state from `swipes` only (action='right') and toggles via `swipes` -- never touching `likes`. This dual-source causes the sync bug.

**Brand follows:** The existing `follows` table (follower_id, following_id) is used for BOTH user-follows and brand-follows (BrandsTab uses `useFollows` for brands). A dedicated `brand_follows` table is cleaner but the `follows` table already works. We will create `brand_follows` for a proper separation.

**Posts system:** `posts`, `post_images`, `post_products` tables already exist with full schemas. `post_products` already has `external_url`, `external_title`, `external_image_url`, `external_brand_name` columns -- perfect for URL pasting. `visibility` column exists with values: `public_explore`, `stylelink_only`, `private`. `CreateStyleLinkPostModal` already supports product tagging and visibility toggle.

**StyleLink:** Referenced in ~29 files. Route at `/u/:username`. `StyleLinkCardCompact` on Profile and Dashboard pages.

---

## Phase 1: Database Migration (1 migration file)

Create `brand_follows` table:

```
brand_follows
  id          uuid PK default gen_random_uuid()
  user_id     uuid NOT NULL references auth.users
  brand_id    uuid NOT NULL references brands(id) -- brands.id is uuid
  created_at  timestamptz default now()
  UNIQUE(user_id, brand_id)
```

Indexes:
- `idx_brand_follows_user_id ON brand_follows(user_id)`
- `idx_brand_follows_brand_id ON brand_follows(brand_id)`

RLS policies:
- SELECT: `auth.uid() = user_id` (user can see own follows)
- INSERT: authenticated, `auth.uid() = user_id`
- DELETE: `auth.uid() = user_id`

No changes needed to `posts`, `post_products`, `post_images` -- schemas already support everything including external product URLs with cached metadata.

---

## Phase 2: Like Sync Fix (Critical Bug)

### Problem
Three competing hooks: `useLikedProducts` (reads `likes`), `useLikeFit` (reads/writes `likes` for fits), and `ProductMasonryGrid` inline code (reads/writes `swipes`). Need ONE canonical system.

### Solution: Unified `useProductLikes` hook

Create `src/hooks/useProductLikes.ts`:
- **Single query key:** `['product-likes', userId]`
- **Reads from:** `likes` table (canonical source)
- **Exposes:**
  - `likedIds: Set<string>` -- fast O(1) lookup
  - `isLiked(productId: string): boolean`
  - `toggleLike(productId: string)` -- mutation with optimistic update
- **On toggle (like):** 
  1. Insert into `likes` table
  2. Also insert into `swipes` with `action: 'right'` (keeps ML training data consistent per your tweak #1)
- **On toggle (unlike):**
  1. Delete from `likes` table
  2. Delete matching `swipes` row for that product
- **Query invalidation on success:** `['product-likes']`, `['liked-products']`

### Files changed:
- **New:** `src/hooks/useProductLikes.ts`
- **Edit:** `src/components/ProductMasonryGrid.tsx` -- replace inline `swipes`-based state with `useProductLikes` hook. Remove the `fetchLiked` useEffect and `handleLikeToggle` function, replace with `const { isLiked, toggleLike } = useProductLikes()`
- **Edit:** `src/components/SwipeDeck.tsx` -- keep existing `handleLike` behavior (writes to both) but ensure query invalidation includes `['product-likes']` so list view updates instantly
- **Edit:** `src/components/TrendingStylesCarousel.tsx` -- replace the `addToLikesMutation` inline mutation with `useProductLikes().toggleLike` for consistency

### Retiring old hooks:
- `useLikedProducts` -- keep for Profile favorites section (it returns full product details, not just IDs). But update its query key to `['liked-products', userId]` and make it refetch when `['product-likes']` is invalidated.
- `useLikeFit` -- keep as-is (it's for fits/outfits, separate entity)

---

## Phase 3: Follow Brands Backend + Hook

### New hook: `src/hooks/useFollowBrands.ts`
- `useFollowedBrands()` -- fetches user's followed brand IDs from `brand_follows`
- `useFollowedBrandsWithDetails()` -- joins with `brands` table to get name + logo_url (single query, no N+1)
- `followBrand(brandId)` / `unfollowBrand(brandId)` -- mutations with optimistic updates
- `isFollowingBrand(brandId)` -- derived from cached set

### Integration:
- **Edit `src/components/explore/BrandsTab.tsx`:** Replace `useFollows()` (user follows) with `useFollowBrands()` for brand cards
- **Edit `src/pages/BrandDetail.tsx`:** Add follow/unfollow button using `useFollowBrands`
- **Keep `useFollows`** unchanged for user-to-user following

---

## Phase 4: Enhanced Post Creation (Product Links + Visibility)

### Key insight: `CreateStyleLinkPostModal` already does 90% of what's needed
It supports image upload, caption, product tagging (search Azyah catalog), and visibility toggle. We need to:

1. **Add URL pasting** (tweak #4): Support both "Search Azyah catalog" AND "Paste external URL"
   - Add a "Paste link" tab/button alongside the product search
   - When a URL is pasted, create a `post_products` row using the `external_*` columns (already exist in schema: `external_url`, `external_title`, `external_image_url`, `external_brand_name`)
   - Use basic URL metadata extraction (fetch Open Graph tags via edge function or simple client-side approach)

2. **Simplify visibility** (tweak #5): Use `public` and `private` only
   - Map existing `public_explore` to `public`, drop `stylelink_only`
   - Toggle label: "Public" (visible in Explore + Feed) / "Private" (only on your Profile)

3. **Support up to 5 images** (increase from current limit of 4 in `CreatePostModal`, or 1 in `CreateStyleLinkPostModal`)

4. **Product thumbnails in post display**: When rendering posts, show tagged products as small circular thumbnails stacked vertically on the right side of the post image (matching the reference image -- black top, jeans, boots as small circles)

### Files:
- **Edit:** `src/components/stylelink/CreateStyleLinkPostModal.tsx` -- add "Paste URL" input, change visibility to public/private toggle, increase image limit
- **Edit:** `src/hooks/useCreateStyleLinkPost.ts` -- update visibility type, support external product metadata
- **New:** `src/components/PostProductCircles.tsx` -- renders small circular product thumbnails overlaid on post image (matching the Phia reference image style)

---

## Phase 5: Profile Page Redesign (Phia-Inspired)

Complete rewrite of `src/pages/Profile.tsx` with new section components.

### New Layout Order:

```
1. Header (DashboardHeader -- keep existing)
2. Profile Summary Card
   - Large centered avatar
   - Name + @username
   - Quick actions: "Edit Profile" | "Settings"
   - Optional counters: Posts | Brands followed
3. Your Fit (compact card -- tweak #7)
   - Small pill: "Height [x] - [fit completeness]"
   - CTA: "Complete your fit" / "Update fit"
4. Your Favorites (from likes table)
   - Empty: "Save items you love" + "Find items" CTA
   - With items: 2x2 grid of 4 liked product images
   - "View all" arrow link
5. Your Brands (from brand_follows)
   - Row of up to 8 circular brand logos
   - Empty: "Follow brands you love" + CTA
   - "Browse brands" link
6. Trending Looks (existing, smaller cards ~20%)
   - Keep category filter but smaller
7. Your Posts (from posts table)
   - 2-column grid of user's posts with product circles overlay
   - "+ New post" button opens CreateStyleLinkPostModal
8. Events (existing, cleaner card)
9. Benefits & Offers (existing)
```

### Removed from Profile:
- StyleLink card (hidden via feature flag)
- Style Profile progress ring (replaced by compact "Your Fit" pill)
- No "Recently Viewed" section

### New components:
- `src/components/profile/ProfileSummaryCard.tsx` -- avatar, name, username, quick action pills
- `src/components/profile/FavoritesSection.tsx` -- 2x2 grid from `useLikedProducts`, empty state
- `src/components/profile/BrandsSection.tsx` -- horizontal brand logo circles from `useFollowBrands`
- `src/components/profile/YourFitPill.tsx` -- compact height/measurements card
- `src/components/profile/PostsSection.tsx` -- user's posts grid with product circles, "+ New post" trigger

### Style rules (Phia-inspired):
- Clean white/ivory background (existing `bg-[hsl(var(--azyah-ivory))]`)
- Section titles: larger serif font (`text-lg font-serif`), generous vertical spacing
- Cards: `rounded-xl`, subtle border, light shadow (`shadow-sm`)
- Buttons: pill-style (`rounded-full`), Azyah accent color for primary CTAs only
- No heavy gradients
- More whitespace between sections (`space-y-6`)

---

## Phase 6: Style Link Disable (Feature Flag + Route Guard)

1. **Feature flag:** Add `style_link: false` to `src/lib/features.ts`
2. **Profile:** Remove `StyleLinkCardCompact` import and rendering (done in Phase 5 redesign)
3. **Dashboard:** Remove `StyleLinkCardCompact` from `src/components/RoleDashboard.tsx`
4. **Route guard** (tweak #6): In `src/App.tsx`, wrap `/u/:username` route with a check:
   - If `features.style_link === false`, redirect to `/profile`
   - Keep all StyleLink code files intact for future re-enable
5. **Remove from navigation** -- no entry point from Profile, Dashboard, or Settings

---

## Phase 7: Posts on Explore Globe (Optional/Deferred)

Add a "Posts" tab to the Explore page:
- Add as a 6th tab (or replace one)
- When active, show a horizontal carousel of recent public posts at the bottom
- Posts come from `posts` table where `visibility = 'public'`

This is lowest priority and can be deferred. The core value is posts on the Profile page first.

### Files:
- **Edit:** `src/pages/Explore.tsx` -- add Posts tab
- **New:** `src/components/explore/PostsOverlay.tsx` -- carousel of public posts

---

## Implementation Sequence

```text
Step | Item                                     | Scope
-----|------------------------------------------|---------------------------
1    | DB migration: brand_follows table         | 1 migration file
2    | useProductLikes hook (like sync fix)       | 1 new hook
3    | Update ProductMasonryGrid                  | 1 file edit
4    | Update SwipeDeck query invalidation        | 1 file edit (small)
5    | Update TrendingStylesCarousel              | 1 file edit
6    | useFollowBrands hook                       | 1 new hook
7    | Update BrandsTab + BrandDetail             | 2 file edits
8    | Enhance CreateStyleLinkPostModal           | 1 file edit
9    | PostProductCircles component               | 1 new component
10   | Profile page full redesign                 | 1 major rewrite
11   | ProfileSummaryCard component               | 1 new component
12   | FavoritesSection component                 | 1 new component
13   | BrandsSection component                    | 1 new component
14   | YourFitPill component                      | 1 new component
15   | PostsSection component                     | 1 new component
16   | Style Link feature flag + route guard      | 3 file edits
17   | Posts on Explore (deferred)                | 2 files
```

---

## Addressing Your Specific Tweaks

1. **ML data consistency:** `toggleLike()` in `useProductLikes` will ALSO write a swipe event to `swipes` table so training data stays consistent regardless of where the like happens.

2. **Hook consolidation:** One public hook `useProductLikes` for liked IDs + toggle. `useLikedProducts` kept only for fetching full product details (Profile favorites). Both share invalidation via `['product-likes']` key.

3. **Brand follows indexes:** Migration includes indexes on both `user_id` and `brand_id`. Profile loads brand icons via a single join query (no N+1).

4. **URL pasting for posts:** Both methods supported -- search Azyah catalog OR paste any external URL. Uses existing `post_products.external_*` columns.

5. **Visibility simplified:** `public` and `private` only. Existing `public_explore` mapped to `public`.

6. **StyleLink route guard:** Feature flag check in the route -- disabled means redirect to `/profile`.

7. **Your Fit kept visible:** Compact pill card stays on Profile (height + fit completeness) so the fit-first differentiator remains visible.

---

## Technical Notes

- `brands.id` is `uuid` -- `brand_follows.brand_id` will match as `uuid`
- `post_products` already has all the external metadata columns (`external_url`, `external_title`, `external_image_url`, `external_price_cents`, `external_currency`, `external_brand_name`, `external_brand_logo_url`) -- no schema changes needed for URL pasting
- Posts RLS already allows: anyone can view all posts, users can create/update/delete own posts
- The reference image shows product thumbnails as small circles stacked vertically on the right side of the post image with a subtle white border -- this will be the `PostProductCircles` component design
- `follows` table remains untouched for user-to-user follows
- All existing routes continue working; StyleLink code kept intact but unreachable


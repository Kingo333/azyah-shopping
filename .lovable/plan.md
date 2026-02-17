

# IntroCarousel Pills, Feed Improvements, Trending Fix, Profile Compactness, and Unified Floating Nav

## Overview

Six changes: (1) Add "AI Try-On Image" and "AI Try-On Video" glass pills to the IntroCarousel, (2) Interleave user posts with tagged items into the masonry feed alongside community outfits, (3) Make the Quick Swipe section slightly smaller, (4) Fix Trending Looks try-on button to open AiStudioModal instead of navigating away, (5) Make the Profile Summary Card header shorter, (6) Replace the Profile page's bottom nav with the same floating glassmorphism pill used on the Feed page, with active-page highlighting on both.

---

## 1. IntroCarousel: Add AI Try-On Glass Pills

**File: `src/pages/onboarding/IntroCarousel.tsx`**

On the "See It On You" slide (slide index 2, `interactive-slider` type), add two glass pills below the subtitle text:

- "AI Try-On Image" pill with an `Image` icon
- "AI Try-On Video" pill with a `Video` icon

Styled identically to the floating nav in list view: `bg-white/50 backdrop-blur-xl border border-white/20 rounded-full` with small text. Placed as a horizontal row centered below the subtitle, above the BeforeAfterSlider. No other positioning changes.

---

## 2. Feed Masonry: Interleave User Posts with Tagged Items

**File: `src/components/ProductMasonryGrid.tsx`**

Currently, `CommunityOutfitBlock` is inserted every 12 products. Enhance this to also interleave **user posts** (from `posts` table with `post_products` and `post_images`) as a new `UserPostBlock` component.

- Fetch public user posts (with images and tagged products) alongside community outfits
- Create a `UserPostBlock` component: shows the post image full-width spanning both columns, with small circular tagged-product thumbnails overlaid (like the existing `PostProductCircles`), user avatar, and caption
- Alternate between `CommunityOutfitBlock` and `UserPostBlock` at each interleave point (e.g., community at position 12, user post at position 24, repeat)
- This breaks the masonry briefly with a full-width card, then resumes the grid

---

## 3. Quick Swipe: Make Slightly Smaller

**File: `src/components/MiniSwipePreview.tsx`**

- Reduce the card container from `max-w-[220px] aspect-[3/4]` to `max-w-[180px] aspect-[3/4]`
- Reduce outer section padding from `py-1` to `py-0.5`
- Reduce the header margin from `mb-1.5` to `mb-1`
- Reduce the "Swipe to train" pill text and font sizes proportionally
- Keep all drag/swipe logic, button positions, and overlay behavior intact -- only sizing changes

---

## 4. Trending Looks: Fix Try-On Button

**File: `src/components/TrendingStylesCarousel.tsx`**

The try-on button currently navigates to `/p/${product.id}?tryon=true`, which loads a product page. Instead, it should open the AiStudioModal directly (like the feed does).

- Accept an `onTryOnClick` callback prop on `TrendingStylesCarousel`
- Replace the `navigate(...)` call in the Shirt button's onClick with `onTryOnClick?.(product)`

**File: `src/pages/Profile.tsx`**

- Import `AiStudioModal`
- Add `showAiStudio` state
- Pass `onTryOnClick={() => setShowAiStudio(true)}` to `TrendingStylesCarousel`
- Render `<AiStudioModal open={showAiStudio} onClose={() => setShowAiStudio(false)} />`

---

## 5. Profile Summary Card: Make Header Shorter

**File: `src/components/profile/ProfileSummaryCard.tsx`**

- Reduce avatar from `h-20 w-20` to `h-16 w-16`
- Reduce top padding from `pt-6` to `pt-3`
- Reduce bottom padding from `pb-4` to `pb-2`
- Reduce name margin from `mt-3` to `mt-2`
- Reduce stats margin from `mt-3` to `mt-2`
- Reduce buttons margin from `mt-4` to `mt-2`

This keeps the same design but tightens vertical spacing.

---

## 6. Unified Floating Nav for Profile and Feed

**Current state**:
- Feed (list view) has an inline floating glassmorphism pill (`bg-white/50 backdrop-blur-xl rounded-full`) in `Swipe.tsx`
- Profile uses the standard `BottomNavigation` component (solid white bar with border-top)
- Neither highlights the active page in the floating nav

**Changes**:

**File: `src/pages/Swipe.tsx`** (list view floating nav, lines 382-404)
- Add active-page highlighting: the Feed/ShoppingBag icon gets `text-[hsl(var(--azyah-maroon))]` since we're on the feed page
- Other icons stay `text-foreground/60`

**File: `src/components/BottomNavigation.tsx`**
- When on the `/profile` page, render the same glassmorphism floating pill style instead of the solid bar
- Use the same classes: `bg-white/50 backdrop-blur-xl rounded-full py-2 px-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-white/20`
- Position with `fixed left-4 right-4` and `bottom: calc(var(--safe-bottom) + 16px)`
- Add active-page highlighting using `text-[hsl(var(--azyah-maroon))]` for the current page's icon, `text-foreground/60` for others
- This replaces the solid bar only on the profile page; other non-swipe pages keep the standard bar

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `src/pages/onboarding/IntroCarousel.tsx` | Add two glass AI try-on pills on the "See It On You" slide |
| `src/components/ProductMasonryGrid.tsx` | Fetch and interleave user posts with tagged items into masonry |
| `src/components/MiniSwipePreview.tsx` | Reduce card size from 220px to 180px max-width |
| `src/components/TrendingStylesCarousel.tsx` | Accept `onTryOnClick` prop instead of navigating |
| `src/pages/Profile.tsx` | Add AiStudioModal, pass onTryOnClick to TrendingStylesCarousel |
| `src/components/profile/ProfileSummaryCard.tsx` | Reduce vertical spacing for shorter header |
| `src/pages/Swipe.tsx` | Add active-page color to floating nav icons |
| `src/components/BottomNavigation.tsx` | Use floating glass pill on profile page with active highlighting |

---

## Technical Notes

- **Glass pill style**: Reuses `bg-white/50 backdrop-blur-xl border border-white/20 rounded-full` -- consistent with the feed's floating nav
- **Active page color**: `text-[hsl(var(--azyah-maroon))]` -- the app's brand maroon, already used in the standard bottom nav
- **User post interleaving**: Queries `posts` table with `post_images` and `post_products` joins, filtered to `visibility = 'public_explore'`. Displayed as a full-width break card between masonry chunks
- **MiniSwipePreview sizing**: Only CSS dimension changes; all motion values, drag constraints, and gesture thresholds remain identical
- **AiStudioModal**: Already imported and used in `Swipe.tsx`; same pattern replicated in `Profile.tsx`


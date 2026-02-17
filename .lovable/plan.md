

# Fix Profile Navigation from Explore + Post Detail Enhancements

## Overview

Three changes: (1) Remove the own-profile redirect so `/profile/:id` works for ALL users including yourself, enriching it with proper content tabs; (2) Add an "Edit" button to the post detail viewer; (3) Make tagged product circles clickable with platform-aware link handling (in-app browser on iOS, new tab on web, internal navigation for Azyah products).

---

## 1. Remove Own-Profile Redirect and Enrich UserProfile Page

**Problem**: The `useEffect` in `UserProfile.tsx` redirects logged-in users to `/profile` when they view their own ID. The user wants `/profile/:id` to be a dedicated "public view" page for ANY user -- even themselves -- showing that person's public content.

**File: `src/pages/UserProfile.tsx`**

- **Remove** the `useEffect` redirect (lines 87-91)
- **Fix the RLS issue**: The `public_profiles` table may return nothing for users with `is_public = false`. Instead, query from the `users_public` view (which has no visibility filter) as a fallback when `public_profiles` returns nothing
- **Add content tabs**: Expand from just "Posts" to three tabs: "Posts", "Outfits", "Items"
  - Posts: Public posts with images (already exists but needs `visibility = 'public_explore'` filter for non-own profiles)
  - Outfits: Public fits (`fits` table where `is_public = true`)
  - Items: Public wardrobe items (`wardrobe_items` where `public_reuse_permitted = true`)
- **Show social links**: Display website, bio, country from the profile data (already partially there, just ensure it renders)
- **Add Follow button**: Import `useFollows` and show a Follow/Following button on other users' profiles

**File: `src/components/globe/CountryDrawer.tsx`**

- **Revert** the current user click handler from `navigate('/profile')` back to `navigate('/profile/${user.id}')` so clicking your own name in the People tab goes to the enriched public profile view (line 590)

---

## 2. Add Edit Button to Post Detail Viewer

**File: `src/components/profile/PostsSection.tsx`**

- Add a "Edit" button (pencil icon) in the post detail dialog header area
- On click, close the detail viewer and open the `CreateStyleLinkPostModal` -- but since that modal doesn't currently support editing, we'll add a simpler inline edit approach:
  - Show an "Edit" button that opens the `CreateStyleLinkPostModal` with the existing post data pre-filled (will require adding an `editPost` prop to the modal)
- Alternatively (simpler): Add a "Delete" and "Edit caption" inline capability directly in the detail viewer (edit the text content, save via Supabase update)

**Approach chosen**: Add an Edit button that enables inline caption editing + save within the detail dialog. This avoids complex refactoring of the create modal.

- Add `isEditing` state + editable textarea for the caption
- Add a save mutation that updates `posts.content` via Supabase
- Show a pencil icon button in the detail view header

---

## 3. Make Tagged Product Circles Clickable with Platform-Aware Links

**File: `src/components/PostProductCircles.tsx`**

- Add an `onProductClick` callback prop to `PostProductCircles`
- Each circle becomes clickable (wrapping in a button or adding onClick)
- The click handler receives the product data (product_id, external_url, etc.)

**File: `src/components/profile/PostsSection.tsx`**

- Update the PostsSection query to also fetch `external_url` and `product_id` from `post_products`
- Pass an `onProductClick` handler to `PostProductCircles` inside the detail viewer
- The handler logic:
  1. If `product_id` exists (Azyah internal product): `navigate('/p/${product_id}')`
  2. If `external_url` exists (external retailer): call `openExternalUrl(external_url)` -- this already handles iOS (Safari View Controller via Capacitor Browser plugin) vs web (window.open) automatically
  3. If neither exists: show a toast "No link available"

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `src/pages/UserProfile.tsx` | Remove own-profile redirect; add fallback query; add Outfits + Items tabs; add Follow button |
| `src/components/globe/CountryDrawer.tsx` | Revert current user click to navigate to `/profile/${id}` |
| `src/components/profile/PostsSection.tsx` | Add Edit button with inline caption editing; fetch `external_url` + `product_id`; pass `onProductClick` to circles |
| `src/components/PostProductCircles.tsx` | Add `onProductClick` prop; make circles clickable |

---

## Technical Details

- **RLS fallback**: `public_profiles` filters by `is_public`. For the profile view to work for all users, query `users_public` (a view without the `is_public` filter) when `public_profiles` returns no result.
- **Platform-aware links**: `openExternalUrl()` from `src/lib/openExternalUrl.ts` already handles iOS (Capacitor Browser plugin for Safari View Controller) vs web (window.open). No new dependencies needed.
- **Capacitor version**: All Capacitor packages remain at v7. The `@capacitor/browser` package (already installed at v7.0.3) provides the in-app browser functionality.
- **Post editing**: Uses a simple `supabase.from('posts').update({ content }).eq('id', postId)` call. Only the caption is editable inline; full re-editing of images/tags would require the create modal refactor (future enhancement).


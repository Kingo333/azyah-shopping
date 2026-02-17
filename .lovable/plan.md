

# Fix: Community Outfits & User Posts Not Appearing in Feed

## Problem
The feed's masonry grid is supposed to alternate between product chunks, community outfit blocks, and user post blocks. But **both data-fetching queries fail silently with 400 errors**, so the interleaving blocks never render.

## Root Causes

### 1. Community Outfits query fails (no FK relationship)
The query tries `user:users(name, avatar_url)` but the `fits` table has no foreign key to `users`. PostgREST cannot resolve the join.

**Fix:** Replace the embedded join with two separate queries -- first fetch `fits`, then fetch the user data for each unique `user_id` from the `users` table manually. Or simpler: just drop the `user` join and fetch user info separately.

### 2. User Posts query fails (wrong column names)
The query selects `post_products(image_url, title, ...)` but the actual columns are `external_image_url` and `external_title`. No `image_url` or `title` columns exist in `post_products`.

**Fix:** Update the select to use the correct column names: `external_image_url`, `external_title`.

## Changes

### File: `src/components/ProductMasonryGrid.tsx`

**Community Outfits fetch (around line 40-55):**
- Remove `user:users(name, avatar_url)` from the select since there's no FK
- Fetch fits without user join: `.select('id, name, title, image_preview, render_path, user_id, is_public')`
- After getting fits, do a second query to `users` table for the distinct user IDs to get name/avatar
- Merge user data into the outfit objects

**User Posts fetch (around line 60-80):**
- Change `post_products(image_url, title, product_id, external_url)` to `post_products(external_image_url, external_title, product_id, external_url)`
- Also remove the `user:users(...)` join from posts if that table also lacks an FK (needs verification -- but the posts table likely has an FK since it's a core table)
- Update the mapping to use `external_image_url` as `image_url` and `external_title` as `title`

**UserPostBlock and downstream components:**
- Ensure they receive the correctly-named fields (the mapping in ProductMasonryGrid normalizes them, so no changes needed downstream)

### File: `src/components/UserPostBlock.tsx`
- No changes needed -- it receives already-mapped data

### File: `src/components/CommunityOutfitBlock.tsx`
- No changes needed -- it receives already-mapped data

## Technical Details
- The `fits` table has a `user_id` column but no foreign key constraint to `public.users`. We work around this with a manual two-step fetch.
- The `post_products` table columns are: `id`, `post_id`, `product_id`, `external_url`, `external_title`, `external_image_url`, `external_price_cents`, `external_currency`, `external_brand_name`, `external_brand_logo_url`, `position_x`, `position_y`, `label`.
- Both queries currently fail with HTTP 400 but the errors are silently ignored (`if (data)` check skips the null result).

## Result
After these fixes, the feed in list view mode will show the intended pattern: 12 product cards in masonry, then a community outfit block or user post block, then 12 more products, and so on alternating.


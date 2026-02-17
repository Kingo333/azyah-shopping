

# Fix User Profile Page: Product Circles, Outfit & Item Navigation

## Issue 1: Post Product Circles Not Showing

The posts query only selects `post_images` but does NOT include `post_products`. Without this data, there are no tagged product circles to render.

**Fix in `src/pages/UserProfile.tsx`:**

- Update the posts query select to include `post_products(external_image_url, external_title, product_id, external_url)`
- Import `PostProductCircles` component
- Map the `post_products` data and render `PostProductCircles` on each post thumbnail in the grid

## Issue 2: Clicking Outfits Should Navigate to Dress Me Community

Currently, outfit cards are not clickable (no onClick handler). Tapping an outfit should take the user to the community outfits area.

**Fix:**

- Add `onClick={() => navigate('/dress-me/community')}` to each outfit card in the Outfits tab grid

## Issue 3: Clicking Items Should Navigate to Dress Me Community

Same issue -- item cards have no navigation. Tapping a public item should take the user to the community area.

**Fix:**

- Add `onClick={() => navigate('/dress-me/community')}` to each item card in the Items tab grid

---

### Technical Details

**File: `src/pages/UserProfile.tsx`**

1. Add import for `PostProductCircles` from `@/components/PostProductCircles`
2. Update line 89 posts query select:
   ```
   .select(`id, content, created_at, visibility, post_images(id, image_url, sort_order), post_products(external_image_url, external_title, product_id, external_url)`)
   ```
3. In the Posts grid (around line 304-318), after the image and content overlay, add:
   ```tsx
   <PostProductCircles
     products={(post.post_products || []).map((pp: any) => ({
       image_url: pp.external_image_url,
       title: pp.external_title,
       product_id: pp.product_id,
       external_url: pp.external_url,
     }))}
   />
   ```
4. On the outfit card div (line 341), add: `onClick={() => navigate('/dress-me/community')}`
5. On the item card div (line 375), add: `onClick={() => navigate('/dress-me/community')}`

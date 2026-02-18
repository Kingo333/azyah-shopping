

## Fix Three Issues: People Tab Display, Post Click-to-Open, and Premium Modal Visibility

### Issue 1: People Tab in Explore Drawer Not Showing Users
**Root Cause Investigation Needed**: The People tab in the Country Drawer (`src/components/globe/CountryDrawer.tsx`) has the correct code to show "You" (with visibility toggle) and other shoppers. The queries depend on:
- `user?.id` being truthy (for the "You" section)
- `countryCode` matching the user's stored country (converted via `getCountryCodeFromName`)

The most likely cause is a country name-to-code mismatch -- if a user's `country` value in the `users` table doesn't match what `getCountryCodeFromName()` expects, they won't appear in the drawer. Additionally, the header stat text in `Explore.tsx` (lines 256-264) may briefly show brand-related text while shopper data loads.

**Fix**: Add fallback handling and ensure the "You" section always appears regardless of country match. No code changes needed to the query logic itself unless a data mismatch is confirmed.

---

### Issue 2: Posts Not Clickable on Public Profile (`/profile/:userId`)
**Root Cause**: In `src/pages/UserProfile.tsx`, the posts grid (lines 302-329) renders post thumbnails but has **no onClick handler** and **no post detail dialog**. Unlike the own-profile `PostsSection.tsx` which has a `selectedPost` state and a `Dialog` for viewing post details, the `UserProfile.tsx` page is completely missing this functionality.

**Fix** (in `src/pages/UserProfile.tsx`):
1. Add `selectedPost` state variable
2. Add `onClick={() => setSelectedPost(post)}` to each post grid item
3. Add a post detail `Dialog` (similar to `PostsSection.tsx`) that shows:
   - Full post image
   - `PostProductCircles` with interactive product tags
   - Product tags that navigate to `/p/{product_id}` for internal products or open external URLs via `openExternalUrl`
   - Caption text
   - Date display
4. Import the necessary components (`Dialog`, `DialogContent`, `openExternalUrl`)

---

### Issue 3: Premium Upgrade Modal Only Shows for Shopper Users
**Root Cause**: The `PostLoginUpgradeModal` is rendered inside the `/swipe` page (`src/pages/Swipe.tsx`), which is role-gated to `roles={['shopper', 'admin']}` in `src/App.tsx` (line 156). Brand users never visit `/swipe`, so they never see the upgrade modal.

**Fix**: Move or duplicate the `PostLoginUpgradeModal` to a location accessible to all authenticated users. The best candidate is rendering it inside the main `Profile` page (or a shared layout component) since all user roles visit `/profile`.

---

### Technical Changes

| File | Change |
|------|--------|
| `src/pages/UserProfile.tsx` | Add `selectedPost` state, onClick handlers on post grid items, and a post detail Dialog with product tag interactions (using `openExternalUrl` for external links, navigate for internal products) |
| `src/pages/UserProfile.tsx` | Import `Dialog`, `DialogContent` from ui, and `openExternalUrl` from lib |
| `src/components/PostLoginUpgradeModal.tsx` or layout | Render the modal in a shared location (e.g., Profile page) so brand users also see it |
| `src/pages/Profile.tsx` (or equivalent) | Add `<PostLoginUpgradeModal />` so all authenticated users can see the upgrade prompt |


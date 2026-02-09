

# Fix Profile Section Sizes + Favorites Bug + Capacitor Versions

## 1. Make Posts and Brands Sections Smaller

Both sections will be made more compact to match the visual weight of the Favorites carousel.

**PostsSection (`src/components/profile/PostsSection.tsx`):**
- Reduce card size from `w-[120px] h-[120px]` to `w-[100px] h-[100px]`
- Reduce loading skeleton to match
- Reduce gap from `gap-2` to `gap-1.5`

**BrandsSection (`src/components/profile/BrandsSection.tsx`):**
- Reduce avatar circles from `h-12 w-12` to `h-10 w-10`
- Reduce loading skeletons from `w-12 h-12` to `w-10 h-10`
- Reduce label width from `w-14` to `w-12`
- Tighten gap from `gap-3` to `gap-2.5`

## 2. Fix Favorites Not Showing Liked Products

Two issues to address:

**A. Silent error swallowing in `useLikedProducts` (`src/hooks/useLikedProducts.ts`):**
- Add `console.error` logging when queries fail so errors surface in devtools
- The hook currently catches errors and throws them to React Query, but the component never checks the `error` return value
- Add a brief error state to `FavoritesSection.tsx` that shows when the query fails instead of showing the empty "Save items you love" placeholder

**B. Image loading issue in SmartImage (`src/components/SmartImage.tsx`):**
- Remove `crossOrigin="anonymous"` from the `<img>` tag -- this attribute forces CORS preflight requests on CDN images (like ASOS) that may not support it, causing images to fail loading silently
- The `srcSet` functionality still works without this attribute for same-origin and CORS-enabled sources

**C. Add error visibility in FavoritesSection (`src/components/profile/FavoritesSection.tsx`):**
- Check the `error` return value from `useLikedProducts`
- If error exists and no data loaded, show a small retry message instead of the empty state
- This will help surface any remaining issues with the likes query

## 3. Fix Capacitor Package Version Consistency

**Package (`package.json`):**

Current inconsistency:
```
@capacitor/app:        ^7.1.1
@capacitor/browser:    ^7.0.3
@capacitor/cli:        ^7.4.4
@capacitor/clipboard:  ^8.0.0   <-- version 8, wrong!
@capacitor/core:       ^7.4.4
@capacitor/ios:        ^7.4.4
@capacitor/share:      ^7.0.3
@capacitor/status-bar: ^7.0.4
```

Fix: Downgrade `@capacitor/clipboard` from `^8.0.0` to `^7.0.0` so all Capacitor packages are on the same major version 7.

---

## Files Changed

```
File                                            | Action
------------------------------------------------|--------
src/components/profile/PostsSection.tsx         | Edit -- reduce card size to 100x100
src/components/profile/BrandsSection.tsx         | Edit -- reduce avatar to h-10 w-10
src/hooks/useLikedProducts.ts                   | Edit -- add error logging
src/components/profile/FavoritesSection.tsx      | Edit -- add error state handling
src/components/SmartImage.tsx                    | Edit -- remove crossOrigin="anonymous"
package.json                                    | Edit -- @capacitor/clipboard ^8.0.0 to ^7.0.0
```

Total: 6 small edits. No database changes.

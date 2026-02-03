
# Azyah App Navigation Restructure + Phia-Style UI Refresh

## ✅ IMPLEMENTED CHANGES

### Phase 1: Navigation Restructure (COMPLETED)

#### Bottom Navigation (5→4 tabs)
- **File:** `src/components/BottomNavigation.tsx`
- Changed from: Insights, Explore, Feed, Wardrobe, Collabs
- Changed to: **Feed (center), Explore, Collabs, Profile**
- Wardrobe removed from nav (now in Profile page)
- Guest mode behavior preserved

#### Auth Landing Route
- **File:** `src/lib/rbac.ts`
- Shoppers now land on `/swipe` (Feed) instead of `/dashboard`

#### Route Updates
- **File:** `src/App.tsx`
- Added `/profile` route → Profile component
- `/dashboard` now redirects to `/profile` for backward compatibility
- Imported new Profile page

### Phase 2: Profile Page (COMPLETED)

#### New Profile Page
- **File:** `src/pages/Profile.tsx` (NEW)
- Consolidates shopper dashboard content:
  - Deals Card
  - StyleLink Card
  - Style Profile with progress ring
  - Trending Looks with category filter
  - Wardrobe/Closets Section (via ClosetOutfitsSection)
  - Events Section
  - Benefits & Offers
  - Collabs Preview

### Phase 3: Feed Header Redesign (COMPLETED)

#### Swipe.tsx Updates
- **File:** `src/pages/Swipe.tsx`
- **Removed:** Search input from header
- **Added:** Category button that opens bottom sheet picker
- Back button now navigates to `/profile`
- Category sheet shows all top-level categories
- Selecting a category filters the feed

### Phase 4: Visual Cleanup (IN PROGRESS)

TODO:
- [ ] ProductCard.tsx style cleanup
- [ ] Consistent card shadows and borders
- [ ] Typography hierarchy audit

---

## Files Modified

| File | Status | Changes |
|------|--------|---------|
| `src/components/BottomNavigation.tsx` | ✅ | 5→4 tabs, removed HangerIcon/Wardrobe |
| `src/lib/rbac.ts` | ✅ | Shopper landing → `/swipe` |
| `src/App.tsx` | ✅ | Added `/profile` route, redirect `/dashboard` |
| `src/pages/Profile.tsx` | ✅ | NEW - Profile page with all sections |
| `src/pages/Swipe.tsx` | ✅ | Category button, removed search input |

---

## Acceptance Checklist

### Navigation
- [x] 4 tabs visible: Feed, Explore, Collabs, Profile
- [x] Feed tab is centered with pop-out style
- [x] Active tab has maroon indicator
- [x] Guest mode preserved

### Feed Page
- [x] Category button in header
- [x] Search input removed
- [x] Category sheet opens with all categories
- [x] Swipe mode unchanged

### Profile Page
- [x] All sections from old dashboard present
- [x] Wardrobe section accessible
- [x] Settings accessible via header

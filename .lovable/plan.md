
# Azyah Navigation + Feed Redesign (Phia-Style) - Implementation Plan

## Summary of Changes

This plan addresses the remaining issues to align the app with a clean "Phia-style" aesthetic and the updated IA requirements:

1. **Bottom Navigation**: Uniform tab sizing (remove big circular Feed button)
2. **Feed Default View**: List/masonry view as default (not swipe mode)
3. **True Masonry Layout**: Pinterest-style staggered grid
4. **Mini Swipe Preview**: Horizontal carousel at top of Feed
5. **Community Outfit Blocks**: Inserted while scrolling (every ~12 items)
6. **Remove "All" Filter**: Default to "no category selected" 
7. **Category Tiles**: Prominent category selection section
8. **Profile Cleanup**: Remove Collabs preview + Find Better Deals

---

## Phase 1: Bottom Navigation - Uniform Tabs

### File: `src/components/BottomNavigation.tsx`

**Current Issue**: Feed tab has special `isCenter: true` styling with a large pop-out circular button (lines 178-212).

**Changes**:
- Remove `isCenter` property from nav items
- Remove the special conditional rendering for center button (the `if (item.isCenter)` block)
- All tabs use the same uniform styling
- Keep maroon accent for active state only

**Before (Line 21)**:
```typescript
{ id: 'feed', label: 'Feed', icon: ShoppingBag, path: '/swipe', isCenter: true },
```

**After**:
```typescript
{ id: 'feed', label: 'Feed', icon: ShoppingBag, path: '/swipe' },
```

Remove the entire center button rendering block (lines 178-212) and use the regular nav item rendering for all tabs.

---

## Phase 2: Feed Default View Mode

### File: `src/pages/Swipe.tsx`

**Current Issue**: View mode defaults to `'swipe'` (line 50):
```typescript
const [viewMode, setViewMode] = useState<'swipe' | 'list'>('swipe');
```

**Changes**:
1. Change default to `'list'`:
```typescript
const [viewMode, setViewMode] = useState<'swipe' | 'list'>('list');
```

2. Persist view mode in localStorage so it doesn't reset:
```typescript
const [viewMode, setViewMode] = useState<'swipe' | 'list'>(() => {
  const saved = localStorage.getItem('feed-view-mode');
  return (saved === 'swipe' || saved === 'list') ? saved : 'list';
});

useEffect(() => {
  localStorage.setItem('feed-view-mode', viewMode);
}, [viewMode]);
```

3. Update tutorial logic (lines 83-91) to not force swipe mode on first visit.

---

## Phase 3: Remove "All Categories" Button

### File: `src/pages/Swipe.tsx`

**Current Issue**: Category sheet has an "All Categories" button (lines 258-265).

**Changes**:
- Remove the "All Categories" button from the sheet
- Default state becomes "no category selected" which shows all products naturally
- Update `getCurrentCategoryDisplay()` to show "Browse" or category name instead of "All"

---

## Phase 4: True Masonry Layout

### New File: `src/components/ProductMasonryGrid.tsx`

Create a proper Pinterest-style masonry layout using CSS columns.

```tsx
interface ProductMasonryGridProps {
  products: Product[];
  isLoading: boolean;
  communityOutfits?: PublicFit[]; // For interleaving
  onProductClick: (product: Product) => void;
}
```

**Layout approach**:
- Use CSS `columns: 2` for mobile, `columns: 3` for tablet, `columns: 4` for desktop
- `break-inside: avoid` on cards
- Variable height cards based on image aspect ratio
- Clean card design: image + brand name overlay + bookmark button

**Card Styling (Phia-clean)**:
- White background
- Thin border (`border border-border`)
- Subtle shadow (`shadow-sm`)
- Rounded corners (`rounded-xl`)
- Brand name as subtle overlay at bottom
- Bookmark/save button top-right (shows on hover)

---

## Phase 5: Mini Swipe Preview

### New File: `src/components/MiniSwipePreview.tsx`

A compact horizontal carousel at the top of the Feed showing 4-6 product cards.

**Structure**:
```tsx
<section className="mb-4">
  <div className="flex items-center justify-between mb-2 px-4">
    <h2 className="text-sm font-serif font-medium">Quick Swipe</h2>
    <Button variant="link" size="sm" onClick={openFullSwipe}>
      Open Full Swipe →
    </Button>
  </div>
  <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x">
    {previewProducts.map(product => (
      <MiniSwipeCard 
        key={product.id} 
        product={product}
        onLike={() => handleLike(product)}
        onSkip={() => handleSkip(product)}
      />
    ))}
  </div>
</section>
```

**Mini Card Design**:
- Fixed width: `w-28` (112px)
- Aspect ratio: 3/4
- Two action buttons at bottom: ❌ (skip) and ❤️ (like)
- These actions record swipe signals for personalization

**Behavior**:
- Uses same data source as SwipeDeck (first 6 products)
- Actions trigger real swipe tracking (like SwipeDeck)
- "Open Full Swipe" switches to swipe mode

---

## Phase 6: Community Outfit Blocks

### New File: `src/components/CommunityOutfitBlock.tsx`

A horizontal block of 2-3 community outfits inserted into the masonry feed.

**Structure**:
```tsx
<section className="col-span-full py-4 my-4 border-y border-border bg-muted/30">
  <div className="flex items-center justify-between mb-3 px-4">
    <h3 className="text-sm font-serif font-medium">Community Outfits</h3>
    <Button variant="link" size="sm" onClick={() => navigate('/community')}>
      Explore →
    </Button>
  </div>
  <div className="flex gap-3 overflow-x-auto px-4 pb-2">
    {outfits.slice(0, 3).map(outfit => (
      <CommunityOutfitCard 
        key={outfit.id}
        outfit={outfit}
        onViewOutfit={() => navigate(`/community/outfit/${outfit.id}`)}
        onGoToWardrobe={() => navigate('/dress-me')}
      />
    ))}
  </div>
</section>
```

**Card Design**:
- Fixed width: `w-32` (128px)
- Aspect ratio: 3/4
- User avatar badge (bottom-left)
- Two action chips at bottom:
  - "View" → Opens outfit detail
  - "Wardrobe" → Goes to /dress-me

**Integration with ProductMasonryGrid**:
- After every 12 product tiles, render a `CommunityOutfitBlock`
- Rotates through available community outfits

---

## Phase 7: Category Tiles Section

### File: `src/pages/Swipe.tsx` (reuse existing `CategoryGrid`)

The existing `CategoryGrid` component is already well-designed. Ensure it's rendered in list view:

```tsx
{viewMode === 'list' && (
  <div className="px-4 pt-4">
    <CategoryGrid 
      selectedCategories={filters.categories}
      onCategoryToggle={(category) => {
        setFilters(prev => ({
          ...prev,
          categories: prev.categories.includes(category)
            ? prev.categories.filter(c => c !== category)
            : [category] // Single selection for cleaner UX
        }));
      }}
    />
  </div>
)}
```

---

## Phase 8: Profile Page Cleanup

### File: `src/pages/Profile.tsx`

**Remove Collabs Preview Section** (lines 382-399):
Delete the entire Collabs card section.

**Remove Deals Card** (lines 215-218):
Delete the `<DealsCard>` component and its related drawer/imports.

**Remove related imports**:
- `DealsCard`
- `DealsDrawer`
- `ClipboardLinkPrompt`
- `useClipboardLinkDetector`

**Keep**:
- StyleLink Card (brand partnerships)
- Style Profile Card
- Trending Looks
- Wardrobe Section (ClosetOutfitsSection)
- Events
- Benefits & Offers

---

## Phase 9: Update Swipe.tsx Feed Layout

### File: `src/pages/Swipe.tsx`

Replace the current list view rendering (lines 347-371) with new structure:

```tsx
{viewMode === 'list' && (
  <div className="flex-1 overflow-auto">
    {/* Mini Swipe Preview at top */}
    <MiniSwipePreview 
      products={products.slice(0, 6)}
      onOpenFullSwipe={() => setViewMode('swipe')}
      onSwipeAction={handleSwipeAction}
    />
    
    {/* Category Grid */}
    <div className="px-4 pt-4">
      <CategoryGrid 
        selectedCategories={filters.categories}
        onCategoryToggle={handleCategoryToggle}
      />
    </div>
    
    {/* Masonry Grid with Community Blocks */}
    <div className="px-4 pt-4">
      <ProductMasonryGrid 
        products={products}
        isLoading={productsLoading}
        communityOutfitsInterval={12}
      />
    </div>
  </div>
)}
```

---

## Files Summary

| File | Action | Changes |
|------|--------|---------|
| `src/components/BottomNavigation.tsx` | Modify | Remove center button styling, uniform tabs |
| `src/pages/Swipe.tsx` | Modify | Default list view, persist mode, new Feed layout |
| `src/components/ProductMasonryGrid.tsx` | **Create** | True masonry layout with community blocks |
| `src/components/MiniSwipePreview.tsx` | **Create** | Horizontal mini swipe carousel |
| `src/components/CommunityOutfitBlock.tsx` | **Create** | Community outfits horizontal block |
| `src/pages/Profile.tsx` | Modify | Remove Collabs + DealsCard sections |
| `src/components/CategoryGrid.tsx` | Keep | Already clean, no changes needed |

---

## Testing Checklist

### Bottom Navigation
- [ ] All 4 tabs same size/style
- [ ] No big circular Feed button
- [ ] Active state shows maroon accent
- [ ] Guest mode behavior preserved

### Feed Page
- [ ] Opens in list/masonry view by default
- [ ] View mode persists after page reload
- [ ] Mini swipe preview visible at top
- [ ] Mini swipe like/skip actions work
- [ ] "Open Full Swipe" switches to swipe mode
- [ ] Category tiles visible and functional
- [ ] Masonry grid is visually staggered (Pinterest-style)
- [ ] Community outfit blocks appear every ~12 items
- [ ] No "All" category button

### Profile Page
- [ ] No Collabs section visible
- [ ] No Find Better Deals/DealsCard visible
- [ ] Wardrobe section still works
- [ ] Style Profile card works
- [ ] Events section works
- [ ] Benefits & Offers works

### Guest Mode
- [ ] Can browse Feed as guest
- [ ] Auth prompt shows for protected actions
- [ ] Navigation behavior unchanged for guests

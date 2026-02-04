
# Quick Swipe & Feed Refinements - Implementation Plan

## Summary of Issues and Fixes

Based on your feedback, here are the specific changes needed:

---

## 1. Quick Swipe Improvements

### Issue 1.1: Add Same Buttons as SwipeCard (Try-On + Info)
**Current Problem:** The `MiniSwipePreview` component only shows brand name and title overlay, but doesn't have the info "i" button and try-on shirt icon that the full SwipeCard has.

**Fix:** Add the same button layout as `SwipeCard.tsx` (lines 151-182):
- Add Try-On button (Shirt icon + "Try On" text) in top-right
- Add Info button (Info icon) below try-on button
- Both buttons should be stacked vertically on the right side

### Issue 1.2: Make Quick Swipe Area Smaller
**Current Problem:** The card is `max-w-[280px]` with `aspect-[3/4]` which is quite large.

**Fix:** Reduce the card size:
- Change from `max-w-[280px]` to `max-w-[220px]`
- Keep same aspect ratio but smaller footprint
- Reduce padding around the section

### Issue 1.3: Link Quick Swipe to Full Swipe Mode Data
**Current Problem:** Quick Swipe is currently getting products from the same list as the masonry grid.

**Status:** Already using the same product data source (`products.slice(0, 6)`), which is correct. The swipe actions (`onLike`, `onSkip`) are already connected to record swipes in the database.

---

## 2. Masonry Grid Card Improvements

### Issue 2.1: Add Try-On Button with Shirt Icon Under Heart
**Current Problem:** The Try-On button uses `User` icon and is in the bottom-right action buttons group.

**Fix:** Update `MasonryProductCard` in `ProductMasonryGrid.tsx`:
- Change try-on icon from `User` to `Shirt`
- Move try-on button to be vertically stacked under the heart button (top-right)
- Keep it visible always like the heart (not just on hover)

---

## 3. "Suggested for you" Stability

### Issue 3.1: Products Keep Reshuffling
**Current Problem:** In `useUnifiedProducts.ts` (lines 231-235), the sorting uses `Math.random()` which causes products to re-sort on every render.

**Fix:** Make the product order stable by:
1. Using a seeded random value that only changes on page refresh
2. Store the sorted order in state and only regenerate on actual refresh
3. Weight recommendations 60% based on liked swipes + opened products, 40% other factors

**Implementation:**
```typescript
// In Swipe.tsx, add stable session key
const [sessionKey] = useState(() => Date.now()); // Only changes on page reload

// Pass to hook to generate consistent random seed
```

Modify `useUnifiedProducts.ts` sorting to use a deterministic random based on session:
```typescript
// Use product ID + session key for consistent random
const getSeededRandom = (productId: string, sessionKey: number) => {
  let hash = 0;
  const str = productId + sessionKey;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return (hash >>> 0) / 4294967295;
};
```

---

## 4. Community Outfits Display Bug

### Issue 4.1: Community Blocks Breaking/Disappearing
**Current Problem:** The community outfit blocks are inserted using `col-span-full` inside a CSS columns layout. CSS columns don't support `col-span-full` - that's for CSS Grid.

**Current Implementation (broken):**
```tsx
<div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
  {elements} <!-- includes <div className="col-span-full"> which doesn't work in columns -->
</div>
```

**Fix:** Switch the ProductMasonryGrid to use a different approach:
1. Split the products into chunks
2. Between each chunk, render a full-width community block
3. Use flexbox or render each section separately

**New Structure:**
```tsx
<div className="space-y-4">
  {/* Masonry chunk 1 */}
  <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
    {products.slice(0, 12).map(product => <MasonryProductCard ... />)}
  </div>
  
  {/* Community Block 1 */}
  <CommunityOutfitBlock outfits={...} />
  
  {/* Masonry chunk 2 */}
  <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
    {products.slice(12, 24).map(product => <MasonryProductCard ... />)}
  </div>
  
  {/* Community Block 2 */}
  <CommunityOutfitBlock outfits={...} />
  
  {/* And so on... */}
</div>
```

---

## Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `src/components/MiniSwipePreview.tsx` | Modify | Add Try-On + Info buttons, reduce card size |
| `src/components/ProductMasonryGrid.tsx` | Modify | Move try-on button under heart with Shirt icon, fix community block layout |
| `src/pages/Swipe.tsx` | Modify | Add session key for stable sorting, pass onTryOn/onInfo handlers to MiniSwipePreview |
| `src/hooks/useUnifiedProducts.ts` | Modify | Use stable seeded random instead of Math.random() |

---

## Detailed Implementation

### File: `src/components/MiniSwipePreview.tsx`

**Add Props for callbacks:**
```typescript
interface MiniSwipePreviewProps {
  products: Product[];
  onOpenFullSwipe: () => void;
  onLike: (product: Product) => void;
  onSkip: (product: Product) => void;
  onInfoClick?: (product: Product) => void;  // NEW
  onTryOnClick?: (product: Product) => void; // NEW
}
```

**Add Top-Right Button Stack (inside motion.div, after image):**
```tsx
{/* RIGHT: Try-On + Info buttons - stacked vertically */}
<div className="absolute top-3 right-3 flex flex-col items-end gap-2 z-10">
  {/* Virtual Try-On button */}
  {onTryOnClick && (
    <Button
      variant="ghost"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        onTryOnClick(currentProduct);
      }}
      className="h-auto px-2 py-1 rounded-full bg-background/70 backdrop-blur-sm hover:bg-background/90 shadow-lg opacity-80 hover:opacity-100 flex items-center gap-1 transition-all"
      title="Virtual Try-On"
    >
      <Shirt className="h-3 w-3" strokeWidth={2} />
      <span className="text-[9px] font-medium">Try On</span>
    </Button>
  )}
  
  {/* Info button */}
  <Button
    variant="ghost"
    size="icon"
    onClick={(e) => {
      e.stopPropagation();
      onInfoClick?.(currentProduct);
    }}
    className="h-7 w-7 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg"
  >
    <Info className="h-3.5 w-3.5" strokeWidth={2.5} />
  </Button>
</div>
```

**Reduce Card Size:**
```tsx
// Change line 101:
<div className="relative w-full max-w-[220px] mx-auto aspect-[3/4] overflow-visible">
```

**Reduce Section Padding:**
```tsx
// Change line 85:
<section className="py-2 bg-background">
```

---

### File: `src/components/ProductMasonryGrid.tsx`

**Change Try-On Icon and Position:**
```tsx
// In MasonryProductCard, update the button layout:
<div className="relative">
  <SmartImage ... />
  
  {/* Right-side buttons - stacked vertically */}
  <div className="absolute top-2 right-2 flex flex-col gap-1.5">
    {/* Like/Heart button */}
    <button
      onClick={onLikeToggle}
      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
        isLiked 
          ? 'bg-[hsl(var(--azyah-maroon))] text-white' 
          : 'bg-white/90 text-muted-foreground opacity-0 group-hover:opacity-100'
      }`}
    >
      <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
    </button>
    
    {/* Try-On button - below heart */}
    <button
      onClick={onTryOnClick}
      className="w-8 h-8 rounded-full flex items-center justify-center bg-white/90 text-muted-foreground opacity-0 group-hover:opacity-100 shadow-sm transition-all"
    >
      <Shirt className="h-4 w-4" />
    </button>
  </div>
  
  {/* Info button - bottom right */}
  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
    <Button
      size="icon"
      variant="secondary"
      className="h-7 w-7 rounded-full bg-white/90 hover:bg-white shadow-sm"
      onClick={onInfoClick}
    >
      <Info className="h-3.5 w-3.5 text-muted-foreground" />
    </Button>
  </div>
</div>
```

**Fix Community Block Layout - Use Chunk Rendering:**
```tsx
const renderContent = () => {
  const chunks: React.ReactNode[] = [];
  const chunkSize = communityOutfitsInterval;
  
  for (let i = 0; i < products.length; i += chunkSize) {
    const chunk = products.slice(i, i + chunkSize);
    const chunkIndex = Math.floor(i / chunkSize);
    
    // Add the masonry chunk
    chunks.push(
      <div key={`masonry-${i}`} className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
        {chunk.map(product => (
          <MasonryProductCard
            key={product.id}
            product={product}
            isLiked={likedProducts.has(product.id)}
            onLikeToggle={(e) => handleLikeToggle(product.id, e)}
            onClick={() => handleProductClick(product)}
            onInfoClick={(e) => handleInfoClick(product, e)}
            onTryOnClick={(e) => handleTryOnClick(product, e)}
          />
        ))}
      </div>
    );
    
    // Add community block after each chunk (except the last if partial)
    if (i + chunkSize < products.length && communityOutfits.length > 0) {
      const outfitSlice = communityOutfits.slice(
        (chunkIndex * 3) % communityOutfits.length,
        ((chunkIndex * 3) % communityOutfits.length) + 3
      );
      
      if (outfitSlice.length > 0) {
        chunks.push(
          <CommunityOutfitBlock key={`community-${i}`} outfits={outfitSlice} />
        );
      }
    }
  }
  
  return chunks;
};

return (
  <div className="space-y-4">
    {isLoading ? (
      <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="break-inside-avoid mb-3">
            <Skeleton className="w-full aspect-[3/4] rounded-xl" />
          </div>
        ))}
      </div>
    ) : (
      renderContent()
    )}
  </div>
);
```

---

### File: `src/hooks/useUnifiedProducts.ts`

**Add Stable Seeded Random:**
```typescript
// Add helper function at top of file
const getSeededRandom = (productId: string, sessionKey: number): number => {
  let hash = 0;
  const str = productId + sessionKey.toString();
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return (hash >>> 0) / 4294967295; // Return 0-1
};

// Modify the interface to accept sessionKey
export interface UnifiedProductFilters {
  // ... existing fields
  sessionKey?: number; // For stable random sorting
}
```

**Update Sorting Logic (lines 231-235):**
```typescript
// Sort by personalization with stable randomization
processedProducts.sort((a, b) => {
  const sessionKey = filters.sessionKey || Date.now();
  const aRandom = getSeededRandom(a.id, sessionKey);
  const bRandom = getSeededRandom(b.id, sessionKey);
  const aScore = ((a as any)._personalization_score || 0.5) + (aRandom * 0.2 - 0.1);
  const bScore = ((b as any)._personalization_score || 0.5) + (bRandom * 0.2 - 0.1);
  return bScore - aScore;
});
```

---

### File: `src/pages/Swipe.tsx`

**Add Session Key State:**
```typescript
// Add near top with other state (around line 33):
const [sessionKey] = useState(() => Date.now());
```

**Pass Session Key to Hook:**
```typescript
// Update useUnifiedProducts call (around line 134):
const {
  products,
  isLoading: productsLoading
} = useUnifiedProducts({
  category: viewMode === 'list' && filters.categories.length > 0 ? 'multi' : filters.categories[0] || 'all',
  subcategory: filters.subcategories[0],
  gender: filters.genders[0],
  priceRange: filters.priceRange,
  searchQuery: filters.searchQuery,
  currency: filters.currency,
  categories: viewMode === 'list' ? filters.categories : undefined,
  countryCode: (filters as any).countryCode,
  sessionKey // NEW: For stable sorting
});
```

**Add Callbacks for MiniSwipePreview:**
```typescript
// Add after handleSwipeSkip (around line 180):
const handleMiniSwipeInfo = useCallback((product: any) => {
  navigate(`/p/${product.id}`);
}, [navigate]);

const handleMiniSwipeTryOn = useCallback((product: any) => {
  navigate(`/p/${product.id}?tryon=true`);
}, [navigate]);
```

**Update MiniSwipePreview Usage:**
```tsx
<MiniSwipePreview 
  products={products.slice(0, 6)}
  onOpenFullSwipe={() => setViewMode('swipe')}
  onLike={handleSwipeLike}
  onSkip={handleSwipeSkip}
  onInfoClick={handleMiniSwipeInfo}
  onTryOnClick={handleMiniSwipeTryOn}
/>
```

---

## Testing Checklist

### Quick Swipe Section
- [ ] Card size is smaller (220px max width)
- [ ] Try-On button visible with Shirt icon (top-right)
- [ ] Info button visible with "i" icon (below Try-On)
- [ ] Clicking Try-On opens product page with tryon=true
- [ ] Clicking Info opens product detail page
- [ ] Swipe left/right still works
- [ ] Like/Skip still records in database

### Masonry Grid Cards
- [ ] Heart button at top-right (same behavior)
- [ ] Shirt icon for Try-On button (below heart)
- [ ] Info button at bottom-right
- [ ] All buttons show on hover

### "Suggested for you" Stability
- [ ] Products stay in same order while scrolling
- [ ] Order only changes on page refresh (F5 or reload)
- [ ] Personalization still affects order

### Community Outfits
- [ ] Community blocks display properly between product chunks
- [ ] No visual glitches or disappearing content
- [ ] Blocks appear every ~12 products
- [ ] "View" and "Wardrobe" buttons still work

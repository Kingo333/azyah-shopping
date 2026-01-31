

# Fix Plan: Similar on Azyah Section Issues

## Issues Identified

| Issue | Root Cause |
|-------|------------|
| View More needs 2 taps | Event propagation conflict: the carousel's Embla drag handlers intercept the first tap on the "View more" button |
| Carousel jumps/stutters | `dragFree: true` combined with Vaul drawer touch handling creates conflicting gesture recognition |
| ASOS images show placeholder | The `media_url` field from `deals-match-catalog` is not processed through `displaySrc()` or the ASOS URL guard fails on edge cases |

---

## Technical Analysis

### Problem 1: Double-Tap on View More

The current code:
```tsx
// Line 30-34: Embla carousel initialized at component level
const [emblaRef] = useEmblaCarousel({ 
  align: 'start',
  containScroll: 'trimSnaps',
  dragFree: true
});

// Line 210: Button inside the carousel's DOM ancestor
<button onClick={handleExpandToggle}>View more</button>
```

The Embla carousel captures touch/mouse events for drag detection. When tapping "View more", the first tap is consumed by Embla's drag initialization, and only the second tap actually fires the click event.

### Problem 2: Carousel Jitter

Two issues combine:
1. `dragFree: true` allows momentum scrolling which fights with the Vaul drawer's swipe-to-close gesture
2. The component re-renders on `expanded` state change, potentially resetting Embla's internal position

### Problem 3: ASOS Placeholder Images

The edge function returns `media_url` as a raw database value (line 199 in `deals-match-catalog`):
```ts
const mediaUrl = product.media_urls?.[0] || '';
```

But the component's `getDisplayImageUrl` only handles URLs containing `asos-media.com`:
```tsx
if (url.includes('asos-media.com')) {
  return upgradeAsosImageUrl(url, 400);
}
```

If the stored URL is malformed, missing the protocol, or uses a different ASOS CDN subdomain, the guard fails and the raw URL is used - which may not load.

---

## Solution

### Fix 1: Prevent Tap Interception on Buttons

Move the "View more" button **outside** the Embla container and add explicit event handling to stop propagation:

```tsx
// Move header with View more button outside the emblaRef container
<div className="space-y-3">
  <div className="flex items-center justify-between px-1">
    {/* Header stays here */}
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setExpanded(true);
      }}
    >
      View more
    </button>
  </div>

  {/* Carousel container - separate from header */}
  <div className="overflow-hidden" ref={emblaRef}>
    <div className="flex gap-2">
      {displayMatches.map(...)}
    </div>
  </div>
</div>
```

This ensures the button click is never captured by Embla's gesture handlers.

### Fix 2: Stabilize Carousel Scrolling

1. Remove `dragFree: true` (causes momentum conflicts with drawer)
2. Add `watchDrag: false` when inside a drawer to prevent gesture conflicts
3. Add CSS `touch-action: pan-x` to the carousel to hint browser about gesture intent

```tsx
const [emblaRef] = useEmblaCarousel({ 
  align: 'start',
  containScroll: 'trimSnaps',
  dragFree: false,  // Changed: prevent momentum scroll conflicts
  skipSnaps: false,
});
```

Add to carousel container:
```tsx
<div 
  className="overflow-hidden touch-pan-x" 
  ref={emblaRef}
  style={{ touchAction: 'pan-x' }}
>
```

### Fix 3: Fix ASOS Image URL Handling

Update `getDisplayImageUrl` to handle more ASOS URL variants and use the centralized `displaySrc` helper:

```tsx
import { displaySrc } from '@/lib/displaySrc';

const getDisplayImageUrl = useCallback((url: string | null | undefined): string => {
  if (!url) return '/placeholder.svg';
  
  // Use centralized displaySrc which handles all URL types
  return displaySrc(url);
}, []);
```

Also update the ASOS URL guard in `src/lib/urlGuards.ts` to catch more patterns:

```ts
export const isAsosUrl = (u: string): boolean =>
  /asos-media\.com|asos\.com.*\/products\//i.test(u);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/deals/AzyahMatchesSection.tsx` | Fix button placement, remove `dragFree`, add `touch-action`, use `displaySrc` for images |
| `src/lib/urlGuards.ts` | Expand ASOS URL detection regex |

---

## Implementation Details

### AzyahMatchesSection.tsx Changes

1. **Header/button placement**: Keep header with "View more" button as a sibling to (not inside) the carousel container

2. **Carousel configuration**:
   ```tsx
   const [emblaRef] = useEmblaCarousel({ 
     align: 'start',
     containScroll: 'trimSnaps',
     dragFree: false,
     skipSnaps: false,
   });
   ```

3. **Touch handling on carousel**:
   ```tsx
   <div 
     className="overflow-hidden" 
     ref={emblaRef}
     style={{ touchAction: 'pan-x' }}
   >
   ```

4. **Image URL handling**:
   ```tsx
   import { displaySrc } from '@/lib/displaySrc';

   // Replace custom getDisplayImageUrl with centralized helper
   const imageUrl = displaySrc(match.media_url);
   ```

5. **Button event handling**:
   ```tsx
   <button
     onClick={(e) => {
       e.stopPropagation();
       setExpanded(prev => !prev);
     }}
     onPointerDown={(e) => e.stopPropagation()}
     className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
   >
     View more
     <ChevronRight className="h-3 w-3" />
   </button>
   ```

### urlGuards.ts Changes

Expand the ASOS detection to handle edge cases:

```ts
export const isAsosUrl = (u: string): boolean =>
  /images\.asos-media\.com|asos-media\.com|\.asos\.com/i.test(u);
```

---

## Expected Results

| Issue | Before | After |
|-------|--------|-------|
| View more tap | Needs 2 taps | Single tap works |
| Carousel scroll | Stutters, conflicts with drawer | Smooth horizontal scroll |
| ASOS images | Shows placeholder | Product images load |

---

## Technical Notes

- The `touch-action: pan-x` CSS property tells the browser to only handle horizontal panning on this element, preventing conflict with the drawer's vertical swipe gesture
- Using `displaySrc()` ensures all image URL types (ASOS, Supabase, relative paths) are processed consistently
- The `onPointerDown` stopPropagation prevents Embla from interpreting button taps as potential drag starts


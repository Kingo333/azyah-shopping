

# Feed Refinements - Masonry Layout, Community Blocks & Try-On Flow

## Summary

This plan addresses three key issues:
1. **Masonry layout not obvious on mobile** - needs visual differentiation
2. **Community outfits not appearing** - database query uses wrong column name
3. **Try-On behavior should match SwipeCard** - open AiStudioModal, don't cancel jobs on page leave

---

## Issue 1: Masonry Layout Not Obvious on Mobile

### Problem
The current masonry grid uses `columns-2` on mobile which can look like a regular 2-column grid when images have similar aspect ratios.

### Solution
Shift the layout to be more visually distinct by:
- Adding stagger gap variations between columns
- Increasing gap between columns for better visual separation
- Using CSS `column-gap` and `gap` together with margin variations

### File: `src/components/ProductMasonryGrid.tsx`

**Changes:**
```tsx
// Line 148 - Update masonry grid classes
<div key={`masonry-${i}`} className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 px-1">
```

Also update the skeleton loading to match:
```tsx
// Lines 127-134
<div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 px-1">
```

---

## Issue 2: Community Outfits Not Appearing

### Root Cause
The `CommunityOutfitBlock` component interface expects `image_url` but the `fits` table has `image_preview` and `render_path` columns instead.

The query in `ProductMasonryGrid.tsx` (line 39) selects correctly from the database, but the data mapping to the `CommunityOutfit` interface is broken.

### Database Reality
```sql
fits table columns:
- id, user_id, title, name, image_preview, render_path, is_public, ...
```

### Current Query (Line 37-42)
```typescript
const { data } = await supabase
  .from('fits')
  .select('*, user:users(name, avatar_url)')
  .eq('is_public', true)
  .order('created_at', { ascending: false })
  .limit(10);
```

The query returns `image_preview` but the component expects `image_url`.

### Solution

**File: `src/components/ProductMasonryGrid.tsx`**

Map the data correctly after fetching:
```typescript
// After line 44, transform the data
if (data) {
  const mappedOutfits = data.map(fit => ({
    id: fit.id,
    name: fit.name || fit.title,
    image_url: fit.image_preview || fit.render_path,
    user: fit.user
  }));
  setCommunityOutfits(mappedOutfits);
}
```

**File: `src/components/CommunityOutfitBlock.tsx`**

The interface is already correct (`image_url`), so no changes needed there - just need to fix the data mapping in the parent.

---

## Issue 3: Try-On Should Open AiStudioModal (Like SwipeCard)

### Current Behavior
- **SwipeCard**: `onTryOn` opens `AiStudioModal` (line 472-474 in SwipeDeck.tsx)
- **MiniSwipePreview**: `onTryOnClick` navigates to `/p/${product.id}?tryon=true`
- **ProductMasonryGrid**: `onTryOnClick` navigates to `/p/${product.id}?tryon=true`

### Desired Behavior
All try-on buttons should open `AiStudioModal` inline, same as SwipeCard does.

### Solution

**File: `src/pages/Swipe.tsx`**

1. Add state for AiStudioModal:
```typescript
const [showAiStudio, setShowAiStudio] = useState(false);
```

2. Import AiStudioModal:
```typescript
import AiStudioModal from '@/components/AiStudioModal';
```

3. Update the try-on handler:
```typescript
const handleMiniSwipeTryOn = useCallback((product: any) => {
  setShowAiStudio(true);
}, []);
```

4. Add handlers for ProductMasonryGrid:
```typescript
const handleMasonryTryOn = useCallback((product: any) => {
  setShowAiStudio(true);
}, []);
```

5. Pass the handler to ProductMasonryGrid:
```tsx
<ProductMasonryGrid 
  products={products}
  isLoading={productsLoading}
  communityOutfitsInterval={12}
  onTryOnClick={handleMasonryTryOn}
/>
```

6. Add the modal component:
```tsx
<AiStudioModal 
  open={showAiStudio} 
  onClose={() => setShowAiStudio(false)} 
/>
```

---

## Issue 4: Background Try-On Jobs Should Persist

### Current Behavior
When users start a try-on and leave the page, the polling stops and they don't get notified when it completes.

### Solution
Use the existing `tryonNotifications` utility and add a global try-on job monitor that:
1. Stores pending job IDs in localStorage
2. Polls for completion on any page
3. Shows a toast notification when complete

### New File: `src/hooks/useTryOnJobMonitor.ts`

Create a hook that monitors background try-on jobs:
```typescript
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const PENDING_JOBS_KEY = 'pending_tryon_jobs';

export const useTryOnJobMonitor = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  // Register a new job to monitor
  const registerJob = (jobId: string) => {
    const pending = JSON.parse(localStorage.getItem(PENDING_JOBS_KEY) || '[]');
    if (!pending.includes(jobId)) {
      pending.push(jobId);
      localStorage.setItem(PENDING_JOBS_KEY, JSON.stringify(pending));
    }
  };

  // Poll for pending jobs on mount
  useEffect(() => {
    if (!user?.id) return;

    const checkPendingJobs = async () => {
      const pending = JSON.parse(localStorage.getItem(PENDING_JOBS_KEY) || '[]');
      if (pending.length === 0) return;

      // Check each pending job
      for (const jobId of pending) {
        const { data } = await supabase
          .from('ai_tryon_jobs')
          .select('status, result_url')
          .eq('id', jobId)
          .single();

        if (data) {
          if (data.status === 'succeeded' && data.result_url) {
            toast({
              title: 'Try-On Complete!',
              description: 'Your virtual try-on is ready. Check AI Studio to view it.',
            });
            // Remove from pending
            const updated = pending.filter((id: string) => id !== jobId);
            localStorage.setItem(PENDING_JOBS_KEY, JSON.stringify(updated));
          } else if (data.status === 'failed') {
            // Remove failed jobs
            const updated = pending.filter((id: string) => id !== jobId);
            localStorage.setItem(PENDING_JOBS_KEY, JSON.stringify(updated));
          }
        }
      }
    };

    // Check immediately and then every 30 seconds
    checkPendingJobs();
    const interval = setInterval(checkPendingJobs, 30000);

    return () => clearInterval(interval);
  }, [user?.id, toast]);

  return { registerJob };
};
```

### Integration

**File: `src/App.tsx` (or layout component)**

Add the hook at a high level so it runs globally:
```typescript
import { useTryOnJobMonitor } from '@/hooks/useTryOnJobMonitor';

// Inside the component:
useTryOnJobMonitor();
```

---

## Issue 5: Quick Swipe Area Smaller

### Current Size
The quick swipe card is `max-w-[220px]` which was already reduced.

### Additional Reduction
Reduce section padding and card size slightly more for mobile.

### File: `src/components/MiniSwipePreview.tsx`

Already has:
```tsx
<section className="py-2 bg-background">
<div className="relative w-full max-w-[220px] mx-auto aspect-[3/4] overflow-visible">
```

This is appropriate - the 220px max width with 3/4 aspect is compact. The issue might be the outer padding.

Update to:
```tsx
<section className="py-1 bg-background">
```

And reduce the heading text size slightly if needed.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ProductMasonryGrid.tsx` | Fix community outfit data mapping, increase gap for mobile |
| `src/components/MiniSwipePreview.tsx` | Minor padding adjustments |
| `src/pages/Swipe.tsx` | Add AiStudioModal, update try-on handlers |
| `src/hooks/useTryOnJobMonitor.ts` | **Create** - Background job notification |
| `src/App.tsx` or layout | Add useTryOnJobMonitor hook |

---

## Technical Details

### Community Outfit Data Mapping Fix

The `fits` table returns:
```typescript
{
  id: string;
  name: string | null;
  title: string;
  image_preview: string;
  render_path: string | null;
  user: { name: string; avatar_url: string; }
}
```

But `CommunityOutfitBlock` expects:
```typescript
{
  id: string;
  name?: string;
  image_url?: string;
  user?: { name?: string; avatar_url?: string; }
}
```

The mapping should be:
```typescript
const mappedOutfits = data.map(fit => ({
  id: fit.id,
  name: fit.name || fit.title,
  image_url: fit.image_preview || fit.render_path,
  user: fit.user
}));
```

### AiStudioModal Integration in List View

The SwipeDeck already has AiStudioModal integrated. For list view, we need to:
1. Import AiStudioModal in Swipe.tsx
2. Add state `showAiStudio`
3. Change try-on handlers to open modal instead of navigating
4. Render the modal component

---

## Testing Checklist

### Masonry Layout
- [ ] Grid shows staggered layout on mobile (not uniform rows)
- [ ] Gap between items is visually distinct
- [ ] Cards maintain proper aspect ratios

### Community Outfits
- [ ] Community outfit blocks appear every ~12 products while scrolling
- [ ] Outfit images display correctly (not broken/missing)
- [ ] User avatars show correctly
- [ ] "View" and "Wardrobe" buttons work

### Try-On Flow
- [ ] Clicking Try-On on Quick Swipe opens AiStudioModal
- [ ] Clicking Try-On on masonry card opens AiStudioModal
- [ ] Try-On jobs continue processing when user navigates away
- [ ] User gets toast notification when job completes on another page

### Quick Swipe
- [ ] Card is compact and doesn't take too much space
- [ ] Try-On and Info buttons match SwipeCard design
- [ ] Swipe interactions work correctly



# Fix: Floating Nav Overlapping with Content

## Problem

From the screenshot, the floating navigation bar is overlapping with the product cards at the bottom of the masonry grid. The content doesn't have enough bottom padding to clear the floating nav.

## Solution

1. **Increase bottom padding on masonry grid container** - Change from `pb-24` to `pb-32` or more to ensure the floating nav doesn't overlap content
2. **Ensure nav has proper z-index** - Already has `z-40`, but content might be overlapping

## Implementation

### File: `src/pages/Swipe.tsx`

**Change 1: Increase bottom padding for content (line ~380)**

```tsx
// Current:
<div className="px-4 pb-24">
  <ProductMasonryGrid ... />
</div>

// Updated:
<div className="px-4 pb-36">
  <ProductMasonryGrid ... />
</div>
```

This gives ~144px of bottom padding (9rem) to ensure the floating nav (which is ~60-70px tall including safe area) has enough clearance.

## Summary

| Change | Purpose |
|--------|---------|
| `pb-24` → `pb-36` | Add more bottom padding so products don't overlap with floating nav |

This is a simple CSS fix to prevent the overlap shown in the screenshot.

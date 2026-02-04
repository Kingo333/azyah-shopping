
# Fix: Floating Navigation Bar Styling

## Current Issue
The floating navigation icons aren't visible or look "squished". Looking at the reference design (phia.com), the nav bar should have:
- A wider pill shape that stretches across most of the screen
- Pure white background for maximum contrast
- Large, clearly visible black icons
- Even distribution across the width

## Solution

### Changes to `src/pages/Swipe.tsx`

**Update the floating nav container styling:**

| Current | Updated |
|---------|---------|
| `bg-card/95` | `bg-white` - Pure white for contrast |
| `px-10 py-3.5` | `mx-4 px-6 py-4` - Use margin for width, more padding |
| `left-1/2 -translate-x-1/2` | `left-4 right-4` - Stretch to screen edges |
| `gap-10` | `justify-between` - Even distribution |
| `border border-border` | Remove border for cleaner look |

**Update icon styling:**

| Current | Updated |
|---------|---------|
| `text-primary` / `text-foreground/60` | `text-black` for all icons |
| `h-6 w-6` | `h-7 w-7` - Larger icons |
| `strokeWidth={2}` | `strokeWidth={1.5}` - Slightly thinner for elegance |

### Technical Implementation

```tsx
{/* Floating Icon-Only Bottom Nav for List View */}
<div 
  className="fixed z-40 left-4 right-4
             bg-white 
             rounded-full py-4 px-6
             shadow-[0_4px_20px_rgba(0,0,0,0.12)]
             flex items-center justify-between"
  style={{ bottom: 'calc(var(--safe-bottom, 0px) + 16px)' }}
>
  <button onClick={() => navigate('/swipe')} className="p-2">
    <Home className="h-7 w-7 text-black" strokeWidth={1.5} />
  </button>
  <button onClick={() => navigate('/explore')} className="p-2">
    <Search className="h-7 w-7 text-black" strokeWidth={1.5} />
  </button>
  <button onClick={() => navigate('/favorites')} className="p-2">
    <Bookmark className="h-7 w-7 text-black" strokeWidth={1.5} />
  </button>
  <button onClick={() => navigate('/profile')} className="p-2">
    <User className="h-7 w-7 text-black" strokeWidth={1.5} />
  </button>
</div>
```

## Icon Selection

Based on the reference design (phia.com), I'll use these icons to match:
- **Home** - Home icon (house shape)
- **Search** - Magnifying glass
- **Bookmark** - Save/favorites
- **User** - Account/profile

All icons from `lucide-react` already imported or easily available.

## Summary

| Change | Purpose |
|--------|---------|
| `bg-white` instead of `bg-card/95` | Ensures pure white background regardless of theme |
| `left-4 right-4` positioning | Makes pill stretch to screen edges with consistent margin |
| `justify-between` | Evenly distributes icons across the width |
| `text-black` | Ensures icons are always visible against white |
| `h-7 w-7` icons | Larger, more prominent icons matching reference |
| `strokeWidth={1.5}` | Slightly thinner strokes for elegant look |
| Removed border | Cleaner, more minimal appearance |

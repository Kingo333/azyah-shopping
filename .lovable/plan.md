

# UI Enhancement Plan: Extension + Drawer with 30 Results

## Summary

This plan addresses three key improvements:
1. **Update extension logo/colors** to match Azyah brand (maroon `#7A143E` instead of purple `#8B5CF6`)
2. **Redesign extension UI** with Phia-style glassmorphism (frosted glass, clean cards)
3. **Increase result limit to 30** for both app drawer and extension
4. **Improve app drawer UI** with consistent premium aesthetics

---

## Part 1: Extension Logo & Brand Colors

### Current State
- Extension uses purple gradient (`#8B5CF6` → `#7C3AED`)
- SVG icons show purple circle with white search icon
- Header: `linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)`

### Azyah Brand Colors (from intro carousel)
- **Primary Maroon**: `#7A143E` (HSL 343 75% 32%) - used in logo, CTAs
- **Logo**: `/marketing/azyah-logo.png` - the stylized "A" logo

### Changes Required

**Files to modify:**

1. **`extension/icons/icon16.svg`, `icon48.svg`, `icon128.svg`**
   - Replace purple fill `#8B5CF6` with maroon `#7A143E`
   - Alternatively, use the Azyah "A" letter design if we want exact logo match

2. **`extension/styles.css`** - Update all purple references:
   ```css
   /* BEFORE */
   .panel-header {
     background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
   }
   .btn-primary {
     background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
   }
   .preview-price { color: #8B5CF6; }
   .price-median { color: #8B5CF6; }
   
   /* AFTER */
   .panel-header {
     background: linear-gradient(135deg, #7A143E 0%, #5C1030 100%);
   }
   .btn-primary {
     background: linear-gradient(135deg, #7A143E 0%, #5C1030 100%);
   }
   .preview-price { color: #7A143E; }
   .price-median { color: #7A143E; }
   ```

3. **`extension/sidepanel.html`** - Add Azyah logo image:
   ```html
   <!-- Replace SVG search icon with Azyah logo -->
   <header class="panel-header">
     <div class="logo">
       <img src="https://azyah-shopping.lovable.app/marketing/azyah-logo.png" alt="Azyah" width="24" height="24">
       <span>Find Better Deals</span>
     </div>
   </header>
   ```

---

## Part 2: Extension UI Redesign (Phia-Style Glassmorphism)

### Design Reference (from Phia screenshots)
- Clean white/frosted backgrounds with subtle shadows
- "This price is typical" status line with gradient bar
- Compact filter pills (New | Used | Size)
- Card-based results with thumbnail on left, price prominent
- Minimal chrome, maximum content

### New Extension Structure

```text
┌─────────────────────────────────────────────────────────────────┐
│ HEADER (sticky, frosted glass)                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [A logo] Find Better Deals               [⚙️ Settings]     │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ PRODUCT PREVIEW (frosted card)                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [thumb] BRAND                                               │ │
│ │         AED 299                        [🔍 Search Deals]   │ │
│ │         Product title...                                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ DETECTED TAGS (small pills)                                     │
│ [Abaya] [Purple] [Brown] [Printed] [✨ Pattern Mode]           │
├─────────────────────────────────────────────────────────────────┤
│ PRICE VERDICT (gradient bar)                                    │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ This price is: typical                                     │ │
│ │ ═══════════════●═══════════════════                        │ │
│ │ AED 120      AED 250         AED 450                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ BEST MATCH (highlighted card)                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Best ✓] [thumb] Source  AED 180                    [→]   │ │
│ │                  Title...                                  │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ SIMILAR DEALS (29 more cards, scrollable)                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [thumb] Source  AED 200                            [→]     │ │
│ │         Title...                                           │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ [thumb] Source  AED 220                            [→]     │ │
│ │         Title...                                           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ... (scroll for more)                                           │
└─────────────────────────────────────────────────────────────────┘
```

### CSS Changes (`extension/styles.css`)

**A) Glassmorphism Base**
```css
body {
  background: rgba(248, 249, 250, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.panel-container {
  background: transparent;
}

.panel-header {
  background: rgba(122, 20, 62, 0.95);  /* Maroon with transparency */
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
```

**B) Frosted Cards**
```css
.deal-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  border-radius: 16px;
}

.deal-card:hover {
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}
```

**C) Price Verdict Bar (Phia-style)**
```css
.price-verdict {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.price-bar-visual {
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(
    to right,
    #22c55e 0%,      /* Low - green */
    #fbbf24 50%,     /* Median - amber */
    #ef4444 100%     /* High - red */
  );
}
```

**D) Remove Emojis, Use Icons**
Replace emoji section headers with clean text:
- `💰 Price Comparison` → `Price Comparison`
- `📦 Similar Deals` → `Similar Deals`
- `✓ Original Found` → Keep checkmark icon

---

## Part 3: Increase Result Limit to 30

### Current Limits
- **App (PhotoTab)**: `slice(0, 15)` at line 380
- **Extension (sidepanel.js)**: `slice(1, 15)` at line 233

### Changes Required

**File: `src/components/deals/PhotoTab.tsx`**
```typescript
// Line 380: Change from 15 to 30
{data.shopping_results.slice(0, 30).map((result, index) => (
```

**File: `extension/sidepanel.js`**
```javascript
// Line 233: Change from 15 to 30
const otherDeals = sortedResults.slice(1, 30);
```

**File: `supabase/functions/deals-unified/index.ts`**
- Backend already returns up to 40 results (rerank limit)
- No backend changes needed for 30 results

---

## Part 4: App Drawer UI Improvements

### Current State (DealsDrawer.tsx)
Already has good glassmorphism:
- `bg-white/85 backdrop-blur-2xl`
- `rounded-t-[28px]`
- Frosted tab pills

### Enhancements

**A) Update header icon to match Azyah brand**

**File: `src/components/deals/DealsDrawer.tsx`**
```tsx
// Line 52-55: Replace Tag icon with Azyah logo
<div className="flex items-center justify-center gap-2">
  <img 
    src="/marketing/azyah-logo.png" 
    alt="Azyah" 
    className="w-7 h-7 object-contain"
  />
  <DrawerTitle className="font-serif text-lg" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
    Find Better Deals
  </DrawerTitle>
</div>
```

**B) Update PhotoTab result limit**

Already covered in Part 3.

**C) Consistent card styling**

DealResultCard already has excellent glassmorphism - no changes needed.

---

## Files to Modify

| File | Changes |
|------|---------|
| `extension/icons/icon16.svg` | Change fill from `#8B5CF6` to `#7A143E` |
| `extension/icons/icon48.svg` | Change fill from `#8B5CF6` to `#7A143E` |
| `extension/icons/icon128.svg` | Change fill from `#8B5CF6` to `#7A143E` |
| `extension/sidepanel.html` | Add Azyah logo image in header |
| `extension/styles.css` | Glassmorphism overhaul + maroon brand colors |
| `extension/sidepanel.js` | Change `slice(1, 15)` to `slice(1, 30)` |
| `src/components/deals/DealsDrawer.tsx` | Replace Tag icon with Azyah logo |
| `src/components/deals/PhotoTab.tsx` | Change `slice(0, 15)` to `slice(0, 30)` |

---

## Visual Before/After

### Extension Header
```text
BEFORE:                              AFTER:
┌──────────────────────────┐        ┌──────────────────────────┐
│ 🔍 Find Better Deals     │        │ [A] Find Better Deals    │
│ (purple gradient)        │        │ (maroon gradient + glass)│
└──────────────────────────┘        └──────────────────────────┘
```

### Extension Cards
```text
BEFORE:                              AFTER:
┌──────────────────────────┐        ┌──────────────────────────┐
│ Solid gray background    │        │ Frosted glass            │
│ No blur effect           │        │ backdrop-blur: 12px      │
│ 1px solid border         │        │ Soft shadow + glow       │
└──────────────────────────┘        └──────────────────────────┘
```

### Result Count
```text
BEFORE: 15 deals shown              AFTER: 30 deals shown
```

---

## Technical Notes

1. **Logo Loading**: Using absolute URL for extension (`https://azyah-shopping.lovable.app/marketing/azyah-logo.png`) since extension can't access local files from web resources easily

2. **Glassmorphism Browser Support**: `backdrop-filter` works in Chrome 76+ which covers all extension users

3. **No Backend Changes**: Result limit increase is frontend-only since backend already returns 30+ candidates

4. **Performance**: 30 cards is still lightweight - no virtualization needed for this count


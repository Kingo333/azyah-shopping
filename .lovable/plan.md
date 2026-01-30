

# Premium "Find Better Deals" UI Upgrade

## Overview

Transform the Deals UI from a generic flat admin-panel style to a premium, glassy, Phia-like experience that matches the Explore globe's glassmorphism aesthetic.

**Scope**: Visual-only changes. No feature logic, routes, or data handling will be modified.

---

## Current State Analysis

| Component | Issue |
|-----------|-------|
| `DealsDrawer.tsx` | Standard drawer with white background, basic tabs, no glass effect |
| `DealResultCard.tsx` | Plain Card with heavy borders, "ring" highlight for best deal |
| `PriceVerdict.tsx` | Thick bar (8px), large marker knob, plain labels |
| Tab styling | Generic TabsList, not segmented control |
| Scan panel | Missing - no visual feedback showing scanned image/URL |

---

## Implementation Plan

### 1. DealsDrawer - Glass Bottom Sheet

**File**: `src/components/deals/DealsDrawer.tsx`

Transform the drawer container to match CountryDrawer's glassmorphism:

```text
Current:
  DrawerContent className="max-h-[90vh]"

Updated:
  DrawerContent className="
    bg-white/85 dark:bg-gray-900/85
    backdrop-blur-2xl
    border-t border-white/20
    shadow-2xl
    max-h-[85vh]
    rounded-t-[28px]
  "
```

**Header redesign**:
- Smaller icon (6x6 rounded-xl gradient)
- Title with subtle text-shadow for depth
- Sparkles icon with animate-pulse glow

### 2. Glass Segmented Control Tabs

**File**: `src/components/deals/DealsDrawer.tsx`

Replace generic tabs with a premium pill-based segmented control:

```text
TabsList className="
  w-full grid grid-cols-3 
  bg-black/5 dark:bg-white/10 
  p-1.5 rounded-full
"

TabsTrigger className="
  rounded-full text-xs font-medium
  transition-all duration-200
  data-[state=inactive]:text-muted-foreground/70
  data-[state=active]:bg-white/90 dark:data-[state=active]:bg-white/20
  data-[state=active]:text-foreground
  data-[state=active]:shadow-[0_0_12px_rgba(251,191,36,0.3)]
  data-[state=active]:border data-[state=active]:border-white/30
"
```

### 3. Scan Panel Component

**New Component**: `src/components/deals/ScanPanel.tsx`

A glassmorphic panel that shows the input (uploaded image, URL thumbnail, or query) with status:

```text
+--------------------------------------------------+
| [📷 Image]  "Scanning the web..."                |
|             ████████░░░░ shimmer animation       |
+--------------------------------------------------+

After results:
+--------------------------------------------------+
| [📷 Image]  ✨ 40+ deals found                   |
|             [Try another] button                 |
+--------------------------------------------------+
```

Styling:
- `bg-white/50 dark:bg-white/10 backdrop-blur-xl`
- `rounded-2xl border border-white/20`
- `shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]`
- Shimmer loading effect via CSS keyframes

### 4. Redesigned PriceVerdict

**File**: `src/components/deals/PriceVerdict.tsx`

Transform from thick bar to elegant thin bar with chip labels:

**Before**:
- 8px height bar
- Large 12px marker knob
- Plain text labels

**After**:
- 4px height bar with rounded ends
- 6px glowing dot marker with pulse animation
- Labels as tiny pill badges (rounded-full, bg-white/70)

```text
Visual:
[Low] ─────────•───────── [High]
 ↓                          ↓
pill badge              pill badge
bg-green-500/20         bg-red-500/20
text-green-600          text-red-500
```

Marker styling:
```text
w-2 h-2 rounded-full 
bg-white 
shadow-[0_0_8px_rgba(255,255,255,0.8),0_0_4px_rgba(251,191,36,0.6)]
ring-2 ring-amber-400/50
```

### 5. Glass DealResultCard

**File**: `src/components/deals/DealResultCard.tsx`

Replace solid Card with glassmorphic card:

```text
Current:
  Card className="overflow-hidden hover:shadow-md"
  + ring-2 ring-green-500 for best deal

Updated:
  className="
    overflow-hidden rounded-2xl
    bg-white/60 dark:bg-white/10
    backdrop-blur-xl
    border border-white/30 dark:border-white/10
    shadow-[0_4px_24px_rgba(0,0,0,0.06)]
    hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)]
    hover:bg-white/80 dark:hover:bg-white/15
    transition-all duration-200
  "
```

**Best Deal badge**:
- Small pill in top-left corner
- `bg-green-500/90 backdrop-blur-sm`
- `text-[9px] font-semibold text-white`
- `shadow-[0_0_8px_rgba(34,197,94,0.4)]`

**Open button**:
- Icon-only button (ExternalLink)
- `w-8 h-8 rounded-full`
- `bg-amber-500/90 hover:bg-amber-500`
- `text-white`

**Price styling**:
- Larger `text-lg font-bold`
- Merchant/rating in smaller `text-[10px] text-muted-foreground/80`

### 6. Tab Content Updates

**Files**: `PhotoTab.tsx`, `LinkTab.tsx`, `SearchTab.tsx`

**Dropzone (PhotoTab)**:
```text
Current: border-2 border-dashed, basic hover

Updated:
  border border-dashed border-white/40
  bg-white/30 dark:bg-white/5
  backdrop-blur-sm
  rounded-2xl
  hover:border-amber-500/50
  hover:bg-white/50
  transition-all
```

**Input fields (LinkTab, SearchTab)**:
```text
className="
  pl-10 h-12
  bg-white/50 dark:bg-white/10
  backdrop-blur-sm
  border-white/30 dark:border-white/20
  rounded-xl
  focus:ring-2 focus:ring-amber-500/30
  focus:border-amber-500/50
"
```

**Submit buttons**:
- `bg-gradient-to-r from-amber-500 to-orange-500`
- `rounded-xl h-11`
- `shadow-[0_4px_16px_rgba(251,191,36,0.3)]`
- `hover:shadow-[0_6px_20px_rgba(251,191,36,0.4)]`

### 7. CSS Additions

**File**: `src/index.css`

Add shimmer animation for loading states:

```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.animate-shimmer {
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0) 0%,
    rgba(255,255,255,0.4) 50%,
    rgba(255,255,255,0) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

---

## Component Hierarchy

```text
DealsDrawer (glass container)
├── Header
│   ├── Icon (gradient amber/orange)
│   ├── Title + Sparkles
│   └── Glass segmented tabs [Photo | Link | Search]
│
└── Tab Content
    ├── ScanPanel (shows input + status)
    ├── PriceVerdict (thin bar + chip labels + glow dot)
    ├── Disclaimer (tiny text)
    └── Results List
        └── DealResultCard × N (glass cards)
```

---

## Accessibility Considerations

| Element | Requirement |
|---------|-------------|
| Tab triggers | Maintain focus-visible ring (`ring-2 ring-ring`) |
| Price labels | WCAG AA contrast (green-600/red-500 on light backgrounds) |
| Best Deal badge | 4.5:1 contrast (white on green-500) |
| Button focus | Visible outline on keyboard focus |
| Loading states | Announce via aria-live for screen readers |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/deals/DealsDrawer.tsx` | Glass container, segmented tabs |
| `src/components/deals/PriceVerdict.tsx` | Thin bar, chip labels, glow marker |
| `src/components/deals/DealResultCard.tsx` | Glass card, icon button, pill badge |
| `src/components/deals/PhotoTab.tsx` | Glass dropzone, ScanPanel, shimmer loading |
| `src/components/deals/LinkTab.tsx` | Glass input, ScanPanel |
| `src/components/deals/SearchTab.tsx` | Glass input |
| `src/index.css` | Add shimmer keyframes |

---

## Visual Reference

The updated UI will match:
- **CountryDrawer** glass styling: `bg-white/80 backdrop-blur-2xl border-white/20`
- **GlobalSearch** tabs: Pill-shaped, active state with primary color
- **Phia overlay** aesthetic: Floating tool feel, amber/gold accent color

---

## No Breaking Changes

- All existing props, state, and data flow remain unchanged
- Route `/deals` and drawer behavior preserved
- Edge function calls (`deals-from-image`, `deals-from-url`, `deals-search`) untouched
- Only Tailwind classes and minor DOM structure adjustments


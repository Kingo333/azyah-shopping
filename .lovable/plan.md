

# Wire Dashboard Photo Upload to `deals-unified` with Ximilar

## Summary

The dashboard photo upload (`PhotoTab.tsx`) currently calls the legacy `deals-from-image` endpoint, which uses text-based heuristics for color/pattern detection. This plan wires it to use the new `deals-unified` pipeline with Ximilar fashion tagging for significantly better color and pattern accuracy.

---

## Current State vs Target State

| Aspect | Current (deals-from-image) | Target (deals-unified) |
|--------|---------------------------|------------------------|
| Color detection | Keyword matching from Lens titles | Ximilar dominant color extraction |
| Pattern detection | Keyword heuristics | Ximilar pattern/design classification |
| Category | Text matching | Ximilar fashion category API |
| Exact match | Not attempted | Google Lens `exact_matches` first |
| Chip looping | Not implemented | Top 2 Lens chips explored |
| Response | `shopping_results[]` only | `exact_match` + `shopping_results[]` + `ximilar_tags` |

---

## Implementation Steps

### Step 1: Create New Hook `useDealsUnified`

Create a new hook that matches the `deals-unified` API contract:

**File:** `src/hooks/useDealsUnified.ts`

```text
Input interface:
{
  source: 'app_upload'
  market: 'AE' | 'US' | 'UK'
  image_url: string (signed Supabase URL)
}

Output interface:
{
  success: boolean
  exact_match?: { link, title, source, thumbnail, price }
  shopping_results: ShoppingResult[]
  visual_matches: VisualMatch[]
  price_stats: PriceStats
  deals_found: number
  ximilar_tags?: {
    primary_category: string
    subcategory: string
    colors: string[]
    patterns: string[]
    is_pattern_mode: boolean
  }
  debug?: DebugInfo
}
```

Key differences from `useDealsFromImage`:
- Uses `source: 'app_upload'` instead of just `imageUrl`
- Returns `ximilar_tags` for UI display
- Returns `exact_match` separately from `shopping_results`

### Step 2: Update `PhotoTab.tsx`

Replace the `useDealsFromImage` hook with `useDealsUnified`:

```text
Current flow:
  handleCropConfirm → upload crop → searchFromImage(signedUrl)

New flow:
  handleCropConfirm → upload crop → searchUnified({ 
    source: 'app_upload',
    market: 'AE',
    image_url: signedUrl 
  })
```

Changes required:
1. Import `useDealsUnified` instead of `useDealsFromImage`
2. Update function call in `handleCropConfirm`
3. Update data consumption to handle new response shape

### Step 3: Add Ximilar Tags Display Component

Create a reusable component to show detected fashion attributes:

**File:** `src/components/deals/XimilarTagsDisplay.tsx`

```text
Props:
{
  category?: string
  subcategory?: string
  colors?: string[]
  patterns?: string[]
  isPatternMode?: boolean
}

Renders:
┌────────────────────────────────────────────┐
│ 🏷️ Detected: Dress                        │
│ [Black] [Gold] [Printed]                   │
└────────────────────────────────────────────┘
```

Visual design:
- Small pills/chips for colors and patterns
- Color pills have colored dot indicator
- Pattern mode shows "✨ Pattern Mode" badge

### Step 4: Add "Exact Match" Section

When `exact_match` is returned, show it prominently before alternatives:

**Update:** `PhotoTab.tsx` results section

```text
{data.exact_match && (
  <ExactMatchCard 
    result={data.exact_match}
    onOpen={...}
  />
)}
```

Design:
- Gold/highlighted border
- "Original Item Found" badge
- Shown above the regular results list

### Step 5: Update DealResultCard for Sub-Scores (Optional Enhancement)

If `sub_scores` are present, show visual match quality:

```text
Props addition:
{
  sub_scores?: {
    pattern: number
    silhouette: number
    color: number
  }
}

Renders tiny bar or percentage next to each result
```

### Step 6: Remove Separate Catalog Match Call

Currently `PhotoTab` makes a separate `matchCatalog()` call after receiving results. The `deals-unified` endpoint already handles this internally (or we can add it).

Check if `deals-unified` returns Azyah catalog matches, otherwise keep the existing flow.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useDealsUnified.ts` | Hook to call `deals-unified` endpoint |
| `src/components/deals/XimilarTagsDisplay.tsx` | Display detected fashion attributes |
| `src/components/deals/ExactMatchCard.tsx` | Highlighted card for exact match |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/deals/PhotoTab.tsx` | Replace hook, update data flow, add Ximilar tags display |
| `src/components/deals/DealResultCard.tsx` | (Optional) Add sub-scores display |

---

## Type Definitions

Add to existing types or create new file:

```text
interface UnifiedDealsResult {
  success: boolean;
  exact_match?: ExactMatch;
  shopping_results: ShoppingResult[];
  visual_matches: VisualMatch[];
  price_stats: PriceStats;
  deals_found: number;
  ximilar_tags?: XimilarTagsResponse;
  debug?: DebugInfo;
}

interface XimilarTagsResponse {
  primary_category?: string;
  subcategory?: string;
  colors?: string[];
  patterns?: string[];
  is_pattern_mode?: boolean;
}

interface ExactMatch {
  link: string;
  title: string;
  source: string;
  thumbnail?: string;
  price?: string;
  confidence?: number;
}
```

---

## Data Flow Diagram

```text
┌──────────────────────────────────────────────────────────────┐
│                    PHOTO UPLOAD FLOW                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  User drops image                                            │
│       ↓                                                      │
│  Upload to deals-uploads bucket                              │
│       ↓                                                      │
│  Show crop selector (detect-objects for ROI)                 │
│       ↓                                                      │
│  User confirms crop                                          │
│       ↓                                                      │
│  Upload cropped image → get signed URL                       │
│       ↓                                                      │
│  Call deals-unified:                                         │
│  {                                                           │
│    source: "app_upload",                                     │
│    market: "AE",                                             │
│    image_url: signedUrl                                      │
│  }                                                           │
│       ↓                                                      │
│  ┌─────────────────────────────────────┐                     │
│  │  deals-unified backend:             │                     │
│  │  1. Ximilar tagging                 │                     │
│  │  2. Google Lens exact + visual      │                     │
│  │  3. Chip looping (max 2)            │                     │
│  │  4. Google Shopping with hints      │                     │
│  │  5. Visual rerank (Gemini)          │                     │
│  │  6. Soft filtering + scoring        │                     │
│  └─────────────────────────────────────┘                     │
│       ↓                                                      │
│  Response:                                                   │
│  {                                                           │
│    exact_match: {...},                                       │
│    shopping_results: [...],                                  │
│    ximilar_tags: {                                           │
│      category: "dress",                                      │
│      colors: ["black", "gold"],                              │
│      patterns: ["printed"]                                   │
│    },                                                        │
│    price_stats: {...}                                        │
│  }                                                           │
│       ↓                                                      │
│  UI renders:                                                 │
│  - Ximilar tags (color/pattern pills)                        │
│  - Exact match card (if found)                               │
│  - Price verdict                                             │
│  - Ranked results                                            │
│  - Similar on Azyah                                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Backward Compatibility

- Keep `useDealsFromImage` hook for any other components that might use it
- The new hook is additive, not a replacement
- `deals-from-image` endpoint remains functional as fallback

---

## Technical Details

### Hook Implementation Pattern

The new hook follows the same pattern as existing hooks:

```text
export function useDealsUnified() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<UnifiedDealsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchUnified = useCallback(async (params: {
    source: 'app_upload';
    market?: 'AE' | 'US' | 'UK';
    image_url: string;
  }) => {
    setIsLoading(true);
    // ... call supabase.functions.invoke('deals-unified', { body: params })
  }, []);

  const reset = useCallback(() => { ... }, []);

  return { searchUnified, data, isLoading, error, reset };
}
```

### PhotoTab Changes Summary

```text
- import { useDealsFromImage } from '@/hooks/useDealsFromImage';
+ import { useDealsUnified } from '@/hooks/useDealsUnified';

- const { searchFromImage, data, isLoading, error, reset } = useDealsFromImage();
+ const { searchUnified, data, isLoading, error, reset } = useDealsUnified();

// In handleCropConfirm:
- await searchFromImage(signedData.signedUrl);
+ await searchUnified({ 
+   source: 'app_upload',
+   market: 'AE',
+   image_url: signedData.signedUrl 
+ });

// In results section, add:
+ {data?.ximilar_tags && (
+   <XimilarTagsDisplay {...data.ximilar_tags} />
+ )}
+ {data?.exact_match && (
+   <ExactMatchCard result={data.exact_match} />
+ )}
```

---

## Definition of Done

| Requirement | Acceptance Criteria |
|-------------|---------------------|
| Hook created | `useDealsUnified` calls `deals-unified` endpoint correctly |
| PhotoTab updated | Uses new hook, shows results from unified pipeline |
| Ximilar tags shown | Color/pattern pills visible when tags detected |
| Exact match displayed | Gold-highlighted card when original found |
| Pattern mode works | Pattern garments show better pattern-matched results |
| No regressions | Existing features (crop selector, price verdict, catalog match) still work |


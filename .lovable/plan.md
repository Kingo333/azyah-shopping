# Phia-Style "Find Better Deals" System Audit

## Status: ✅ Phase 1 Complete (2026-01-31)

---

## Approved Changes Implemented

### 1. ✅ Remove Search Mode Completely

**Files Deleted:**
- `src/components/deals/SearchTab.tsx`
- `src/hooks/useDealsSearch.ts`
- `supabase/functions/deals-search/index.ts`

**Files Updated:**
- `src/components/deals/DealsDrawer.tsx` - Now shows only Photo | Link tabs (2 columns)
- `supabase/config.toml` - Removed `deals-search` function config

---

### 2. ✅ Eliminate Server-Side Scraping

**Before (deals-from-url):**
```typescript
// REMOVED: This was actively scraping external sites
const pageResponse = await fetch(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AzyahBot/1.0)' },
});
const html = await pageResponse.text();
extractedProduct = extractMetadata(html);
```

**After:**
- Uses Google Lens directly on URL to detect og:image
- Extracts brand/product hints from URL path (no fetch)
- Provides `suggestion` field when results are low: "For best results, try uploading a photo of the product instead."

---

### 3. ✅ Improved Query Pack Generation (Category/Color/Silhouette Locking)

**New vocabulary constants:**
```typescript
const COLOR_WORDS = ['grey', 'gray', 'stone', 'beige', 'black', 'white', ...];
const CATEGORY_WORDS = ['abaya', 'kaftan', 'dress', 'kimono', 'modest', ...];
const SILHOUETTE_WORDS = ['open', 'kimono', 'butterfly', 'wide sleeve', ...];
const FABRIC_WORDS = ['satin', 'chiffon', 'linen', 'cotton', 'silk', ...];
```

**Query pack strategy:**
1. Extract color/category/silhouette/fabric from visual match titles
2. Generate locked queries: `{color} {category}`, `{color} {silhouette} {category}`
3. Include fabric variants: `{fabric} {category} {color}`
4. Fallback to raw visual match titles (cleaned)
5. Limit to 10 unique queries

---

### 4. ✅ Result Floor Strategy

If results < 10 after initial queries:
1. Run broader "style pack" queries (drop brand, keep category+color+silhouette)
2. Add generic fallbacks like `{category} UAE`, `modest {category}`
3. Continue deduplicating to prevent repeats

---

### 5. ✅ Pipeline Logging Counters

Both `deals-from-image` and `deals-from-url` now return:
```typescript
interface PipelineLog {
  input_has_image: boolean;
  query_pack_count: number;
  raw_results_count: number;
  after_dedupe_count: number;
  final_returned_count: number;
  used_fallback_queries: boolean;
}
```

Console logs now show:
```
[deals-from-image] Pipeline: input_has_image=true, query_pack=8, raw=127, dedupe=45, final=45
```

---

## Future Phases (Not Yet Implemented)

### Phase 2: Visual Re-ranking (Correct Approach)

**NOT using text embeddings for images!**

Correct implementation options:
1. **CLIP-style image embeddings** via OpenAI Vision or Hugging Face
2. **Heuristic rerank** (interim):
   - Dominant color similarity
   - Aspect ratio matching
   - "Person-wearing vs flat-lay" detection
   - Category constraint filtering

### Phase 3: In-App WebView Extractor (Mobile)

Flow:
1. User pastes URL → shows "Open in Azyah" prompt
2. Opens in-app WebView
3. Injects JS extractor (JSON-LD → OG → DOM fallback)
4. Builds `ProductContext` and calls `deals-from-context`

### Phase 4: Browser Extensions (Separate Project)

- Chrome Extension (Manifest V3)
- Safari Web Extension (Xcode wrapper)
- Both share extraction logic and call unified backend

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    PHIA-STYLE "FIND BETTER DEALS" (v2)                          │
├─────────────────────────────┬───────────────────────────────────────────────────┤
│         PhotoTab            │              LinkTab                              │
│    (Image upload)           │   (URL → Google Lens direct)                      │
├─────────────────────────────┴───────────────────────────────────────────────────┤
│                           Edge Functions                                        │
│      deals-from-image       │       deals-from-url                              │
│  (Google Lens + Query Pack) │  (NO scraping, Lens on URL)                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                    Query Pack Generation                                        │
│   • Color locking (grey, stone, beige...)                                       │
│   • Category locking (abaya, kaftan, dress...)                                  │
│   • Silhouette variants (open, kimono, butterfly...)                            │
│   • Result floor (min 10, fallback to style pack)                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                    SerpApi (Google Lens + Shopping)                             │
│   • gl=ae, hl=en, location=UAE                                                  │
│   • Merge all shopping arrays                                                   │
│   • Robust dedup (link → product_id → composite)                                │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Testing Checklist

- [ ] Photo tab: Upload grey abaya → get 10+ results, mostly similar silhouette/color
- [ ] Link tab: Paste ASOS URL → get results without server scraping errors
- [ ] Price verdict shows Low/Typical/High when ≥5 valid prices
- [ ] Pipeline logs visible in edge function logs
- [ ] No "Search" tab visible in UI

---

## Previous Fix: Similar on Azyah Section

### Issues Fixed (Earlier Session)

| Issue | Fix Applied |
|-------|-------------|
| View More needs 2 taps | Added `stopPropagation()` + `onPointerDown` on buttons |
| Carousel stutters | Removed `dragFree: true`, added `touch-action: pan-x` |
| ASOS images placeholder | Updated `isAsosUrl` regex, use `displaySrc()` |

### Files Modified
- `src/components/deals/AzyahMatchesSection.tsx`
- `src/lib/urlGuards.ts`

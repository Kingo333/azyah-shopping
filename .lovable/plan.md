

# Phia-Style "Find Better Deals" Verification Audit

## Executive Summary

| Area | Status | Details |
|------|--------|---------|
| **Search Mode Removed** | ✅ PASS | No SearchTab, no useDealsSearch, no deals-search function |
| **No Server Scraping** | ✅ PASS | Server-side fetch removed from deals-from-url |
| **Link Works Phia-style** | ❌ FAIL | No in-session extraction (extensions/WebView) implemented |
| **Photo/Link Parity** | ⚠️ PARTIAL | Both return results, but Link lacks image extraction capability |
| **ProductContext Schema** | ❌ FAIL | Not implemented - no unified schema exists |
| **WebView Extraction** | ❌ FAIL | Not implemented |
| **Extension Extraction** | ❌ FAIL | Not implemented |
| **Result Floor** | ✅ PASS | Style pack fallback triggers at <10 results |
| **Dedupe Robustness** | ✅ PASS | Uses link → product_id → composite key strategy |
| **Similarity Relevance** | ⚠️ PARTIAL | Query pack uses color/category locking but no visual rerank |
| **Price Verdict** | ✅ PASS | Requires 5+ prices, computes p25/p50/p75 |
| **Card Hierarchy** | ✅ PASS | Brand/Source + Price primary, Title secondary |
| **Pipeline Logging** | ✅ PASS | All counters present in response |
| **Rate Limiting** | ✅ PASS | 10 req/min/user implemented |
| **Caching** | ✅ PASS | 30-minute cache with hash keys |

---

## Section 1: Hard Requirements

### 1.1 Search Mode Removed

| Check | Result |
|-------|--------|
| SearchTab.tsx exists? | ❌ NO (deleted) |
| useDealsSearch.ts exists? | ❌ NO (deleted) |
| deals-search function exists? | ❌ NO (deleted) |
| DealsDrawer has only Photo/Link? | ✅ YES (grid-cols-2) |

**Status: ✅ PASS**

---

### 1.2 No Server-Side Scraping

| Check | Result |
|-------|--------|
| `deals-from-url` fetches product pages? | ❌ NO |
| HTML parsing (DOMParser/regex)? | ❌ NO |
| Uses Google Lens on URL directly | ✅ YES (line 451) |
| Uses URL path parsing only | ✅ YES (extractBrandFromUrl, extractProductHintFromUrl) |

**Code verification (deals-from-url lines 424-433):**
```typescript
// Extract brand and product hint from URL (NO server-side scraping)
const urlBrand = extractBrandFromUrl(url);
const urlProductHint = extractProductHintFromUrl(url);

let extractedProduct = { 
  title: urlProductHint, 
  image: null as string | null, 
  brand: urlBrand || null 
};
```

**Note:** The `extract-link-metadata` function still scrapes URLs but is NOT used by deals flows.

**Status: ✅ PASS**

---

### 1.3 Link Works Phia-Style (In-Session Extraction)

| Check | Result |
|-------|--------|
| Mobile WebView extractor? | ❌ NOT IMPLEMENTED |
| Chrome extension? | ❌ NOT IMPLEMENTED |
| Safari Web Extension? | ❌ NOT IMPLEMENTED |
| `deals-from-context` endpoint? | ❌ NOT IMPLEMENTED |
| ProductContext schema defined? | ❌ NOT IMPLEMENTED |
| "Open in Azyah" prompt? | ❌ NOT IMPLEMENTED |

**Current Link behavior:**
1. User pastes URL
2. Server runs Google Lens directly on the URL (works when URL contains og:image)
3. Falls back to URL path parsing for product hints
4. Shows `suggestion: "For best results, try uploading a photo instead."` when results are low

**Gap:** Link mode does NOT use in-session extraction. It relies on Google Lens being able to detect an image from the URL, which often fails on blocked sites (ASOS, Zara).

**Status: ❌ FAIL**

---

### 1.4 Photo and Link Share Same Pipeline

| Check | Result |
|-------|--------|
| Photo returns multiple results? | ✅ YES |
| Link returns multiple results? | ✅ YES (when Lens succeeds) |
| Both use query pack generation? | ✅ YES |
| Both use result floor strategy? | ✅ YES |
| Both compute price verdict? | ✅ YES |

**Gap:** Link cannot extract `main_image_url` from blocked sites, limiting similarity quality.

**Status: ⚠️ PARTIAL PASS**

---

## Section 2: ProductContext Contract

### 2.1 ProductContext Schema

**Expected schema:**
```typescript
type ProductContext = {
  page_url: string
  title?: string
  brand?: string
  price?: number
  currency?: string
  main_image_url?: string
  image_urls?: string[]
  category_hint?: string
  extracted_from: "chrome_ext" | "safari_ext" | "azyah_webview" | "photo_upload"
}
```

**Current state:** No ProductContext type exists. Backend uses ad-hoc structures:
- `deals-from-image` accepts: `{ imageUrl: string }`
- `deals-from-url` accepts: `{ url: string }`

**Status: ❌ FAIL**

---

### 2.2 WebView Extraction Quality

**Status: ❌ NOT IMPLEMENTED**

No in-app WebView with JS injection exists. The existing `@capacitor/browser` is not used for product extraction.

---

### 2.3 Extension Extraction Quality

**Status: ❌ NOT IMPLEMENTED**

No Chrome/Safari extension code exists in the repository.

---

## Section 3: Results Quality

### 3.1 Result Floor

| Check | Result |
|-------|--------|
| Multiple query sources? | ✅ YES (visual matches + query pack) |
| Fallback broadening at <10? | ✅ YES (buildStylePackQueries) |
| Pipeline logs show counters? | ✅ YES |

**Code verification (deals-from-image lines 454-457):**
```typescript
if (allShoppingResults.length < MIN_RESULTS_FLOOR && visualMatchTitles.length > 0) {
  console.log(`[deals-from-image] Below result floor (${allShoppingResults.length}), running style pack...`);
  pipelineLog.used_fallback_queries = true;
  // ... runs broader queries
}
```

**Status: ✅ PASS**

---

### 3.2 Dedupe Robustness

| Check | Result |
|-------|--------|
| Uses valid HTTP link? | ✅ YES |
| Falls back to product_id? | ✅ YES |
| Falls back to composite key? | ✅ YES (source + price + title) |

**Code verification (lines 114-134):**
```typescript
function dedupKey(result: any): string {
  const link = normalizeLink(result.link);
  const productId = (result.product_id || '').trim();
  
  if (link && link.startsWith('http')) {
    return `link:${link}`;
  }
  
  if (productId) {
    return `pid:${productId}`;
  }
  
  // Composite fallback
  return `mix:${source}|${price}|${title}`;
}
```

**Status: ✅ PASS**

---

### 3.3 Similarity Relevance

| Check | Result |
|-------|--------|
| Category locking? | ✅ YES (CATEGORY_WORDS vocabulary) |
| Color family locking? | ✅ YES (COLOR_WORDS vocabulary) |
| Silhouette keywords? | ✅ YES (SILHOUETTE_WORDS vocabulary) |
| Visual re-ranking (embeddings)? | ❌ NOT IMPLEMENTED |
| Heuristic re-ranking? | ❌ NOT IMPLEMENTED |

**Current sorting:** Price-only (lowest first)

**Code (line 531-536):**
```typescript
// Sort by price (will be replaced by visual similarity ranking in Phase 2)
allShoppingResults.sort((a, b) => {
  if (a.extracted_price === null) return 1;
  if (b.extracted_price === null) return -1;
  return a.extracted_price - b.extracted_price;
});
```

**Status: ⚠️ PARTIAL PASS** (query pack is good, but no visual rerank)

---

## Section 4: Price Verdict

| Check | Result |
|-------|--------|
| Requires 5+ valid prices? | ✅ YES (line 518) |
| Uses extracted_price numbers? | ✅ YES |
| Ignores null/invalid prices? | ✅ YES |
| Computes low/typical/high correctly? | ✅ YES (p25/p50/p75) |
| Handles insufficient data gracefully? | ✅ YES (shows "need 5+ to show range") |

**Status: ✅ PASS**

---

## Section 5: UI/UX

### 5.1 Card Hierarchy

**DealResultCard.tsx structure:**
- Line 77-78: Source (Brand) - PRIMARY, `text-xs font-medium`
- Line 81-83: Price - PRIMARY, `text-lg font-bold`
- Line 89-91: Title - SECONDARY, `text-[11px] text-muted-foreground/80`
- Lines 44-71: Thumbnail on left (w-16 h-16)
- Lines 103-114: External open button on right

**Status: ✅ PASS**

---

### 5.2 Photo/Link Flow Parity

| Element | PhotoTab | LinkTab |
|---------|----------|---------|
| ScanPanel preview | ✅ | ✅ |
| "X deals found" | ✅ | ✅ |
| PriceVerdict bar | ✅ | ✅ |
| AzyahMatchesSection | ✅ | ✅ |
| DealResultCard list | ✅ | ✅ |
| "Try another" button | ❌ (no reset button) | ✅ |

**Status: ✅ PASS** (minor: Photo could add reset button)

---

## Section 6: Logging & Observability

### 6.1 Pipeline Counters

**PipelineLog interface (both functions):**
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

**Console log format:**
```
[deals-from-image] Pipeline: input_has_image=true, query_pack=8, raw=127, dedupe=45, final=45
```

**Status: ✅ PASS**

---

## Section 7: Security & Cost Guards

| Check | Result |
|-------|--------|
| Per-user rate limit? | ✅ YES (10 req/min) |
| Cache prevents repeated API calls? | ✅ YES (30 min TTL) |
| Cache uses hash keys? | ✅ YES |

**Status: ✅ PASS**

---

## Section 8: Test Matrix (Cannot Execute - Need Manual Testing)

Tests require actual API calls. Recommend manual verification:

| Test | Expected | Manual Check Required |
|------|----------|----------------------|
| Photo: abaya on model | 10+ results, similar silhouette | ⬜ |
| Photo: sneakers on white | 10+ results | ⬜ |
| Photo: handbag product shot | 10+ results | ⬜ |
| Link: ASOS product page | Results via Lens (may fail) | ⬜ |
| Link: Amazon product page | Results via Lens (should work) | ⬜ |

---

## Issues Summary

### P0 - Critical (Blocking Phia Parity)

| Issue | File | Line | Description |
|-------|------|------|-------------|
| No in-session extraction | N/A | N/A | Link mode cannot extract from blocked sites |
| No ProductContext schema | N/A | N/A | No unified interface for extensions/WebView |
| No deals-from-context endpoint | N/A | N/A | Backend doesn't accept ProductContext |

### P1 - High (Quality Gap)

| Issue | File | Line | Description |
|-------|------|------|-------------|
| No visual re-ranking | deals-from-image | 531-536 | Results sorted by price, not similarity |
| Link lacks image extraction | deals-from-url | 457-458 | Only works if Lens detects og:image from URL |

### P2 - Medium (Polish)

| Issue | File | Line | Description |
|-------|------|------|-------------|
| PhotoTab no reset in results | PhotoTab.tsx | - | Missing "Try another" button after results |
| Carousel still has minor gesture issues | AzyahMatchesSection | 30-35 | May conflict with drawer in some edge cases |

---

## Fix Recommendations

### P0 Fixes Required

1. **Create `deals-from-context` Edge Function**
   - Accept standardized ProductContext payload
   - Use main_image_url for Lens if provided
   - Fall back to query-based search if no image

2. **Implement In-App WebView Extractor (Mobile)**
   - Create `OpenInAzyahButton` component in LinkTab
   - Use Capacitor Browser or custom WebView
   - Inject JS to extract JSON-LD → OG → DOM
   - Return ProductContext to `deals-from-context`

3. **Define ProductContext Type**
   - Create `src/types/ProductContext.ts`
   - Use in all deals hooks and edge functions

### P1 Fixes Required

1. **Add Visual Re-ranking (Heuristic First)**
   - Extract dominant color from input image
   - Filter results by color similarity
   - Sort by combined score (color match + price)

2. **Improve Link Image Extraction**
   - If Lens returns no image, prompt user to paste image URL or upload

---

## Definition of Done Checklist

### Phase 1 (Current - MOSTLY COMPLETE)

- [x] Search mode fully removed
- [x] Server-side scraping eliminated
- [x] Query pack with category/color/silhouette locking
- [x] Result floor strategy (min 10)
- [x] Pipeline logging counters
- [x] Rate limiting + caching
- [x] Card hierarchy (brand + price primary)
- [x] Price verdict with 5+ results guard

### Phase 2 (NOT STARTED)

- [ ] ProductContext schema defined
- [ ] `deals-from-context` endpoint created
- [ ] In-app WebView extractor (mobile)
- [ ] Visual re-ranking (heuristic or embeddings)

### Phase 3 (NOT STARTED)

- [ ] Chrome Extension (Manifest V3)
- [ ] Safari Web Extension
- [ ] Extension extraction parity with WebView

---

## Final Verdict

**Phase 1 Implementation: ✅ COMPLETE**

The system has successfully:
- Removed Search mode entirely
- Eliminated server-side scraping
- Implemented query pack with descriptor locking
- Added result floor strategy
- Maintained proper UI hierarchy

**Phia-Style Parity: ❌ NOT ACHIEVED**

Critical gaps remain:
- No in-session extraction (extensions/WebView)
- No ProductContext standardization
- No visual re-ranking
- Link mode limited without client-side extraction

**Recommendation:** Proceed to Phase 2 implementation focusing on:
1. In-app WebView extractor (highest ROI for mobile users)
2. Visual heuristic re-ranking
3. ProductContext standardization


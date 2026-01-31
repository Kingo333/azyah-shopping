# Phia-Style "Find Better Deals" Implementation Status

## Phase 2 Audit Summary (Accurate as of latest review)

| Area | Status | Details |
|------|--------|---------|
| **ProductContext Schema** | ✅ DONE | `src/types/ProductContext.ts` with full typing |
| **deals-from-context Endpoint** | ✅ DONE | JWT verified, rate limiting, caching, no scraping |
| **Visual Heuristic Rerank** | ✅ DONE | 0.4 color + 0.4 category + 0.2 source quality |
| **Dedupe + Merge Arrays** | ✅ DONE | link → product_id → composite fallback |
| **Blocked-site Detection** | ✅ FIXED | Precise domain matching (hostname === site \|\| endsWith) |
| **WebView Extraction** | ❌ NOT WORKING | Uses @capacitor/browser (cannot inject JS) |
| **Open in Azyah Flow** | ❌ NOT WORKING | Opens system browser, extraction script never runs |
| **Extensions** | ❌ NOT STARTED | Chrome/Safari extensions not implemented |

---

## What's Actually Complete

### ✅ Approved Components

1. **ProductContext Type** (`src/types/ProductContext.ts`)
   - Full schema with page_url, extracted_from enum, optional fields
   - Response types for deals-from-context

2. **deals-from-context Edge Function** (`supabase/functions/deals-from-context/index.ts`)
   - Accepts ProductContext payload
   - JWT authentication via `supabase.auth.getUser(token)`
   - Rate limiting: 10 req/min/user via `deals_rate_limit` table
   - Caching: 30-min TTL via `deals_cache` table
   - No server-side HTML scraping
   - Visual heuristic reranking applied

3. **Visual Heuristic Reranking** (all edge functions)
   - `computeSimilarityScore()` with weighted scoring
   - Sort by similarity first, price as tiebreaker
   - `pipeline_log.visual_rerank_applied` flag

4. **Dedupe Robustness**
   - `dedupKey()` uses link → product_id → composite key
   - `mergeShoppingArrays()` combines shopping, inline, sponsored, related
   - Empty links don't collapse results

5. **Blocked-site Detection** (`src/components/deals/LinkTab.tsx`)
   - Fixed: Uses precise domain matching
   - `hostname === site || hostname.endsWith('.' + site)`

---

## What's NOT Working (Phase 2 Incomplete)

### ❌ WebView Extraction (Critical Gap)

**Problem:** `OpenInAzyahButton.tsx` uses `@capacitor/browser`

```typescript
// Current implementation - DOES NOT WORK FOR EXTRACTION
await Browser.open({
  url,
  presentationStyle: 'popover',
  toolbarColor: '#1f2937',
});
```

**Why it fails:**
- `@capacitor/browser` opens SFSafariViewController (iOS) or Chrome Custom Tabs (Android)
- These are system browsers that **cannot run JavaScript injection**
- The extraction script in `webview-extractor.ts` is never executed
- ProductContext is never captured from the browsing session

**Required fix:** Replace with a WebView plugin that supports `evaluateJavaScript()`:
- Option 1: `@nicholasleblanc/capacitor-webview` or similar
- Option 2: Custom native plugin using WKWebView (iOS) / Android WebView
- Must support: open URL → inject JS → receive response → close

### ❌ Extraction Bridge Not Connected

Even if WebView worked, the flow is not wired:
1. App opens WebView ❓
2. App injects extraction script ❓ (script exists but never runs)
3. Extractor returns ProductContext ❓
4. App calls `deals-from-context` ❓
5. User sees improved results ❓

---

## Phase Completion Criteria

### Phase 2 Approval Rule

**Phase 2 is complete ONLY when this works:**

> On iPhone + Android:
> 1. Open a Zara/ASOS/Nike product page
> 2. Tap "Open in Azyah"
> 3. It returns title + main_image_url + price (ProductContext)
> 4. App calls deals-from-context with that context
> 5. Deals are clearly more similar than URL paste fallback

**Current status:** Cannot do this. Phase 2 is NOT complete.

---

## Remaining Work

### P0 — Real WebView Extraction

1. Replace `@capacitor/browser` with WebView plugin supporting JS injection
2. Implement extraction bridge:
   ```typescript
   // Pseudocode for what's needed
   const result = await WebView.evaluateJavaScript(EXTRACTION_SCRIPT);
   const context = parseExtractionResult(result);
   onContextExtracted?.(context);
   ```
3. Wire `onContextExtracted` to call `useDealsFromContext.searchFromContext()`

### P1 — Manual Test Matrix

Verify with actual API calls:
- Photo: abaya → 10+ similar results
- Photo: sneakers → 10+ results
- URL: Amazon → works via Lens
- URL: Shopify → works via Lens
- URL: ASOS via WebView extraction → ProductContext captured, better results
- URL: Nike via WebView extraction → ProductContext captured, better results

### Phase 3 (Future)

- Chrome Extension (Manifest V3)
- Safari Web Extension
- Extension extraction parity with WebView

---

## Files Reference

| File | Status | Purpose |
|------|--------|---------|
| `src/types/ProductContext.ts` | ✅ Done | Type definitions |
| `supabase/functions/deals-from-context/index.ts` | ✅ Done | Backend endpoint |
| `src/hooks/useDealsFromContext.ts` | ✅ Done | Frontend hook |
| `src/lib/webview-extractor.ts` | ⚠️ Exists but unused | Extraction script |
| `src/components/deals/OpenInAzyahButton.tsx` | ❌ Broken | Uses wrong WebView |
| `src/components/deals/LinkTab.tsx` | ✅ Fixed | Blocked-site detection |

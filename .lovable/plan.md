
# Browser Extension Implementation Plan — "Find Better Deals" (Phia-Style)

## Executive Summary

Build a Chrome extension (MV3) that provides a Phia-like shopping experience: when a user is on any product page, they can click a button to extract the product image and find visually similar deals using the existing Supabase backend infrastructure.

---

## Part 1: Audit of Existing Assets

### Assets We Will Reuse

| Asset | Purpose | Status |
|-------|---------|--------|
| `deals-from-image` | Takes an image URL → returns shopping deals with visual reranking | ✅ Ready (accepts signed HTTPS URLs) |
| `deals-from-context` | Takes ProductContext payload → runs Lens + shopping search | ✅ Ready (used by WebView flow) |
| `visual-rerank` | Reranks results with granular sub-scores (pattern/silhouette/color) | ✅ Ready (pattern mode implemented) |
| `detect-objects` | Auto-detects product ROI with Gemini Vision | ✅ Ready (accepts bucket/path or HTTPS URL) |
| `deals-match-catalog` | Finds "Similar on Azyah" catalog matches | ✅ Ready |
| `ProductContext` interface | Standardized extraction payload schema | ✅ Ready (`src/types/ProductContext.ts`) |
| `webview-extractor.ts` | JavaScript extraction logic (JSON-LD → OG → DOM) | ✅ Reusable for extension |

### Gaps Requiring Backend Changes

| Gap | Problem | Solution |
|-----|---------|----------|
| Image URL download | Extension sends page image URLs that may be blocked from Lens | Backend downloads image server-side and uploads to Storage |
| Authentication | Extensions need API key auth, not JWT | Add API key auth mode to edge functions |
| CORS for extension | Extension calls from `chrome-extension://` origin | Already handled with `Access-Control-Allow-Origin: *` |

---

## Part 2: Extension Architecture

### 2.1 File Structure

```text
extension/
├── manifest.json           # MV3 manifest
├── service_worker.js       # Background script (API calls)
├── content_script.js       # Injected into product pages
├── sidepanel.html          # Side panel UI
├── sidepanel.js            # Side panel logic
├── styles.css              # Side panel styles
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── lib/
    └── extractor.js        # Product extraction (from webview-extractor.ts)
```

### 2.2 Manifest Configuration (MV3)

```text
- Permissions: activeTab, scripting, storage, sidePanel
- Host permissions: <all_urls> (for image extraction)
- Content scripts: Inject on all product pages
- Side panel: Primary UI (Chrome 116+)
```

### 2.3 Data Flow

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ EXTENSION FLOW                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. User visits product page                                                │
│     ↓                                                                       │
│  2. Content script extracts product info:                                   │
│     • JSON-LD Product schema (highest priority)                             │
│     • OpenGraph meta tags                                                   │
│     • DOM fallback (title, price, main image)                               │
│     ↓                                                                       │
│  3. User clicks "Find Better Deals" button                                  │
│     ↓                                                                       │
│  4. Side panel opens showing extracted product preview                      │
│     ↓                                                                       │
│  5. Service worker sends to backend:                                        │
│     POST /deals-from-context                                                │
│     {                                                                       │
│       "context": {                                                          │
│         "page_url": "https://...",                                          │
│         "extracted_from": "chrome_ext",                                     │
│         "main_image_url": "https://...",                                    │
│         "title": "...",                                                     │
│         "price": 99.99,                                                     │
│         "category_hint": "dress"                                            │
│       }                                                                     │
│     }                                                                       │
│     ↓                                                                       │
│  6. Backend:                                                                │
│     a) Downloads image server-side (avoids CORS/hotlinking)                 │
│     b) Stores in deals-uploads bucket                                       │
│     c) Runs Google Lens with signed URL                                     │
│     d) Runs shopping search with query pack                                 │
│     e) Runs visual rerank with pattern mode                                 │
│     f) Runs deals-match-catalog                                             │
│     ↓                                                                       │
│  7. Side panel displays results:                                            │
│     • Price verdict                                                         │
│     • Best match (highlighted)                                              │
│     • Similar deals list                                                    │
│     • Similar on Azyah section                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 3: Implementation Details

### Phase 1: Core Extension (MVP)

#### 3.1 Content Script — Product Extraction

Reuse the extraction logic from `src/lib/webview-extractor.ts`:

**Priority order:**
1. **JSON-LD Product** — Parse `<script type="application/ld+json">` for `@type: "Product"`
2. **OpenGraph** — `og:title`, `og:image`, `og:site_name`
3. **DOM fallback** — Common selectors for title, price, main image

**Output:**
```text
{
  pageUrl: string,
  title: string | null,
  priceText: string | null,
  currencyGuess: string | null,
  imageUrl: string | null,
  allCandidateImages: string[],
  extractionConfidence: 'high' | 'medium' | 'low'
}
```

#### 3.2 Service Worker — API Communication

**Authentication strategy:**
- For authenticated users: Use Supabase access token from storage
- For guest users: Prompt to sign in (link to Azyah app)

**API calls:**
1. `deals-from-context` — Primary endpoint for extension flow
2. `deals-match-catalog` — Catalog similarity (separate call for async)

#### 3.3 Side Panel UI

**Layout:**
```text
┌────────────────────────────────────────┐
│  🔍 Find Better Deals                  │
├────────────────────────────────────────┤
│  [Product Image]  │ Title              │
│                   │ Price: AED 299     │
│                   │ Source: ASOS       │
├────────────────────────────────────────┤
│  [Search Deals]  [Select Image ▼]      │
├────────────────────────────────────────┤
│  💰 Price Verdict                      │
│  ├─ Low: AED 150                       │
│  ├─ Median: AED 280                    │
│  └─ High: AED 450                      │
├────────────────────────────────────────┤
│  ⭐ Best Match                         │
│  └─ [Card: Image | Title | Price]      │
├────────────────────────────────────────┤
│  📦 Similar Deals                      │
│  ├─ [Card 1]                           │
│  ├─ [Card 2]                           │
│  └─ [Card 3]                           │
├────────────────────────────────────────┤
│  🏷️ Similar on Azyah                   │
│  └─ [Horizontal scroll cards]          │
└────────────────────────────────────────┘
```

**States:**
- `idle` — Waiting for user action
- `extracting` — Running extraction
- `searching` — Calling API
- `results` — Showing deals
- `error` — Show error with retry option

#### 3.4 Image Selection Mode

When auto-detection fails or user wants a different image:

1. User clicks "Select Image" button
2. Content script overlays page with selector mode
3. All `<img>` elements get highlight-on-hover
4. User clicks desired image
5. Overlay closes, side panel updates with new image

---

### Phase 2: Backend Changes

#### 3.5 Add Image Download Helper to `deals-from-context`

**New logic in `deals-from-context`:**

```text
if (context.main_image_url && context.main_image_url.startsWith('https://')) {
  // Download image server-side to avoid hotlinking blocks
  const imageBlob = await fetch(context.main_image_url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AzyahBot/1.0)' }
  });
  
  // Upload to deals-uploads bucket
  const path = `ext/${userId}/${uuid}.jpg`;
  await supabase.storage.from('deals-uploads').upload(path, imageBlob);
  
  // Generate signed URL for Lens
  const signedUrl = await supabase.storage.from('deals-uploads').createSignedUrl(path, 900);
  
  // Use signed URL for Lens search
  lensSearchUrl = signedUrl;
}
```

#### 3.6 Add Debug Fields to Response

```text
{
  "success": true,
  "debug": {
    "used_image_url": "https://...(signed URL)",
    "image_downloaded": true,
    "roi_used": false,
    "visual_rerank_applied": true,
    "pattern_mode": true,
    "filtered_count": 5,
    "top_scores": [
      { "link": "...", "textScore": 0.32, "visual": 0.78, "final": 0.69 }
    ]
  }
}
```

---

### Phase 3: Quality & Polish

#### 3.7 Screenshot Fallback

When image URL extraction fails:

1. User clicks "Capture Screenshot"
2. Extension captures visible tab region
3. User draws selection box on screenshot
4. Cropped image is converted to base64
5. Upload to `deals-uploads` bucket
6. Proceed with normal search flow

#### 3.8 Rate Limiting & Caching

Reuse existing infrastructure:
- `deals_rate_limit` table — 10 req/min/user
- `deals_cache` table — 30-minute cache

#### 3.9 Error Handling

| Scenario | User Message |
|----------|--------------|
| No product detected | "Couldn't detect a product. Try selecting an image manually." |
| Image blocked | "This site blocks image access. Try using screenshot capture." |
| Rate limited | "You've searched a lot! Try again in 1 minute." |
| API error | "Something went wrong. Please try again." |
| Not logged in | "Sign in to Azyah to find deals." |

---

## Part 4: Files to Create/Modify

### New Files (Extension)

| File | Description |
|------|-------------|
| `extension/manifest.json` | Chrome MV3 manifest |
| `extension/service_worker.js` | Background script for API calls |
| `extension/content_script.js` | Product extraction + image selector |
| `extension/sidepanel.html` | Side panel HTML |
| `extension/sidepanel.js` | Side panel JavaScript |
| `extension/styles.css` | Side panel styling |
| `extension/lib/extractor.js` | Extraction logic (ported from TS) |
| `extension/icons/*` | Extension icons |

### Modified Files (Backend)

| File | Changes |
|------|---------|
| `supabase/functions/deals-from-context/index.ts` | Add server-side image download |
| `supabase/config.toml` | (no changes needed — JWT verification already configured) |

---

## Part 5: Technical Details

### 5.1 Content Script Injection

```text
// manifest.json content_scripts section
"content_scripts": [{
  "matches": ["<all_urls>"],
  "js": ["content_script.js"],
  "run_at": "document_idle"
}]
```

### 5.2 Side Panel Registration

```text
// manifest.json side_panel section
"side_panel": {
  "default_path": "sidepanel.html"
}
```

### 5.3 Service Worker Message Handling

```text
// Messages from content script → service worker
- EXTRACT_PRODUCT: { tabId } → Run extraction
- SEARCH_DEALS: { context } → Call backend
- GET_AUTH_STATUS: {} → Check if user is logged in

// Messages from side panel → service worker
- SEARCH_DEALS: { context } → Call backend
- SELECT_IMAGE: { tabId } → Activate image selector mode
- CAPTURE_SCREENSHOT: { tabId } → Start screenshot capture
```

### 5.4 API Call Structure

```text
POST https://klwolsopucgswhtdlsps.supabase.co/functions/v1/deals-from-context
Headers:
  Authorization: Bearer <user_access_token>
  Content-Type: application/json

Body:
{
  "context": {
    "page_url": "https://www.asos.com/product/...",
    "extracted_from": "chrome_ext",
    "title": "ASOS DESIGN midi dress in black",
    "brand": "ASOS",
    "price": 45.00,
    "currency": "USD",
    "main_image_url": "https://images.asos-media.com/...",
    "category_hint": "dress",
    "extraction_confidence": "high"
  }
}
```

---

## Part 6: Definition of Done

| Requirement | Acceptance Criteria |
|-------------|---------------------|
| Button appears | Floating button visible on product pages (configurable sites) |
| Product extraction | Correctly extracts title, image, price from JSON-LD/OG/DOM |
| Search works | Returns visually similar deals (pattern/color matching) |
| Results display | Side panel shows price verdict, best match, deals list |
| Similar on Azyah | Shows catalog matches when available |
| Image selector | User can manually select any image on page |
| Screenshot fallback | Works when image URLs are blocked |
| Authentication | Prompts sign-in for unauthenticated users |
| Error handling | Graceful fallbacks with actionable messages |

---

## Part 7: Implementation Order

**Phase 1 (Core MVP) — Estimated: 1-2 days**
1. Create extension folder structure and manifest
2. Port extraction logic from webview-extractor.ts
3. Build content script with extraction + floating button
4. Build side panel UI (static mockup first)
5. Implement service worker API calls
6. Connect all pieces end-to-end

**Phase 2 (Backend Support) — Estimated: 1 day**
1. Add server-side image download to deals-from-context
2. Add debug fields to response
3. Test with various retailer sites

**Phase 3 (Polish) — Estimated: 1-2 days**
1. Implement image selector mode
2. Implement screenshot capture fallback
3. Add loading states and error handling
4. Style refinements
5. Cross-browser testing

**Phase 4 (Safari Port) — Future**
1. Convert to Safari Web Extension
2. Submit to App Store

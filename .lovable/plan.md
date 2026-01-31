

# Image Search Enhancement Plan: Google Lens-Level Accuracy

## ✅ IMPLEMENTATION STATUS: COMPLETE

All 4 phases have been implemented:

### Phase 1: Backend Vocabulary (DONE)
- Added `PATTERN_WORDS` (40+ patterns) and `TRIM_WORDS` (15+ trims)
- Added `BRAND_PATTERNS` (100+ fashion brands)
- Updated `extractDescriptors()` to include patterns/trims
- Updated `buildQueryPack()` to prioritize pattern queries
- Updated scoring weights: Pattern 0.25, Category 0.20, Color 0.15, Trim 0.10, Brand 0.05-0.12

### Phase 2: Smart Crop UI (DONE)
- Created `ImageCropSelector.tsx` with draggable/resizable crop box
- Created `imageCropUtils.ts` with canvas crop helpers
- Updated `PhotoTab.tsx` to show crop step before search
- Added presets: Garment, Pattern, Full Image

### Phase 3: AI Overview Attributes (DONE)
- Created `analyze-product-image` edge function
- Returns structured JSON: category, colors, pattern, fabric, silhouette, description
- Uses Gemini vision for analysis

### Phase 4: Visual Rerank (DONE)
- Created `visual-rerank` edge function
- Compares query image to result thumbnails using Gemini
- Returns similarity scores 0-1 for each result
- Blends 60% text score + 40% visual score

---

## Original Plan

## Executive Summary

This plan enhances the "Find Deals from Photo" feature to match Google Lens/Pinterest accuracy by adding:

1. **Layer 0**: Smart Select crop UI (Google Lens-style region selection)
2. **Layer 0.5**: AI Overview attribute extraction (structured hints before Lens)
3. **Layer B**: Multi-crop visual search (parallel Lens queries)
4. **Layer C**: Soft brand detection (bonus scoring, not hard matching)
5. **Layer D**: Enhanced pattern/print vocabulary
6. **Layer E**: Visual rerank using thumbnail embeddings (the "secret sauce")

**No background removal (bg-remove)** - replaced by user-controlled cropping which is more reliable and matches how Google Lens actually works.

---

## Current Architecture Problems

Based on code review:

| Issue | Impact | Evidence |
|-------|--------|----------|
| Raw images sent to Lens | Model + background confuses Lens → "generic abaya" results | `PhotoTab.tsx` line 75: `searchFromImage(signedData.signedUrl)` |
| No crop UI | User can't isolate the garment | No cropping component exists |
| Text-only reranking | Color/category matching ignores visual similarity | `deals-from-image/index.ts` lines 531-602 |
| No brand detection | Brand signals in Lens titles discarded | Only category/color extracted |
| No pattern vocabulary | "printed", "paisley", "border" not extracted | Current vocab lacks pattern terms |

---

## Implementation Plan

### Layer 0: Smart Select Crop UI (Frontend)

**Goal**: Let user select the exact garment region before search, like Google Lens does.

**New Component**: `src/components/deals/ImageCropSelector.tsx`

Features:
- Draggable/resizable crop box over uploaded image
- Quick presets: "Garment", "Pattern/Detail", "Full Image"
- Auto-suggested default crop: center 70% of image
- Generates 1-3 crop URLs for backend

```text
User Flow:
1. Upload photo
2. Crop selector appears with auto-suggested box
3. User can adjust or use presets
4. "Search" triggers upload of selected crops
5. Backend runs Lens on each crop
```

**Files to Create**:
- `src/components/deals/ImageCropSelector.tsx` - Interactive crop UI
- `src/utils/imageCropUtils.ts` - Canvas crop helpers

**Files to Modify**:
- `src/components/deals/PhotoTab.tsx` - Add crop step between upload and search
- `src/hooks/useDealsFromImage.ts` - Accept `imageUrls[]` array

### Layer 0.5: AI Overview Attribute Extraction

**Goal**: Before calling Lens, run Gemini vision on the cropped image to extract structured attributes.

This mimics Google's "AI Overview" panel that shows: "Looks like: printed open abaya with border trim"

**New Edge Function**: `supabase/functions/analyze-product-image/index.ts`

Inputs:
- `imageUrl`: The cropped garment image

Outputs (structured JSON):
```json
{
  "category": "open abaya",
  "subcategory": "kimono style",
  "color_primary": "beige",
  "color_secondary": "multicolor border",
  "pattern": "printed paisley border",
  "fabric_hint": "flowing/chiffon-like",
  "silhouette": "open front, wide sleeves",
  "brand_guess": null,
  "confidence": 0.85
}
```

Uses existing `LOVABLE_API_KEY` + Gemini (same pattern as `auto-tag` function).

**Integration**:
- Called before Lens queries
- Attributes used to build smarter query pack
- Shown in UI: "Looks like: {color} {pattern} {category}"

### Layer B: Multi-Crop Visual Search (Backend)

**Modify**: `supabase/functions/deals-from-image/index.ts`

**Changes**:

1. Accept array of image URLs:
```typescript
interface DealsFromImageInput {
  imageUrl?: string;           // Legacy single image
  imageUrls?: {
    url: string;
    cropType: 'full' | 'garment' | 'pattern';
  }[];
  aiAttributes?: AttributeHints;
}
```

2. Run parallel Lens calls (max 3):
```typescript
const lensPromises = imageUrls.map(({ url, cropType }) => 
  callLensApi(url).then(results => ({ results, cropType }))
);
const allLensResults = await Promise.all(lensPromises);
```

3. Weighted merge:
```text
Pattern crop matches → weight 1.5
Garment crop matches → weight 1.2
Full image matches → weight 1.0
```

4. Dedupe across all crops

### Layer C: Brand Detection (Soft Bonus)

**Modify**: `supabase/functions/deals-from-image/index.ts`

Add brand vocabulary (100+ fashion brands):
```typescript
const BRAND_PATTERNS = [
  'zimmermann', 'etro', 'gucci', 'prada', 'zara', 'mango', 'hm',
  'uniqlo', 'asos', 'namshi', 'ounass', 'farfetch', 'net-a-porter',
  'massimo dutti', 'cos', 'arket', 'other stories', 'reiss',
  'karen millen', 'hobbs', 'anthropologie', 'free people',
  // ... 80+ more
];
```

Brand detection from Lens titles:
```typescript
function extractBrandHints(titles: string[]): { brand: string; confidence: number }[] {
  const matches: Map<string, number> = new Map();
  
  for (const title of titles) {
    const lower = title.toLowerCase();
    for (const brand of BRAND_PATTERNS) {
      if (lower.includes(brand)) {
        matches.set(brand, (matches.get(brand) || 0) + 1);
      }
    }
  }
  
  return Array.from(matches.entries())
    .map(([brand, count]) => ({
      brand,
      confidence: count >= 3 ? 0.9 : count >= 2 ? 0.6 : 0.3
    }))
    .sort((a, b) => b.confidence - a.confidence);
}
```

**Soft bonus in reranking** (NOT hard matching):
```typescript
// Brand bonus: 0.05-0.12 (very soft - doesn't dominate)
if (detectedBrands.length > 0) {
  const topBrand = detectedBrands[0];
  if (resultTitle.includes(topBrand.brand)) {
    score += topBrand.confidence * 0.12; // Max 0.12 for high-confidence brand
  }
}
```

### Layer D: Pattern/Print Vocabulary

**Modify**: `supabase/functions/deals-from-image/index.ts`

Add comprehensive pattern vocabulary:
```typescript
const PATTERN_WORDS = [
  // Prints
  'printed', 'print', 'floral', 'paisley', 'abstract', 'geometric',
  'animal', 'leopard', 'zebra', 'snake', 'polka', 'dot', 'striped',
  'stripe', 'plaid', 'check', 'gingham', 'tartan', 'houndstooth',
  'tie-dye', 'marble', 'tropical', 'botanical',
  
  // Surface treatments
  'embroidered', 'embroidery', 'sequin', 'beaded', 'crystal',
  'applique', 'patchwork', 'quilted', 'textured', 'ribbed',
  
  // Transparency/texture
  'lace', 'mesh', 'sheer', 'see-through', 'crochet', 'knit',
  
  // Color effects
  'gradient', 'ombre', 'color-block', 'two-tone', 'contrast'
];

const TRIM_WORDS = [
  'border', 'trim', 'edging', 'piping', 'contrast trim',
  'fringe', 'tassel', 'ruffle', 'pleated', 'scalloped'
];
```

Update `extractDescriptors` to include patterns:
```typescript
function extractDescriptors(titles: string[]): ExtractedDescriptors {
  const allText = titles.join(' ').toLowerCase();
  
  return {
    colors: COLOR_WORDS.filter(c => allText.includes(c)),
    categories: CATEGORY_WORDS.filter(c => allText.includes(c)),
    silhouettes: SILHOUETTE_WORDS.filter(s => allText.includes(s)),
    fabrics: FABRIC_WORDS.filter(f => allText.includes(f)),
    patterns: PATTERN_WORDS.filter(p => allText.includes(p)),      // NEW
    trims: TRIM_WORDS.filter(t => allText.includes(t)),             // NEW
  };
}
```

Update query pack building to include patterns:
```typescript
if (patterns.length > 0) {
  queries.push(`${patterns[0]} ${primaryCategory}`);
  if (primaryColor) {
    queries.push(`${primaryColor} ${patterns[0]} ${primaryCategory}`);
  }
}

if (trims.length > 0) {
  queries.push(`${primaryCategory} with ${trims[0]}`);
}
```

### Layer E: Visual Rerank Using Thumbnail Embeddings

**Goal**: After getting shopping results, compute actual visual similarity between the query image and result thumbnails.

This is the "near-duplicate-ish" behavior that makes Google/Pinterest so accurate.

**New Edge Function**: `supabase/functions/visual-rerank/index.ts`

Uses OpenAI CLIP embeddings (or Gemini vision) to compute visual similarity:

```typescript
interface VisualRerankInput {
  queryImageUrl: string;
  results: Array<{
    id: string;
    thumbnailUrl: string;
    currentScore: number;
  }>;
}

interface VisualRerankOutput {
  results: Array<{
    id: string;
    visualSimilarity: number;  // 0-1
    combinedScore: number;     // weighted blend
  }>;
}
```

Implementation approach:
```typescript
// Option A: Use OpenAI embeddings (requires OpenAI API)
async function computeVisualSimilarity(imageA: string, imageB: string): Promise<number> {
  // Use OpenAI CLIP or vision model to compare images
  // Return cosine similarity 0-1
}

// Option B: Use Gemini to compare images (already have LOVABLE_API_KEY)
async function compareImagesWithGemini(
  queryImage: string, 
  thumbnails: string[]
): Promise<number[]> {
  // Batch comparison: "Rate similarity 0-10 for each thumbnail vs query"
  // Convert to 0-1 scores
}
```

Integration in `deals-from-image`:
```typescript
// After text reranking, run visual rerank on top 30 results
if (allShoppingResults.length >= 10) {
  const topResults = allShoppingResults.slice(0, 30);
  
  const visualScores = await visualRerank({
    queryImageUrl: primaryCropUrl,
    results: topResults.map(r => ({
      id: r.link,
      thumbnailUrl: r.thumbnail,
      currentScore: r.similarity_score ?? 0
    }))
  });
  
  // Blend: 60% text score + 40% visual score
  for (const result of topResults) {
    const vs = visualScores.find(v => v.id === result.link);
    if (vs) {
      result.similarity_score = result.similarity_score * 0.6 + vs.visualSimilarity * 0.4;
    }
  }
  
  // Re-sort
  allShoppingResults.sort((a, b) => (b.similarity_score ?? 0) - (a.similarity_score ?? 0));
}
```

---

## Updated Scoring Weights

**Current weights** (text-only):
- Color match: 0.4
- Category match: 0.4
- Source quality: 0.2

**New weights** (visual + text):
- Pattern match: 0.25 (NEW - highest priority for prints)
- Category match: 0.20 (reduced)
- Color match: 0.15 (reduced)
- Visual similarity: 0.25 (NEW - from embedding comparison)
- Brand bonus: 0.05-0.12 (soft, confidence-weighted)
- Source quality: 0.05 (reduced)

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `src/components/deals/ImageCropSelector.tsx` | Interactive crop UI with presets |
| `src/utils/imageCropUtils.ts` | Canvas crop and multi-region generation |
| `supabase/functions/analyze-product-image/index.ts` | AI attribute extraction (Gemini) |
| `supabase/functions/visual-rerank/index.ts` | Thumbnail embedding comparison |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/deals/PhotoTab.tsx` | Add crop step, show "Looks like:" hint, send multiple crops |
| `src/hooks/useDealsFromImage.ts` | Accept `imageUrls[]` and `aiAttributes` |
| `supabase/functions/deals-from-image/index.ts` | Multi-crop Lens, brand detection, pattern vocab, call visual-rerank |

---

## Implementation Phases

### Phase 1: Quick Wins (4-6 hours)

**Backend vocabulary expansion + brand detection**:
1. Add `PATTERN_WORDS` and `TRIM_WORDS` to `deals-from-image`
2. Add `BRAND_PATTERNS` (100+ brands)
3. Extract patterns/brands from Lens titles
4. Use in query pack building
5. Add soft brand bonus to scoring (0.05-0.12)

**Expected impact**: 20-30% improvement for patterned items

### Phase 2: Smart Crop UI (8-10 hours)

1. Create `ImageCropSelector.tsx` component
2. Add canvas crop utilities
3. Update `PhotoTab.tsx` to show crop step
4. Update hook to send multiple crop URLs
5. Update backend to accept `imageUrls[]`

**Expected impact**: 40-50% improvement for model shots

### Phase 3: AI Overview Attributes (4-6 hours)

1. Create `analyze-product-image` edge function
2. Call before/parallel to Lens
3. Show "Looks like: {description}" in UI
4. Use attributes to enhance query pack

**Expected impact**: 15-20% improvement + better UX

### Phase 4: Visual Rerank (8-12 hours)

1. Create `visual-rerank` edge function
2. Use Gemini vision for batch comparison
3. Call after text reranking on top 30 results
4. Blend scores: 60% text + 40% visual
5. Re-sort results

**Expected impact**: 30-40% improvement for exact/near-duplicate detection

---

## Technical Details

### Crop Selector Interaction

```text
┌─────────────────────────────────────┐
│  [Image with draggable crop box]    │
│                                     │
│    ┌─────────────────┐             │
│    │  Garment area   │             │
│    │                 │             │
│    └─────────────────┘             │
│                                     │
├─────────────────────────────────────┤
│  Presets: [Garment] [Pattern] [Full]│
│                                     │
│  "Looks like: beige printed abaya"  │
│                                     │
│  [Cancel]            [Search Deals] │
└─────────────────────────────────────┘
```

### Multi-Crop Pipeline Flow

```text
User uploads photo
       ↓
[Crop Selector UI] → User selects/adjusts crop(s)
       ↓
[Upload cropped regions to Storage]
       ↓
[Call analyze-product-image] → "Looks like: printed open abaya"
       ↓
[Call deals-from-image with imageUrls[]]
       ↓
[Parallel Lens calls on each crop]
       ↓
[Weighted merge + dedupe]
       ↓
[Build query pack with patterns/brands]
       ↓
[Shopping searches]
       ↓
[Text reranking (pattern + category + color)]
       ↓
[Visual reranking on top 30 thumbnails]
       ↓
[Final sorted results]
```

### Visual Rerank with Gemini

Using existing `LOVABLE_API_KEY` + Gemini vision for batch comparison:

```typescript
const prompt = `
You are comparing a query garment image to shopping result thumbnails.

Query image: [IMAGE 1 - the garment the user is searching for]

Rate each thumbnail's visual similarity to the query (0-10):
- 10 = Exact same item or near-identical
- 7-9 = Very similar (same style, similar pattern/color)
- 4-6 = Somewhat similar (same category, different details)
- 1-3 = Not very similar (different style)
- 0 = Completely different

Thumbnails to rate:
[IMAGE 2] [IMAGE 3] [IMAGE 4] ...

Return JSON: {"scores": [8, 6, 3, ...]}
`;
```

This is cost-effective (single API call for batch) and leverages Gemini's strong vision capabilities.

---

## Success Metrics

After implementation, test with the same problematic images:

| Metric | Before | Target |
|--------|--------|--------|
| Pattern preservation | "generic abaya" results | Top 5 match the print style |
| Brand detection | None | Brand appears in pipeline_log if detectable |
| Visual match quality | 30% relevant | 70%+ relevant in top 10 |
| "Looks like" accuracy | N/A | Matches user's perception |

### Test Cases

1. **Printed abaya with border** → Should find similar prints, not solid colors
2. **Zimmermann floral dress** → Should detect brand hint, find similar florals
3. **Nike sneakers** → Should find same model or very similar styles
4. **Plain black blazer** → Should work with current logic (simpler case)

---

## Dependencies

- **LOVABLE_API_KEY**: Already configured ✓
- **SERPAPI_API_KEY**: Already configured ✓
- **No new external dependencies** - uses existing AI gateway

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Gemini vision API costs | Batch calls, only run on user-selected crops |
| Visual rerank latency | Only on top 30 results, can be made optional |
| Crop UI complexity | Simple presets work for 80% of cases |
| Brand misdetection | Soft bonus only, doesn't override visual match |



# Comprehensive Audit: "Find Better Deals" Photo Search Implementation Status

## Overview

After a detailed code review of all relevant files, here is the complete status of each recommended fix:

---

## Phase 1 (Must-Do) - Status Check

### ✅ 1. Upload Image First
**Status: DONE**
- **File:** `src/components/deals/PhotoTab.tsx` (lines 88-110)
- User uploads image, crop is applied, then uploaded to Supabase Storage
- Signed URL (15 min expiry) is created and used for search
- **Evidence:** Lines 91-106 show the full upload → signed URL flow

### ❌ 2. detect-objects Uses {bucket, path} → Downloads Bytes → inline_data
**Status: NOT DONE - CRITICAL BUG**
- **File:** `supabase/functions/detect-objects/index.ts` (line 60)
- Backend still expects `imageUrl` (URL string), not `{bucket, path}`
- Line 113-114: Still uses `image_url: { url: imageUrl }` format
- **File:** `src/utils/objectDetection.ts` (line 28)
- Frontend still passes `imageUrl` (blob URL) to the edge function
- **Evidence:** Edge function logs show error:
  ```
  Invalid URL format: blob:https://id-preview--fdc5efa8...
  ```
- **Result:** Detection fails silently, falls back to heuristics

### ⚠️ 3. deals-match-catalog Fallback Sanitization
**Status: PARTIALLY DONE**
- **File:** `supabase/functions/deals-match-catalog/index.ts`
- Lines 199-222: Main path sanitization is DONE
- **Line 273: Fallback path still uses raw array access!**
  ```typescript
  media_url: p.media_urls?.[0] || '',  // NOT SANITIZED
  ```
- **Required:** Apply same parsing logic to fallback path

### ⚠️ 4. Fix Brand Images: Store storage_path, Sign on Render
**Status: NOT VERIFIED**
- Database stores `media_urls` as JSONB array
- No evidence of bucket path vs signed URL strategy
- ASOS/external URLs work; internal brand uploads need verification

---

## Phase 2 (Quality Jump) - Status Check

### ✅ 5. Candidate Pool = Lens Visual Matches + Shopping Results
**Status: DONE**
- **File:** `supabase/functions/deals-from-image/index.ts` (lines 492-520)
- Multi-crop Lens calls are implemented
- Pattern crops get 1.5x weight, garment crops get 1.2x
- Visual matches are merged with shopping results

### ❌ 6. Visual Similarity Primary Ranking (0.8 visual / 0.2 text)
**Status: NOT DONE**
- **File:** `supabase/functions/visual-rerank/index.ts` (line 183)
- Current weights: **60% text / 40% visual**
  ```typescript
  const combinedScore = (result.currentScore * 0.6) + (visualSimilarity * 0.4);
  ```
- **Required:** Change to 20% text / 80% visual

### ⚠️ 7. Use Large Images for Rerank
**Status: NOT DONE**
- **File:** `supabase/functions/deals-from-image/index.ts` (lines 830-832)
- Still uses `r.thumbnail` which are often tiny (80px)
  ```typescript
  thumbnailUrl: r.thumbnail,  // Should prefer larger image
  ```
- SerpAPI often returns both `thumbnail` and `image` (larger)
- **Required:** Prefer `r.image` over `r.thumbnail` when available

### ⚠️ 8. Dual-Query Embedding (ROI + Detail Crop)
**Status: PARTIALLY DONE**
- **File:** `src/components/deals/PhotoTab.tsx` (line 82)
- Only sends primary (garment) crop:
  ```typescript
  const primaryCrop = crops.find(c => c.type === 'garment') || crops[0];
  ```
- **File:** `src/components/deals/ImageCropSelector.tsx` (lines 194-198)
- Only returns one crop:
  ```typescript
  onConfirm([{ type: 'garment', rect: cropRect }]);
  ```
- **Required:** Generate and send pattern detail crop alongside garment

---

## Carousel/Image Glitch Fix - Status Check

### ⚠️ Similar on Azyah Carousel
**Status: NOT FIXED**
- **File:** `src/components/deals/AzyahMatchesSection.tsx`
- Still uses Embla carousel which can cause flicker
- **Recommendation:** Replace with simple CSS scroll-snap grid

---

## Summary Table

| Fix | Status | Priority | Files to Change |
|-----|--------|----------|-----------------|
| 1. Upload first | ✅ DONE | P0 | - |
| 2. detect-objects uses bytes/inline_data | ❌ NOT DONE | P0 | `detect-objects/index.ts`, `objectDetection.ts`, `PhotoTab.tsx` |
| 3. Fallback path sanitization | ⚠️ PARTIAL | P0 | `deals-match-catalog/index.ts` line 273 |
| 4. Brand image storage strategy | ❓ UNVERIFIED | P1 | Database/frontend |
| 5. Candidate pool merging | ✅ DONE | P1 | - |
| 6. Visual-first ranking (0.8/0.2) | ❌ NOT DONE | P1 | `visual-rerank/index.ts` line 183 |
| 7. Use large images for rerank | ❌ NOT DONE | P1 | `deals-from-image/index.ts` line 832 |
| 8. Dual-query embedding | ⚠️ PARTIAL | P1 | `PhotoTab.tsx`, `ImageCropSelector.tsx` |
| Carousel glitches | ⚠️ NOT FIXED | P1 | `AzyahMatchesSection.tsx` |

---

## Implementation Plan

### Phase 1 - Critical Detection Fix (Must Do First)

**1.1 Update `detect-objects` to use inline_data (not URL)**

```
File: supabase/functions/detect-objects/index.ts

Changes:
- Accept {bucket, path} instead of imageUrl
- Use service role to download image bytes from Supabase Storage
- Convert to base64
- Send to Gemini as inline_data instead of image_url
```

**1.2 Update Frontend to Upload First, Then Detect**

```
File: src/components/deals/PhotoTab.tsx

Changes:
- Upload full image immediately after file drop
- Get bucket + path reference
- Pass {bucket, path} to ImageCropSelector

File: src/components/deals/ImageCropSelector.tsx

Changes:
- Accept storagePath prop instead of imageUrl
- Pass {bucket, path} to detectProductRegions()

File: src/utils/objectDetection.ts

Changes:
- Accept {bucket, path} instead of imageUrl
- Pass to edge function
```

**1.3 Fix Fallback Sanitization**

```
File: supabase/functions/deals-match-catalog/index.ts

Change line 273:
FROM: media_url: p.media_urls?.[0] || '',
TO: Apply the same firstMediaUrl() logic from lines 200-222
```

### Phase 2 - Quality Improvements

**2.1 Increase Visual Weight**

```
File: supabase/functions/visual-rerank/index.ts

Change line 183:
FROM: const combinedScore = (result.currentScore * 0.6) + (visualSimilarity * 0.4);
TO:   const combinedScore = (result.currentScore * 0.2) + (visualSimilarity * 0.8);
```

**2.2 Use Larger Images for Rerank**

```
File: supabase/functions/deals-from-image/index.ts

Change lines 831-832:
FROM: thumbnailUrl: r.thumbnail,
TO:   thumbnailUrl: r.image || r.thumbnail,  // Prefer larger image
```

**2.3 Replace Carousel with CSS Scroll**

```
File: src/components/deals/AzyahMatchesSection.tsx

Changes:
- Remove Embla carousel dependency
- Use simple CSS scroll-snap container
- Add fixed dimensions to prevent layout shift
```

**2.4 Dual Crop Generation**

```
File: src/components/deals/ImageCropSelector.tsx

Changes:
- Generate pattern crop (inner 40% of garment box) automatically
- Return both crops in onConfirm()

File: src/components/deals/PhotoTab.tsx

Changes:
- Upload both crops
- Pass both to searchFromImages()
```

---

## Technical Details

### detect-objects Inline Data Implementation

```typescript
// detect-objects/index.ts - NEW IMPLEMENTATION
const { bucket, path, tapPoint } = await req.json();

// Download bytes using service role
const { data: fileData, error: downloadError } = await supabase
  .storage
  .from(bucket)
  .download(path);

if (downloadError) throw new Error(`Download failed: ${downloadError.message}`);

// Convert to base64
const arrayBuffer = await fileData.arrayBuffer();
const base64 = btoa(
  new Uint8Array(arrayBuffer).reduce((data, byte) => 
    data + String.fromCharCode(byte), ''
  )
);

// Send to Gemini with inline_data
const geminiPayload = {
  model: 'google/gemini-2.5-flash',
  messages: [{
    role: 'user',
    content: [
      { 
        type: 'image', 
        source: { 
          type: 'base64', 
          media_type: 'image/jpeg', 
          data: base64 
        }
      },
      { type: 'text', text: DETECTION_PROMPT }
    ]
  }]
};
```

### Visual Weight Change Rationale

The current 60/40 text/visual split causes:
- Generic category matches to rank higher than visual matches
- "abaya" text match beats "same pattern abaya" visual match
- Patterns and prints are poorly represented

The 20/80 text/visual split will:
- Prioritize actual visual similarity
- Keep text hints as tie-breakers only
- Better match user expectations from Google Lens

---

## Definition of Done

| Requirement | Current | After Fix |
|-------------|---------|-----------|
| Auto-detect objects on upload | ❌ Heuristics only | ✅ ML detection via Gemini |
| Detection works on iOS Safari | ❌ Blob URLs fail | ✅ Uses storage bytes |
| Tap to switch between objects | ⚠️ Works on fallback only | ✅ Works on real detections |
| Visual rerank prioritized | ❌ 40% visual | ✅ 80% visual |
| Pattern similarity matches | ❌ Text-dominated | ✅ Visual-dominated |
| Similar on Azyah images load | ⚠️ Mostly | ✅ All paths sanitized |
| No carousel glitches | ❌ Flicker on load | ✅ CSS scroll-snap |

---

## Files to Modify

1. `supabase/functions/detect-objects/index.ts` - Major rewrite for inline_data
2. `src/utils/objectDetection.ts` - Accept bucket/path
3. `src/components/deals/PhotoTab.tsx` - Upload before crop, pass storage path
4. `src/components/deals/ImageCropSelector.tsx` - Accept storage path, dual crop
5. `supabase/functions/deals-match-catalog/index.ts` - Fix line 273
6. `supabase/functions/visual-rerank/index.ts` - Change line 183
7. `supabase/functions/deals-from-image/index.ts` - Prefer larger images
8. `src/components/deals/AzyahMatchesSection.tsx` - Replace carousel with CSS scroll

# Deals Pipeline: Priority-Group Ranking (Color → Type → Pattern → Silhouette)

## Status: ✅ IMPLEMENTED

Last Updated: 2026-02-02

---

## Summary

The deals-unified pipeline now uses strict priority-group ranking to ensure top 10 results respect detected color, item type, and pattern—in that order—without relying on titles and without burning API calls.

---

## Key Changes Implemented

### 1. Priority-Group Ranking (Group A → B → C → D)

**Ranking Priority Order:**
1. **Color** (highest priority) - `colorSubScore >= 0.55`
2. **Item Type** - `typePass = titleMatch || silhouetteSubScore >= 0.50`
3. **Pattern/Design** - `patternSubScore >= 0.50` (only for patterned items)
4. **Silhouette** (fallback tie-breaker)

**Groups:**
- **Group A**: color_pass + type_pass + pattern_pass (if required) → Best Matches
- **Group B**: color_pass + type_pass, but pattern unconfirmed
- **Group C**: color_pass only, type uncertain
- **Group D**: Everything else → More Results

**Sort Logic:**
```
1. Sort by group: A first, D last
2. Within same group: sort by final_score DESC
```

### 2. Cheap Pre-Filters (NO LLM calls)

- **Color Family Bucketing**: Maps detected colors to families (purple_family, gold_family, etc.)
- **Cheap Color Check**: Uses title to bucket as 'likely', 'unknown', or 'unlikely'
- **Cheap Type Detection**: Detects item type (long/top/bottom/accessory) from category

### 3. Non-Reranked Items Handling

Per audit tweak: Items that weren't reranked get `color_pass = false` automatically and are pushed below reranked candidates.

### 4. ROI Overlay Cleanup

Removed rendering of non-selected bounding boxes in `ImageCropSelector.tsx`. Only the active selection box is now visible.

### 5. Enhanced Telemetry

New debug metrics:
- `returned_top10_color_pass_n` - Target: >= 7
- `returned_top10_type_pass_n` - Target: >= 6
- `returned_top10_pattern_pass_n` - For patterned items
- `top10_has_unreranked_n` - Target: 0 or 1
- `group_a_count`, `group_b_count`, `group_c_count`, `group_d_count`
- `cheap_color_likely_n`, `cheap_color_unlikely_n`, `cheap_type_matched_n`

---

## Acceptance Criteria

| Requirement | Target | Verification |
|-------------|--------|--------------|
| Top 10 respects detected color | `returned_top10_color_pass_n >= 7` | Check debug response |
| Top 10 respects item type | `returned_top10_type_pass_n >= 6` | Check debug response |
| No unreranked in top 10 | `top10_has_unreranked_n <= 1` | Check debug response |
| Pattern required when detected | `returned_top10_pattern_pass_n >= 5` | For patterned items |
| UI shows only selected box | No floating markers | Visual check |

---

## Files Modified

| File | Changes |
|------|---------|
| `supabase/functions/deals-unified/index.ts` | Priority-group ranking, cheap filters, enhanced debug |
| `src/components/deals/ImageCropSelector.tsx` | Removed other box markers |
| `src/components/deals/PhotoTab.tsx` | Passes description_hint |
| `src/hooks/useDealsUnified.ts` | Added description_hint param |

---

## Test Matrix

| Test Case | Expected Outcome |
|-----------|------------------|
| Purple/brown garment | Top 10 dominated by purple/brown (Group A) |
| Plain black dress | Top 10 stays black/charcoal |
| Patterned abaya | Pattern mode triggers, Group A requires pattern_pass |
| Screenshot with cluttered background | Only main garment box shown |

---

## Future Improvements (Not Yet Implemented)

1. **Multi-Market Expansion**: Query AE + US + UK when color-pass candidates < 5
2. **Ximilar 403 Lockout**: 24-hour skip after plan limit error (system_flags table)
3. **Adaptive Rerank Budget**: 25 default → extend to 40 if needed
4. **Server-side Thumbnail Color Analysis**: HSV histogram for true cheap color filtering

---

## Debug Payload Example

```json
{
  "counts": {
    "group_a_count": 12,
    "group_b_count": 5,
    "group_c_count": 8,
    "group_d_count": 15,
    "returned_top10_color_pass_n": 8,
    "returned_top10_type_pass_n": 7,
    "top10_has_unreranked_n": 0
  }
}
```

---

## Previous Plan: Wire Dashboard Photo Upload to deals-unified

✅ **COMPLETED** - The dashboard photo upload now uses the deals-unified pipeline with Ximilar fashion tagging.

See implementation in:
- `src/hooks/useDealsUnified.ts`
- `src/components/deals/PhotoTab.tsx`
- `src/components/deals/XimilarTagsDisplay.tsx`
- `src/components/deals/ExactMatchCard.tsx`

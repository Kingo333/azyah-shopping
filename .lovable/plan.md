

# UI Refinements: Upgrade Modal, Feature Labels, and Community Outfits

## 1. Update PostLoginUpgradeModal perks text and add "Post & Earn"

**File:** `src/components/PostLoginUpgradeModal.tsx`

Current labels:
- "AI Try-On (AI generated)" --> "AI Try-On: Picture & Video"
- "UGC Collaborations" --> "UGC Collab"
- "Redeem Points for Credits" --> "Redeem Points"
- "Find Deals & Compare" --> "Find Deals"

Add a 5th perk:
- Icon: `PenLine` or `Camera`, label: "Post & Earn"

Improve the copy to be more compelling. Change the title from "Unlock Premium" to something like "Go Premium" and the description to a value-driven line like "Unlock every feature, earn more, and stand out."

## 2. Update Upgrade page feature pills to match

**File:** `src/pages/dashboard/Upgrade.tsx`

Update the `features` array (lines 22-28):
- "AI Try-On" --> "AI Try-On: Picture & Video"
- Keep "UGC Collabs", "Redeem Points", "Find Deals" as-is (already short)
- Add a new entry: `{ icon: <PenLine />, name: 'Post & Earn', premiumOnly: true }` -- this becomes 7 pills, so adjust grid to `grid-cols-3` with the 7th wrapping naturally, or keep 6 and replace one. Since "Height/Fit Check" and "Taste Learning" are free features, we can keep the grid at 6 by replacing the least impactful free feature, or simply add it as a 7th pill.

Best approach: add "Post & Earn" as a 7th pill. The `grid-cols-3` layout will show 3-3-1 which looks fine, or we can switch to a flex-wrap layout for even distribution.

## 3. Fix Community Outfits showing only 1 card

**File:** `src/components/ProductMasonryGrid.tsx` (lines 207-217)

The bug is in the slice logic:
```
const outfitSlice = communityOutfits.slice(
  (chunkIndex * 3) % communityOutfits.length,
  ((chunkIndex * 3) % communityOutfits.length) + 3
);
```

With only 2 outfits, `(1 * 3) % 2 = 1`, so `slice(1, 4)` returns only 1 item. Fix: always pass the full `communityOutfits` array to `CommunityOutfitBlock` -- it already handles random selection of 2 internally via `useMemo`.

Change to:
```tsx
if (communityOutfits.length > 0) {
  chunks.push(
    <CommunityOutfitBlock key={`community-${i}`} outfits={communityOutfits} />
  );
}
```

## Technical Summary

| File | Change |
|------|--------|
| `src/components/PostLoginUpgradeModal.tsx` | Update perk labels, add "Post & Earn", improve headline copy |
| `src/pages/dashboard/Upgrade.tsx` (lines 22-28) | Add "Post & Earn" pill, update "AI Try-On" to include "Picture & Video" |
| `src/components/ProductMasonryGrid.tsx` (lines 207-217) | Pass full outfits array instead of broken slice logic |




## Root Cause: Unstable Array References Causing Re-render Loops

The glitching happens because of a chain of unstable array references:

1. **`useMutualFollows`** uses `following` (an array from `useFollows`) directly in its `queryKey` (line 11). Every time `useFollows` returns a new array reference (same data, new object), the query key changes, triggering a refetch and returning a new `mutualFollowIds` array.

2. **`ProductMasonryGrid`** has a `useEffect` (line 158) with `mutualFollowIds` as a dependency. Since arrays are compared by reference in React, even identical content triggers the effect to re-run.

3. Each re-run calls `fetchUserPosts`, which eventually calls `setUserPosts(mapped)` — creating a new state. During the fetch, `userPosts` briefly has stale or empty data, causing the `UserPostBlock` to appear, disappear, and reappear.

**This creates a loop:** `useFollows` re-renders → new `following` ref → `useMutualFollows` refetches → new `mutualFollowIds` ref → `useEffect` fires → `setUserPosts` → re-render → repeat.

---

### Fix

**File 1: `src/hooks/useMutualFollows.ts`**
- Stabilize the `queryKey` by sorting and joining the `following` array into a string, so the query only refetches when the actual IDs change, not when the array reference changes.

**File 2: `src/components/ProductMasonryGrid.tsx`**
- Replace `mutualFollowIds` in the `useEffect` dependency with a serialized string (`mutualFollowIds.join(',')`) so the effect only re-runs when the actual list of IDs changes, not on every new array reference.

| File | Change |
|------|--------|
| `src/hooks/useMutualFollows.ts` | Use `JSON.stringify(following)` or `following.sort().join(',')` in `queryKey` instead of raw array |
| `src/components/ProductMasonryGrid.tsx` | Use `const mutualKey = mutualFollowIds.join(',')` as the `useEffect` dependency instead of the array directly |


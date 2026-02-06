

# Fix Remaining App Store Compliance Gaps

Two issues remain that could cause rejection:

1. **Block user content filtering is incomplete** -- blocked users' content still appears in all community feeds (FashionFeed, CommunityOutfits, CommunityClothes, DressMeCommunity). Apple expects blocked content to actually disappear everywhere, not just on profile pages.

2. **AI Beauty Consultant has no AI disclosure** -- the Beauty Consultant page is live and active but has no "AI-generated" disclaimer, unlike the try-on modals which were already fixed.

---

## Fix 1: Filter Blocked Users from All Feed Queries

### Approach
Import `useBlockedUsers` in each feed page and filter results client-side to exclude content from blocked user IDs. This is the fastest and safest approach -- no database changes needed, no new RPC functions.

### Files to edit:

**A. `src/pages/FashionFeed.tsx`**
- Import `useBlockedUsers` hook
- Call `const { blockedIds } = useBlockedUsers()` in the component
- After posts are loaded (line 121), filter out posts where `user_id` is in `blockedIds`
- Apply: `setPosts((data || []).filter(p => !blockedIds.includes(p.user_id)))`

**B. `src/pages/CommunityOutfits.tsx`**
- Import `useBlockedUsers` hook
- Call `const { blockedIds } = useBlockedUsers()` in the component
- Filter the query results: after the fits are mapped with user data, filter out any where `user.id` is in `blockedIds`
- Use `useMemo` to derive filtered fits from the query data + blockedIds

**C. `src/pages/CommunityClothes.tsx`**
- Same pattern: import hook, filter results by blocked IDs

**D. `src/pages/DressMeCommunity.tsx`**
- Same pattern: import hook, filter community outfits by blocked user IDs

---

## Fix 2: AI Disclosure on Beauty Consultant

### File to edit: `src/pages/BeautyConsultant.tsx`

Add a small disclaimer text near the chat header area (where "AI Beauty Consultant" title appears):
- Text: "AI-generated advice -- consult a professional for specific concerns."
- Styled as `text-xs text-muted-foreground` to match the existing UI pattern
- Placed below the subtitle text in the header area

---

## Implementation Order

```text
Priority | Item                                    | Scope
---------|-----------------------------------------|------------------
1        | Filter blocked users from FashionFeed   | 1 file, ~10 lines
2        | Filter blocked users from CommunityOutfits | 1 file, ~10 lines
3        | Filter blocked users from CommunityClothes | 1 file, ~10 lines
4        | Filter blocked users from DressMeCommunity | 1 file, ~10 lines
5        | AI disclosure on BeautyConsultant        | 1 file, ~3 lines
```

Total: 5 files edited, all small changes. No database changes, no new edge functions.

---

## Technical Notes

- The `useBlockedUsers` hook is already built and tested -- it fetches the current user's block list with a 5-minute cache (`staleTime: 1000 * 60 * 5`). For guest/logged-out users it returns an empty array, so filtering is a no-op.
- Client-side filtering is appropriate here because block lists are typically small (tens of IDs, not thousands) and the feed queries already limit to 20-50 results.
- The `blockedIds` array contains UUIDs of blocked users, and all feed data includes `user_id` fields, so matching is straightforward.


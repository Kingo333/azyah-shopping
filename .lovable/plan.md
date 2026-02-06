
# Disable Beauty Consultant + Complete Feed Filtering + Updated Audit

This plan covers three areas: (1) disabling the Beauty Consultant feature entirely since it is not being used, (2) completing the blocked-user content filtering that was missed in the feeds, and (3) providing the updated audit scorecard.

---

## Part 1: Disable Beauty Consultant

The Beauty Consultant is currently live and referenced in 6 locations. Since it is not being used, all references need to be removed or disabled.

### Changes:

**A. Feature flag -- `src/lib/features.ts`**
- Set `ai_beauty_consultant: false`

**B. Upgrade page -- `src/pages/dashboard/Upgrade.tsx`**
- Remove "AI Beauty Consultant" from the `features` highlight array (line 32-36)
- Remove "AI Beauty Consultant" row from `comparisonFeatures` table (line 49)

**C. Rewards credit redemption -- `src/components/rewards/CreditRedemptionCard.tsx`**
- Remove the "Beauty AI" credit package (lines 37-44) from `CREDIT_PACKAGES`
- Remove `'beauty'` from the `CreditPackage` type union

**D. Credits display -- `src/components/CreditsDisplay.tsx`**
- Remove `beauty: 'Beauty Consultant'` from `featureLabels`
- Remove `'beauty'` from the `feature` prop type union
- Remove the beauty branch from the credit count logic

**E. Route cleanup -- `src/App.tsx`**
- Remove the `/beauty-consultant` route (lines 227-231)
- Remove the `BeautyConsultant` import (line 41)

**F. Protected route list -- `src/components/ProtectedRoute.tsx`**
- Remove `'/beauty-consultant'` from the protected paths array (line 40)

**G. Rewards page comment -- `src/pages/Rewards.tsx`**
- Update the file comment on line 3 to remove "beauty" from the description: change "AI try-on, beauty, video" to "AI try-on, video"

Note: The `BeautyConsultant.tsx` page file itself will be kept but will be unreachable since the route is removed and the feature flag is `false`. This avoids deleting a large file unnecessarily.

---

## Part 2: Complete Blocked User Feed Filtering

The block user hooks exist and the UI to block/unblock works, but blocked users' content still appears in all 4 community feed surfaces. This must be fixed for Apple UGC compliance.

### Changes:

**A. `src/pages/FashionFeed.tsx`**
- Import `useBlockedUsers` from `@/hooks/useBlockedUsers`
- Call `const { blockedIds } = useBlockedUsers()` in the component
- After posts are loaded (line 121), filter: `setPosts((data || []).filter(p => !blockedIds.includes(p.user_id)))`

**B. `src/pages/CommunityOutfits.tsx`**
- Import `useBlockedUsers`
- Filter query results to exclude fits from blocked user IDs

**C. `src/pages/CommunityClothes.tsx`**
- Import `useBlockedUsers`
- Filter query results to exclude items from blocked user IDs

**D. `src/components/PublicFitsGrid.tsx`** (used by DressMeCommunity)
- Import `useBlockedUsers`
- Filter the fits data to exclude blocked user IDs

---

## Part 3: Updated Audit Scorecard

After these changes, the compliance status will be:

### Blockers -- ALL RESOLVED

| Blocker | Status |
|---------|--------|
| A. Info.plist permission strings | Done |
| B. Account deletion (full) | Done |
| C. Block user (DB + UI + filtering) | Done after this plan |
| D. Terms jurisdiction | Done |

### Medium-Risk Items

| Item | Status |
|------|--------|
| AI disclosure on try-on results | Done |
| "Opens retailer website" on Shop Now | Done |
| Contact Support in settings | Done |
| Beauty Consultant removed from premium | Done after this plan |
| Feed filtering for blocked users | Done after this plan |

### Remaining (not code changes)

| Item | Action Needed |
|------|---------------|
| Privacy labels for App Store Connect | Fill in manually during submission |
| Test account with seeded data | Create before submission |
| Screenshots for 6.7" and 5.5" | Create before submission |
| Reviewer notes in App Store Connect | Write before submission |

### Estimated Readiness After This Plan: 92/100

The remaining 8 points are for non-code items (privacy labels, test account, screenshots) that need to be prepared in App Store Connect before submission.

---

## Implementation Order

```text
Priority | Item                                | Scope
---------|-------------------------------------|------------------
1        | Feature flag: beauty consultant off  | 1 line
2        | Remove from Upgrade.tsx              | 2 deletions
3        | Remove from CreditRedemptionCard     | 1 deletion + type fix
4        | Remove from CreditsDisplay           | type + logic cleanup
5        | Remove route from App.tsx            | 2 lines
6        | Remove from ProtectedRoute           | 1 line
7        | Update Rewards.tsx comment            | 1 line
8        | Filter blocked users in FashionFeed  | ~5 lines
9        | Filter blocked users in CommunityOutfits | ~5 lines
10       | Filter blocked users in CommunityClothes | ~5 lines
11       | Filter blocked users in PublicFitsGrid | ~5 lines
```

Total: 11 files edited, all small targeted changes. No new files, no database changes, no new edge functions.

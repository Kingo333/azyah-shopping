

## Fix "Go Premium" Modal: Navigation and Perks

### Issue 1: Fix 404 on "View Plans" button
The modal navigates to `/upgrade` which doesn't exist as a route. The correct route is `/dashboard/upgrade`.

- **File:** `src/components/PostLoginUpgradeModal.tsx`, line 49
- **Change:** `navigate('/upgrade')` to `navigate('/dashboard/upgrade')`

### Issue 2: Remove "Find Deals" from perks
Remove the "Find Deals" entry from the `premiumPerks` array. This also removes the unused `DollarSign` icon import.

- **File:** `src/components/PostLoginUpgradeModal.tsx`, line 22
- **Remove:** `{ icon: <DollarSign ... />, label: 'Find Deals' }`
- **Remove from import (line 13):** `DollarSign`

With "Find Deals" removed, 4 perks remain (even number), so the grid stays a clean 2x2 layout with no special centering logic needed.

No backend or RevenueCat changes.

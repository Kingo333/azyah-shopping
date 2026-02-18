

## Remove "Find Deals" from the Upgrade Page

### What changed previously
- Removed "Find Deals" from the **Go Premium pop-up modal** (`PostLoginUpgradeModal.tsx`) -- already done.

### What to do now
- Remove "Find Deals" from the **Upgrade page** (`src/pages/dashboard/Upgrade.tsx`)

### Technical Details

| File | Line | Change |
|------|------|--------|
| `src/pages/dashboard/Upgrade.tsx` | 28 | Remove `{ icon: <DollarSign ...>, name: 'Find Deals', premiumOnly: true }` from the `features` array |
| `src/pages/dashboard/Upgrade.tsx` | 6 | Remove `DollarSign` from the icon imports (if no longer used elsewhere in the file) |

After removal, the features array goes from 7 pills to 6, which still fits neatly in the 3-column grid layout (two full rows).

No backend or RevenueCat changes.



# Phase 1 Completion Plan - Brands AND Retailers Support

## Verification: Retailer Support Already Present

The database security layer correctly handles both organization types:

```sql
-- is_collab_owner already checks both:
SELECT id FROM brands WHERE owner_user_id = auth.uid()
UNION
SELECT id FROM retailers WHERE owner_user_id = auth.uid()
```

The UI components already accept `orgType: 'brand' | 'retailer'` prop.

---

## Remaining Work (5 Tasks)

### Task 1: Add Budget Fields to CreateCollabWizard

**File:** `src/components/ugc/CreateCollabWizard.tsx`

Add missing campaign fields to FormData interface and form UI:

| Field | Type | Description |
|-------|------|-------------|
| total_budget | number | Campaign budget (computed: payout = budget / slots) |
| slots_total | number | Max accepted creators |
| posts_per_creator | number | Submissions cap per creator (default: 1) |
| acceptance_mode | string | 'manual' or 'auto_first_n' |
| payout_hold_days | number | Days before payout confirmation |

Add a new "Campaign Settings" card in the form with these fields.

---

### Task 2: Create useAcceptApplicant Hook (Security Fix)

**File:** `src/hooks/useCollaborations.ts`

Current `handleAccept` bypasses slot capacity check by updating directly. Must use the secure RPC instead.

```typescript
export const useAcceptApplicant = () => {
  return useMutation({
    mutationFn: async (applicationId: string) => {
      const { data, error } = await supabase.rpc('accept_applicant', {
        p_application_id: applicationId
      });
      // Handle waitlist scenario in result
    }
  });
};
```

---

### Task 3: Update CollabApplicantsModal to Use RPC

**File:** `src/components/ugc/CollabApplicantsModal.tsx`

Changes:
1. Import and use `useAcceptApplicant` hook instead of direct update
2. Display slot capacity status (X/Y filled)
3. Add "Waitlisted" section for WAITLISTED applicants
4. Show different toast for waitlist vs accepted result

---

### Task 4: Create Brand/Retailer Deliverable Review Components

**New Files:**
- `src/components/ugc/DeliverableReviewQueue.tsx`
- `src/components/ugc/PayoutTrackingTable.tsx`

**DeliverableReviewQueue features:**
- List pending deliverables (status = 'submitted' or 'under_review')
- Show creator name, platform, post URL
- Preview screenshot via signed URL (using get_deliverable_screenshot_path RPC)
- Approve/Request Revision/Reject buttons
- Uses `review_deliverable` RPC

**PayoutTrackingTable features:**
- List payouts grouped by status (owed/hold/paid/unpaid_issue)
- Mark as Paid button (uses update_payout_status RPC)
- Show unpaid issues with reasons

---

### Task 5: Add Deliverables Tab to CollabDashboard

**File:** `src/components/ugc/CollabDashboard.tsx`

Add new tabs inside the dashboard:
- **Manage** (existing)
- **Deliverables** (new - shows DeliverableReviewQueue)
- **Payouts** (new - shows PayoutTrackingTable)
- **Analytics** (existing)

---

## Implementation Order

```text
1. useAcceptApplicant hook     -> Security fix (highest priority)
2. CollabApplicantsModal       -> Use new hook + show slots
3. CreateCollabWizard          -> Add budget fields
4. DeliverableReviewQueue      -> Brand review workflow
5. PayoutTrackingTable         -> Payout management
6. CollabDashboard tabs        -> Wire up new components
```

---

## Files Summary

| File | Action |
|------|--------|
| src/hooks/useCollaborations.ts | Add useAcceptApplicant hook |
| src/components/ugc/CollabApplicantsModal.tsx | Use RPC, show slots/waitlist |
| src/components/ugc/CreateCollabWizard.tsx | Add budget/slots/acceptance fields |
| src/components/ugc/DeliverableReviewQueue.tsx | Create new |
| src/components/ugc/PayoutTrackingTable.tsx | Create new |
| src/components/ugc/CollabDashboard.tsx | Add Deliverables & Payouts tabs |

---

## Security Confirmation

All RPCs verify ownership via `is_collab_owner()` which checks BOTH:
- Brands: `SELECT id FROM brands WHERE owner_user_id = auth.uid()`
- Retailers: `SELECT id FROM retailers WHERE owner_user_id = auth.uid()`

No changes needed for retailer support at the database level.

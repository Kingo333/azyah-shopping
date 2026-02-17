

# Rename Collabs to UGC + Add Tab Descriptions + Fix Back Button

## Changes

### 1. Rename page title and nav label to "UGC"

**File: `src/pages/UGCCollaborations.tsx`**
- Change the header title from "Collabs" to "UGC"

**File: `src/components/BottomNavigation.tsx`**
- Change the nav item label from "Collabs" to "UGC" (line 22 in navItems array)

### 2. Add short description notes below each tab

**File: `src/pages/UGCCollaborations.tsx`**
- Below the TabsList, inside each TabsContent, add a small muted description (1-2 lines max, consistent with the minimalist microcopy strategy):
  - **Collabs tab**: "Partner with brands to create content and get paid for posting on social media."
  - **Reviews tab**: "Read and share honest reviews about brands -- help the community spot great partners and avoid bad ones."
- Styled as `text-xs text-muted-foreground mb-4` so it's subtle and doesn't clutter the UI

### 3. Fix back button to navigate to /profile

**File: `src/pages/UGCCollaborations.tsx`**
- Change `navigate(-1)` to `navigate('/profile')` so the back arrow always goes to the profile page

## Technical Details

Three small edits to `src/pages/UGCCollaborations.tsx` and one label change in `src/components/BottomNavigation.tsx`. No new dependencies or database changes.


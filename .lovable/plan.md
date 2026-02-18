

## Plan: Redesign "Go Premium" Modal with Once-Per-Week Frequency

### What changes

**1. Show once per week instead of once per session**
- Currently uses `sessionStorage` (resets every browser session)
- Will switch to `localStorage` with a stored timestamp
- Modal only reappears after 7 days have passed since last dismissal

**2. Redesign the modal to look more premium**
- Gradient background with glassmorphism styling (matching the app's premium aesthetic)
- Larger, more prominent crown/star icon with a glowing accent
- Perk items styled as pill/chip badges in a grid layout instead of a plain list
- Bolder "View Plans" CTA button using the `premium` button variant
- Subtle shimmer/gradient border on the dialog

**3. Navigation stays connected**
- "View Plans" button already navigates to `/upgrade` -- this will be preserved
- No routing changes needed

### Technical Details

**File: `src/components/PostLoginUpgradeModal.tsx`**

| Area | Current | New |
|------|---------|-----|
| Storage key | `sessionStorage` with `upgrade_shown_this_session` | `localStorage` with `upgrade_last_shown_at` (timestamp) |
| Frequency | Once per session | Once per 7 days |
| Icon | Small star in circle | Larger crown with gradient background glow |
| Perks list | Vertical plain list | 2-column grid of styled pill badges |
| CTA button | Default variant | `premium` variant with gradient styling |
| Dialog style | Plain `rounded-2xl` | Gradient border, glassmorphism backdrop, richer padding |
| Navigate target | `/upgrade` | `/upgrade` (unchanged) |

**Logic change (pseudocode):**
```
const UPGRADE_STORAGE_KEY = 'upgrade_last_shown_at';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// In useEffect:
const lastShown = localStorage.getItem(UPGRADE_STORAGE_KEY);
if (lastShown && Date.now() - Number(lastShown) < ONE_WEEK_MS) return;

// On show:
localStorage.setItem(UPGRADE_STORAGE_KEY, String(Date.now()));
```

Only one file is modified: `src/components/PostLoginUpgradeModal.tsx`.

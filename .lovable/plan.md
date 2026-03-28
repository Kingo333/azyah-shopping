

## Adjust Events Page Sizing

Three small tweaks in `src/pages/Events.tsx`:

### 1. Try-On Result Thumbnails — Slightly Bigger
- Line 371: Change `w-[90px]` to `w-[120px]`

### 2. AR Button — Add "AR" Label
- Lines 443-455: Change from icon-only `size="icon"` to a small button with both icon and text
- Replace `w-7 h-7 p-0` with `h-7 px-1.5 text-xs gap-0.5` and add "AR" text next to the Smartphone icon

### 3. Try On / Try Again Button — Slightly Shorter
- Line 428: Change `h-7` to `h-6` and keep `text-xs`
- Match AR button height to `h-6` as well

### Files Changed
| File | Change |
|------|--------|
| `src/pages/Events.tsx` | Three line-level tweaks for sizing |


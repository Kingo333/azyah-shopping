

## Redesign Events Page

Three targeted design changes to the `/events` page.

---

### 1. Event Listing Cards — Side-by-Side Layout (lines 554-593)

**Current**: Banner image stacked on top, full width, cut in half. Info below.
**Change**: Horizontal layout — image on the left (fixed width, full height, showing the whole photo), event info on the right. Similar to the profile page events section.

- Replace the stacked `div > img` + `CardHeader` + `CardContent` with a `flex flex-row` layout
- Image: `w-40 h-full object-cover rounded-l-lg` (fixed width, fills card height)
- Info: `flex-1 p-4` with name, date, location, description, and "View Event Catalog" button
- On mobile (`sm:` breakpoint), keep horizontal but shrink image to `w-28`

### 2. Try-On Results — Compact Trending-Style Cards (lines 366-395)

**Current**: `aspect-square` cards in a grid with `✨` sparkle badge and `CardContent` footer showing brand name + date. Oversized.
**Change**: Smaller cards matching the Trending Looks style from profile — 3:4 aspect ratio (~90x120px thumbnails), no sparkle emoji, no text footer. Show delete button on hover only. Remove the `CardContent` text section entirely.

- Change grid to `flex gap-2 overflow-x-auto` horizontal scroll row
- Each card: `w-[90px] flex-shrink-0` with `aspect-[3/4]` image
- Remove `✨` badge
- Remove `<CardContent>` with brand name and date
- Keep hover-reveal delete button (smaller)
- Keep green border accent for succeeded results

### 3. Product Card Buttons — Fix Sizing (lines 438-468)

**Current**: "Try On" button is `flex-1` and AR button has fixed padding. When both show, they can overflow or look uneven on the `w-36` card.
**Change**: 
- Make the button row `flex gap-1 w-full`
- Try On button: `flex-1 min-w-0 text-xs h-7 truncate` (text truncates instead of overflowing)
- AR button: `w-7 h-7 p-0` icon-only (no "AR" text) — just the Smartphone icon, keeping the purple border styling
- This ensures both buttons always fit within the 136px card width

---

### Files Changed

| File | Change |
|------|--------|
| `src/pages/Events.tsx` | All three sections updated in-place |


# Partner portals (brand, store, events): audit and build plan

Date: 2026-10-29. Owner asked: check the brand and store portals and the store's Events against the design (spec 7.23, mockup `docs/redesign/mockups/v3/05-partners.html`) for good UX, UI and a simple workflow, then fix them.

## 1. Audit (what was on main at c0101b54)

Checked by reading the code and by screenshots with sample data at 390px and 1280px wide.

### Built before today
- v3 colors and flat cards, status labels (Live / Pending), the "waiting for approval" banner, the Settings tidy-up.

### Not built (spec 7.23)
- Sidebar on computers / bottom bar on phones (both portals still use a wrapping tab strip).
- Products as rows with the next action (Publish on Pending, Edit otherwise) and a "6 products · 2 pending" line.
- Events list with status words and counts; event page with brands, items and try-on readiness.

### Bugs
| # | Where | Problem |
|---|---|---|
| B1 | Brand products | Price always shows in US dollars (`formatPrice` is called without the product's currency). |
| B2 | Store products | "Stock: 0" on every product and "Low stock" counts every product: stock is never tracked (every form saves 0). |
| B3 | Store products (phone) | The title and the two buttons don't fit: "Add Multiple" runs off the screen. |
| B4 | Event items | The "Try-On Ready" badge checks an old field (`outfit_bitstudio_id`), so it never shows for new uploads. |
| B5 | Events | An event whose dates have passed still shows "active" in green, but shoppers no longer see it. |
| B6 | Events | New events start as Draft, and nothing says that shoppers only see events marked Active. |
| B7 | Event page | Two "Back to Events" buttons, then a third "Back to Brands" one level down. |
| B8 | Store brands | "Add Brand Partnership" only opens one fixed ASOS import page. "1 Products". |
| B9 | Brand (agency/studio) | Four stat cards that always show "-", one of them "Active Collabs" while collabs are hidden. |
| B10 | Brand | Dead code builds random "top products" numbers (`Math.random`); not shown, removed. |
| B11 | Event dates | `new Date('2026-11-12')` is read as UTC midnight, which can show the day before in some time zones. |
| B12 | Database | `event_brands.event_id` has no foreign key to `retail_events` on production (checked 2026-10-29), so deleting an event left its brands and items behind. The app now deletes the event's brands first (items cascade from brands). A foreign key with `on delete cascade` would fix it in the database; that's a migration for the owner to approve. |

### Workflow problems
- **Events take five steps and two photo uploads per item**: Events → Manage Brands → Manage Products → upload photo → Add Try-on → upload a second "outfit" photo. The server already falls back to the product photo (`thenewblack-event-tryon`: `try_on_config.outfit_image_url || try_on_data.outfit_image_url || image_url`); only the shopper screen waits for `try_on_ready`. So one photo can make an item ready.
- Event status is a raw drop-down (Draft / Active / Ended) with no explanation; the real state also depends on the dates.
- Screens inside Events have no address, so the browser's Back button leaves the portal and a refresh loses your place.
- The create and edit forms are two copies of the same form (they had already drifted: different file types).
- Deleting uses the browser's plain `confirm()` box; delete buttons are filled red on every card.
- Products: every card has a filled red delete button; Publish is only inside the edit screen; "Product 4" (a bulk upload without a name) doesn't say what's missing.
- Above the products sit a header card, a lone Feedback button row and four stat cards, so on a phone the products start below the first screen. The stats repeat the Analytics tab.

## 2. Decisions (made for the owner; any can change)
| # | Decision | Why |
|---|---|---|
| P1 | One layout for both portals: sidebar on computers (name, "Brand portal" / "Store portal", menu, Help, theme, Sign out); on phones a top bar and a bottom bar. | Spec 7.23 and the mockup. Five store menus fit a bottom bar; the tab strip wrapped. |
| P2 | The four stat cards go. Products show "6 products · 2 pending · 3 live" in their header; numbers live in Analytics. | They repeated Analytics and pushed the work below the first screen. |
| P3 | Products are rows: photo, name (+ what's missing), price, status, one action (Publish on Pending, else Edit). Delete stays inside Edit (and in the brand's bulk select). | Mockup; one clear next step per row; no red buttons on every item. |
| P4 | Publish on a row publishes at once when nothing is missing; otherwise it opens Edit, which lists what's missing. | Same checks as today (`publishProblems`). |
| P5 | Event status shown as words from status and dates: Draft (hidden), Upcoming, Live, Ended. The form has one switch, "Show to shoppers", instead of the drop-down. | Matches what shoppers see (`Events.tsx` and the try-on rule `isEventOpen`). |
| P6 | One event form for create and edit; Delete event moves into Edit. | One copy; no red button on every card. |
| P7 | An item photo is enough for try-on: uploads are marked ready. "Use a different try-on photo" and "3D model (AR)" stay as options in the item sheet. | The server already uses the product photo; one upload instead of two. |
| P8 | Events, event and brand are in the address (`?tab=events&event=…&brand=…`). One Back on each level. | Browser Back and refresh work. |
| P9 | Store "Add Brand Partnership" becomes "Import products" (same page). | The label promised something that doesn't exist. |
| P10 | No database or Edge Function changes. | Front end only; same tables and rules. |

## 3. Build steps
1. `src/lib/partnerPortal.ts` + tests: `eventPhase`, `eventPhaseLabel`, `formatDateRange`, `parseDay`, `formatMoney`, `plural`, `productSummary`, `productIssues`, `productNextAction`.
2. `PartnerShell` (sidebar / bottom bar) and `PartnerProductList` (rows); use them in `BrandPortal` and `RetailerPortal`; remove stat cards, dead code, the lone Feedback row.
3. Events: `RetailerEvents` list with counts and phase labels, one `EventFormDialog`, event page (`EventCatalogManager` + `EventBrandManager`) with one Back and a summary, items page (`BrandProductManager`) with ready-on-upload, the B4 fix and advanced options; address state.
4. Store brands label fix (B8).
5. Checks: `npx vitest run` (Live Cam 31/31), type check vs baseline, lint (no new errors), build, screenshots at 390 and 1280 of each screen.
6. Draft PR with a Vercel preview; merge only on the owner's go.

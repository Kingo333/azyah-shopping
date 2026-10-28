# Design v3 Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the neutral, Apple-style design v3 into the app behind a per-device switch (`?design=v3`), off for everyone, so the owner can phone-test before switching it on.

**Architecture:** A `design-v3` class on `<html>` (set from a flag like nav v2) swaps the CSS variables: brand maroon and the hard-coded "cartier" palette turn into neutral ink, a new `buy` color stays maroon for buy buttons only, fonts become the system stack, glass is switched off. A Tailwind `v3:` variant lets components add v3-only classes without touching today's look. Screens that need layout changes branch on `useDesignV3()`.

**Tech Stack:** React 18, Vite, Tailwind 3, shadcn/Radix, next-themes, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-27-azyah-design-v3.md` (mockups `docs/redesign/mockups/v3/`).

## Global Constraints
- Switch off = today's app, pixel for pixel. Every v3 change is behind the `design-v3` class, the `v3:` variant or `useDesignV3()`. Exception: hiding features that are already off (Deals tab, Premium rows for UGC and Height/Fit) applies in both looks.
- No edits under `src/components/ai-studio/live-cam/**`, `supabase/functions/live-cam-*`, `workers/**`. `npx vitest run src/components/ai-studio/live-cam` stays 31/31.
- Maroon (`buy`) only on: Shop (swipe card and product details), Buy on [brand] (bag), Add to bag. Nothing else.
- Light only in this build: dark tokens are written but `ThemeProvider` keeps `defaultTheme="light"` (spec D9 follows in a later step, after every screen is checked in dark).
- Install: `npm install --legacy-peer-deps --no-package-lock --ignore-scripts`. Build with `vite.local.config.ts`; `git checkout supabase/functions/mcp/index.ts` after a build; never commit it.
- Styling-only changes are verified by type check, build and screenshots; logic (flags, tabs, grouping, filtering) gets tests first.

## Review Focus
1. With the switch off, a screen looks or behaves differently → check `git diff` for any class or branch not guarded by `v3:`/`design-v3`/`useDesignV3()`.
2. With the switch on, a buy button turns black (the cartier remap) or a non-buy control stays maroon (hard-coded `#7A143E`/`#7c1d3e`/`azyah-maroon`) → grep for leftovers per screen.
3. Removing blur leaves white text on a see-through panel unreadable (Explore header, AI Studio frame).
4. The 5-tab bar on iPhone: safe-area padding, the center button not covering content, pages keeping `pb-20`.
5. Try on as a page: Live Cam's camera view and session still start, end and clean up when the page is left.

---

### Task 1: The switch
**Files:** Create `src/lib/designV3.ts`, `src/lib/designV3.test.ts`, `src/hooks/useDesignV3.ts`, `src/components/DesignV3Root.tsx`. Modify `src/lib/features.ts`, `src/hooks/useNavV2.ts`, `src/App.tsx`.
**Interfaces — Produces:**
- `DESIGN_V3_STORAGE_KEY = 'azyah:design_v3'`, `DESIGN_V3_CLASS = 'design-v3'`
- `resolveDesignV3(search: string, storage: FlagStorage | null, defaultOn: boolean): boolean` — `?design=v3` turns on and remembers, `?design=v2` turns off and forgets, otherwise stored value, otherwise default.
- `useDesignV3(): boolean`; `<DesignV3Root />` adds/removes `design-v3` on `document.documentElement`.
- `features.design_v3 = false`, `features.deals = false`.
- `useNavV2()` returns true when design v3 is on.
- [ ] Tests: on/off by param, remembered, forgotten on `v2`, storage throwing still applies the param, default used otherwise.
- [ ] Run `npx vitest run src/lib/designV3.test.ts` → FAIL; implement; → PASS. Mount `<DesignV3Root />` inside the router in `App.tsx`.
- [ ] Commit `feat(design-v3): per-device switch`.

### Task 2: Tokens, fonts and base components
**Files:** Create `src/styles/design-v3.css` (imported from `src/index.css`). Modify `tailwind.config.ts`, `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/tabs.tsx`, `src/components/ui/input.tsx`, `src/components/ui/badge.tsx`.
- `design-v3.css`: `.design-v3 { … }` sets every spec 4.1 light token as HSL channels (`--ground`, `--card`, `--ink`, `--ink-2`, `--ink-3`, `--fill`, `--line`, `--line-strong`, `--buy`, `--buy-foreground`, `--ok*`, `--wait*`, `--bad*`, `--danger-ink`, `--pin`) and remaps today's variables: `--background`→ground, `--card`, `--foreground`/`--card-foreground`→ink, `--primary`→ink, `--primary-foreground`→white, `--secondary`/`--muted`/`--accent`→fill, `--muted-foreground`→ink-2, `--border`/`--input`→line, `--ring`→ink, `--accent-cartier`→ink, `--azyah-maroon`→ink, `--azyah-ivory`→ground, `--radius: 0.875rem`, `--shadow-card/-elegant/-cartier/-crimson/-glow: none`, cartier 50–900 → neutral greys (600/700 = ink/black). `.design-v3.dark { … }` with the dark column (unused this build). Font: `.design-v3 body, .design-v3 .font-sans, .design-v3 .font-luxury, .design-v3 .font-serif, .design-v3 .font-cormorant, .design-v3 .font-playfair { font-family: <system stack> }`; `.font-wordmark { font-family: 'Playfair Display', serif }`. Glass: `.design-v3 [class*="backdrop-blur"] { backdrop-filter: none }`.
- `tailwind.config.ts`: cartier palette values become `hsl(var(--cartier-N))` with `:root` defaults equal to today's values (so v2 is unchanged); add colors `buy`, `ink`, `ink-2`, `ink-3`, `ground`, `fill`, `line`, `line-strong`, `ok`, `wait`, `bad`; add plugin `addVariant('v3', '.design-v3 &')`.
- `button.tsx`: new variant `buy: "bg-buy text-buy-foreground hover:bg-buy/90"`; base `v3:rounded-[14px]`.
- `card.tsx`: `v3:rounded-[20px] v3:border-0 v3:shadow-none`. `tabs.tsx`: list `v3:rounded-[10px] v3:bg-fill v3:p-0.5`; trigger `v3:rounded-[8px] v3:text-ink v3:data-[state=active]:bg-card v3:data-[state=active]:shadow-none`. `input.tsx`: `v3:bg-fill v3:border-0 v3:rounded-[10px] v3:text-base`. `badge.tsx`: `v3:rounded-full v3:font-medium`.
- [ ] Verify: `npx tsc --noEmit -p tsconfig.app.json` (no new errors), build, and a screenshot of one screen with and without `?design=v3`.
- [ ] Commit `feat(design-v3): tokens, fonts, base components`.

### Task 3: Five-tab bar
**Files:** Modify `src/lib/navV2.ts`, `src/lib/navV2.test.ts`, `src/components/nav/ShopperTabBar.tsx`.
**Interfaces — Produces:** `ShopperTabId = 'feed' | 'explore' | 'try-on' | 'community' | 'profile'`; `SHOPPER_TABS` = Feed `/swipe`, Explore `/explore`, Try on `/try-on`, Community `/community`, Profile `/profile`; `activeShopperTab`: `/swipe`, `/discover` → feed; `/explore`, `/brand`, `/featured-brands`, `/trending-styles` → explore; Try on and Community as now; profile as now plus `/events`, `/cart`, `/dress-me`.
- [ ] Update tests (5 tabs in order; `/explore` → explore; `/brand/x` → explore; `/cart` → profile), run → FAIL, implement → PASS.
- [ ] Bar: icons ShoppingBag, Globe, Shirt (inside a 34px `bg-ink text-white` circle), Users, User; active `text-ink`, inactive `text-ink-3` in v3 (v2 keeps maroon active); on `/explore` and `/try-on` while Live Cam runs the bar is black (`v3:` classes keyed on the active tab).
- [ ] Commit `feat(nav): five tabs (Feed, Explore, Try on, Community, Profile)`.

### Task 4: Deals hidden
**Files:** Modify `src/lib/exploreTabs.ts`, `src/lib/exploreTabs.test.ts`, `src/pages/Explore.tsx`.
**Interfaces:** `visibleExploreTabs(yourFitEnabled: boolean, dealsEnabled: boolean)`; `resolveExploreTab(param, yourFitEnabled, dealsEnabled)` (`?tab=deals` opens Brands when hidden).
- [ ] Tests first (deals hidden by default, `?tab=deals` → brands, deals shown when enabled), FAIL → implement → PASS. Explore renders the Deals trigger and `DealsDrawer` only when `features.deals`; the grid column count comes from the visible tabs.
- [ ] Commit `feat(explore): hide Deals (later feature)`.

### Task 5: Explore in v3
**Files:** Modify `src/pages/Explore.tsx`.
- [ ] v3: page `v3:bg-black`; header without gradient; title 26/600 left with the counts line in `ink-2`; search as a round icon button opening GlobalSearch; segmented control dark (`#1C1C1E` track, `#3A3A3C` selected, no per-tab colors via `v3:data-[state=active]:bg-[#3A3A3C]`); hint pill → plain `ink-2` text. When the shopper bar is shown (`useNavV2()`), hide the Home button and "Skip to Feed" pill. Globe component and its props unchanged.
- [ ] Screenshot (guest mode) with and without `?design=v3`. Commit `feat(design-v3): Explore`.

### Task 6: Feed in v3
**Files:** Modify `src/pages/Swipe.tsx`, `src/components/SwipeCard.tsx`, `src/components/SwipeActionBar.tsx`.
- [ ] `Swipe.tsx` v3 header: large title "Feed" left, "Style model N%" under it, favorites and filter buttons right, no back arrow, no blur.
- [ ] `SwipeCard.tsx` with `useDesignV3()`: image area on top (Try on as a white pill), info panel below the image on `bg-card`: brand (ink-2, sentence case), title, price (tabular, right). Gestures and handlers unchanged. Shop uses `variant="buy"`.
- [ ] `SwipeActionBar.tsx`: in v3 Pass/Save/Like as 46px round `bg-card` buttons and Shop `variant="buy"`.
- [ ] Existing swipe tests pass; screenshot. Commit `feat(design-v3): Feed`.

### Task 7: Try on as a full screen
**Files:** Modify `src/components/AiStudioModal.tsx` (outer frame only), `src/pages/TryOn.tsx`.
**Interfaces:** `AiStudioModal` gets `presentation?: 'dialog' | 'page'` (default `'dialog'`). `'page'` renders the same header, tabs and body in a normal full-height page container (no `Dialog`, no backdrop, no glass), header becomes large title "Try on" + credits line, close button hidden. Tab contents, state, hooks and `LiveCamTab` unchanged.
- [ ] `TryOn.tsx`: v3 → `<AiStudioModal open presentation="page" onClose={…} />` inside `main` with `pb-20`; v2 → unchanged.
- [ ] Segmented tabs use the v3 Tabs styles; "Generate" buttons become default (ink) in v3 automatically; nothing maroon. The page header's credits line shows remaining only ("3 pictures · 1 video left today", spec B10).
- [ ] Live Cam tests 31/31; screenshot (logged-out shows the sign-in gate — note it). Commit `feat(design-v3): Try on screen`.

### Task 8: Community and Profile
**Files:** Modify `src/pages/Community.tsx`, `src/pages/Profile.tsx`, `src/components/DashboardHeader.tsx`, `src/pages/DressMeWardrobe.tsx`.
- [ ] Community: title "Community" in v3 (v2 keeps "Explore"), segmented Outfits / Clothes / Posts; Posts renders today's `FeedComponent` (spec B4). v2 unchanged.
- [ ] Profile v3: header shows the "Azyah" wordmark (`font-wordmark`); a grouped-rows card (My closet → `/dress-me/wardrobe`, Friends → today's friends screen or `/community` friends sheet, Favorites → `/favorites`, Events → `/events`, Rewards → `/rewards`) replaces the Events card and the Benefits card; the two Analyze closet buttons are hidden in v3 and shown in My closet's header menu instead (spec B3).
- [ ] Screenshots. Commit `feat(design-v3): Community and Profile`.

### Task 9: Product details and the bag
**Files:** Create `src/lib/cartGroups.ts`, `src/lib/cartGroups.test.ts`. Modify `src/components/ProductDetailPage.tsx`, `src/pages/ShoppingCart.tsx`.
**Interfaces:** `groupCartBySeller(items: CartLine[]): { key: string; seller: string; items: CartLine[]; buyUrl: string | null; subtotalCents: number }[]` where `CartLine` has `product: { external_url?: string | null; merchant_name?: string | null; brand?: { name?: string | null } | null; price_cents: number }` and `quantity`. Key = hostname of `external_url` (without `www.`); seller = `merchant_name` ‖ brand name ‖ hostname; items without a link go to one last group `{ key: 'offline', seller: 'Not sold online yet', buyUrl: null }`. First-seen order (spec B11).
- [ ] Tests first: two items on one site → one group; a brand item on a marketplace site named by `merchant_name`; no link → offline group last; subtotal counts quantity. FAIL → implement → PASS.
- [ ] Product details: Shop now uses `variant="buy"` in v3; Save stays secondary.
- [ ] Bag: the query adds `products.external_url`, `products.merchant_name` and `brands.id`; v3 shows the groups with "Buy on {seller}" (`variant="buy"`, opens `buyUrl`), the offline group without a button, and hides "Proceed to checkout" and "Save for later". v2 unchanged.
- [ ] Commit `feat(design-v3): product details and bag`.

### Task 10: Premium rows match what exists
**Files:** Create `src/lib/planRows.ts`, `src/lib/planRows.test.ts`. Modify `src/pages/dashboard/Upgrade.tsx`.
**Interfaces:** `visiblePlanRows<T extends { name: string }>(rows: T[], flags: { ugc_collab: boolean; your_fit: boolean }): T[]` — drops UGC rows when `ugc_collab` is off and Height/Fit rows when `your_fit` is off.
- [ ] Tests first, FAIL → implement → PASS; Upgrade uses it for both feature lists (both looks).
- [ ] v3 on web and Android (`!isNativeIOS()`): the purchase button area shows "Subscribe in the Azyah iPhone app" (secondary) instead of a button that only toasts (spec B9).
- [ ] Commit `fix(premium): don't list hidden features`.

### Task 11: Welcome screen
**Files:** Create `src/components/WelcomeV3.tsx`. Modify `src/pages/Landing.tsx`, `src/pages/onboarding/IntroCarousel.tsx`.
- [ ] `WelcomeV3`: white, one product photo (first featured product image the landing page already loads, else a neutral block), "Azyah" wordmark, the one sentence from the spec, buttons: "Continue with email" (ink, → `/onboarding/signup`), "Browse first" (secondary, sets guest mode → `/swipe`), "Already have an account? Sign in" (→ the existing sign-in route). Landing and IntroCarousel render it in v3 for logged-out visitors; v2 unchanged.
- [ ] Screenshot (logged out). Commit `feat(design-v3): welcome`.

### Task 12: Sweep of the remaining screens
**Files:** As found. Create `src/components/StatusLabel.tsx` (pale tint + text from spec 4.1; used where product/partner statuses are shown).
- [ ] For each screen in spec section 7 not covered above (search, brand page, favorites, events, rewards, settings, sign-up steps, style quiz, someone's profile, shared pages, AR chrome, legal, 404, brand portal, store portal, admin approvals): grep the file for `azyah-maroon`, `#7A143E`, `#7c1d3e`, `bg-gradient`, `shadow-lg`, `backdrop-blur`, `font-serif|font-cormorant|font-playfair`; add `v3:` overrides so only buy actions keep maroon, titles use the system font (wordmark keeps Playfair), cards are flat. Status badges in the portals use `StatusLabel` in v3 with today's `productStatusLabel` text (Live → ok, Pending → wait, others neutral; spec B7). Rewards keeps check-in, packages, leaderboard and activity (B8). Partner menus stay per type, salons included (B6).
- [ ] Screenshots of every guest-reachable screen at 390 and 1280 wide with `?design=v3`.
- [ ] Commit per group of screens.

### Deferred to follow-up steps (named, with reasons — not dropped)
| Spec part | Why not in this build | When |
|---|---|---|
| 7.7 Live Cam running layout (black full-screen camera, garment strip, round snapshot button) | Needs edits inside `src/components/ai-studio/live-cam/**`, which this build doesn't touch; tokens already restyle its buttons and cards. | Own step after the owner's phone test of this build (RunPod topped up). |
| 7.6 Try on item tray (From feed / Saved / My closet / Upload chips) and results row inside Picture/Video | Reworks AI Studio's picture and video internals; this build gives the full-screen frame, modes and credits with today's controls. | Next step, with its own tests. |
| D9 Dark mode | Every screen must be checked in dark first; tokens are written. | After the light build is approved. |
| 7.8 Community "Following" segment | There's no following feed query today. | With the Community data work. |
| 7.17 Settings regrouped into iPhone-style groups | 1,200-line page; this build restyles it (flat cards, system font, buy-free); regrouping is its own change. | Next step. |
| 7.24 Kiosk | Phase 5 (`KIOSK_MVP.md`). | Phase 5. |

### Task 13: Verify and hand over
- [ ] `npx vitest run` (all pass), Live Cam 31/31, type check (no new errors), build, `git checkout supabase/functions/mcp/index.ts`.
- [ ] With `?design=v2` (or a fresh device): Feed, Explore, Try on, Profile look exactly as before (screenshots side by side).
- [ ] `git diff origin/main -- src/components/ai-studio/live-cam supabase/functions workers` → empty.
- [ ] Update `SESSION_STATE.md` and `AUDIT_CHECKLIST.md`; final whole-branch review; push the branch, then `main` (owner approved), switch off for everyone.

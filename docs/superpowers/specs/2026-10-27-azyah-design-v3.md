# Azyah design v3 — neutral, Apple-style redesign of the whole app

_2026-10-27. Status: written for owner approval. Nothing built yet._
_Mockups: `docs/redesign/mockups/v3/01…06.html` (open in a browser). Where a mockup and this document differ, this document wins._
_Builder check (fresh reviewer, 2026-10-28) raised 12 questions; each answer is written into the section it affects and listed in section 8b._
_Method: Superpowers brainstorming (owner direction → recon of `main` → mockups → this design), plus the rules of the "taste" skill (`github.com/Leonxlnx/taste-skill`, `design-taste-frontend`, app-screens reference). The skill was read, not installed._

## 1. Why
Azyah should feel calm and premium, like an Apple app, so the clothes and the try-on are what people notice. Today the app mixes three serif fonts, frosted glass, colored tabs, soft shadows and maroon everywhere, and the "default kit" look (Inter on light grey with white 12px cards). The owner's direction:
- grey, black and white everywhere; maroon only on buttons that buy (Shop and the like);
- keep the Feed;
- Your Fit is gone; Deals in the Globe is hidden for later;
- focus on trying on and exploring;
- design every screen, with no gaps.

## 2. Goals, non-goals, anti-goals
**Goals**
1. One visual language for every screen (shopper, partner, admin, shared pages), light and dark.
2. Five clear tabs: Feed, Explore, Try on, Community, Profile. Try on is a full screen, not a pop-up.
3. Maroon means "buy". Everything else is neutral.
4. Every screen has defined empty, loading and error states.
5. Works on phone first, then tablet and desktop.

**Non-goals**
- No change to how Live Cam works (`useLiveCamSession.ts`, `live-cam-*` functions, the Worker, RunPod). Only its look changes.
- No change to how the Globe works: same 3D globe, same data, same tap-a-country list. Only its colors change.
- No new backend features. The design uses what exists today, plus two flags (section 9).
- No in-app payments (section 8, decision D1).

**Anti-goals (a failure even if it "works")**
- Maroon on tabs, toggles, headers or every button.
- Glass, blur, gradients or glowing effects on resting surfaces.
- A dead button (like today's "Proceed to checkout", which does nothing).
- Live Cam behaving differently, or breaking on older iPhone builds.
- Hidden features (Your Fit, Deals, UGC) showing up again anywhere.

## 3. Constraints
- **Code:** React, Vite, Tailwind, shadcn/Radix (`src/components/ui`), Supabase. The iPhone app bundles the web code (Capacitor, `webDir: 'dist'`), so changes reach iPhone users only with a new App Store build.
- **Owner checks:** Live Cam and Try on changes need the owner's phone test on a Vercel preview before merge.
- **Rollout:** behind flags (section 9) so the current look stays until the owner switches it on.
- **Flags:** `your_fit = false`, `ugc_collab = false`, `nav_v2` per-device opt-in (`?nav_v2=1`) already exist in `src/lib/features.ts` / `src/lib/navV2.ts`.

## 4. Visual language

### 4.1 Color (tokens go in `src/index.css` + `tailwind.config.ts`)
| Token | Light | Dark | Use |
|---|---|---|---|
| `ground` | #F5F5F7 | #000000 | Page background |
| `card` | #FFFFFF | #1C1C1E | Cards, sheets, grouped rows |
| `card-2` | #F2F2F4 | #2C2C2E | Inset blocks inside a card |
| `ink` | #1D1D1F | #FFFFFF | All running text, primary buttons |
| `ink-2` | #6E6E73 | #B4B4B4 | Secondary notes only |
| `ink-3` | #8E8E93 | #949494 | Inactive tab labels, meta |
| `fill` | #E9E9EB | #2C2C2E | Chips, segmented control track, icon buttons |
| `line` | #E5E5EA | #38383A | Row dividers, bar top edge |
| `line-strong` | #D1D1D6 | #48484A | Secondary button border |
| `buy` | #7A143E | #9E1F52 | Buy buttons only (see rule below) |
| `buy-ink` | #FFFFFF | #FFFFFF | Text on buy buttons |
| `ok` | #DCFAE5 / text #04250E | #0F3D22 / #D8F5E2 | "Published", "Approved", "Live" |
| `wait` | #FFF1D6 / text #5C3A00 | #3D2A08 / #FFE2A8 | "Pending", "waiting for approval" |
| `bad` | #FFEDEA / text #831C1E | #4A1414 / #FFD6D1 | "Rejected", errors |
| `danger-ink` | #B3261E | #FF6961 | Delete account, Reject |
| `pin` | #B8486F | #D06A90 | Map pins on the Globe (data, not chrome) |

**The maroon rule.** `buy` appears only on actions that spend money or start buying: Shop, Buy on [brand], Add to bag. Not on tabs, toggles, links, the Try on button, headers, icons or badges. Each screen has at most one buy button visible at a time (the bag has one per brand, which is the same action repeated per seller).

**Primary button rule.** Every other main action is `ink` filled (black in light, white in dark), one per screen. Secondary buttons are `card` with a `line-strong` border. Tertiary actions are plain text.

**Status colors** only mean status. Toggles use iOS green #34C759 when on.

### 4.2 Type
- **Face:** the system font stack `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, system-ui, sans-serif` (San Francisco on iPhone/Mac, Roboto on Android, Segoe on Windows). No web-font download. Inter, Cormorant Garamond and Playfair Display are removed from UI text.
- **One serif job:** the "Azyah" wordmark (Playfair Display, kept only for that).
- **Sizes (px / weight):** large title 26/600, screen title 17/600, section heading 15/600, body 13–15/400 (15 for reading, 13 for dense lists), caption 12/400, smallest 11. Inputs are 16px (stops iPhone zoom).
- **Three weights:** 400, 500, 600. Bold 700 only for a total price.
- **Numbers:** tabular figures (`font-variant-numeric: tabular-nums`) for prices, counts, credits, points, timers.
- **Case:** sentence case everywhere. No uppercase labels.

### 4.3 Space, shape, depth
- 4px grid. Phone side margins 16px. Gap inside a section 8–12px; between sections 16–24px.
- **Radius:** cards and sheets 20, inner tiles and photos 12–16, buttons 14, segmented control 10 (segments 8), chips and avatars fully round. Nested radii step down.
- **Depth:** flat. Cards are separated from the page by color only (no shadow, no border). Shadows only on floating things: the Create button, menus, sheets, dialogs.
- **No** glass, backdrop blur, gradients, glows or colored icon tiles. Text never sits on a dark fade over a photo; it sits on solid color.

### 4.4 Icons and imagery
- One outline icon set (Lucide, already used), grey `ink-2`, 20–22px in bars, 17–20px in rows and buttons.
- Product photos are the hero. Closet cut-outs sit on white tiles. People show as their photo or initials on a pale tint.
- No illustrations, no welcome banners, no emoji in system text.

### 4.5 Motion
- 150–250ms ease-out, transform and opacity only. Sheets slide up; tabs switch without animation.
- Every control has press feedback. `prefers-reduced-motion` removes movement and keeps content.
- The bottom bar never auto-hides (today it slides away on some pages).

### 4.6 Words
Plain, short, sentence case, verb-first buttons ("Add to bag", "Generate try-on"). Errors say what happened and what to do. Privacy notes are explicit ("Only you can see it").

## 5. Components (one set, shared by every screen)
| Component | Spec |
|---|---|
| Bottom bar | Solid `card`, top `line`. Five items: Feed (shopping-bag), Explore (globe), Try on (shirt, inside a 34px `ink` circle), Community (users), Profile (user). Active = `ink` icon + label; inactive = `ink-3`. Labels 10px. 44px+ targets. Safe-area padding. On dark screens (Explore, Live Cam) the bar is black and the Try on circle inverts to white. |
| Desktop / tablet shell | ≥ 768px: left sidebar 220px, same color as `ground` (never dark), Azyah wordmark at top, the five destinations, active item = `fill` pill. Content max width 1100px. |
| Top area | Large title (26/600) left, round 32px `fill` icon buttons right (search, favorites, filters, settings). Sub-screens: back chevron, centered 17/600 title. |
| Segmented control | `fill` track, `card` selected segment, 12px labels. Used for modes (Picture/Video/Live Cam), list filters (Outfits/Clothes/Following), (Liked/Wishlist). |
| Chips | `fill`, round, 12px, no wrap; selected = `ink` with white text. Used for categories and sources. |
| Buttons | Primary `ink`; Buy `buy`; Secondary `card` + `line-strong`; Text; Destructive text `danger-ink`. Height 44–48 on phone. |
| Card | `card`, radius 20, padding 12–16, no shadow. |
| Grouped rows | iPhone Settings style: rows 44–52px, divider `line`, leading grey icon optional, trailing value in `ink-2` and chevron `#C7C7CC`. |
| Product tile | Photo (radius 16), name 12–13px, price tabular in `ink-2`. Same tile in search, favorites, brand pages, results of "similar". |
| Swipe card | Photo top (radius 20 card), "Try on" white pill top-right, image dots; info panel below the photo on `card`: name, price (tabular, right), brand. Under the card: Pass, Save, Like round buttons + one Buy "Shop" button. Swipe gestures unchanged. |
| Sheet | Slides up, radius 20 top corners, grabber, used for product details, country list, filters, create. |
| Status label | Pale tint + dark text of the same hue (`ok`, `wait`, `bad`, neutral `fill`). 11px, round. |
| Toggle | iOS style, green when on. |
| Inputs | 44px, `fill` background, radius 10, 16px text, label above in `ink-2`. |
| Empty state | Keeps the section frame and title; one sentence in a dashed 1px `line-strong` box; one action if there is one. |
| Loading | The final layout in flat `line` grey blocks at real sizes. No shimmer, no layout jump. |
| Error | Inside the block that failed: what failed, when it last worked, a "Try again" text button. Never a full-screen error for one block. |
| Toast | Small `ink` pill at the bottom above the bar, 2–3 seconds, plain words. |

## 6. Navigation and screen map
**Tabs (routes):** Feed `/swipe`, Explore `/explore`, Try on `/try-on`, Community `/community`, Profile `/profile`. This updates the existing nav v2 (today 4 tabs: Discover/Try on/Community/Profile) to these 5 names and routes. Existing redirects stay (`/feed`, `/forum`, `/fashion-feed`, `/dress-me/community` → `/community`; `/discover` → `/swipe`).

| Tab | Screens reached from it |
|---|---|
| Feed | Swipe deck · list view · product details sheet · search · favorites · bag · filters |
| Explore | Globe (Brands, Following, People) · country list sheet · brand page `/brand/:slug` · store page · featured brands · trending styles |
| Try on | Picture · Video · Live Cam · your results · event try-ons |
| Community | Outfits · Clothes · Following · outfit page `/community/outfit/:id` · item page `/community/item/:id` · create post/outfit |
| Profile | Summary · My closet `/dress-me/wardrobe` · outfit builder `/dress-me/canvas` · favorites · events `/events` · rewards `/rewards` · Premium `/dashboard/upgrade` · settings `/settings` · someone else's profile `/profile/:userId` |
| Outside the tabs | Welcome `/landing`, `/` · sign-up/sign-in `/onboarding/signup` · reset password · style quiz `/onboarding-calibration` · shared pages `/share/item/:slug`, `/share/outfit/:slug` · StyleLink `/u/:username` · AR `/ar/:eventId/:brandId` · legal pages · 404 · brand portal `/brand-portal` · store portal `/retailer-portal` · admin `/admin/partners` |

**Other routes:** `/p/:id` (guest-openable, used by shared links) opens the product details sheet over the Feed. The public outfit page is `/community/outfit/:id`; `/dress-me/outfit/:id` is your own outfit with Edit. `/affiliate`, `/affiliate/:userId`, `/oauth/consent`, `/admin/delete-user`, `/retailer-portal/brands/:brandId` take the new tokens only. No new store or event routes in this design: a store's page uses the brand-page layout where one exists; event details open from `/events`.

**Guests** can use Feed and Explore. Any action that needs an account (save, like, try on, follow, bag) opens a sign-in sheet and returns the person to where they were.

## 7. Screens
Each screen: what it's for, what's on it, what the main action is, and its states. Mockup file in brackets.

### 7.1 Feed `/swipe` [01]
For: discovering clothes. Large title "Feed", subline "Style model 72%" (today's calibration value). Right: favorites, filters. The swipe card (section 5). Under it: Pass, Save, Like, and Buy "Shop" (opens the product's brand site as today; hidden when the product has no link). "Try on" on the photo opens Try on with this item selected. List view toggle stays in the filter sheet. Empty: "You've seen everything for these filters" + Clear filters. Loading: card-shaped grey block. Error: inside the card area with Try again.

### 7.2 Product details (sheet) [02]
From feed, search, brand pages, favorites, community. Photo gallery (dots), close (chevron down), share, save. Brand (ink-2), name 19/600, price tabular. Size chips when the product has sizes. Two buttons: secondary "Try on", Buy "Add to bag". Grouped rows: Description, Fabric and care (when present), Delivery ("From the brand's site"). "Similar items" row of product tiles below. If no external link: Add to bag still works; the bag shows "Not sold online yet" for that brand.

### 7.3 Search (sheet, from any tab's search button) [02]
Field + Cancel. Segmented: Products, Brands, People (today's GlobalSearch tabs; "Shoppers" is renamed People). Filter chips under it (category, price, country). Results: product tiles in 2 columns; brand and people results as rows with avatar/logo and Follow. Empty: "No results for 'x'. Try another word." Recent searches when the field is empty.

### 7.4 Explore `/explore` [01]
For: browsing the world of brands and people. Black screen. Large title "Explore", subline "48 brands in 12 countries" (today's counts). Search button. Segmented (dark): Brands, Following, People. **Deals hidden** (flag `deals = false`), **Fit removed**. The 3D globe as today; map pins in `pin` color; the hint "Tap a country to see its brands/people" in `ink-2`. Country list sheet as today (Brands, People, Products, Posts tabs) in the light sheet style. Removed: the Home button and "Skip to feed" pill (the tab bar replaces both).

### 7.5 Brand and store page `/brand/:slug` [02]
Back, share. Card: logo (initials on `ink` square if no logo), name, city · product count, Follow (secondary). Short description. Category chips (All, then the brand's categories, New). Product tiles, 3 columns. Store pages use the same layout ("Store" instead of "Brand", brands they carry as a row). Past work / portfolio as a horizontal row when present.

### 7.6 Try on `/try-on` [01, 03]
A full screen (replaces the AI Studio pop-up; the pop-up stays for older entry points until removed). Large title "Try on", subline with what's left ("3 pictures · 1 video left today"; `get_user_credits` returns remaining credits only, so no totals are shown). Results button (photo icon) top-right. Segmented: **Picture** (default), Video, Live Cam (shoppers only, as today).
- **Picture:** two cards side by side: "Add your photo" (dashed, note "Only you can see it") and the item. Source chips: From feed, Saved, My closet, Upload. Primary black "Generate try-on". "Your results" row (latest 4; tap opens the result viewer: share, save, download, delete).
- **Video:** the same layout, with the result of a picture try-on or a photo as input, duration chips (5 s / 10 s as today), primary "Make video". Progress shows as "Making your video… usually 1–2 minutes" in the results row.
- **Live Cam:** before starting: the garment picker (closet, products, event items) and "Start Live Cam"; a note on time per session and that a GPU starts up (under a minute when warm). While running (section 7.7).
- **No credits:** for Basic users the primary button becomes "Get more try-ons" (black) → Premium; for Premium users who used today's try-ons it says "More try-ons tomorrow" with no button. Never disabled without saying why.

### 7.7 Live Cam while running [03]
Black, full screen like the iPhone camera. Top: close (ends session), status "Live" with a green dot (or "Starting…"), time left (tabular). The camera view fills the middle. Bottom: garment strip (selected one ringed in white; last tile "My closet" opens the picker), big round snapshot button (saves to the private snapshots folder; "Only you can see it" toast). Errors (connection lost, GPU busy) show inside the camera area with "Try again" and "End". Behavior, messages and limits are exactly today's (`useLiveCamSession.ts` unchanged).

### 7.8 Community `/community` [01]
Large title "Community" (today the page is titled "Explore", which clashes with the Globe). Search button. Segmented: Outfits, Clothes, Posts (people's posts, today's `FeedComponent`; with the new bar `/feed` and `/forum` already redirect here, so posts need this home), and Following once a following feed exists. Two-column cards: photo, name, likes (tabular). Floating black "Create" button (post or outfit sheet) — the only shadow on the screen. Outfit page and item page: photo, author row with Follow, items list (rows with price → product details), "Try this look on you" (black), Save. Empty Following: "Follow people to see their outfits here." + Find people.

### 7.9 Profile `/profile` [01]
"Azyah" wordmark top-left (the one serif), search and settings buttons. Summary card: avatar/initials, name, "12 posts · 5 brands · 120 points", New post (chip). Grouped rows: My closet, Friends (friend requests and your friends, today's friendships), Favorites, Events ("1 near you"), Rewards ("120 pts"). Sections: Your posts (3-up), Trending looks (3-up, with the category filter as a chip). No Your Fit anywhere. The two "Analyze closet" buttons move into My closet's menu (they're tools, not profile content).

### 7.10 My closet `/dress-me/wardrobe` [03]
Large title "My closet", subline "32 items · 6 outfits", black round + (add item: camera, photos, from a product). Segmented: Clothes, Outfits. Category chips: All, Tops, Bottoms, Dresses, Outerwear, Shoes, Bags, Accessories (today's categories). White tiles, 3 columns, cut-outs centered. **Starter items stay** (the 10 default items every new user gets) with a dashed note "Starter items to play with. Swap them for your own anytime." + Hide. Primary black "Make an outfit". Item page: photo, details, "Try on" (secondary), "Share" (if public reuse is on), privacy toggle "Others can reuse this item".

### 7.11 Outfit builder `/dress-me/canvas` [03]
Cancel / "New outfit" / Save. White canvas with the current drag, resize and layer behavior (unchanged). The friend modes stay: styling a friend's closet (`?mode=friend&friendId=`) shows "Styling [name]'s closet" under the title, and suggest mode sends the outfit as a suggestion. Tools on the canvas: undo, background. Category chips + a tray of closet items. Fields: Name, Occasion. Save → outfit page with Share and "Make it public".

### 7.12 Favorites `/favorites` [03]
Large title "Favorites". Segmented: Liked, Wishlist (today's tabs). Product tiles, 2 columns, heart button on each to remove. Empty: "Things you like in Feed show up here." + Go to Feed.

### 7.13 Bag `/cart` [02]
Large title "Bag", "2 items". Items grouped by **where they're sold**: the site of the product's link (`external_url`), named by `merchant_name`, else the brand name, else the site's name. Rows with photo, name, brand · size, quantity, Remove, price (tabular). Each group ends with Buy "Buy on [seller]" (opens that item's link; for several items it opens the first and keeps the rest listed). So a brand's item sold through a store or marketplace says "Buy on [that store]", never the brand's name for someone else's site. Items with no link group under "Not sold online yet" without a button. Note: "Each brand sells on its own site. Your bag remembers what you picked." No in-app checkout (decision D1). Empty: "Your bag is empty." + Go to Feed.

### 7.14 Events `/events` [04]
Large title "Events". Current event card: photo, name, dates · brands, "Try on items" (black) and "Details" (secondary). "Your event try-ons": your private results (3-up) with the note "Only you can see these". Past events below as rows. Event page: brands carried, items to try on, map/location row.

### 7.15 Rewards `/rewards` [04]
Large title "Rewards". Card: "Your points" with the number at 32/600 tabular, progress to the next reward. Then everything today's page has, restyled: **Daily check-in** (a row with today's state and a Check in button), **Redeem** (today's credit packages as rows; Premium-only as today, non-Premium sees "Redeem with Premium" → Premium), **Leaderboard** (global / country segmented, today's `MinimizedLeaderboard`), **Activity** (today's points activity and redemptions as rows with signed amounts: + in green #247B50, − in `ink-2`).

### 7.16 Premium `/dashboard/upgrade` [04]
Close button. "Azyah Premium", one sentence. Segmented Monthly / Yearly (save label computed from prices). Comparison rows (today's values): AI try-on — 5 total / 10 a day; Create outfits — 5 / unlimited; Closet items — 10 / unlimited; Points to credits — no / yes; Priority support — no / yes; Live Cam — Standard / Premium quality **only when Premium Live Cam is switched on** (`VITE_LIVE_CAM_PREMIUM_UI`). **Removed rows:** UGC collaboration, Height/Fit check (hidden features). On iPhone: primary black "Continue · AED 200 a year" (or AED 30 a month), App Store purchase as today, "Cancel anytime in Settings." On web and Android: the plans show, and the button area says "Subscribe in the Azyah iPhone app" (secondary, with the App Store link) instead of a button that only shows a toast. Taking payment on the web (the unused `create-stripe-checkout` function) is a later owner decision.

### 7.17 Settings `/settings` [04]
Back, "Settings". Groups: **Account** (Personal information, Shopping preferences "AED · UAE", Subscription "Basic/Premium"); **Privacy** (Show me on the Globe and leaderboard — toggle, today's `preferences.visible_on_globe`; Social links). No "Public profile" toggle: it doesn't exist, and a switch that doesn't really hide anything would break a privacy promise; **Help** (Invite friends, Contact support, FAQ — moved from the intro carousel, Terms, Privacy, Cookies); **Sign out**; last, alone, red text "Delete account" (confirm sheet stating that photos, closet and outfits are deleted). No measurements section.

### 7.18 Welcome, sign-up, sign-in, reset [04]
Welcome `/landing`, `/` (logged out): white, one large product photo, "Azyah" wordmark, one sentence ("Find clothes you love and see them on you before you buy."), black "Continue with email", secondary "Browse first" (guest mode), "Already have an account? Sign in". Sign-up flow as today (email → code → password → username → country), one step per screen, large title per step, inputs per section 5. Reset password: same layout. The 4-slide intro carousel is replaced by this one screen (decision D6).

### 7.19 Style quiz `/onboarding-calibration` [04]
Back, "1 of 4", Skip. Progress bar (ink on fill). One question per screen: coverage, fit, fabric, style (today's steps; measurements stays hidden). Answers as grouped rows with a check circle. Black "Continue".

### 7.20 Someone's profile `/profile/:userId` [06]
Avatar/initials, name, "@handle · 34 outfits · 210 followers", Follow (black), Share (secondary), Add friend (text) where friendships allow. Segmented: Outfits, Items, Posts (today's tabs; only what they made public). Grid 3-up. StyleLink (`/u/:username`) stays off as today (`style_link = false`, the route redirects to `/profile`); if it returns it uses this same layout.

### 7.21 Shared pages `/share/outfit/:slug`, `/share/item/:slug` [06]
Opened in a browser, no login. White. Top: "Azyah" wordmark, "Open the app". The look or item, author, item rows with prices → product page, one black action "Try this look on you" (opens the app/sign-up, then Try on with these items). Share previews (`share-meta`) unchanged.

### 7.22 AR `/ar/:eventId/:brandId`
Keeps its current camera experience; its buttons and labels take the new tokens (black/white on the camera view, no glass).

### 7.23 Partner portals [05]
Same tokens. Desktop: sidebar matching the page, brand/store name and "Brand portal"/"Store portal" at top.
- **Brand portal** `/brand-portal`: menus per partner type, as today: fashion brands — Products, Analytics, Settings (+ Events in Phase 5); agencies and studios — Services, Portfolio, Analytics, Settings; salons — their own `SalonDashboard`, restyled with the tokens. (Collabs stays hidden.) "Waiting for approval" banner in `wait` tint. Products: title + "48 products · 3 pending", Bulk upload (secondary), Add product (black). Table rows: thumbnail, name (+ "missing photo" note from `publishProblems`), price (right, tabular), status label using today's labels (`productStatusLabel`): Live (`ok`), Pending = draft (`wait`), Hidden, Archived, Out of stock, Sold out (neutral). Next action in the same column on every row: Publish on Pending, Edit otherwise.
- **Store portal** `/retailer-portal`: Products, Brands, Events, Analytics, Settings. On phones the sidebar becomes a bottom bar. Events list with status (Live `ok`, Draft neutral); event page with brands, try-on items, try-on count.
- **Admin approvals** `/admin/partners`: "Partner approvals · 2 waiting", cards with name, type · city · signed-up time, Pending label, black Approve, red-text Reject; "Recently decided" rows.

### 7.24 Kiosk (Phase 5, Live Cam only)
Same language as Live Cam (7.7), full screen, no tab bar: attract loop (garment photos, "Tap to try on"), consent screen ("This camera shows you wearing the clothes. Nothing is recorded or kept." + Start), live view with big garment buttons, End, automatic reset after 60s idle, optional QR snapshot behind a second consent. Built in Phase 5 (`KIOSK_MVP.md`).

### 7.25 Legal pages, 404, offline
Large title, readable 15px text, max width 680px. 404: "This page doesn't exist." + Go to Feed. Offline: a toast "You're offline. Some things won't load." and the per-block error state.

## 8. Decisions made for the owner (marked; the owner can change any)
| # | Decision | Why |
|---|---|---|
| D1 | No in-app checkout. The bag groups items by brand, with "Buy on [brand]" opening the brand's site. The dead "Proceed to checkout" button goes. | Shop already opens the brand's site; in-app payment for many brands would need payments, delivery and returns that don't exist. A working path beats a dead button. |
| D2 | Sign-in stays email + code (as today). Apple and Google come back later together. | Google and Apple were removed before (legacy users had to reset passwords). On iPhone, Apple's rules require Sign in with Apple whenever another social sign-in is offered. |
| D3 | Five tabs; Community keeps its own tab. | Five clear jobs: discover, explore, try on, share, my things. iOS bars hold five comfortably. |
| D4 | Try on opens on Picture; Live Cam is the third mode. | Picture is the cheapest and most reliable; every Live Cam session costs GPU time. |
| D5 | Brand portal keeps Services and adds Events in Phase 5. | Services exists today; events are planned for brands. |
| D6 | One welcome screen replaces the 4-slide intro; its FAQ moves to Settings → Help. | Fewer steps before people see clothes; the taste rules ban welcome banners. |
| D7 | Premium shows today's plan values; rows for hidden features (UGC, Height/Fit) are removed. The credits line reads live values from the server. | Plans are a business decision; hidden features must not be sold. |
| D8 | Profile drops the two "Analyze closet" buttons into My closet's menu. | They act on the closet. |
| D9 | Dark mode follows the phone's setting, true black. | Apple style; the app already has dark tokens. |
| D10 | System font instead of Inter/Cormorant/Playfair; Playfair only for the wordmark. | Native feel, no font download, one face. |

**To check during the build (not a design choice):** new users get 4 picture credits in the database, but today's Premium page says "5 total". The screen should show what `get_user_credits` returns; the owner confirms which number is right.

## 8b. Builder-check answers (2026-10-28, owner-approved direction; decided by Claude)
| # | Question | Answer (section) |
|---|---|---|
| B1 | How does v3 reach iPhone users when flags are fixed at build time? | Test with `?design=v3` on the web; on approval flip `design_v3: true` in code: web gets it at once, iPhone with the next App Store build. No remote switch (9). |
| B2 | Is v3 tied to the new tab bar? | Yes: v3 always shows the five-tab bar; the old bars are not restyled (9). |
| B3 | Friends? | Kept: Friends row in Profile, friend and suggest modes in the outfit builder (7.9, 7.11, 7.20). |
| B4 | Posts and StyleLink? | Community gets a Posts tab (today's `FeedComponent`); StyleLink stays off (7.8, 7.20). |
| B5 | "Public profile" toggle? | Removed; only the real Globe/leaderboard toggle (7.17). |
| B6 | Brand portal menus? | Per partner type as today, salons keep their dashboard (7.23). |
| B7 | Product statuses? | Today's labels: Pending (draft), Live, Hidden, Archived, Out of stock, Sold out; Publish on Pending (7.23). |
| B8 | Rewards features? | All kept: check-in, credit packages, leaderboard, activity (7.15). |
| B9 | Premium on web/Android? | Plans show with "Subscribe in the Azyah iPhone app"; web payments later; Live Cam row only when on (7.16). |
| B10 | Credit totals? | Show remaining only; Premium daily-limit message (7.6). |
| B11 | Bag grouping? | By the site the item is sold on (7.13). |
| B12 | Uncovered routes? | `/p/:id` sheet over Feed; canonical outfit pages; other routes tokens only; no new store/event routes (6). |

## 9. Rollout
1. Flags in `src/lib/features.ts`: `deals: false` (hides the Explore Deals tab and its drawer; `exploreTabs.ts` drops 'deals'), `design_v3` (new tokens and components). `design_v3` gets a per-device opt-in like nav v2 (`?design=v3`, remembered; `?design=v2` to leave) so the owner can phone-test before anyone sees it. Turning v3 on also turns on the five-tab bar (B2). Flags are fixed at build time: switching v3 on for everyone is a one-line code change that reaches the web on merge and iPhones with the next App Store build (B1).
2. Order: tokens + components → bottom bar (5 tabs, nav v2 updated) → Feed, Explore, Try on → Community, Profile, closet, outfit builder → shopping sheets, bag, favorites → account screens → shared pages → partner portals → kiosk (Phase 5).
3. Each step: owner phone test on a Vercel preview (Live Cam test needs RunPod topped up), then merge. After the last shopper step, an iPhone build so App Store users get it, then `design_v3` on for everyone and the old styles removed.

## 10. Accessibility
Text contrast ≥ 4.5:1 on its surface (the grey values above meet it on `ground` and `card`). Touch targets ≥ 44px. Every icon-only button has a label. Dynamic text sizes don't break rows (rows grow). Focus rings on web (2px `ink` outline). Reduced motion respected. Status is never color-only (labels carry words).

## 11. Verification
- Unit tests for flag logic (`deals`, `design_v3` opt-in, 5-tab routing) and any helpers.
- `npx vitest run src/components/ai-studio/live-cam` stays green; Live Cam files unchanged except styling in components that render it (and the owner's phone test).
- Browser check at 390, 768 and 1280px wide for each screen group (taste skill rule): one clear title, equal margins, no empty stretches over half a screen, maroon only on buy buttons, no glass/gradients/shadows on resting cards.
- Dark mode screenshot per group.

## 12. Left to the builder
Exact component file layout, Tailwind class names, which shadcn primitives each component wraps, animation curves within 150–250ms, image aspect ratios per grid, copy polish within the rules in 4.6.

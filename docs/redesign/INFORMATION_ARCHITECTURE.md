# Information Architecture (proposed)

Status: **proposal for review.** Nothing here is built yet.

## Principle
One loop for shoppers: **see something → try it on → save, share or create with it.** Everything else is secondary and lives one level down.

## Shopper navigation: 4 stable tabs

| Tab | Route | What it holds | Replaces |
|---|---|---|---|
| **Discover** | `/discover` | Mode switch at top: **For You** (swipe / grid, today's `/swipe`), **Search**, **Globe**. Product and outfit cards everywhere have **Try On**, **Save**, **Share**, **Brand**. | Feed tab (`/swipe`), Explore tab (`/explore`), GlobalSearch modal, Trending/Featured pages |
| **Try On** | `/try-on` | Live camera first (big Start button, current garment, garment tray: Saved, Wardrobe, Recently viewed). "Photo" and "Video" as secondary modes. | AiStudioModal (picture/video/live tabs), ProductTryOnModal (BitStudio), Live Cam's hidden tab |
| **Community** | `/community` | One feed of public posts and outfits. Floating **Create** button → "Post" or "Outfit (canvas)". Outfit detail, comments, likes, report/block. | `/community`, `/dress-me/community`, `/fashion-feed`, mock `/feed`, `/forum` |
| **Profile** | `/profile` | Me: Saved (likes/wishlist), My outfits & boards, Wardrobe, My posts, Following, Rewards, Settings, Upgrade. (Your Fit hidden.) | Profile dashboard, Favorites, Dress Me wardrobe entry, Rewards, Affiliate |

- The bar is **always visible** on these four tabs (no auto-hide). It hides only inside full-screen tools: Live camera session, canvas editor, AR, kiosk.
- One visual style for the bar on every screen. Active state: filled icon + label + accent colour. Labels always shown. Touch targets ≥ 44 px.
- Desktop/tablet (≥ 1024 px): the same four destinations as a left rail.
- Each tab keeps its own state (scroll, filters, search query, selected globe layer) when switching tabs (React Query cache + URL search params).

## Discover in detail
- `/discover` (default **For You**). `?mode=search&q=…`, `?mode=globe&layer=brands|people|outfits&country=AE`.
- **Search** covers products, outfits (public fits/posts), people, brands, in one result page with filter chips. One search implementation (today's `GlobalSearch.tsx` logic moved into a hook).
- **Globe** has 3 layers only: **People** (opt-in public profiles with a country), **Outfits** (public outfits by creator country), **Brands** (by `brands.country_code`). Tapping a country opens a sheet with cards and clear actions (Follow, View outfit, Shop brand, Try On). Following/Your Fit/Deals tabs are removed from the globe: Following becomes a filter chip ("People I follow"), Your Fit is hidden behind a flag (owner: no longer needed), Deals goes behind a flag.
- Globe stays lazily loaded (already its own 166 KB chunk) and never requests location permission; country comes from the profile field the user set.

## Try On in detail
- Entry points: Try On tab, and **Try On** on every product/outfit card → `/try-on?product=<id>` (or `?wardrobe=<id>`, `?event_product=<id>`). The garment is preselected; no re-upload.
- Screen order: garment preview + "Start live try-on" → camera permission explainer (only first time) → warm-up status ("Starting GPU… usually under a minute; first start of the day can take several minutes") → live view with garment tray for instant swaps → Stop / Snapshot / Share.
- "Photo" and "Video" modes clearly labelled as **not live** ("Upload a photo, get a result in ~30 s").
- Unsupported device or denied camera → explain and offer Photo mode.
- Guests can open Try On and see what it does; starting a session requires an account (GPU cost).
- The Live Cam WebSocket contract stays exactly as today (`set_reference_image`, `set_prompt` with `instruction`, `frame`, `ready` with engine hints, `status`, `error`). The redesign only changes the screen around `useLiveCamSession`.

## Community in detail
- `/community` feed tabs: **For You** · **Following**. Filter chips: Outfits · Posts.
- **Create** → sheet: "Post a photo" (today's StyleLink post modal) or "Build an outfit" (DressMe canvas, unchanged). Publishing asks for visibility (Public / Only me). Saved outfits stay private by default (`fits.is_public = false`).
- Item/outfit detail keeps `/community/outfit/:id`, `/community/item/:id`.

## Partner Workspace (separate shell)
`/partner` with its own left/top navigation, never mixed with shopper tabs:
**Overview · Products · Try-On readiness · Events & Pop-ups · Analytics · Settings**, plus Collaborations behind a flag. Brand vs retailer differences are permissions, not separate apps. `/brand-portal` and `/retailer-portal` redirect to `/partner`.

## Kiosk (separate shell)
`/kiosk/:standId` full-screen, no app navigation. Operator setup at `/partner/events/:id/kiosk`. See KIOSK_MVP.md.

## URL compatibility (must keep working)
| Old | New |
|---|---|
| `/swipe` | `/discover` (redirect, keep query) |
| `/explore?tab=brands|shoppers|following` | `/discover?mode=globe&layer=brands|people|people&following=1` |
| `/dashboard`, `/favorites`, `/wishlist`, `/likes` | `/profile` sections (redirect) |
| `/dress-me*` | unchanged paths (canvas and wardrobe stay); entry moves to Community/Profile |
| `/fashion-feed`, `/feed`, `/forum` | `/community` |
| `/ugc` | `/partner/collabs` for partners; `/community` for shoppers |
| `/brand-portal`, `/retailer-portal/*` | `/partner/*` |
| `/share/outfit/:slug`, `/share/item/:slug`, `/ar/:eventId/:brandId`, `/auth/callback`, `/reset-password*`, `/oauth/consent`, `/extension-auth`, `/brand/:slug`, `/profile/:userId`, `/p/:id` | **unchanged** |
| `com.azyah.style://…` deep links | unchanged (handled by `useDeepLinkHandler.ts`) |

## Screen map

```
Shopper
├─ Discover (/discover)
│   ├─ For You (swipe / grid)        → Product sheet → Try On | Save | Share | Brand page
│   ├─ Search (products, outfits, people, brands)
│   └─ Globe (People | Outfits | Brands) → Country sheet → cards
├─ Try On (/try-on)
│   ├─ Live (default)  → session → swap garment → snapshot/share
│   ├─ Photo
│   └─ Video
├─ Community (/community)
│   ├─ Feed (For You | Following)    → Outfit/Post detail → like/comment/share/report
│   └─ Create → Post | Outfit canvas (/dress-me/canvas) → publish
└─ Profile (/profile)
    ├─ Saved · Outfits & boards · Wardrobe · Posts · Following  (Your Fit hidden, owner 2026-10-26)
    └─ Rewards · Upgrade · Settings

Partner (/partner) — brand / retailer
├─ Overview · Products · Try-On readiness · Events & Pop-ups · Analytics · Settings

Kiosk (/kiosk/:standId) — full screen, operator-activated
```

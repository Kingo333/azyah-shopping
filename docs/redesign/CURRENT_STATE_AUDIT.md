# Current State Audit

Audit date: 2026-10-26. Baseline commit: `228dcdf` (main, "Live Cam: send JoyAI full-size frames and garment details (#2)").
Method: read the router, navigation, every page's imports and table usage, the try-on stack, and the live Supabase project (read-only queries, advisors, Edge Function list). Nothing in production was changed.

## 1. Baseline

| Check | Result |
|---|---|
| Size | 666 TS/TSX files, ~130k lines in `src/`; 54 pages; 47 Edge Functions in repo, **88 deployed** |
| Tests | `npx vitest run`: **12 files, 134 tests, all pass** (includes `src/components/ai-studio/live-cam/__tests__`) |
| Build | `npx vite build` passes in ~48 s. Main JS chunk **2.84 MB (753 KB gzip)** + `charts` chunk 1.05 MB. No route-level code splitting (`src/App.tsx` imports every page eagerly). |
| Install | `npm ci` fails: `package-lock.json` is out of sync with `package.json`. `npm install` only works with `--legacy-peer-deps`. Two lockfiles (`bun.lock`, `bun.lockb`, `package-lock.json`). |
| Build side effect | Building without `VITE_SUPABASE_PROJECT_ID` makes the Lovable MCP Vite plugin **rewrite `supabase/functions/mcp/index.ts`** (projectRef becomes `"project-ref-unset"`). Reverted in this audit; anyone building locally could commit a broken function. |
| Lint | Known `no-explicit-any` errors (not re-measured; `.planning/codebase/CONCERNS.md` counts 656 `any`). |

### Live data (exact counts, 2026-10-26)

8 auth users (5 shopper, 2 brand, 1 retailer, 0 admin) · 144 products · 5 brands · 1 retailer · 1 retail event · 5 event products · 1 post · 3 fits (canvas outfits) · 2 looks · 0 follows · 97 likes · 41 wardrobe items · 129 Live Cam sessions (5 in the last 60 days) · 20 AI try-on jobs · 6 salons · 5 toy replicas · 0 collaborations · 0 cart items · 1 subscription · ~689k analytics `events` rows.

**Implication:** the product is pre-launch. A redesign carries very little data-migration risk; the real risks are security, Live Cam stability, and public/share URLs.

## 2. Routes and reachability (`src/App.tsx`)

Route guard: `ProtectedRoute` (role from `user_roles` table via `src/lib/roleCache.ts`, cached 5 min in sessionStorage). Guests are allowed into some guarded routes via a localStorage "guest mode" flag (`src/hooks/useGuestMode.ts`) and the `GUEST_ACCESSIBLE_ROUTES` list in `src/components/ProtectedRoute.tsx`.

| Route | Page | Guard | Reachable from UI? | Status |
|---|---|---|---|---|
| `/` , `/onboarding/intro` | IntroCarousel | signed-out only | entry | Working |
| `/landing` | Landing (921 lines) | public | yes | Working, marketing |
| `/onboarding/signup` | SignUp | signed-out only | yes | Working |
| `/swipe` | Swipe (grid/list/swipe modes) | shopper/admin + guest | **"Feed" tab** | Working, core |
| `/explore` | Explore (globe) | any signed-in + guest | **"Explore" tab** | Partial (see §4) |
| `/ugc` | UGCCollaborations | all roles | **"UGC" tab** | Working code, **0 collaborations ever** |
| `/profile` | Profile (dashboard hub) | signed-in | **"Profile" tab** | Working, overloaded |
| `/dashboard` | → `/profile` | | | Redirect |
| `/profile/:userId` | UserProfile | signed-in | yes | Working |
| `/settings` | ProfileSettings (1198 lines) | signed-in | yes | Working |
| `/favorites` (+`/wishlist`,`/likes` redirects) | Favorites | shopper | yes | Working |
| `/cart` | ShoppingCart | shopper | **no in-app link found** | Orphan, 0 rows |
| `/dress-me`, `/dress-me/wardrobe` | DressMeWardrobe | shopper | yes | Working |
| `/dress-me/canvas` | DressMeCanvas (EnhancedInteractiveCanvas) | shopper | yes | Working, core canvas |
| `/dress-me/community` | DressMeCommunity (public fits) | shopper | yes | Working |
| `/dress-me/outfit/:id` | DressMeOutfitDetail | shopper | yes | Working |
| `/community` (+`/community/outfit/:id`, `/community/item/:id`) | Community: Outfits / Clothes / Your Fit tabs | public | from share pages | Working; overlaps DressMeCommunity |
| `/feed` | Feed | shopper | **no link** | **Hard-coded mock posts** (`src/pages/Feed.tsx:52`) |
| `/fashion-feed` | FashionFeed (real `posts`) | shopper | only via `ShopperNavigation`, which is itself only on orphan pages | Effectively orphaned |
| `/forum` | Forum (53 lines) | shopper | no | Stub |
| `/events` | Events (EventTryOnModal, picture try-on) | shopper | from Profile | Working, 1 event |
| `/ar/:eventId/:brandId`, `/ar/test` | ARExperience (MediaPipe + three.js) | public | QR code | Working (per `.planning/STATE.md`) |
| `/brand-portal` | BrandPortal | brand | role redirect | Working |
| `/retailer-portal`, `/retailer-portal/brands/:brandId` | RetailerPortal | retailer | role redirect | Working |
| `/brand/:slug`, `/featured-brands`, `/trending-styles` | brand pages | public | partly | Working |
| `/rewards`, `/affiliate`, `/affiliate/:userId` | points, codes | signed-in | from Profile | Working, little use |
| `/dashboard/upgrade` | Upgrade (RevenueCat/Stripe) | signed-in | yes | Working |
| `/share/outfit/:slug`, `/share/item/:slug` | Public share views | public | external | **Must keep** |
| `/u/:username`, `/u/:username/deals` | → `/profile` | | | Style Link disabled by flag |
| `/p/:id` | PhotoCloseup | shopper | yes | Working |
| `/auth/callback`, `/reset-password*`, `/extension-auth`, `/oauth/consent` | auth | public | external | **Must keep** |
| `/admin/delete-user` | UserDeletionTool | admin | no | Admin tool |
| `/debug/health` | DebugHealthPage | **public** | no | Should be dev-only |

**Pages that exist but have no route** (dead code): `Index.tsx` (imported, never routed → `RoleDashboard.tsx` 755 lines is dead), `ARTryOn.tsx` (622), `BeautyConsultant.tsx` (726), `Install.tsx`, and 11 onboarding pages already marked deprecated in `src/pages/onboarding/deprecation-notice.ts`.

**Unimported modules:** 116 files / ~19,000 lines in `src/components`, `src/hooks`, `src/lib`, `src/utils` are never imported (list: first-pass grep, recorded in the PR; spot-checked). Includes `MoodBoardBuilder.tsx`, `BoardCanvas.tsx`, `InteractiveCanvas.tsx`, `AiTryOnModal.tsx`, `AiTryOnUploader.tsx`, the whole `src/components/AiStudio/` folder, `VisualSearchModal.tsx`, `ExploreSearch.tsx`, `explore/BrandsTab|FollowingTab|ShoppersTab.tsx`, `FeedComponent.tsx`, `PersonalizationEngine.tsx`, voice panels, `ToyReplicaUploader.tsx`.

## 3. Navigation (`src/components/BottomNavigation.tsx`)

- Tabs: **Feed** (`/swipe`), **Explore** (`/explore`), **UGC** (`/ugc`, auth), **Profile** (`/profile`, auth).
- On 17 routes the bar **auto-minimises after 2 s** to a small arrow (`AUTO_HIDE_ROUTES`), including the core Feed and Explore screens.
- Two visual styles: a full bar, and a floating pill on Profile only.
- Hidden for brand/retailer by reading `user.user_metadata.role` (UI only; fine for UI, but inconsistent with the route guard which uses `user_roles`).
- `/swipe` list view hides the bar and shows its own floating nav → **two navigation systems**.
- A second, older nav (`ShopperNavigation.tsx`) still exists on Likes, Wishlist, FeaturedBrands, TrendingStyles, FashionFeed, UserProfile.
- Explore's top-left button is "Home" → `/dashboard` (= Profile), and top-right "Skip to Feed" → `/swipe`: Explore is treated as an interstitial, not a destination.
- No Try-On destination. Live Cam is the third tab of `AiStudioModal`, opened from Swipe, SwipeDeck and Profile.

## 4. Feature inventory

Status: Working / Partial / Duplicated / Broken / Obsolete / Unknown. Relevance: Core / Supporting / Secondary / Out of scope.

| Feature | Entry point | Role | Key dependencies | Status | Relevance | Proposed action | Risk |
|---|---|---|---|---|---|---|---|
| Swipe / grid discovery | `/swipe` (Feed tab) | shopper, guest | `SwipeDeck`, `useUnifiedProducts`, `swipes`, `get_personalized_product_scores` | Working | Core (Discover) | Keep, move under Discover | Low |
| Global search | modal from Explore & Profile | all | `GlobalSearch.tsx` (products by title `ilike`, `public_profiles`, `brands`) | Partial: no outfits/posts, title-only | Core | Improve + single entry in Discover | Low |
| Globe | `/explore` | signed-in, guest | `GlobeWrapper`/`GlobeScene` (166 KB chunk), `CountryDrawer`, `brands.country_code`, `users.country` | Partial: 5 tabs (Brands/Following/Shoppers/Your Fit/Deals); 3 tabs just open drawers and blank the globe; **Shoppers counts read `users` but RLS only returns the caller's own row**, so counts are wrong | Core differentiator | **Owner 2026-10-26: keep exactly as is, hide only the Fit tab.** ~~Refocus on People / Outfits / Brands~~ | Privacy (location) |
| Following | Explore drawer, profile | signed-in | `follows`, `brand_follows`, `useFollows` | Working, 0 follows | Supporting | Keep inside Globe/People and profiles | Low |
| Deals / price match | Explore "Deals" drawer, affiliate | signed-in | 6 `deals-*` functions, `deals_cache` | Working code, niche | Secondary | Hide behind flag | External API cost |
| Your Fit (body measurements) | Explore + Community tab | signed-in | `AddYourFitModal`, `users` columns | Working | Supporting | ~~Move to Profile~~ **Owner: hide behind a flag, no longer needed** | Personal data |
| Picture try-on | AiStudioModal "Picture" | signed-in | `thenewblack-picture(-free)`, `ai_assets`, credits | Working | Core (Try On, secondary mode) | Keep under Try On → "Photo" | Credits |
| Video try-on | AiStudioModal "Video" | signed-in | `thenewblack-video`, `video_job_logs` | Working | Secondary | Keep under Try On → "Video" | Credits |
| **Live Cam (real-time)** | AiStudioModal "Live" tab, **shoppers only** | shopper | `useLiveCamSession.ts`, `live-cam-session-start/end/snapshot-save`, Worker `fluxrt-orchestrator`, RunPod | Working (5 sessions / 60 days) | **Core differentiator** | Promote to first-class Try On destination; keep WS contract | Must not break |
| Garment picker for Live Cam | inside Live tab | shopper | wardrobe + **first 12 rows of `products`** + 12 `event_brand_products` | Partial: no product→try-on handoff | Core | Accept a preselected product | Low |
| Event try-on (photo) | `/events` → EventTryOnModal | shopper | `thenewblack-event-tryon`, `event_tryon_jobs`, `event_user_photos` (public bucket) | Working | Supporting (B2B) | Fold into Partner/Kiosk + Try On | **Privacy: public bucket** |
| AR overlay (3D) | `/ar/:eventId/:brandId` QR | public | MediaPipe, three.js, `event-ar-models` | Working per `.planning` | Secondary | Keep link working; decide vs Live Cam for kiosk | Low |
| BitStudio try-on (older provider) | Favorites/Likes → `ProductTryOnModal` | shopper | `useBitStudio`, `src/lib/bitstudio-client.ts`, `src/lib/tryon/providers/bitstudio.ts`, `bitstudio-*` functions | **Still active** through `ProductTryOnModal` (Favorites, Likes) — a second, separate photo try-on path | Duplicated | Route Favorites' Try On to the unified Try On screen, then retire | Second provider bill |
| Outfit canvas (Dress Me) | `/dress-me/canvas` | shopper | `EnhancedInteractiveCanvas`, `useCanvasSave`, `fits`, `fit_items` | Working | **Core (Community)** | Keep; launch from Community "Create" | Must preserve |
| Wardrobe | `/dress-me/wardrobe` | shopper | `wardrobe_items`, `bg-remove`, Gemini/FashionCLIP analysis | Working | Core (feeds canvas + Live Cam) | Keep, surface in Profile | Low |
| Moodboard builder | none | — | `MoodBoardBuilder.tsx`, `AutoLayoutBoardCanvas` | **Dead (never imported)**; `looks` table has 2 rows | — | Candidate for removal after confirming | Low |
| Posts (StyleLink posts) | Profile → CreateStyleLinkPostModal | signed-in | `posts`, `post_images`, `post_products`, `post_likes` | Working, 1 post | Core (Community) | Unify with fits in one Community feed | Low |
| Community outfits/clothes | `/community`, `/dress-me/community` | public / shopper | `fits.is_public`, `public-fits` function | Duplicated (two screens) | Core | Merge into Community | Low |
| Comments | fit comments sheet | signed-in | `fit_comments` (0 rows) | Working code | Core | Keep; extend to posts | Low |
| Reporting / blocking | `moderation-flag`, `community_flags`, `blocked_users`, `useBlockedUsers` | signed-in | | Partial | Required for UGC | Keep, make consistent | App-store requirement |
| UGC collaborations | `/ugc` **bottom tab** | all | 14 `ugc/*` components, `collaborations` (0 rows), payouts | Working code, unused | Secondary | Remove from tab bar; move to Partner Workspace behind flag | Low |
| Brand reputation (reviews/scams/Q&A) | `/ugc` "Reviews" | all | `brand_reviews`, `brand_scam_reports` | Working code | Secondary | Hide behind flag | Moderation burden |
| Rewards / points / salons | `/rewards` | signed-in | `points_ledger`, `award_points`, `salons`, `redemptions` | Working; **redeem function insecure (S4)** | Secondary | Keep behind Profile, fix security | Credits abuse |
| Affiliate codes / promos | `/affiliate`, Profile | signed-in | `affiliate_links`, `affiliate_promos` (2) | Working | Secondary | Keep in Profile, flag | Low |
| Cart / checkout | `/cart` | shopper | `cart_items` (0 rows) | Orphan | Out of scope (shopping happens on brand sites) | Hide (route kept) | None |
| Subscriptions / premium | `/dashboard/upgrade` | signed-in | RevenueCat (iOS), Stripe, `subscriptions`, guard trigger | Working | Supporting (monetisation) | Keep | Billing |
| Beauty consultant (voice/chat) | none (page unrouted) + `BeautyAssistantFab` on Landing | — | 9 deployed `beauty-*` functions | Mostly dead | Out of scope | Hide/remove FAB | API cost |
| Toy replica | none | — | `generate-toy-replica` | Dead UI | Out of scope | Remove UI | Low |
| Brand portal | `/brand-portal` | brand | products, imports (ASOS etc.), CollabDashboard, Services, Portfolio, **SalonDashboard** | Working, cluttered | Core (Partner) | Simplify into Partner Workspace | Data ownership |
| Retailer portal | `/retailer-portal` | retailer | products, brands, events, collabs, analytics, bulk ASOS import | Working | Core (Partner) | Merge into Partner Workspace | Data ownership |
| Event management | Retailer portal → events | retailer | `retail_events`, `event_brands`, `event_brand_products` (retailer-managed only) | Working | Core (Kiosk) | Extend for kiosk collections | Brands can't self-manage event items |
| Analytics | `analytics-api`, `events` table (689k rows) | brand/retailer | `AnalyticsDashboard` | Partial | Supporting | Keep basic; add retention | Table growth |
| Guest browsing | localStorage flag | guest | `useGuestMode`, `GuestActionPrompt`, `useGuestGate` | Partial: `/explore` and `/swipe` wrap guest logic around `ProtectedRoute` | Core | Replace with "public by default, gate actions" | Low |
| PWA / install banner | `InstallBanner`, `sw.js` | all | | Unknown | Supporting | Verify | Stale caches |
| Native iOS (Capacitor) | `ios/`, `codemagic.yaml`, deep links `com.azyah.style://` | all | `useDeepLinkHandler.ts` | Working | Core | Keep deep links (`/auth/callback`, `/share/*`) | Must not break |

## 5. Try-on stack: what is actually active

| Mode | Provider (verified in code) | Notes |
|---|---|---|
| Live Cam | FluxRT / JoyAI on RunPod via Cloudflare Worker `fluxrt-orchestrator` | Single endpoint currently on JoyAI (per brief; RunPod not checked from here). Tier migration and new `live-cam-session-start` **not deployed** (confirmed: `live_cam_sessions` has no tier columns; function at v38). |
| Picture | The New Black (`thenewblack-picture`, `-free`) | Credits via `get_user_credits` / `deduct_ai_studio_credit` (service role). |
| Video | The New Black (`thenewblack-video`) | |
| Event photo try-on | The New Black (`thenewblack-event-tryon`) | |
| Gemini VTO | `vto-gemini` | Wired as a provider in `src/lib/tryon/providers/gemini.ts`. |
| BitStudio | `bitstudio-*` (7 live functions) | Older provider, **still used** by `ProductTryOnModal` (Favorites/Likes). Duplicate of Picture try-on. |
| AR | MediaPipe + three.js (client only) | 3D `.glb` models per event product. |

Docs that describe older providers: `EVENT_TRYON_*.md`, `AR_*`, multiple `SECURITY_*` files at the repo root (8 of them) — none should be trusted without checking code.

## 6. Edge Function drift

88 functions are deployed, 47 are in the repo. **41 live functions have no source in the repo**, including `payment-webhook`, `create-payment-intent`, `verify-payment`, `get-refund`, `ziina-webhook`, `create-premium-payment-intent`, `tryon-start/status`, `tryon-jobs`, `bitstudio-generate/inpaint/upscale/video/edit`, `import-asos-*` (5), `beauty-*` (8), `send-password-reset`, `user-setup-hook`, `delete-user-completely`, `safety-realtime-session`, `serper-weekly-ingest`, `google-shopping-search`, `analytics-api`. Several have `verify_jwt: false`. These cannot be reviewed or rolled back from git. See SUPABASE_AUDIT.md.

## 7. Top UX problems (evidence)

1. **No clear core loop.** The four tabs are Feed (swipe), Explore (globe), UGC (brand collabs, 0 rows), Profile. Try-on — the differentiator — is hidden in a modal's third tab, and only for shoppers (`AiStudioModal.tsx:56,583`).
2. **No product → try-on handoff.** `AiStudioModal` takes no garment input; the Live Cam picker loads an arbitrary 12 products (`LiveCamGarmentPicker.tsx:43`).
3. **Navigation that disappears** after 2 s on the main screens, plus a second nav system in list view and an old `ShopperNavigation` on six pages.
4. **Three community surfaces** (`/community`, `/dress-me/community`, orphaned `/fashion-feed`) plus a mock `/feed` and stub `/forum`; two post-creation modals (`CreatePostModal`, `CreateStyleLinkPostModal`).
5. **Profile is a dashboard**: search, trending carousel, featured event, AI Studio, closet analysis (two buttons: FashionCLIP and Gemini), posts, brands, rewards — all in `Profile.tsx`.
6. **Guest access is bolted on** via a localStorage flag instead of public routes; `/explore` is `ProtectedRoute` but then re-implements guest mode.
7. **Explore is framed as a detour** ("Home" and "Skip to Feed" buttons).
8. **Business clutter in shopper UI**: UGC tab; salons inside the brand portal.
9. **Inconsistent type**: three display serifs (`font-cormorant` ×61, `font-serif` ×38, `font-playfair` ×26) and 21 hard-coded hex colours.
10. **Heavy first load**: a single 2.8 MB bundle including three.js, echarts, MediaPipe paths.

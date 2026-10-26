# Implementation Plan

Each phase ships as its own draft PR (or a few small ones), reviewed and merged with the owner's OK. Merging to `main` deploys to production through Vercel, so every PR must be green and safe on its own. Live Cam must keep working after every PR.

Superpowers workflow per phase: design approved → task-level plan (`writing-plans`) → test-first changes (`test-driven-development`) → `verification-before-completion` (tests, build, manual check on a Vercel preview) → review.

## Phase 0 — Baseline (done in this PR)
Audit docs, baseline numbers (CURRENT_STATE_AUDIT.md §1), proposed security migration.

## Phase 1 — Security lockdown (first; needs approval to apply)
| Task | Acceptance | Tests |
|---|---|---|
| 1.1 Apply `20261026120000_lock_down_privileged_functions.sql` on a **Supabase branch**, run the checks in SUPABASE_AUDIT.md | All S1–S4 probes denied; real flows (signup, account delete, picture try-on credits, points redemption, Live Cam) still work | SQL probe script committed under `supabase/tests/` |
| 1.2 Apply to production (owner approval) | Advisors 0028/0029 counts drop; no errors in function logs for 24 h | Re-run probes |
| 1.3 Switch `enhance-wardrobe-item` to the service client for credit deduction, then revoke `deduct_wardrobe_credit` from authenticated | Wardrobe enhance still deducts | Function test |
| 1.4 S6 products policy, S7 private photo buckets with signed URLs, S10 WITH CHECK clauses | Archived products hidden from anon; photo URLs expire | SQL probes |
| 1.5 Pull the 41 live-only Edge Function sources into git (read-only) | Every deployed function has source | — |

## Phase 2 — Navigation & shells (frontend only)
- 2.1 Lazy-load all routes (`React.lazy` + `Suspense`) — no UI change. *Acceptance:* main chunk < 1 MB; all routes render; tests pass.
- 2.2 New `ShopperShell` with 4 stable tabs (Discover, Try On, Community, Profile), no auto-hide, desktop rail; old routes redirect (table in INFORMATION_ARCHITECTURE.md). Behind flag `nav_v2` so it can be switched off.
- 2.3 Make discovery routes public (no guest-mode flag needed); gate only actions (save, follow, post, start live session) with one `RequireAccount` prompt.
- 2.4 Single `useRole()`; remove `user_metadata.role` from UI decisions.
*Tests:* route redirect table test; nav renders for guest/shopper/brand; Playwright smoke: open each tab, back button returns to previous tab state.

## Phase 3 — Discover & Community
- 3.1 Discover For You = existing Swipe screen in the new shell.
- 3.2 Unified Search (products, outfits, people, brands) as a hook + page; bounded queries.
- 3.3 Globe layers People / Outfits / Brands with server-side country counts (RPC respecting profile visibility); Following as a filter.
- 3.4 Community feed merging public `fits` and `posts`; Create sheet → Post or Outfit canvas; visibility choice; report/block on every item.
- 3.5 Hide Feed mock, Forum, FashionFeed, UGC tab, Cart behind flags; redirects.
*Tests:* search returns each entity type; private fits never appear in feed (RLS test); canvas save → reload → identical layout.

## Phase 4 — Try On (UI around the existing engines)
- 4.1 `/try-on` screen; `GarmentRef` from URL; product → Try On handoff from every card.
- 4.2 Live first: start/stop, warm-up states, Cancel, camera denied/unsupported, GPU unavailable → Photo fallback. Reuses `useLiveCamSession` unchanged.
- 4.3 Photo/Video modes from AiStudioModal logic; Favorites' BitStudio path rerouted to Photo.
- 4.4 Garment tray (Saved, Wardrobe, Recently viewed, Event) using existing mid-session swap.
*Tests:* existing live-cam tests stay green; new unit tests for garment resolution; mocked-WebSocket test for status transitions; **manual phone test by the owner** on the Vercel preview with a warm worker.

## Phase 5 — Partner Workspace & Kiosk MVP
- 5.1 `/partner` shell; brand/retailer portals mapped into it; redirects.
- 5.2 Partner verification status (migration + admin approval).
- 5.3 Try-on readiness checks for products (image, garment type, background clean-up).
- 5.4 Brand-managed event items (policy change for `event_brand_products`).
- 5.5 Kiosk tables, `kiosk-session-start`, `/kiosk/:standId`, operator setup (KIOSK_MVP.md).
*Tests:* cross-role RLS tests (brand A cannot edit brand B; retailer can't edit unowned brand products); kiosk reset and recovery tests.

## Phase 5b — Live Cam quality (engine-side, separate PRs, can run in parallel)
From the brief, in priority order: Gemini garment-detail sentences into the JoyAI instruction; garment clean-up (white, 1024 px); 720p @16 fps on PRO 6000; WebRTC / H.264 downlink; precision reference; tuning. Each needs the owner's phone test and, where relevant, RunPod changes via the Chrome extension.

## Phase 6 — Clean-up
Remove dead pages/components (one PR, after Phases 2–4 ship), archive stale root docs, fix lockfile.

## Phase 7–8 — Regression, docs, release
See TEST_AND_RELEASE_PLAN.md. Keep SESSION_STATE.md current after every PR.

## Risks & controls
| Risk | Control |
|---|---|
| Breaking Live Cam | Engine code moved unchanged; tests stay green; owner phone test before merge; feature flag keeps old modal reachable |
| Locking users out with the security migration | Branch test first; rollback script ready; only 8 accounts to verify |
| Broken shared links / deep links | Redirect table test; keep `/share/*`, `/auth/*`, `/ar/*` untouched |
| Production release on merge | Small PRs, Vercel previews, flags for new nav |
| GPU cost at kiosks | Explicit warm/cool steps; cost shown to organiser |

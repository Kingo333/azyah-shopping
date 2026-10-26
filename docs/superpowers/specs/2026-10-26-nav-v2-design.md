# Navigation v2 (Phase 2) Design

_2026-10-26. Owner said "fix whatever is left": further brainstorming questions skipped; the calls below marked "my call" are the builder's, made from the owner's earlier decisions._

## Intent
Give shoppers one stable 4-tab bar (Discover, Try On, Community, Profile) instead of today's auto-hiding bar with a UGC tab, without changing anything for users until the owner has tested it on their phone.

## Owner decisions this design follows
- 4 tabs as in the session-2 mockups; the bar is always visible (no auto-hide), labels always shown.
- **Globe stays exactly as it works today** (only its Fit tab hidden).
- **Your Fit is hidden everywhere** (no longer needed); data and code stay.
- Don't break Live Cam: no change to `useLiveCamSession`, live-cam functions, Worker, RunPod or the WebSocket contract. Any Try On UI change needs the owner's phone test before merge.
- New navigation behind a feature flag; old URLs keep working; lazy-load routes.

## Goals
1. **Lazy-loaded routes** (all users): pages load on demand; main JS chunk much smaller than 2.8 MB. A stale chunk after a deploy reloads the page once instead of showing a blank screen.
2. **Nav v2 behind a flag** (off for everyone by default). A device opts in with `?nav_v2=1` (remembered on that device; `?nav_v2=0` turns it off). My call: per-device opt-in so the owner can test on the live site or a preview without anyone else seeing it.
3. With nav v2 on:
   - **Discover** → today's swipe feed (`/swipe`); the Globe (`/explore`, unchanged) also counts as Discover. `/discover` redirects to `/swipe`, keeping the query.
   - **Try On** → `/try-on`, which opens today's AI Studio (Photo, Video, Live Cam) unchanged; closing it returns to the previous page. My call: Phase 4 builds the real Try On screen; this phase only gives it a stable home.
   - **Community** → `/community`; **Profile** → `/profile`.
   - Old shopper URLs redirect: `/feed`, `/forum`, `/fashion-feed`, `/dress-me/community` → `/community`. Everything else is unchanged (share, auth, AR, brand pages, portals, `/ugc`, `/cart`).
   - The bar hides on full-screen tools and partner screens, as today (portals, onboarding, AR, canvas, DressMe).
   - Swipe's own floating list-view bar is hidden (the new bar replaces it).
4. **Your Fit hidden** (all users, flag `your_fit` = false): Globe "Fit" tab (Globe shows 4 tabs; `?tab=your-fit` opens Brands), Community "Your Fit" tab, Profile fit pill, Settings measurements section, onboarding measurements step, dashboard "Your fit" button.

## Non-goals (later phases)
Discover mode switch / unified search (Phase 3), real Try On screen and product → Try On handoff (Phase 4), public discovery routes and `RequireAccount` (2.3), single `useRole()` (2.4), Partner Workspace (Phase 5), Globe rework (dropped), removing dead code (Phase 6).

## Anti-goals
- Anything visible to users who haven't opted in, apart from faster loading and Your Fit disappearing.
- Any change to Live Cam behaviour or the Globe's behaviour.

## Tests
Pure, unit-tested modules: flag resolution, active tab per path, redirect table, Explore tab list, lazy-load retry. Full suite, Live Cam suite and build must pass; the main chunk shrinks. Visual check is the owner's phone test (the in-app browser couldn't open the site this session).

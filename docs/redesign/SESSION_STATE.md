# Session State

_Last updated: 2026-10-27 (session 2 end, after the production release). **Start with `docs/redesign/AUDIT_CHECKLIST.md`**: every item, its status and what's left._

## Deployed / live
- **App `main` at `5052ea02` (released 2026-10-27, owner approved).** It holds the docs (PR #3), the partner and event fixes, and the new navigation (nav v2). Vercel production deploy for `5052ea02`: success (08:32 UTC). Before this, `main` was `228dcdf` (Live Cam JoyAI full-size frames, PR #2).
  - Not checked from the PC: `azyahstyle.com` doesn't resolve from this computer, and the per-deploy Vercel link needs a Vercel login. Owner phone test pending (list in AUDIT_CHECKLIST §9).
  - The new 4-tab bar is still **off for everyone**. A phone opts in with `?nav_v2=1` (opt out: `?nav_v2=0`). Lazy page loading, Your Fit hidden, UGC hidden and the Globe People fix are on for everyone.
- Supabase (`klwolsopucgswhtdlsps`, org `odzvviqburgmslcipzfh`): all 7 session-2 migrations live (`20261026170939`, `20261026183904`, `20261026190151`, `20261026192808`, `20261027080215`, `20261027080234`, `20261027080253`), and their files are in `main` under the same versions. `live_cam_sessions_tier` **not** applied (no tier columns on `live_cam_sessions`). `live-cam-session-start` live at v38 (old, no tier parsing). No Supabase branches exist.
  - `thenewblack-event-tryon` live at v51, same source as `main`.
  - Advisors (latest, 2026-10-27): no ERRORs; search_path lint gone; anon SECURITY DEFINER 151, authenticated 160 (intended: public Globe lookups + admin approval function); leaked-password protection off and Postgres patch pending (owner, later); 2 RLS-no-policy (INFO).
- Cloudflare Worker `fluxrt-orchestrator`: May 22 version (legacy tokens). New source not deployed.
- RunPod endpoint `hb1m4x2ngdtbou` on JoyAI (per the brief; not re-checked). Balance was negative on Oct 25: top-up needed before any Live Cam test.

## Branches and PRs
- [Kingo333/azyah-shopping#3](https://github.com/Kingo333/azyah-shopping/pull/3) (`claude/busy-hypatia-ipst1p`): GitHub marks it merged (its commits are in `main`).
- `claude/partner-and-event-lockdown` and `claude/nav-v2`: fully contained in `main`; no PRs were opened (`gh` missing). Safe to delete when the owner wants.
- `claude/redesign-combined`: the release branch (`main` = its merge commit `5052ea02`). This notes update is one commit ahead of `main` on it.
- fluxrt-serverless #14: superseded by #15. Close with owner OK.

## Pending (in repo, not applied)
- `supabase/migrations/20261018090100_live_cam_sessions_tier.sql` (from earlier sessions; was already in `main` before the release).

## Decisions
- Done: no Supabase test branch; Live Cam is a shopper feature; manual partner approval; keep cart, hide UGC; Globe People counts fixed; shopper@test.com has the admin role; event try-ons use shopper credits; guest brands allowed; events browsable without login; Globe unchanged; Your Fit hidden.
- Kiosk engine: **Live Cam (JoyAI) only, no AR fallback** (owner 2026-10-27). ≈ $12.60 per 8-hour day per stand on an RTX 5090, warm worker during event hours. See `KIOSK_MVP.md`.
- Owner, later (not a priority): dashboard leaked-password protection and Postgres upgrade.

## Skills
- Session 2: Superpowers (plugin `superpowers@claude-plugins-official` v7.0.0) and Supabase (`supabase@supabase-agent-skills` and `postgres-best-practices`, commit c9be0e9), loaded from plugins (not from the setup script: `~/.claude/skills` only holds blender-toolkit and reverse-engineer-anything). Whether Superpowers v7.0.0 = commit 2ce8aa1 was not verified.
- `AZYAH_MASTER_PROMPT.md` was not attached / not found in the repo in session 2.

## Environment gotchas
- `npm ci` fails (lockfile drift). Use `npm install --legacy-peer-deps --no-package-lock --ignore-scripts`.
- `npx vite build` without `VITE_SUPABASE_PROJECT_ID` rewrites `supabase/functions/mcp/index.ts`. Revert it (`git checkout supabase/functions/mcp/index.ts`) and never commit that change.
- Local builds in worktrees: `@lovable.dev/mcp-js` isn't installed, so build with a local-only config without the MCP plugin (`vite.local.config.ts`, not committed); worktrees borrow `node_modules` from the main checkout via a junction.
- Baseline after the release: `npx vitest run` → 21 files, 205 tests pass; Live Cam 31/31; build passes; main bundle ≈ 0.70 MB (was 4.39 MB).
- `gh` (GitHub CLI) is not installed on the owner's PC. Pushes go through the owner's Terminal panel (Git Credential Manager sign-in). PR state is read from the public GitHub API.
- Session 2 worked in git worktrees under `.claude/worktrees/` (`redesign`, `partner-lockdown`, `nav-v2`, `combined`), so the owner's uncommitted Lens Studio files in the main checkout stay untouched.

## What session 2 shipped (details in AUDIT_CHECKLIST.md)
- Security lockdown (S1–S4c), partner verification and product visibility, private partner contact emails, private event photos, event try-on on shopper credits with server checks, credits owner-only, admin partner approval (function + `/admin/partners` page, admin checked on the page itself), function search_path pinned, Globe People lookups.
- App: bulk upload saves as Pending, Publish from the edit screen, private contact email in portals, "waiting for approval" banner, nav v2 behind a per-device flag, lazy routes with a one-time reload on stale chunks, old URLs redirect when nav v2 is on, Your Fit and UGC hidden by flags.

## Private people photos (session 2, after the release)
- Branch `claude/private-photos` (from `claude/redesign-combined`), worktree `.claude/worktrees/private-photos`. Design `docs/superpowers/specs/2026-10-27-private-photos-design.md`, plan `docs/superpowers/plans/2026-10-27-private-photos.md`, decision log `docs/superpowers/plans/2026-10-27-private-photos-ledger.md`.
- Owner said "do all fixes" (2026-10-27), then approved release steps 1–2. **Released 2026-10-27:** `20261027125623_stable_media_addresses` and `20261027125651_storage_close_open_writes` applied live (post-apply probes 38/38, advisors unchanged: no new lints, no ERRORs); functions deployed: `thenewblack-event-tryon` v52, `thenewblack-picture` v98, `thenewblack-picture-free` v100, `thenewblack-video` v102 (smoke test: preflight 200, no login 401, bad token 401; all booted); branch merged to `main`. **Folders still public** (owner phone test first). Not applied yet: `…180000`, `…171337`, `…172029`; `delete-account` not deployed.
- **Live now (2026-10-27):** `20261027125623_stable_media_addresses`, `20261027125651_storage_close_open_writes` (38/38), `20261027171126_private_server_only_folders` (video inputs, photo search, old closet folder private; dry run 10/19 → 19/19; old public link → 400), `20261027171337_closet_no_listing` (12/12; logged-out listing returns 0 files; starter items, shared items and public outfit pictures still open, 200), `20261027172029_list_user_storage_objects` (16/16, end-to-end with the real delete_user_completely 8/8 and 12/12 post-apply; keeps files still used by remaining rows: starter items in other closets, products that outlive a store, other people's outfits).
- Functions live: `thenewblack-event-tryon` v52, `thenewblack-picture` v98, `thenewblack-picture-free` v100, `thenewblack-video` v102, `delete-account` v68 (deletes the account data first, then only files nothing else uses; smoke tests 200/401/401). Advisors unchanged.
- App: `src/lib/privateMedia.ts`, AI Studio upload/gallery, Events page. Tests 231/231, Live Cam 31/31, build passes, Live Cam files untouched.
- Final review (fresh reviewer, 2026-10-27): "with fixes". Fixed: temporary links saved by older app builds (new migration `20261027125623_stable_media_addresses`, dry run 2/6 → 7/7); older builds / expired upload links (functions re-sign the caller's own photo); account deletion past 1000 files (loop). Ruled not needed: copies of shared closet items (the app already deletes copies with the original). Tests 244/244, Live Cam 31/31, deno check passes.
- **Left (needs the owner first):** 1) phone test (AI Studio picture/video/gallery/download, event try-on + Events page, Live Cam with a closet garment; top up RunPod); 2) ship an iOS build from `main` (installed builds bundle their code) and let people update; 3) then apply `20261027180000_private_people_photos` (locks ai-tryon-uploads/results/videos; marked NOT APPLIED) and phone-test again. Until then those three folders stay public by link (no uploads, overwrites or listing by others).

## Design v3 (2026-10-27)
- Neutral, Apple-style redesign of every screen: `docs/superpowers/specs/2026-10-27-azyah-design-v3.md`, mockups `docs/redesign/mockups/v3/01…06.html`. Grey/black/white; maroon only on buy buttons; five tabs (Feed, Explore, Try on, Community, Profile); Deals hidden (flag `deals`), Your Fit removed. Rollout behind a `design_v3` per-device flag (section 9).
- **Built 2026-10-28** on branch `main-64g3xr` (plan `docs/superpowers/plans/2026-10-28-design-v3-build.md`, Tasks 1–13). Off for everyone (`design_v3: false`); a device opts in with `?design=v3` (remembered) and leaves with `?design=v2`. v3 also turns on the five-tab bar.
- Done: tokens/fonts/base components (`src/styles/design-v3.css`, `v3:` Tailwind variant, `v3Defaults` so a caller's own classes win), five-tab bar, Deals hidden (both looks), Explore, Feed + swipe card, Try on as a full page (`AiStudioModal presentation="page"`), Community (Posts tab), Profile (wordmark, grouped rows; Analyze closet in My closet's menu), bag grouped by seller (`cartGroups.ts`), Premium rows without UGC/Height-Fit (both looks; also the Go Premium pop-up and Settings), welcome screen, sweep (StatusLabel in portals/admin, maroon Shop buttons, sign-up start, 404, style quiz no longer covered by the bar).
- Checks: `npx vitest run` 30 files / 274 tests; Live Cam 31/31; type check no new errors; build passes; no changes under live-cam, supabase/functions, workers. Switch off = pixel-identical to `main` except the intended removals (Deals tab, Premium UGC/Height rows).
- Not in this build (see the plan's Deferred table): Live Cam running layout, Try on item tray, dark mode, Community Following, Settings regrouping (and the FAQ move), kiosk, desktop sidebar shell (spec 5), Basic "Get more try-ons" button (7.6). Partner portals were checked by code only (screenshots need a brand/store login).
- Screenshots were taken with faked Supabase responses (the cloud sandbox can't reach Supabase), so real data still needs the owner's phone test with `?design=v3`.

## Next step
1. Owner phone test of the live site (AUDIT_CHECKLIST §9). Top up RunPod first if Try On / Live Cam is part of it.
1b. Private photos release (above).
2. ~~Kiosk engine decision~~: Live Cam only (decided 2026-10-27).
3. Phase 3 (Discover search/modes) per `IMPLEMENTATION_PLAN.md`, then Phase 4 (real Try On screen), Phase 5 (Partner Workspace + events + kiosk), Phase 6 (cleanup). Turning nav v2 on for everyone is a one-line flag change (`nav_v2` in `src/lib/features.ts`) once the owner is happy with it.

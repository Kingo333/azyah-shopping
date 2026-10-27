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
- **Still open:** kiosk engine. [Recommended: Live Cam (JoyAI), AR as fallback; ≈ $12.60 per 8-hour day per stand on an RTX 5090.] See `KIOSK_MVP.md`.
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

## Next step
1. Owner phone test of the live site (AUDIT_CHECKLIST §9). Top up RunPod first if Try On / Live Cam is part of it.
2. Kiosk engine decision.
3. Phase 3 (Discover search/modes) per `IMPLEMENTATION_PLAN.md`, then Phase 4 (real Try On screen), Phase 5 (Partner Workspace + events + kiosk), Phase 6 (cleanup). Turning nav v2 on for everyone is a one-line flag change (`nav_v2` in `src/lib/features.ts`) once the owner is happy with it.

# Session State

_Last updated: 2026-10-27 (session 2 end). **Start with `docs/redesign/AUDIT_CHECKLIST.md`**: every item, its status and what's left._

## Deployed / live
- App `main` at `228dcdf` (Live Cam JoyAI full-size frames, PR #2). Vercel auto-deploys `main`.
- Supabase (`klwolsopucgswhtdlsps`, org `odzvviqburgmslcipzfh`): `block_client_premium_self_grant` applied. **`lock_down_privileged_functions` applied 2026-10-26 (version `20261026170939`, owner approved).** `live_cam_sessions_tier` **not** applied (no tier columns on `live_cam_sessions`). `live-cam-session-start` live at v38 (old, no tier parsing). No Supabase branches exist.
  - Post-apply: probes 64/64 pass (rollback mode), 0 test data left, 0 admin rows in `user_roles`.
  - Advisors after apply: anon-executable SECURITY DEFINER 173 → 155, authenticated 173 → 157, no ERROR-level lints. Remaining: 14 mutable search_path, leaked-password protection off, Postgres patch pending, 2 RLS-no-policy (INFO). `redeem_points_for_credits` and `deduct_wardrobe_credit` stay authenticated on purpose (they now check `auth.uid()`). Trigger functions (`handle_new_user` etc.) show as executable but can't be called as RPCs; tidy in Phase 3 (S5).
  - Follow-ups: watch Edge Function logs for 24 h (wardrobe enhance, bg-remove, picture try-on, delete-account); 1.3 switch `enhance-wardrobe-item` to the service client; 1.4 (S6/S7/S10); S15 `get_user_credits` for any user.
- Cloudflare Worker `fluxrt-orchestrator`: May 22 version (legacy tokens). New source not deployed.
- RunPod endpoint `hb1m4x2ngdtbou` on JoyAI (per the brief; not re-checked). Balance was negative on Oct 25: top-up needed before any Live Cam test.

## Security fix (applied)
- `supabase/migrations/20261026170939_lock_down_privileged_functions.sql` (renamed from `20261026120000` to match the live migration version, so `supabase db push` won't re-run it; it is idempotent anyway). Rollback: `supabase/rollbacks/20261026170939_lock_down_privileged_functions.rollback.sql`.
  - Session 2 adversarial review added S4b (`guard_user_credits` trigger) and S4c (`deduct_wardrobe_credit` checks).
  - Probe script: `supabase/tests/security_lockdown_probes.sql` (64 probes). On live, only run it wrapped so it rolls back (replace the final SELECT with a RAISE), never as-is.
  - Tested without a branch (owner's choice): rollback-only dry runs on live. Without fix 30/63, with fix 64/64, after real apply 64/64.

## Pending (in repo, not applied)
- `supabase/migrations/20261018090100_live_cam_sessions_tier.sql` (from earlier sessions).

## Open PRs
- [Kingo333/azyah-shopping#3](https://github.com/Kingo333/azyah-shopping/pull/3): audit docs + security migration (already applied to live directly) + probe script. Open, draft. Branch `claude/busy-hypatia-ipst1p`. Only adds files, so merging it changes nothing live.
- fluxrt-serverless #14: superseded by #15. Close with owner OK.

## Decisions waiting on the owner (recommended default in brackets)
The session-2 kickoff message left all five blank.
1. ~~Security fix~~: done (no branch; applied to live 2026-10-26).
2. Who gets Live Cam? [Any signed-in user, free time limit, more for Premium.]
3. ~~Partner verification~~: decided yes, manual approval (2026-10-26).
4. Hide cart/checkout and UGC collaborations behind flags? [Yes.]
5. Kiosk engine? [Live Cam (JoyAI), AR as fallback; ≈ $12.60 per 8-hour day per stand on an RTX 5090.]

## Skills
- Session 2: Superpowers (plugin `superpowers@claude-plugins-official` v7.0.0) and Supabase (`supabase@supabase-agent-skills` and `postgres-best-practices`, commit c9be0e9) appear in the skill list and were loaded (supabase, test-driven-development). They come from plugins, not from the setup script: `~/.claude/skills` only holds blender-toolkit and reverse-engineer-anything. Whether Superpowers v7.0.0 = commit 2ce8aa1 was not verified.
- `AZYAH_MASTER_PROMPT.md` was not attached / not found in the repo in session 2.

## Environment gotchas
- `npm ci` fails (lockfile drift). Use `npm install --legacy-peer-deps --no-package-lock --ignore-scripts`.
- `npx vite build` without `VITE_SUPABASE_PROJECT_ID` rewrites `supabase/functions/mcp/index.ts`. Revert it (`git checkout supabase/functions/mcp/index.ts`) and never commit that change.
- Baseline: `npx vitest run` → 12 files, 134 tests pass. Build passes (~48 s, main chunk 2.84 MB).
- `gh` (GitHub CLI) is not installed on the owner's PC, so the app could not subscribe to PR #3. PR state was read from the public GitHub API instead.
- Session 2 works in a git worktree at `.claude/worktrees/redesign` (branch `claude/busy-hypatia-ipst1p`), so the owner's uncommitted Lens Studio files on `main` stay untouched.

## Phase 2 (navigation shell): brainstorming in progress
- Mockups shown in chat (session 2): 4 tabs Discover / Try On / Community / Profile, always-visible bottom bar, desktop left rail; Profile without Your Fit. (A Globe-layers mockup was shown, then rejected by the owner.)
- Owner decisions: **Globe stays exactly as it works today (only its Fit tab hidden). Your Fit hidden everywhere behind a flag (no longer needed).** Live-site check in the browser pane failed (site approval refused/hidden pane); verified from code instead. Globe has no tests: add regression tests first in Phase 2. Recorded in FEATURE_DECISIONS.md and INFORMATION_ARCHITECTURE.md.
- Still open: owner's answer to "what should a first-time user see and do in the first ten seconds"; then written design (docs/superpowers/specs/) → builder check → owner approval → writing-plans.

## Partner and events review (session 2, read-only)
- `docs/redesign/PARTNER_AND_EVENTS_REVIEW.md`: brand/retailer login, adding products, events end to end, The New Black link. Nothing applied.
- Headlines: login/roles fine after the fix; any user can create a brand/retailer profile (P1); retailers can write under any brand (P2); bulk upload publishes placeholders live (P7); archived products visible (P8); event brands are free text and event items aren't real products (E1/E2); event try-on uses The New Black with no credits or checks (E3); event photos public (E4).
- Recommended: one Partner Workspace with a thin "Events & pop-ups" section; events reference real brands and products (keep all ids, so QR/AR links survive); shoppers meet events in Discover, brand pages, the Try On tray and an event page browsable without login; all try-ons through the one Try On screen.
- Owner decisions (2026-10-26): event try-ons use the **shopper's credits** (organisers pay outside the app; no sponsored allowance); **guest brands allowed**; **events browsable without login**; **partner verification = manual approval**.

## Partner and event lockdown (session 2)
- Branch `claude/partner-and-event-lockdown` (from main), worktree `.claude/worktrees/partner-lockdown`. Plan: `docs/superpowers/plans/2026-10-26-partner-and-event-lockdown.md`. No PR opened yet (`gh` not installed): open a draft from https://github.com/Kingo333/azyah-shopping/pull/new/claude/partner-and-event-lockdown
- **Migration A APPLIED 2026-10-26** (owner approved) as `20261026183904_partner_verification_and_product_access.sql`; post-apply probes 30/30, advisors unchanged, all 5 brands + 1 retailer approved. It: partner verification (existing partners approved, new ones pending), shoppers only see active non-event products from approved partners, only brand/retailer accounts create profiles, retailers can't post under another company's claimed brand. Probes 17/30 → 30/30; rollback verified identical.
- Edge Function `thenewblack-event-tryon` **v51 DEPLOYED 2026-10-26**: event running, item belongs to event, photo is caller's own, one AI credit (refund on failure), expiring link to the provider, results stored in `ai-tryon-results`. Accepts the old app request. Smoke test 200/401/401; no paid end-to-end run yet (no event is running).
- App: Events page and try-on modal use expiring links; portals show "waiting for approval". Tests 159/159, Live Cam 31/31, build passes.
- **Event media APPLIED 2026-10-26** as `20261026192808_private_event_media.sql`: four event buckets private, owner-only photo/result rules; probes 14/14 on live; old public photo links return 400. Applied before the app merge with owner OK (no event running). Until the merge, the live events page can't show old event results (no one can reach it).
- **Contact emails APPLIED 2026-10-26** as `20261026190151_private_partner_contacts.sql` (probes 17/17 on live): contact emails move to owner-only `brand_contacts` / `retailer_contacts`; public columns kept empty by a trigger (never wipes on empty); the five contact functions answer only the owner. Probes 3/17 → 17/17; rollback verified identical (needs `set constraints all immediate`, included). 1 brand has an email today. Safe to apply before the app merge (old portal just shows the email as empty until the merge).
- App (same branch): portals read/save the private email; bulk uploads save as **Pending**; edit screen has **Publish** (checks name, price, photo, category); plain status labels. Tests 177/177, Live Cam 31/31, build passes.
- Advisors after all three: anon SECURITY DEFINER 155 → 150, no new lints, no ERRORs.
- **Remaining:** owner opens the draft PR for `claude/partner-and-event-lockdown`, phone-tests the Vercel preview (portal pending/publish, settings email, events page), then merge (needs owner OK). First real event try-on after that = first paid end-to-end check.
- After A: approving a new partner = `update brands set verification_status='approved', verification_updated_at=now() where id=…` (run by the server/admin; no admin screen yet).

## Session 2, final round (2026-10-27)
- Branch `claude/nav-v2` (from main): Phase 2 built behind a per-device flag (`?nav_v2=1`), lazy routes (main bundle 4.39 → 0.70 MB), Your Fit hidden (`your_fit=false`), Globe unchanged except the Fit tab. Design + plan in `docs/superpowers/`. Tests 158/158, Live Cam 31/31, build passes. NOT merged; needs owner phone test.
- Branch `claude/partner-and-event-lockdown` got (not applied): `20261027090000_credits_owner_only_and_partner_approval.sql` (S15 + `admin_set_partner_verification`, probes 12/12), `20261027091000_pin_function_search_path.sql` (S14, 0 behaviour differences), and `/admin/partners`. Tests 177/177.
- GitHub push needs the owner to sign in again (saved login expired); nav-v2 and the last partner commits are local only until then.
- Edge Function source download (Phase 1.5) blocked: MCP `get_edge_function` errors for every function.

## Next step
Finish Phase 2 brainstorming (above), then the written design and plan.

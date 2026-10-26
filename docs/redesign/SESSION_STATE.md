# Session State

_Last updated: 2026-10-26 (session 2: security fix review, before branch test)_

## Deployed / live
- App `main` at `228dcdf` (Live Cam JoyAI full-size frames, PR #2). Vercel auto-deploys `main`.
- Supabase (`klwolsopucgswhtdlsps`, org `odzvviqburgmslcipzfh`): `block_client_premium_self_grant` applied. `live_cam_sessions_tier` **not** applied (no tier columns on `live_cam_sessions`). `live-cam-session-start` live at v38 (old, no tier parsing). No Supabase branches exist.
- Cloudflare Worker `fluxrt-orchestrator`: May 22 version (legacy tokens). New source not deployed.
- RunPod endpoint `hb1m4x2ngdtbou` on JoyAI (per the brief; not re-checked). Balance was negative on Oct 25: top-up needed before any Live Cam test.

## Pending (in repo, not applied)
- `supabase/migrations/20261026120000_lock_down_privileged_functions.sql`: **critical security fix (S1–S4c in SUPABASE_AUDIT.md)**. Never executed anywhere. Rollback: `supabase/rollbacks/20261026120000_lock_down_privileged_functions.rollback.sql`.
  - Session 2 adversarial review added S4b (`guard_user_credits` trigger: users could set their own credit amounts) and S4c (`deduct_wardrobe_credit`: negative amounts / other users).
  - Probe script: `supabase/tests/security_lockdown_probes.sql`. Not run yet.
- `supabase/migrations/20261018090100_live_cam_sessions_tier.sql` (from earlier sessions).

## Phase 1 test plan (waiting on owner OK for branch cost)
1. Create Supabase branch. Cost: **$0.01344/hour** (checked 2026-10-26 with get_cost). Plan: about 1 hour, then delete.
2. Run the probe script BEFORE the migration: attack probes should fail (proves they detect the holes).
3. Apply the migration on the branch, run the probes again: every row should pass.
4. Report → owner approves → apply to production → `get_advisors` again → delete branch.
- Caveat: a branch is rebuilt from migration history. If live functions were created outside migrations, the branch may differ; check function presence first.

## Open PRs
- [Kingo333/azyah-shopping#3](https://github.com/Kingo333/azyah-shopping/pull/3): audit docs + proposed security migration + probe script. Open, draft. Branch `claude/busy-hypatia-ipst1p`. Only adds files, so merging it changes nothing live.
- fluxrt-serverless #14: superseded by #15. Close with owner OK.

## Decisions waiting on the owner (recommended default in brackets)
The session-2 kickoff message left all five blank.
1. Test the security migration on a Supabase branch, then apply to production? [Yes. Cost above.]
2. Who gets Live Cam? [Any signed-in user, free time limit, more for Premium.]
3. Partner verification before brands/retailers publish? [Yes, manual approval.]
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

## Next step
Owner OK on branch cost → run the Phase 1 test plan above → apply to production with approval → Phase 2 (navigation shell) per IMPLEMENTATION_PLAN.md (brainstorm + mockups first).

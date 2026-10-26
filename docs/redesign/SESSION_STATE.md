# Session State

_Last updated: 2026-10-26 (end of session 1: audit)_

## Deployed / live
- App `main` at `228dcdf` (Live Cam JoyAI full-size frames, PR #2). Vercel auto-deploys `main`.
- Supabase (`klwolsopucgswhtdlsps`): `block_client_premium_self_grant` applied. `live_cam_sessions_tier` **not** applied (no tier columns on `live_cam_sessions`). `live-cam-session-start` live at v38 (old, no tier parsing).
- Cloudflare Worker `fluxrt-orchestrator`: May 22 version (legacy tokens). New source not deployed.
- RunPod endpoint `hb1m4x2ngdtbou` on JoyAI (per the brief; not re-checked). Balance was negative on Oct 25: top-up needed before any Live Cam test.

## Pending (in repo, not applied)
- `supabase/migrations/20261026120000_lock_down_privileged_functions.sql`: **critical security fix (S1–S4 in SUPABASE_AUDIT.md)**, awaiting owner approval. Never executed anywhere. Rollback: `supabase/rollbacks/20261026120000_lock_down_privileged_functions.rollback.sql`.
- `supabase/migrations/20261018090100_live_cam_sessions_tier.sql` (from earlier sessions).

## Open PRs
- [Kingo333/azyah-shopping#3](https://github.com/Kingo333/azyah-shopping/pull/3): audit docs + proposed security migration. Draft. Branch `claude/busy-hypatia-ipst1p`. Vercel preview green. No review comments. Only adds files, so merging it changes nothing live.
- fluxrt-serverless #14: superseded by #15. Close with owner OK.

## Decisions waiting on the owner (recommended default in brackets)
1. Test the security migration on a Supabase branch, then apply to production? [Yes, now. Supabase branches may cost money: confirm first.]
2. Who gets Live Cam? [Any signed-in user, free time limit, more for Premium.]
3. Partner verification before brands/retailers publish? [Yes, manual approval.]
4. Hide cart/checkout and UGC collaborations behind flags? [Yes.]
5. Kiosk engine? [Live Cam (JoyAI), AR as fallback; ≈ $12.60 per 8-hour day per stand on an RTX 5090.]

## Skills
- Session 1: Superpowers and Supabase skills were **not installed**; auto-install was blocked by the sandbox permission check. Their instructions were downloaded as plain files and followed manually.
- The owner is adding a setup script (pinned commits: `obra/superpowers@2ce8aa1`, `supabase/agent-skills@c9be0e9`) that copies both into `~/.claude/skills`. Check they appear in the skill list at the start of the next session.
- `supabase.com` does not resolve from the sandbox; use the Supabase MCP `search_docs` tool for docs.

## Environment gotchas
- `npm ci` fails (lockfile drift). Use `npm install --legacy-peer-deps --no-package-lock --ignore-scripts`.
- `npx vite build` without `VITE_SUPABASE_PROJECT_ID` rewrites `supabase/functions/mcp/index.ts`. Revert it (`git checkout supabase/functions/mcp/index.ts`) and never commit that change.
- Baseline: `npx vitest run` → 12 files, 134 tests pass. Build passes (~48 s, main chunk 2.84 MB).

## Next step
Get the owner's answers to the decisions above → test the security migration on a Supabase branch → apply to production with approval → Phase 2 (navigation shell) per IMPLEMENTATION_PLAN.md.

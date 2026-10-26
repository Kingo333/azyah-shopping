# Session State

_Last updated: 2026-10-26_

## Deployed / live
- App `main` at `228dcdf` (Live Cam JoyAI full-size frames, PR #2).
- Supabase: `block_client_premium_self_grant` applied. `live_cam_sessions_tier` **not** applied. `live-cam-session-start` live at v38 (old, no tier parsing).
- Cloudflare Worker `fluxrt-orchestrator`: May 22 version (legacy tokens). New source not deployed.
- RunPod endpoint `hb1m4x2ngdtbou` on JoyAI (per brief; not re-checked this session). Balance was negative on Oct 25.

## Pending (in repo, not applied)
- `supabase/migrations/20261026120000_lock_down_privileged_functions.sql` — **critical security fix (S1–S4)**, awaiting approval. Rollback: `supabase/rollbacks/20261026120000_lock_down_privileged_functions.rollback.sql`.
- `supabase/migrations/20261018090100_live_cam_sessions_tier.sql` (from earlier).

## Open PRs
- azyah-shopping: redesign audit + security migration (branch `claude/busy-hypatia-ipst1p`, draft).
- fluxrt-serverless #14: superseded by #15, close with owner OK.

## Skills
- Superpowers and Supabase agent skills are **not installed** in this environment; auto-install was blocked by the sandbox's permission check. Their instructions were downloaded and read as plain files (`obra/superpowers`, `supabase/agent-skills`) and followed manually.
- `supabase.com` does not resolve from the sandbox; Supabase docs were read through the MCP `search_docs` tool.

## Next step
Owner reviews the audit and answers the decisions in the PR summary → apply the security migration on a Supabase branch → Phase 2 (navigation shell).

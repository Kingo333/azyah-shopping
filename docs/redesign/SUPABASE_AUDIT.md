# Supabase Audit

Project: "Fashion World Final" (`klwolsopucgswhtdlsps`, ap-south-1, Postgres 17.4.1.064). Audit date: 2026-10-26.
Method: Supabase security advisors, read-only catalog queries (`pg_proc`, `pg_policies`, grants, triggers), one read-only `set local role anon` check, and code search for callers. **No data or schema was changed.**

Guidance used: the Supabase agent skill's security checklist (user_metadata never for authorization; SECURITY DEFINER in `public` is a public API; UPDATE policies need WITH CHECK; views bypass RLS) and the Supabase docs for advisor lints 0028/0029. The live changelog (`supabase.com/changelog.md`) could not be fetched: `supabase.com` does not resolve from this sandbox. Docs were read through the Supabase MCP `search_docs` tool instead.

## Critical findings (fix before anything else)

### S1. Anyone can wipe any user's data — CRITICAL, confirmed
- `public.delete_user_completely(uuid)`, `(text)`, `(text, boolean)` are `SECURITY DEFINER`, owned by `postgres`, **executable by `anon` and `authenticated`**, and contain **no caller check** (no `auth.uid()`, no role check; verified by reading the bodies).
- Reachable at `POST /rest/v1/rpc/delete_user_completely` with only the public app key (which ships in the web bundle).
- Same pattern (no caller check, anon-executable): `detect_orphaned_users`, `copy_default_wardrobe_items`, `cleanup_*` (5), `delete_expired_ai_assets`, `deduct_ai_studio_credit`, `deduct_beauty_credit`, `deduct_user_credit`, `deduct_video_credit`, `deduct_wardrobe_credit`.
- Legitimate callers are only Edge Functions using the service-role client (`delete-account`, `admin-delete-user`, `thenewblack-*`, `beauty-consultation`), except `deduct_wardrobe_credit` (called with the user's JWT by `enhance-wardrobe-item`) and `detect_orphaned_users` (unused admin component).

### S2. Any signed-in user can make themselves admin — CRITICAL, confirmed
- RLS policy `users_can_update_own_data_only` lets a user UPDATE their own `public.users` row with no column restriction; `has_column_privilege('authenticated','public.users','role','UPDATE')` = true; no trigger guards `role`.
- `get_current_user_role()` reads `public.users.role`. 16 functions trust it, including `admin_get_user_email`, `admin_access_user_data`, `admin_access_payment_data`, `admin_get_subscription_details`.
- Result: `update users set role='admin' where id = me` → read any user's email, profile, payment and subscription data.
- (Frontend route guards use `user_roles`, which users cannot write — good, but that is UI only.)

### S3. Role comes from user-editable metadata — HIGH, confirmed
- Signup triggers `handle_new_user` and `handle_new_user_role` take `raw_user_meta_data->>'role'` and **accept `'admin'`**.
- `sync_user_role_with_metadata` (on `auth.users` UPDATE) copies the metadata role into `public.users.role` whenever metadata changes; users can change their own metadata with `supabase.auth.updateUser({ data: { role } })`.
- Brand/retailer self-selection at signup is a product feature, but there is **no verification** of businesses (see P1).

### S4. Free credits for anyone — HIGH, confirmed
- `redeem_points_for_credits(target_user_id, credit_type, credit_amount, points_cost)` trusts all four client values and has no `auth.uid()` check. Anyone can grant any user any number of AI/video credits (real provider cost). *(Session 2 correction: a negative `points_cost` does not work, because `points_ledger` has `CHECK (amount > 0)`. The fake-package attack does.)*

### S4b. Users can edit their own credits row — HIGH, found in session 2
- RLS policies "Users can insert/update their own credits" on `user_credits` have no column limits and no guard trigger. A signed-in user can `update user_credits set ai_studio_credits = 999` on their own row, or set `last_reset_date` in the past so the next `get_user_credits` call refills all daily credits.
- The policies can't simply be removed: `bg-remove` writes `user_credits` (insert default row, bump `bg_removals_used_monthly`, monthly reset) with the user's login.
- Fix (added to the same migration): `guard_user_credits` trigger. Credit amounts are server-only; `last_reset_date` can only be set to today; the bg-removal counter can go up, and back to 0 only in a new month; client inserts must be a default row.

### S4c. Negative wardrobe "deduction" — HIGH, found in session 2
- `deduct_wardrobe_credit(target_user_id, amount)` stays callable by signed-in users (enhance-wardrobe-item uses the user's login), but accepts any `target_user_id` and a negative `amount`: deducting −100 adds 100 credits.
- Fix (added to the same migration): positive amounts only; users may only deduct their own credits; service role may deduct for anyone.

**Tests:** `supabase/tests/security_lockdown_probes.sql` (about 45 probes; run on a branch only).

**Proposed fix for S1–S4:** `supabase/migrations/20261026120000_lock_down_privileged_functions.sql` (rollback in `supabase/rollbacks/`). **Not applied.** It:
1. Revokes EXECUTE from `public, anon, authenticated` on the service-only functions (keeps `service_role`). `deduct_wardrobe_credit` stays callable by `authenticated` until `enhance-wardrobe-item` switches to the service client.
2. Adds a `guard_users_role` trigger (same pattern as the live `guard_profile_premium_fields`) so only the server can change `users.role`; clients may only insert their own row as `shopper`.
3. Stops accepting `admin` from metadata at signup and stops syncing role from metadata afterwards.
4. Rewrites `redeem_points_for_credits` to require `target_user_id = auth.uid()`, accept only the three packages the app sells (`CreditRedemptionCard.tsx`), and lock per user to prevent double-spend. Same signature, so the app keeps working.

It does not touch any Live Cam table, function or Edge Function (checked by search).

**How to verify before/after (proposed test plan, needs approval to run):** apply on a Supabase **branch** first, then as `anon` and as a test `authenticated` user: call each revoked RPC (expect permission denied), `update users set role='admin'` (expect 42501), sign up with `role: admin` metadata (expect shopper), redeem with a fake package or another user's id (expect error), redeem a real package (expect success). Then run `get_advisors` again; the 0028/0029 counts should drop.

## High / medium findings

| ID | Finding | Evidence | Proposed action |
|---|---|---|---|
| S5 | 173 SECURITY DEFINER functions are executable by `anon` | advisors lint 0028 (173) and 0029 (173) | Phase 3: classify each (public read RPC / per-user / service-only), revoke by default (`alter default privileges ... revoke execute`), re-grant explicitly. Many `admin_*` and `validate_*` functions are dead code. |
| S6 | Archived products are publicly readable | As `anon`: 116 active + **19 archived** visible. The permissive policy "Event products only visible in event context" (role `public`) ORs with `products_secure_anonymous_block` (`false`), defeating it | Make the event policy also require `status='active'` for non-owners |
| S7 | Personal photos in **public** buckets | Public: `event-user-photos`, `ai-tryon-uploads`, `ai-tryon-results`, `ai-tryon-videos`, `tnb-video-inputs`, `wardrobe`, `wardrobe-items`, `event-tryon-renders/results` | Make person-photo buckets private and serve signed URLs; essential before a kiosk. `live-cam-snapshots`, `tryon-persons` are already private. |
| S8 | 41 deployed Edge Functions have no source in git; many have `verify_jwt: false` | `list_edge_functions` vs `supabase/functions/` | Download sources into the repo (read-only) and review; retire unused ones with approval. Payment functions (`payment-webhook`, `ziina-*`, `get-refund`) are the priority. |
| S9 | No partner verification | `brands` / `retailers` INSERT policies only check `owner_user_id = auth.uid()`; any shopper can create a brand row | Add `verification_status` (pending/approved) managed by server; only approved partners publish to Discover or kiosks |
| S10 | UPDATE policies without WITH CHECK | `posts` "Users can update their own posts", `brands` "Brand owners can manage their brands", `retailers` "... manage their retailers", `live_cam_sessions_owner_update`, `event_brands`/`event_brand_products`/`retail_events` ALL policies | Add matching WITH CHECK so rows can't be reassigned to another owner |
| S11 | Brands cannot manage their own event items | `event_brand_products` writable only by the event's retailer | Needed for the kiosk brand workflow (KIOSK_MVP.md) |
| S12 | Leaked-password protection disabled | advisor | Turn on in Auth settings (dashboard toggle; owner action) |
| S13 | Postgres has security patches pending | advisor `vulnerable_postgres_version` (17.4.1.064) | Schedule upgrade (owner action, brief downtime) |
| S14 | 14 functions with mutable `search_path` | advisor | `alter function ... set search_path = ''` |
| S15 | `get_user_credits(target_user_id)` callable for any user (reads premium flag, creates/resets rows) | function body | Require `auth.uid()` or service role |
| S16 | `/debug/health` page is public | `src/App.tsx` | Dev-only |
| S17 | `deals_cache`, `deals_rate_limit` RLS on, no policies | advisor (INFO) | Fine if only service role uses them; document |

## Auth journeys (summary)

| Journey | Current implementation | Issue |
|---|---|---|
| Guest browsing | localStorage `guest mode` + allow-list in `ProtectedRoute` | Products are readable by anon anyway; make discovery routes public and gate actions instead |
| Shopper signup/login | `onboarding/SignUp.tsx`, `AuthContext.signUp` sets metadata role + username | Role from metadata (S3) |
| Brand / retailer signup | Same form with role choice | No verification (S9) |
| Email verification / reset | `/auth/callback`, `/reset-password*`, `send-password-reset` (source not in repo) | Keep URLs; review function |
| Session restore / logout | `AuthContext`, `useSessionMonitor`, role cache in sessionStorage | Clear role cache on role change |
| Role redirect | `src/lib/rbac.ts` `getRedirectRoute` | UI only (fine) |
| Account deletion | `delete-account` → `delete_user_completely` (service role) | Storage cleanup to verify; S1 |
| Native deep links | `com.azyah.style://` via `useDeepLinkHandler.ts` | Keep `/auth/callback`, `/share/*` |

`user_metadata.role` is read in 17 frontend files for UI decisions (nav visibility, Live Cam tab, portal redirects). That is acceptable for display only, but these should read the same source as the route guard (`user_roles`) to avoid mismatches.

## What is already good
- RLS is enabled on every public table (~100 tables).
- `user_roles` is not client-writable; the route guard uses it.
- Premium self-grant is blocked (`guard_profile_premium_fields`, live).
- Share pages use slug RPCs (`get_public_outfit_by_slug`), not raw table reads.

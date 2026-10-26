# Partner and Event Lockdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close three live holes: archived products shown to shoppers; anyone creating brand or retailer profiles and publishing (or posting under someone else's brand); free, unchecked event try-ons with public shopper photos.

**Architecture:** Two SQL migrations, A (products, brands, retailers, partner verification) and B (private event-photo buckets and owner-only storage policies), each tested with rollback-only probe scripts on live before any apply. The event try-on Edge Function gains server-side checks and credit deduction, with its rules in a pure, unit-tested helper. The events page and try-on modal switch to expiring links.

**Tech Stack:** Supabase Postgres 17 (RLS, triggers), Supabase Storage, Deno Edge Function, React + supabase-js, Vitest.

**Spec:** `docs/redesign/PARTNER_AND_EVENTS_REVIEW.md` (branch `claude/busy-hypatia-ipst1p`), findings P1, P2, P4, P6, P8, E3, E4 and owner decisions §5.

## As built (2026-10-26)
- Migration A: probes 17/30 without, **30/30 with**; rollback restores all 20 policies exactly (fingerprint match). Live verified unchanged.
- Migration B: probes 6/14 without, **14/14 with**; rollback restores all 123 storage policies and bucket flags exactly.
- Change from the plan: event try-on **results** are stored in `ai-tryon-results` (same as photo try-on), so saved results keep working in the AI Studio gallery, which shows saved links directly. Shopper **photos** are fully private. Making all try-on results private is a separate AI Studio change (needs the owner's phone test). `resultPath` is now `${userId}/event_${eventId}_${productId}_${now}.png`.
- Not in scope (from the review): bulk upload as drafts (P7), contact-email privacy (P3).

## Global Constraints
- Owner decisions: event try-ons use the **shopper's own AI credits** (same rules as `thenewblack-picture`); partner verification = **manual approval**; guest brands allowed (not built here); events browsable without login (not built here).
- Nothing is applied to the live database, deployed, or merged without the owner's explicit OK. Probes on live run only inside one transaction that ends with a RAISE.
- Existing partners keep today's visibility: backfill every existing brand and retailer to `approved`.
- Keep every existing id and URL (`/events`, `/ar/:eventId/:brandId?productId=`). No change to Live Cam files, its Edge Functions, the Worker or RunPod. `npx vitest run src/components/ai-studio/live-cam` stays green.
- Don't commit `supabase/functions/mcp/index.ts` changes or secrets.
- Rollout order (so nothing breaks in between): migration A (any time) → deploy the Edge Function (accepts the old and new client) → merge the frontend (owner phone test, since it touches a try-on screen) → migration B.

## Review Focus
1. A brand that signs up after migration A is **pending**: its products are hidden from shoppers but visible to the brand itself. Probe: owner sees own product of a pending brand; shopper doesn't.
2. Retailer imports for **unowned catalog brands** (ASOS, 126 products) keep working and stay visible. Probe: retailer inserts under an unowned brand; anon sees the existing ASOS count unchanged.
3. Old app versions still calling the event try-on with a public `person_image_url` during rollout. Unit test: a public-URL input for the caller's own folder resolves to the path; someone else's folder resolves to null.
4. A result stored as a raw provider URL (the old fallback) must still display. Unit test: `http…` paths pass through `signEventMedia` unchanged.
5. A failed provider call must give the credit back. Covered by the function's refund branch; checked in review (no unit seam), same pattern as `thenewblack-picture`.

---

### Task 1: Probes for migration A (red first)
**Files:**
- Create: `supabase/tests/partner_products_probes.sql` (same `pg_temp.probe` / `check_fact` helpers and rollback-mode note as `security_lockdown_probes.sql` on PR #3)

**Interfaces:**
- Produces: probe names used by Task 2's green run.

- [ ] **Step 1: Write probes.** Accounts: shopper S, brand-role B, retailer-role R, second brand-role B2 (has a claimed brand). Assertions:
  - Visibility: anon and S see an active product of an approved brand (ok); don't see an archived product (deny); don't see a product of a pending brand (deny); owner B sees its own archived and its own pending-brand product (ok); anon-visible count of existing products = count of active non-event products (116 today).
  - Profiles: S inserts a brand (deny), B inserts a brand (ok, `verification_status` = pending), R inserts a brand / house label (ok), S inserts a retailer (deny), B inserts a retailer (deny), R inserts a retailer (ok); B sets own `verification_status = 'approved'` (deny); B edits own brand bio (ok).
  - Product writes: B inserts own product (ok); B inserts with R's `retailer_id` (deny); R inserts with own `retailer_id` under an unowned brand (ok), under own house brand (ok), under B2's claimed brand (deny); R updates own store product's `brand_id` to B2's brand (deny); S inserts any product (deny).
- [ ] **Step 2: Run on live in rollback mode without the migration.** Expected: the "deny" profile/visibility/write probes FAIL (holes confirmed), the "ok" flows pass.

### Task 2: Migration A (green)
**Files:**
- Create: `supabase/migrations/<live version>_partner_verification_and_product_access.sql` (rename to the version live records when applied)
- Create: `supabase/rollbacks/<same>_partner_verification_and_product_access.rollback.sql`

**Interfaces:**
- Produces: `brands.verification_status`, `retailers.verification_status` text, NOT NULL, default `'pending'`, check in (`pending`,`approved`,`rejected`); `verification_updated_at timestamptz`. Trigger function `public.guard_partner_verification()` (clients may only insert `pending` and never change it). Policies named `products_public_read`, `products_brand_owner_all`, `products_retailer_owner_all`, `brands_public_read`, `brands_owner_insert`, `brands_owner_update`, `brands_owner_delete`, and the same three plus read for `retailers`.

- [ ] **Step 1: Write the migration.**
  - Add columns; backfill all existing rows to `approved`.
  - `products`: drop the three SELECT policies and the eight brand/retailer write policies; create `products_public_read` FOR SELECT TO anon, authenticated USING (`status = 'active'` AND NOT `is_event_only` AND brand is null-or-approved AND retailer is null-or-approved). Create `products_brand_owner_all` FOR ALL TO authenticated: USING brand owned by `(select auth.uid())`; WITH CHECK the same AND (`retailer_id` null OR retailer owned by caller). Create `products_retailer_owner_all` FOR ALL TO authenticated: USING retailer owned; WITH CHECK the same AND (`brand_id` null OR brand has no owner OR brand owned by caller).
  - `brands` / `retailers`: drop the duplicate ALL/INSERT policies; keep public read (`USING (true)`); owner insert requires `user_roles` role in (`brand`,`retailer`) for brands and `retailer` for retailers; owner update USING + WITH CHECK; owner delete.
  - Guard trigger on both tables (BEFORE INSERT OR UPDATE), same `current_user in ('anon','authenticated')` pattern as `guard_users_role`.
- [ ] **Step 2: Run migration + Task 1 probes on live in rollback mode.** Expected: every probe passes; live unchanged afterwards (0 probe users, no new columns).
- [ ] **Step 3: Write the rollback** (restores the dropped policies verbatim from `pg_policies`, drops trigger, function and columns).
- [ ] **Step 4: Commit.**

### Task 3: Event try-on rules as a pure helper
**Files:**
- Create: `supabase/functions/thenewblack-event-tryon/rules.ts` (no imports)
- Test: `supabase/functions/thenewblack-event-tryon/rules.test.ts`

**Interfaces:**
- Produces:
  - `resolvePersonPath(input: { person_image_path?: string; person_image_url?: string }, eventId: string, userId: string, supabaseUrl: string): string | null`: returns a path in `event-user-photos` only if it starts with `${eventId}/${userId}/`; accepts a bare path, a `/storage/v1/object/public/event-user-photos/…` URL or a `/object/sign/event-user-photos/…?token=` URL from this project; rejects `..`, other hosts and other folders.
  - `isEventOpen(event: { status: string; event_date: string | null; end_date: string | null }, todayIso: string): boolean`: `status === 'active'` and `event_date <= today <= (end_date ?? event_date)`; a missing `event_date` counts as open from the start.
  - `resultPath(eventId: string, userId: string, productId: string, now: number): string` → `${eventId}/${userId}/${productId}_${now}.png`.
- [ ] **Step 1: Write failing tests:** own bare path → path; own public URL → path; other user's folder → null; other event → null; `../` → null; other host → null; both inputs missing → null; event active today → true; ended yesterday → false; status draft → false; single-day event today → true; `resultPath` format.
- [ ] **Step 2: Run `npx vitest run supabase/functions/thenewblack-event-tryon`**, expect FAIL (module missing).
- [ ] **Step 3: Implement `rules.ts`.**
- [ ] **Step 4: Run again**, expect PASS. **Step 5: Commit.**

### Task 4: Event try-on function uses the rules and credits
**Files:**
- Modify: `supabase/functions/thenewblack-event-tryon/index.ts`

**Interfaces:**
- Consumes: Task 3 helpers.
- Request body accepts `{ event_id, product_id, person_image_path? , person_image_url? }` (old clients send the URL). Response unchanged: `{ ok, result_url, job_id }`, where `result_url` is now a signed URL (1 hour).

- [ ] **Step 1: Change the flow:** auth (unchanged) → load `retail_events` row, `isEventOpen` else 403 "This event isn't running" → load item with its `event_brands.event_id`; mismatch → 404 → `resolvePersonPath`, null → 403 → credits exactly as `thenewblack-picture` (`get_user_credits`, `ai_studio_credits <= 0` → 402 "No picture credits remaining", `deduct_ai_studio_credit`, refund on API error or invalid result) → signed URL (600 s) for the person photo sent to the provider → store result at `resultPath(...)` → return signed result URL. Remove `console.log` lines that print photo URLs.
- [ ] **Step 2: Type-check what can be checked locally** (`npx tsc --noEmit` doesn't cover Deno; review by reading), then commit. Deploying needs the owner's OK.

### Task 5: Expiring links on the events page and try-on modal
**Files:**
- Create: `src/lib/eventMedia.ts`; Test: `src/lib/eventMedia.test.ts`
- Modify: `src/pages/Events.tsx` (results grid ~line 381, `handleViewPhoto` ~line 236), `src/components/EventTryOnModal.tsx` (`startTryOn` ~line 186)

**Interfaces:**
- Produces: `signEventMedia(storage: { from(bucket: string): { createSignedUrls(paths: string[], expiresIn: number): Promise<{ data: { path: string | null; signedUrl: string }[] | null; error: unknown }> } }, bucket: string, paths: string[], expiresIn?: number): Promise<Record<string, string>>`, default 3600 s; `http(s)` paths pass through untouched; failures leave the path out.
- [ ] **Step 1: Failing tests:** passes http URLs through; maps storage paths to signed URLs; ignores entries with null path; returns `{}` on error; doesn't call storage when every path is http.
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Implement.** **Step 4: Run, expect PASS.**
- [ ] **Step 5: Use it:** Events results grid shows signed URLs (computed when results load); `handleViewPhoto` uses a signed URL; the modal sends `person_image_path` instead of a public URL.
- [ ] **Step 6:** Small banner on brand and retailer portals when `verification_status = 'pending'`: "Your account is waiting for approval. Shoppers will see your products once it's approved."
- [ ] **Step 7: Full suite + build; commit.**

### Task 6: Migration B: private event photos (probes first)
**Files:**
- Create: `supabase/tests/event_media_probes.sql`; `supabase/migrations/<version>_private_event_media.sql` + rollback

- [ ] **Step 1: Probes:** buckets `event-user-photos`, `event-tryon-results`, `event-tryon-renders`, `event-photos` not public; user U reads own photo object (ok), other user reads it (deny), anon reads it (deny); U uploads into `${event}/${U}/` (ok) and into `${event}/${other}/` (deny); U deletes own photo (ok); U reads own result (row in `event_tryon_jobs` with that `output_path`, ok); another user with a job in the same event can't read it (deny, today they can).
- [ ] **Step 2: Red run** on live (rollback mode). **Step 3: Migration:** set the four buckets private; replace event-photo and result storage policies with owner-only ones (photos: `(storage.foldername(name))[2] = auth.uid()::text`; results: `exists (select 1 from event_tryon_jobs j where j.output_path = name and j.user_id = auth.uid())`); drop `auth.role()` policies in favour of `TO service_role`. **Step 4: Green run.** **Step 5: Commit.** Apply only after Task 5 is live.

### Task 7: Verification and handoff
- [ ] Full `npx vitest run` and `npx vite build` (revert `supabase/functions/mcp/index.ts` if touched), `npx vitest run src/components/ai-studio/live-cam`.
- [ ] Open a draft PR. Report probe results. Ask the owner, one at a time: apply A → deploy the function → phone test + merge → apply B → `get_advisors`.

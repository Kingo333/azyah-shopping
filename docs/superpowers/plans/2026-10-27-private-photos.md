# Private People Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** People's photos (AI Studio uploads, results, videos, video inputs, photo search, old closet folder) open only for their owner; open write holes closed; no folder can be listed by strangers; deleting an account deletes the person's photos. Live Cam and community sharing unchanged.

**Architecture:** Storage rules first (owner-only read/write rules added while folders are still public), then the app and four try-on functions switch to temporary links (signed URLs work on public and private folders alike), then the people-photo folders are made private. The database keeps permanent addresses; the app signs them at display time. Closet and outfit folders stay open-by-link (community content, Live Cam dependency) and only lose "anyone can list".

**Tech Stack:** Supabase Storage RLS (SQL migrations + rollback scripts + rollback-only probes), Deno Edge Functions, React/Vite, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-27-private-photos-design.md`

## Global Constraints
- Live Cam untouched: no edits to `src/components/ai-studio/live-cam/**`, `supabase/functions/live-cam-*`, the Worker or RunPod. `npx vitest run src/components/ai-studio/live-cam` stays 31/31.
- Install: `npm install --legacy-peer-deps --no-package-lock --ignore-scripts`. After any build, `git checkout supabase/functions/mcp/index.ts`; never commit it.
- Live database: probes run only rollback-only (one `execute_sql` call, final DO block RAISEs results). Each migration is applied only after the owner says yes; then rename the file to the version live records.
- Each Edge Function deploy is asked for separately. Never print or commit secrets.
- Link lifetimes: own upload 3600 s; picture input sent to The New Black 3600 s; video input sent to The New Black 86400 s; results returned to the app 86400 s; gallery/Events page re-sign 3600 s on each load.
- Never save a temporary link in the database; store the permanent address (`.../storage/v1/object/public/<bucket>/<path>`).
- Keep `docs/redesign/SESSION_STATE.md` and `AUDIT_CHECKLIST.md` updated after every task.

## Review Focus
1. Stored addresses use the `api.azyahstyle.com` proxy host, or have URL-encoded paths → the parser accepts both hosts and decodes path segments (test in Task 2).
2. A temporary link handed to `saveAsset` → saved as the permanent address (test in Task 3).
3. A video job outlives its input link → input link 86400 s, every `check` returns a fresh link (Task 5).
4. `name` inside the product-outfits rule's subquery resolves to `products.name`, not the file name → qualify as `objects.name` (probe in Task 1).
5. AI Studio's "replace file" upload (`upsert: true`) needs read + insert + update for the owner → owner read rule exists before the broad one goes (probe in Tasks 1 and 6).

---

### Task 1: Close the open doors (migration A)

**Files:**
- Create: `supabase/tests/storage_write_probes.sql`
- Create: `supabase/migrations/<version>_storage_close_open_writes.sql`
- Create: `supabase/rollbacks/<version>_storage_close_open_writes.rollback.sql`

**Interfaces:**
- Produces: owner read rules `ai_tryon_uploads_owner_read`, `ai_tryon_results_owner_read`, `ai_tryon_videos_owner_read`, `tnb_video_inputs_owner_read`, `search_images_owner_read`, `saved_outfits_owner_read` (all `to authenticated using (bucket_id = '<bucket>' and (storage.foldername(name))[1] = auth.uid()::text)`). Tasks 6–7 rely on them.

- [ ] **Step 1: Write the probes** using the `pg_temp` impersonation pattern from `supabase/tests/event_media_probes.sql`. Users: owner O, other user X, anon; a brand owner B with product P, another brand owner B2. Probes (expected after the fix):
  - anon insert into `ai-tryon-results` `O/x.png` → denied; X update of O's `ai-tryon-results` object → 0 rows; same for `ai-tryon-videos`.
  - anon insert / delete in `tnb-video-inputs` → denied / 0 rows.
  - anon insert into `optimized-images` → denied.
  - X insert into `ai-tryon-uploads` at `O/person_1.jpg` → denied; O insert at `O/person_1.jpg` → allowed; O select own → 1 row (upsert path).
  - B insert `product-outfits` `<P>-1.jpg` → allowed; B2 insert / update / delete of `<P>-1.jpg` → denied / 0 / 0; B2 insert `<P2 of B2>-1.jpg` → allowed.
  - `service_role` insert into `ai-tryon-results` → allowed.
  - owner read rules exist for the six buckets above (check `pg_policies`).
- [ ] **Step 2: Run the probes rollback-only on live, expect FAIL** on the write-hole rows (today anyone can write).
- [ ] **Step 3: Write the migration.** Drop: `"Allow insert to ai-tryon-results"`, `"Allow update to ai-tryon-results"`, `"Allow insert to ai-tryon-videos"`, `"Allow update to ai-tryon-videos"`, `"Service role can upload video inputs"`, `"Service role can delete video inputs"`, `"Service can upload optimized images"`, `"Service can update optimized images"`, `"Authenticated users can upload to ai-tryon-uploads"`, `"Brand owners can upload product outfits"`, `"Brand owners can update product outfits"`, `"Brand owners can delete product outfits"`. Create `ai_tryon_uploads_owner_insert` (own folder), the six owner read rules, and `product_outfits_owner_insert/update/delete` with:
  ```sql
  exists (select 1 from public.products p
          left join public.brands b on b.id = p.brand_id
          left join public.retailers r on r.id = p.retailer_id
          where p.id::text = left(objects.name, 36)
            and (b.owner_user_id = auth.uid() or r.owner_user_id = auth.uid()))
  ```
  (update: same expression in `using` and `with check`). Rollback script recreates the dropped rules exactly as listed in `pg_policies` today and drops the new ones; verify with the md5 fingerprint check used in earlier rollbacks.
- [ ] **Step 4: Run the migration + probes rollback-only on live, expect all PASS;** run the rollback inside the same transaction and confirm fingerprints match today's.
- [ ] **Step 5: Commit** (`feat(storage): close open writes, add owner read rules`). **Ask the owner** before applying; after apply, re-run probes rollback-only and `get_advisors`.

### Task 2: Temporary-link helper

**Files:**
- Create: `src/lib/privateMedia.ts`, `src/lib/privateMedia.test.ts`

**Interfaces:**
- Produces:
  - `PRIVATE_MEDIA_BUCKETS: ReadonlySet<string>` = the six folders locked in Task 6 plus `event-user-photos`, `event-tryon-results`, `event-tryon-renders`, `event-photos`, `live-cam-snapshots`.
  - `parseStorageRef(url: string): { bucket: string; path: string } | null` — `https://<any host>/storage/v1/object/(public|sign|authenticated)/<bucket>/<path>[?…]`, path segments decoded.
  - `stableStorageUrl(url: string): string` — signed or authenticated form → same host's `/object/public/<bucket>/<path>`; anything else unchanged.
  - `signPrivateMedia(storage: StorageLike, urls: string[], expiresIn?: number): Promise<Record<string, string>>` — one `createSignedUrls` call per private bucket; non-private or external URLs map to themselves; on error the original stays.

- [ ] **Step 1: Write failing tests:** `parseStorageRef` for a direct public URL, a proxy (`api.azyahstyle.com`) URL, a signed URL with `?token=`, an encoded path (`a%20b.png` → `a b.png`), an external URL (`null`); `stableStorageUrl` turns a signed link into the public form and leaves an ASOS URL alone; `signPrivateMedia` signs only private-bucket URLs, batches two URLs from one bucket into one call, passes through `product-images` and external URLs, keeps originals when signing errors.
- [ ] **Step 2: Run** `npx vitest run src/lib/privateMedia.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement** in `src/lib/privateMedia.ts` (reuse the `StorageLike` shape from `src/lib/eventMedia.ts`).
- [ ] **Step 4: Run** the same command → PASS.
- [ ] **Step 5: Commit** (`feat(media): temporary links for private photos`).

### Task 3: AI Studio uploads and gallery use temporary links

**Files:**
- Modify: `src/hooks/useTheNewBlack.ts` (`uploadImage`), `src/hooks/useAiAssets.ts` (`fetchAssets`, `saveAsset`), `src/components/AiTryOnModal.tsx:336-342` (asset insert)
- Test: `src/hooks/aiAssetUrls.test.ts` + `src/hooks/aiAssetUrls.ts`

**Interfaces:**
- Consumes: `signPrivateMedia`, `stableStorageUrl` (Task 2).
- Produces: `withDisplayUrls(assets: AiAsset[], sign: (urls: string[]) => Promise<Record<string,string>>): Promise<AiAsset[]>` (asset_url replaced by the display link) and `assetUrlForStorage(url: string): string` (= `stableStorageUrl`).

- [ ] **Step 1: Write failing tests:** `assetUrlForStorage` of a signed `ai-tryon-results` link returns the public form; `withDisplayUrls` replaces each `asset_url` with the signed one and keeps rows whose URL couldn't be signed.
- [ ] **Step 2: Run** `npx vitest run src/hooks/aiAssetUrls.test.ts` → FAIL.
- [ ] **Step 3: Implement** `aiAssetUrls.ts`; in `useAiAssets` save `assetUrlForStorage(assetUrl)` and show `withDisplayUrls(...)` (expiresIn 3600); in `AiTryOnModal` save `assetUrlForStorage(currentResult.path)`; in `useTheNewBlack.uploadImage` return `createSignedUrl(fileName, 3600)`'s `signedUrl` (fall back to the public address only if signing fails, logged without the URL).
- [ ] **Step 4: Run** the test, then `npx vitest run` → all PASS.
- [ ] **Step 5: Commit** (`feat(ai-studio): temporary links for uploads and gallery`).

### Task 4: Events page shows older full-address results

**Files:**
- Modify: `src/lib/eventMedia.ts`, `src/lib/eventMedia.test.ts`

**Interfaces:**
- Consumes: `signPrivateMedia` (Task 2). `signEventMedia` signature unchanged.

- [ ] **Step 1: Write failing test:** a full `ai-tryon-results` public address passed to `signEventMedia` comes back as a signed link (today it passes through); a full external URL still passes through.
- [ ] **Step 2: Run** `npx vitest run src/lib/eventMedia.test.ts` → FAIL.
- [ ] **Step 3: Implement:** full URLs go through `signPrivateMedia` instead of passing through.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** (`fix(events): older results stay visible once private`).

### Task 5: Try-on functions return temporary links

**Files:**
- Create: `supabase/functions/thenewblack-video/media.ts`, `supabase/functions/thenewblack-video/media.test.ts`
- Modify: `supabase/functions/thenewblack-picture/index.ts:185-195`, `supabase/functions/thenewblack-picture-free/index.ts:175-185`, `supabase/functions/thenewblack-video/index.ts` (`normalizeImage` ~99-125, `logJob` callers, `check` ~756-825), `supabase/functions/thenewblack-event-tryon/index.ts:174-177`

**Interfaces:**
- Produces: `stableStorageUrl(url: string): string` in `thenewblack-video/media.ts` (same behaviour as Task 2's, Deno-safe, no imports).

- [ ] **Step 1: Write failing tests** for `media.ts`: signed → public form; non-storage URL unchanged.
- [ ] **Step 2: Run** `npx vitest run supabase/functions/thenewblack-video/media.test.ts` → FAIL.
- [ ] **Step 3: Implement** `media.ts`; then in each function keep `getPublicUrl` for what is stored/logged and return `createSignedUrl(path, 86400)` as `result_url` (fall back to the public address if signing fails). Video: send The New Black a `createSignedUrl(inputPath, 86400)` link; `logJob` stores `stableStorageUrl(...)` for `input_image_url` / `used_image_url`. Picture functions: stop printing photo URLs to logs (print the storage path only). Event try-on: `output_path` stays the public address; response `result_url` is the signed link.
- [ ] **Step 4: Run** `npx vitest run` → all PASS; `npx vitest run src/components/ai-studio/live-cam` → 31/31.
- [ ] **Step 5: Commit** (`feat(functions): try-on results returned as temporary links`). **Ask the owner** to deploy the four functions (one ask, four names). After deploy: smoke test each without login → 401; with the owner's phone, see Release.

### Task 6: Lock the people-photo folders (migration B)

**Files:**
- Create: `supabase/tests/private_people_photos_probes.sql`, `supabase/migrations/<version>_private_people_photos.sql`, matching rollback.

- [ ] **Step 1: Write probes:** for each of `ai-tryon-uploads`, `ai-tryon-results`, `ai-tryon-videos`, `tnb-video-inputs`, `search-images`, `wardrobe`: bucket not public; anon select → 0 rows; other user select → 0 rows; owner select own → 1 row; owner upsert path (insert + select + update) works for `ai-tryon-uploads`.
- [ ] **Step 2: Run rollback-only on live** → FAIL (buckets public, broad read rules).
- [ ] **Step 3: Write the migration:** `update storage.buckets set public = false where id in (…six…)`; drop `"Anyone can view ai-tryon-results"`, `"Anyone can view ai-tryon-uploads"`, `"Anyone can view ai-tryon-videos"`, `"Anyone can view video inputs"`, `"Public read for search-images"`. Rollback restores both.
- [ ] **Step 4: Run migration + probes rollback-only** → PASS; rollback fingerprint check.
- [ ] **Step 5: Commit** (`feat(storage): people photos private`). **Ask the owner** to apply only after the Task 5 phone test passed. After apply: probes, advisors, and an old public address of an `ai-tryon-uploads` file returns 400.

### Task 7: Closet and outfits can't be listed (migration C)

**Files:**
- Create: `supabase/tests/closet_listing_probes.sql`, `supabase/migrations/<version>_closet_no_listing.sql`, matching rollback.

- [ ] **Step 1: Write probes:** anon and another user select from `wardrobe-items` / `saved-outfits` objects of O → 0 rows; O → own rows; buckets still public.
- [ ] **Step 2: Run rollback-only** → FAIL.
- [ ] **Step 3: Migration:** drop `"Public can view wardrobe items"` and `"Public can view outfit images"`. Rollback recreates them.
- [ ] **Step 4: Run** → PASS; after apply (owner yes), fetch one closet photo's public address → 200 (Live Cam and public pages unaffected).
- [ ] **Step 5: Commit** (`feat(storage): closet and outfit folders can't be listed`).

### Task 8: Account deletion removes every photo

**Files:**
- Create: `supabase/tests/user_storage_cleanup_probes.sql`, `supabase/migrations/<version>_list_user_storage_objects.sql`, matching rollback
- Modify: `supabase/functions/delete-account/index.ts:53-80`

**Interfaces:**
- Produces: `public.list_user_storage_objects(target_user_id uuid) returns table(bucket_id text, name text)` — SECURITY DEFINER, `set search_path = public, storage`; rows where `(storage.foldername(name))[1] = target_user_id::text`, or `(storage.foldername(name))[2] = target_user_id::text` and `bucket_id in ('event-user-photos','event-tryon-results','event-tryon-renders','event-photos')`. Execute revoked from `public`, `anon`, `authenticated`; granted to `service_role`.

- [ ] **Step 1: Write probes:** test user with one object in `ai-tryon-uploads`, `wardrobe-items`, `live-cam-snapshots` and `event-user-photos` (`E/U/p.jpg`) → helper returns all four; another user's object not returned; `authenticated` and `anon` can't execute it.
- [ ] **Step 2: Run rollback-only** → FAIL (function missing).
- [ ] **Step 3: Implement** the migration; in `delete-account` replace the bucket loop with: call the helper, group by bucket, `remove()` in chunks of 100, record `storage_files_removed` in the result; on helper error fall back to the old loop.
- [ ] **Step 4: Run** probes rollback-only → PASS; `npx vitest run` → PASS.
- [ ] **Step 5: Commit** (`feat(account): deleting an account deletes its photos`). **Ask the owner** to apply the migration and deploy `delete-account`; smoke test without login → 401. No real account is deleted as a test.

### Task 9: Verify and hand over

- [ ] Run `npx vitest run` (all pass), `npx vitest run src/components/ai-studio/live-cam` (31/31), `npx tsc --noEmit -p tsconfig.app.json` filtered to changed files (0 errors), build with the local config, `git checkout supabase/functions/mcp/index.ts`.
- [ ] `git diff --stat origin/main -- src/components/ai-studio/live-cam supabase/functions/live-cam-*` → empty.
- [ ] Update `docs/redesign/SESSION_STATE.md`, `AUDIT_CHECKLIST.md` (row 5.6) and `SUPABASE_AUDIT.md`; commit; push the branch.

## Release (owner gates, in order)
_Updated after the final review: a database safety net and an iPhone build gate were added._
1. ✅ (2026-10-27) Apply `20261027125623_stable_media_addresses` (never keep temporary links, whatever app version saves them) and the Task 1 migration (yes #1).
2. ✅ (2026-10-27: event-tryon v52, picture v98, picture-free v100, video v102; merged) Deploy the four try-on functions (yes #2) and merge the branch to `main` (yes #3).
3. Owner phone test (top up RunPod first for the Live Cam check): AI Studio picture try-on, video try-on, gallery, download; event try-on and Events page results; Live Cam with a "My Closet" garment and a product.
3b. **iPhone gate:** the iOS app bundles its code (`capacitor.config.ts` `webDir: 'dist'`), so installed builds keep the old code. Ship an iOS build from `main` and let people update before step 4. Until then, older builds still try on (the functions re-sign the person's own photo) but their gallery and older event results would show broken pictures after the lock.
4. Apply Task 6 migration (yes #4); repeat the phone test. Re-check the "old public address returns 400" smoke test after about an hour (cached copies).
5. Apply Task 7 migration (yes #5); open a public outfit page and a shared item; Live Cam "My Closet" once more.
6. Apply Task 8 migration and deploy `delete-account` (yes #6).

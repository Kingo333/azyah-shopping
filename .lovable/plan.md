## Audit summary (confirmed)

- `wardrobe_garment_analysis` table, RLS, `ON DELETE CASCADE`, status check (`pending|complete|failed|skipped`), `UNIQUE(wardrobe_item_id)` — present.
- Triggers on `wardrobe_items` `AFTER INSERT` and `AFTER UPDATE OF image_url, image_bg_removed_url, category` calling `dispatch_fashionclip_analysis()` via pg_net + Vault secret — present.
- Edge Functions `analyze-wardrobe-fashionclip` (idempotent on `image_hash + analysis_version`) and `reanalyze-wardrobe-fashionclip-batch` — present.
- Secrets `FASHIONCLIP_WORKER_URL` + `FASHIONCLIP_WORKER_TOKEN` — configured.
- Frontend: `useWardrobeItems` joins analysis rows; `LiveCamGarmentPicker` merges `analysisPromptHint` with manual override into the Live Cam prompt.
- DB state: **40 wardrobe items, 0 analysis rows** → backfill needed.

## Plan — backfill via Edge Function only (no UI)

### 1. Update `reanalyze-wardrobe-fashionclip-batch`

Auth: signed-in user only. Only operates on rows where `wardrobe_items.user_id = auth.uid()`.

Request body:
```json
{ "limit": 3, "chunkSize": 1 }
```
- `limit` default 3, max 50.
- `chunkSize` default 2, max 5.

Eligibility (per signed-in user):
- no `wardrobe_garment_analysis` row, OR
- `status` in (`failed`, `skipped`), OR
- `prompt_hint` is null or empty string.
- Stale `pending` (>10 min) also eligible.

Processing:
- Sort eligible ids deterministically (oldest items first) and take `limit`.
- Split into chunks of `chunkSize`.
- For each chunk: `Promise.allSettled` calling `analyze-wardrobe-fashionclip` with `{ wardrobe_item_id, force: true }` and the trigger-secret header (server-to-server, ownership already enforced).
- Process chunks **sequentially** (await between chunks). No retries.
- After all chunks finish, re-read `wardrobe_garment_analysis` for the queued ids to compute the final summary.

Response:
```json
{
  "total": 40,
  "eligible": 40,
  "requestedLimit": 3,
  "chunkSize": 1,
  "queued": 3,
  "complete": 2,
  "pending": 0,
  "failed": 1,
  "skipped": 0,
  "missing": 0,
  "workerConfigured": true,
  "errors": [{ "wardrobe_item_id": "…", "error": "worker_timeout" }]
}
```

Safety:
- Wrapped in try/catch with `catch (error: any)`.
- Never throws on worker failure — failed items end up in `failed/skipped` and are reported.
- Logs only ids and statuses. **Never log image URLs, tokens, or the trigger secret.**
- `workerConfigured` reflects presence of both secrets so a missing config is obvious in the response.

### 2. Test sequence (user-driven, via curl/Functions tester)

Run #1: `{ "limit": 3, "chunkSize": 1 }` → expect 1–3 `complete` rows with non-empty `prompt_hint`.
Run #2 (after #1 OK): `{ "limit": 10, "chunkSize": 2 }`.
Run #3 (after #2 stable): `{ "limit": 50, "chunkSize": 3 }`.

### 3. Verification

After Run #1:
- `SELECT status, prompt_hint FROM wardrobe_garment_analysis WHERE wardrobe_item_id = '…'` → `complete` + non-empty hint.
- Open AI Studio → Live Cam → pick that item.
- Add a single `console.debug('[livecam] final prompt', finalPrompt)` in the Live Cam prompt-send path so the merged prompt is visible in the browser console. No protocol/scheduler change.

### 4. Out of scope (unchanged)
RunPod FluxRT, Cloudflare, Discover, `event_brand_products`, WebSocket protocol, camera capture, scheduler, per-frame behavior. No UI button. No new schema. No new secrets. Live Cam keeps working with its existing fallback prompt if analysis is missing or failed.

### Files to change
- `supabase/functions/reanalyze-wardrobe-fashionclip-batch/index.ts` — chunked sequential dispatch, richer summary, accept `chunkSize`.
- `src/components/ai-studio/live-cam/…` — one `console.debug` line on prompt send (verification only).

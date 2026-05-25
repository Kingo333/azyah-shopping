## Plan

`RUNPOD_API_KEY` is now stored. Wire it into the two FashionCLIP edge functions and validate.

### Changes

1. **`supabase/functions/analyze-wardrobe-fashionclip/index.ts`**
   - Read `RUNPOD_API_KEY` from env.
   - On every fetch to `${FASHIONCLIP_WORKER_URL}/ping` and `/analyze`, send headers:
     - `Authorization: Bearer ${RUNPOD_API_KEY}` (RunPod gateway)
     - `X-Worker-Token: ${FASHIONCLIP_WORKER_TOKEN}` (app layer)
     - `Content-Type: application/json`
   - If `RUNPOD_API_KEY` missing → persist `skipped` with reason `runpod_auth_not_configured`.

2. **`supabase/functions/reanalyze-wardrobe-fashionclip-batch/index.ts`**
   - Smoke test calls `GET /ping` then `POST /analyze` with both headers above.
   - Add `runpodAuthConfigured: boolean` to smoke-test and backfill responses.
   - Keep diagnostics safe: no tokens, no signed URLs, no base64.
   - Backfill remains 3-item cap; no 10/50 batches.

### Validation

1. Deploy both functions.
2. User clicks **Smoke test worker** on `/profile`.
3. Expect: `runpodAuthConfigured: true`, `pingStatus: 200`, `analyzeStatus: 200` or clear model error.
4. Check RunPod worker logs for `GET /ping` and `POST /analyze`.
5. Only then click **Analyze 3 closet items** and report per-item results, DB status counts, one example `prompt_hint` if complete.

### Out of scope
FluxRT Live Cam endpoint, Cloudflare, Live Cam streaming, camera capture, scheduler, Discover, event products, frontend env, 10/50-item batches.

### Files
- `supabase/functions/analyze-wardrobe-fashionclip/index.ts`
- `supabase/functions/reanalyze-wardrobe-fashionclip-batch/index.ts`

No schema changes. No frontend changes.
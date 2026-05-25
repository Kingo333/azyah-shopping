# FashionCLIP diagnostics + timeout consistency patch

Goal: surface enough safe diagnostic detail to determine whether the RunPod Serverless Load Balancer is returning a real HTTP status (401/403/404/5xx) or actually timing out before reaching FastAPI. Do not change endpoint mode. Do not touch FluxRT Live Cam, Cloudflare, camera capture, scheduler, or Discover/event products.

## Files to edit

1. `supabase/functions/reanalyze-wardrobe-fashionclip-batch/index.ts`
2. `supabase/functions/analyze-wardrobe-fashionclip/index.ts`
3. `src/components/profile/AnalyzeClosetButton.tsx`

No changes to `workers/fashionclip-worker/*`, `supabase/config.toml`, migrations, or any other file.

## Endpoint mode

Keep exactly as-is:
- `GET ${FASHIONCLIP_WORKER_URL}/ping`
- `POST ${FASHIONCLIP_WORKER_URL}/analyze`
- Headers: `Authorization: Bearer ${RUNPOD_API_KEY}` + `X-Worker-Token: ${FASHIONCLIP_WORKER_TOKEN}` (+ `Content-Type: application/json` on POST)
- No `/runsync`, no `/run`, no `/status`, no queue API refactor.

## Changes

### 1. `reanalyze-wardrobe-fashionclip-batch/index.ts`

Smoke-test branch only:
- Read `/ping` body (always, even on 2xx) and produce `pingBodySummary`: first ~240 chars, whitespace collapsed, no tokens, no signed URLs.
- Add to the returned JSON and to the existing `[fashionclip-batch] smoke-test` log:
  - `pingTimeoutMs` (currently 8000)
  - `pingBodySummary`
  - `workerTokenConfigured` (boolean — `!!FASHIONCLIP_WORKER_TOKEN`)
  - `finalPingPath` = `${base}/ping`
  - `finalAnalyzePath` = `${base}/analyze`
  - rename existing `analyzeResponseSummary` exposure consistent with new `analyzeBodySummary` field (keep both keys for one release to avoid breaking the current UI).
- Keep all existing fields (`workerHost`, `workerPathShape`, `workerUrlValid`, `runpodAuthConfigured`, `pingStatus`, `pingDurationMs`, `pingError`, `analyzeStatus`, `analyzeDurationMs`, `analyzeTimeoutMs`, `analyzeTimedOutBeforeResponse`, `analyzeError`, `analyzeResponseKeys`).

Backfill branch:
- Replace hardcoded `30_000` wrapper timeout around internal analyze call with `ANALYZE_TIMEOUT_MS + 15_000` (default 105000, env-driven via same `FASHIONCLIP_WORKER_TIMEOUT_MS`). Reason: the wrapper currently aborts at 30s while the analyzer's own worker call has 90s — this produced false `missing`/`pending` rows.
- No change to selection logic, chunking, or DB write logic.

Hard rule: never log or return tokens, signed image URLs, JWTs, base64, or private keys.

### 2. `analyze-wardrobe-fashionclip/index.ts`

When the worker responds with non-2xx:
- Capture safe `workerBodySummary` (first ~240 chars, stripped) and include it in the JSON response and `[fashionclip] failed` log alongside existing `reason = worker_${status}`, `analyzeDurationMs`, `timeoutMs`.
- Do not collapse non-2xx into `worker_timeout`. Keep the existing `worker_${status}` naming.

When the worker responds 2xx:
- Validate parsed JSON: if missing `metadata` AND missing `prompt_hint`, OR if body contains a top-level `error` field, mark DB row as `failed` with `error: 'worker_invalid_response'` and return `{ status: 'failed', reason: 'worker_invalid_response', workerBodySummary }`.
- Otherwise behave exactly as today (write `complete`).

No change to URL normalization, auth header construction, timeout default (90000), or trigger-secret/JWT authorization.

### 3. `src/components/profile/AnalyzeClosetButton.tsx`

Smoke result block — extend the displayed list to include:
- `workerUrlValid`
- `runpodAuthConfigured`
- `workerTokenConfigured`
- `pingDurationMs`, `pingTimeoutMs`
- `pingBodySummary` (truncated to 200 chars, break-all)
- `analyzeDurationMs`, `analyzeTimeoutMs`, `analyzeTimedOutBeforeResponse`
- `analyzeBodySummary` (truncated to 200 chars, break-all) — fall back to existing `analyzeResponseSummary` if not present

Batch result block — extend per-item display to include `workerBodySummary` when present.

No layout overhaul, no new buttons, no behavior changes. Same two buttons, same invoke bodies.

## Out of scope

- FluxRT Live Cam endpoint, Cloudflare livestream, camera capture, scheduler, Discover/event products.
- Worker repo code (`workers/fashionclip-worker/app.py`, README) — repo `/healthz` vs deployed `/ping` mismatch is noted but not in scope; deployed RunPod worker is the source of truth.
- DB schema, migrations, RLS policies, trigger function, linter findings.
- Refactor to `/runsync` or any RunPod queue API.
- Auth header changes.

## Validation

After deploy, run **Smoke test worker only**. Expected:
- `pingStatus`: a real HTTP code (200/401/403/404) with `pingBodySummary` populated, OR `timeout` with `pingDurationMs ≈ 8000`.
- `analyzeStatus`: a real HTTP code with `analyzeBodySummary`, OR `timeout` with `analyzeTimedOutBeforeResponse: true` and `analyzeDurationMs ≈ 90000`.
- `workerTokenConfigured: true`, `runpodAuthConfigured: true`, `workerUrlValid: true`.

If both still time out at 90s with empty bodies, the blocker is on the RunPod side (gateway not forwarding to FastAPI / wrong auth scope / endpoint routing). Report RunPod-side logs (model loading started, model loaded, POST /analyze received, CUDA errors, image fetch errors, timeout before model loaded) before any further code change.

Do NOT run **Analyze 3 closet items** until smoke test returns a non-timeout `analyzeStatus`.

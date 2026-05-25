## Goal

The FashionCLIP RunPod Serverless Load Balancer endpoint is reachable (`workerHost` resolves, `analyzeStatus: 200` returned from the edge function), but worker `/analyze` calls hit `worker_timeout` — almost certainly cold-start model load exceeding the current 20s ceiling. Keep the HTTP `/ping` + `/analyze` shape exactly as-is (no `/runsync`, no queue API). Only raise timeouts and improve diagnostic visibility.

## Changes

### 1. `supabase/functions/analyze-wardrobe-fashionclip/index.ts`

- Replace the hard-coded `WORKER_TIMEOUT_MS = 20_000` with an env-driven value:
  ```ts
  const WORKER_TIMEOUT_MS = Number(Deno.env.get('FASHIONCLIP_WORKER_TIMEOUT_MS') ?? '90000');
  ```
  Default 90s, configurable via the new optional secret `FASHIONCLIP_WORKER_TIMEOUT_MS`.
- Log `analyzeDurationMs` and the resolved `timeoutMs` alongside the existing failure log so cold-start vs. true-failure is distinguishable.
- No change to URL shape, headers, or response body schema.

### 2. `supabase/functions/reanalyze-wardrobe-fashionclip-batch/index.ts`

Smoke-test branch only — the backfill branch is untouched.

- Read the same `FASHIONCLIP_WORKER_TIMEOUT_MS` env (default 90000) and use it for the `/analyze` probe. Keep `/ping` on a short 8s timeout (ping should never load the model).
- Measure and return:
  - `pingStatus`, `pingDurationMs`, `pingError`
  - `analyzeStatus`, `analyzeDurationMs`, `analyzeError`
  - `analyzeTimeoutMs` (the value actually used)
  - `analyzeTimedOutBeforeResponse` (`true` only when the AbortController fired)
  - `analyzeResponseSummary` (first ~240 chars, stripped) when non-OK
  - existing `workerHost`, `workerPathShape`, `workerUrlValid`, `workerConfigured`
- Never include tokens, signed URLs, or base64 image data in the response or logs.

### 3. Optional secret

Add `FASHIONCLIP_WORKER_TIMEOUT_MS` (optional) via the secrets tool so you can tune timeout later without a redeploy. Not required for the fix — default 90000 kicks in if unset.

## Out of scope (untouched)

- FluxRT Live Cam endpoint, Cloudflare livestream, camera capture, scheduler, Discover/event products.
- The backfill branch of `reanalyze-wardrobe-fashionclip-batch` (only the smoke-test branch is updated).
- No refactor to `/runsync` or RunPod queue API. The endpoint stays as Serverless Load Balancer with `/ping` and `/analyze`.

## Validation

After deploy, run **Smoke test worker** only. Expected outcome:
- `pingStatus: 200`, `pingDurationMs` small.
- `analyzeStatus: 200` with `analyzeDurationMs` possibly large on cold start (≤90000), `analyzeTimedOutBeforeResponse: false`.
- If `analyzeTimedOutBeforeResponse: true` after 90s, the worker itself is stuck — report RunPod-side logs (model loading started / loaded, POST /analyze received, CUDA errors, image fetch errors) before any further code change.
- Do NOT run **Analyze 3 closet items** until smoke test returns a real non-timeout `analyzeStatus`.

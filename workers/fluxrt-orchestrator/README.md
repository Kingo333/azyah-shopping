# fluxrt-orchestrator (Cloudflare Worker)

Issues Live Cam session tokens and proxies the browser WebSocket to RunPod.

`deployed/worker.2026-05-22.js` is the code that was live when this folder was
created (Cloudflare "modified_on" 2026-05-22), kept for reference and rollback.
It was transcribed from the Cloudflare API output; run
`wrangler deployments list` / compare in the dashboard before relying on it byte for byte.
`src/` is the version to deploy next.

## How it works

- **No pods.** Each tier is one RunPod **Serverless Load Balancing** endpoint
  (`RUNPOD_LB_ENDPOINT_ID`, later `PREMIUM_RUNPOD_LB_ENDPOINT_ID`). RunPod scales
  workers; GPU types are chosen on the endpoint in RunPod, not here.
- `POST /sessions/start` (admin key) → mints a signed token, returns
  `ws_url = wss://<endpoint>.api.runpod.ai/ws?token=…`, `tier_requested`, `tier_served`.
  The `live-cam-session-start` edge function rewrites `ws_url` to this Worker's `/ws`.
- `GET /ws?token=…` (public, token-checked) → verifies the token, picks the
  endpoint from the **tier inside the signed token**, adds the RunPod API key,
  and proxies the WebSocket.
- `POST /sessions/end` (admin key) → no-op for both tiers (nothing to destroy).
- `POST /admin/load` (admin key, body `{"tier": "standard"|"premium"}`) → warms
  a GPU worker by calling its `/api/load` (falls back to `/warmup`) with a
  short-lived session token in `X-Session-Token`.
- `GET /diag` (admin key) → which secrets/vars are set (true/false only).

## Token

```
payload = userId.garmentId.tier.maxSessionSeconds.expEpochSeconds
token   = payload + "." + hex(HMAC-SHA256(SESSION_SIGNING_SECRET, payload))
```

`exp` is the connect deadline (300 s Standard, 360 s Premium) and stays the last
segment, so older GPU servers keep working. `maxSessionSeconds` (300) is the
streaming cap; the GPU worker enforces it. Legacy `userId.garmentId.exp` tokens
are still accepted as Standard.

## Premium switch

| PREMIUM_RUNPOD_LB_ENDPOINT_ID | PREMIUM_FALLBACK_TO_STANDARD | Premium request gets |
|---|---|---|
| set | any | Premium endpoint, `tier_served: "premium"` |
| unset | `true` | Standard endpoint, `tier_served: "standard"` |
| unset | not `true` | 503 `premium_not_configured` |

## Env

| Name | Kind | Notes |
|---|---|---|
| ORCHESTRATOR_API_KEY | secret | Edge functions send it as `Authorization: Bearer` |
| RUNPOD_API_KEY | secret | Injected into upstream requests |
| SESSION_SIGNING_SECRET | secret | **Required.** Must equal the GPU workers' value. No fallback. |
| RUNPOD_LB_ENDPOINT_ID | var | Standard (FluxRT) endpoint |
| PREMIUM_RUNPOD_LB_ENDPOINT_ID | var | Premium (JoyAI) endpoint, empty for now |
| PREMIUM_FALLBACK_TO_STANDARD | var | `true` while testing |
| SESSION_MAX_SECONDS | var | 300 |
| SESSION_CONNECT_TTL_STANDARD / _PREMIUM | var | 300 / 360 |

## Test and deploy

```
npm test                 # node --test, no dependencies
npx wrangler deploy      # needs CLOUDFLARE_API_TOKEN; ask before deploying
```

Before the first deploy of `src/`: confirm `SESSION_SIGNING_SECRET` is set on the
Worker. The old code silently signed with `ORCHESTRATOR_API_KEY` when it was
missing; the new code refuses to issue tokens instead.

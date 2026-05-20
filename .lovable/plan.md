## Fix Live Cam ws_url to route through Cloudflare Worker

### Problem
The Cloudflare Worker's `/sessions/start` response returns `ws_url` that points directly at the raw RunPod load balancer (`wss://7k96uky12rreko.api.runpod.ai/ws?token=…`). Browsers cannot attach the required `Authorization: Bearer RUNPOD_API_KEY` header to a WebSocket, so every session times out.

The Worker is already deployed at `https://fluxrt-orchestrator.abdullahiking33.workers.dev` and is meant to proxy the WS while injecting RunPod auth server-side. We need the Edge Function to hand the client a `ws_url` pointing at the **Worker host**, reusing the **same signed token** the Worker already produced.

### Secrets check
- `ORCHESTRATOR_URL` ✅ already set (used today to call `/sessions/start`).
- `ORCHESTRATOR_API_KEY` ✅ already set.
- No new secrets required. We'll optionally read a new `FLUXRT_WORKER_URL` env var if it exists, otherwise derive the WS host from `ORCHESTRATOR_URL`, with a hardcoded default of `https://fluxrt-orchestrator.abdullahiking33.workers.dev`.

### Single file to change
`supabase/functions/live-cam-session-start/index.ts`

### Changes (strictly additive, no DB / RLS / other functions touched)

1. **Add a config constant at top of file:**
   ```ts
   const DEFAULT_WORKER_URL = 'https://fluxrt-orchestrator.abdullahiking33.workers.dev';
   ```
   And inside the handler, resolve:
   ```ts
   const workerHttpUrl = (Deno.env.get('FLUXRT_WORKER_URL') ?? Deno.env.get('ORCHESTRATOR_URL') ?? DEFAULT_WORKER_URL).replace(/\/$/, '');
   const workerWsHost = workerHttpUrl.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');
   ```

2. **Rewrite the worker-returned `ws_url` to point at the Worker host** while preserving the exact signed token. Right after the existing `wsUrl = (parsed.ws_url as string) ?? null;` block:
   ```ts
   if (wsUrl) {
     try {
       const incoming = new URL(wsUrl);
       const token = incoming.searchParams.get('token');
       if (!token) throw new Error('worker ws_url missing token');
       wsUrl = `${workerWsHost}/ws?token=${encodeURIComponent(token)}`;
     } catch (e: any) {
       await supabase
         .from('live_cam_sessions')
         .update({
           status: 'failed',
           error_message: `Invalid worker ws_url: ${e?.message ?? String(e)}`,
           attempts,
           ended_at: new Date().toISOString(),
         })
         .eq('id', session.id);
       return json({ error: 'Invalid worker ws_url', attempts }, 502);
     }
   }
   ```

3. **Leave everything else identical**:
   - Token payload, signing logic (lives in the Worker, untouched).
   - `live_cam_sessions` insert + update fields (`pod_id`, `ws_url`, `status`, `gpu_used`, `cloud_used`, `attempts`).
   - Response shape: `{ session_id, ws_url, pod_id }`.
   - Auth checks, garment RLS check, CORS, error mapping (`runpod_no_capacity`, `runpod_create_failed`).

4. **Logging hygiene:** never log the token. The `console.error` branch already only logs `upstream_status`, `upstream_body`, `attempts` — leave as-is.

### Out of scope (explicitly not touched)
- Worker code, RunPod image, DB schema, RLS, triggers.
- Picture / Video try-on edge functions and UI.
- `useLiveCamSession.ts` client — it already consumes `data.ws_url` blindly, so the fix is transparent.
- Token format / signing key.
- No new npm or Deno deps.

### Deploy
Redeploy `live-cam-session-start` after the edit.

### Acceptance test
1. Open AI Studio → Live Cam, start a session.
2. New row in `live_cam_sessions`: `ws_url` starts with `wss://fluxrt-orchestrator.abdullahiking33.workers.dev/ws?token=` (not `7k96uky12rreko.api.runpod.ai`).
3. RunPod worker flips Idle → Running within ~30s.
4. `attempts` column populates (no longer NULL).

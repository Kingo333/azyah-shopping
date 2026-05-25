## Plan

1. **Update only the FashionCLIP worker URL secret**
   - Refresh `FASHIONCLIP_WORKER_URL` through the secure secrets form.
   - Use the exact base URL format: `https://ik55d90xltg9id.api.runpod.ai`
   - No trailing slash, spaces, or newline.

2. **Keep Live Cam / Cloudflare untouched**
   - Do not change the FluxRT Live Cam RunPod endpoint.
   - Do not change Cloudflare, WebSocket streaming, camera capture, or scheduler code.
   - `RUNPOD_API_KEY` remains separate from the FashionCLIP worker URL.

3. **Verify FashionCLIP smoke test**
   - Re-run the deployed `reanalyze-wardrobe-fashionclip-batch` smoke test.
   - Expected result:
     - `workerConfigured: true`
     - `workerHost: ik55d90xltg9id.api.runpod.ai`
     - `ping status` no longer unreachable if the RunPod worker is awake
     - `analyze status` should return a real HTTP status or response keys

4. **If still unreachable**
   - Check whether the RunPod serverless endpoint is active/awake.
   - Test whether the endpoint expects `/runsync`, `/run`, `/ping`, or a custom path.
   - Adjust only the FashionCLIP edge-function request path if the worker requires a different shape.

## Technical details

Recent logs still show:

```text
host: ""
pathShape: "base"
pingStatus: null
analyzeStatus: null
pingError: "unreachable"
```

That means the edge function sees `FASHIONCLIP_WORKER_URL` as configured, but cannot parse a usable host from it. The next implementation step is to update that one secret and then validate the deployed smoke test.
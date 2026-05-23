## Plan: Sequential WS Handshake + Diagnostic Logs (revised)

### Scope
Edit only `src/components/ai-studio/live-cam/useLiveCamSession.ts`. Keep `DEFAULT_TRYON_PROMPT`, promptHint append logic, capture dimensions, render path, and provisioning unchanged.

### Handshake flow
1. Wait for worker `ready`.
2. Send `set_reference_image` → wait for ack.
3. Send `set_prompt` → wait for ack.
4. Start frame loop (existing capture/send code).

### Ack resolver
A single pending-resolver map keyed by message name (`set_reference_image` | `set_prompt`).

Match an incoming message as an ack if any of:
1. `type === "ack" && name === <key>`
2. `type === "ack" && for === <key>`
3. Typed fallback: `type === "<key>_ack"` or `type === "<key>"` echo with no other payload.

Logic:
- Register resolver **before** calling `ws.send()`.
- 30s `setTimeout` per step; on timeout reject with readable error (`"Worker did not acknowledge <step>"`), fail session via existing `setErrorMessage` + `setStatus('failed')` + `cleanupLocal()`.
- On ack: clear timeout, delete entry, resolve.
- On WS `close` / `error`: reject all pending resolvers and clear their timeouts.

### Guards
- `handshakeStartedRef` boolean — `ready` handler returns early if already true (prevents duplicate handshakes if `ready` fires twice).
- `frameLoopStartedRef` boolean — frame loop start guarded (prevents duplicate intervals).
- If `refB64` is empty/missing → `setErrorMessage('Reference image missing')`, fail, do not send anything, do not start frames.

### Logs (temporary, no base64, no prompt body)
- `[live-cam] product id=<garment.id> source=<garment.source>`
- `[live-cam] reference image exists=<true|false>`
- `[live-cam] set_reference_image ack=<true|false>` (false on timeout/reject)
- `[live-cam] set_prompt ack=<true|false>`
- `[live-cam] final prompt length=<n>`

### Acceptance
- Ref-image ack received before prompt is sent.
- Prompt ack received before frames start.
- promptHint still appended when present.
- Timeout produces readable error in `errorMessage` state.
- No WS protocol, backend, or rendering changes.
# Live Cam Client Protocol Refinements

Four targeted adjustments to `src/components/ai-studio/live-cam/useLiveCamSession.ts`. No other files change. No secrets, no edge function changes, no DB changes.

## 1. Combined prompt (base + garment hint)

Always send the strong default prompt. If `garment.promptHint` exists, append it to the base (don't replace).

```ts
const basePrompt = DEFAULT_TRYON_PROMPT;
const finalPrompt = garment.promptHint?.trim()
  ? `${basePrompt} ${garment.promptHint.trim()}`
  : basePrompt;
```

Reason: hints like "loose abaya" are too thin to stand alone.

## 2. Wait for `ready` before streaming

Currently the client sends `set_reference_image` + `set_prompt` immediately after the WS `open` event and starts the frame loop right after. The worker actually emits a `warming` phase first, then `ready`.

New sequence after `ws.onopen`:

```text
open
  -> attach message handler (handles warming|ready|ack|error|frame)
  -> wait for { type: 'ready' }
       on ready:
         send set_reference_image
         send set_prompt
         set status = 'running'
         start frame loop
```

Status mapping while waiting for `ready` stays `'warming'`. The existing `STARTING_TIMEOUT_MS` (180s) already covers the wait; if it elapses without `ready`, fail as today.

## 3. Handle all worker message types

Single message handler dispatches on `parsed.type`:

- `warming` — log + keep status `'warming'` (optionally surface `state` if present, but no UI change required).
- `ready` — trigger the post-ready sequence above (idempotent: only first `ready` runs it).
- `ack` — ignore (no-op; could be logged at debug level).
- `error` — set `errorMessage` from `parsed.message ?? 'Worker error'`, set status `'failed'`, cleanup.
- `frame` — decode `frame_b64` to canvas (current behavior).
- anything else — ignore.

Non-string `ev.data` (binary) is ignored.

## 4. Backpressure protection

Inside the frame loop's `toBlob` callback, before calling `ws.send`:

```ts
if (wsRef.current.bufferedAmount > 2_000_000) return; // skip frame
```

Prevents queue buildup when the worker is slow. Skipped frames are silently dropped (no retry, no toast).

## Out of scope

- Worker code / RunPod image
- `live-cam-session-start` edge function
- `liveCamTypes.ts` (already aligned; may add optional `LiveCamReadyMessage` / `LiveCamWarmingMessage` / `LiveCamErrorMessage` interfaces opportunistically for type safety, no behavior change)
- DB schema, RLS, auth
- UI components (`LiveCamTab.tsx`, status badge, etc.) — existing `'warming'` / `'running'` / `'failed'` states already render correctly

## Verification

In browser devtools WS frames:

1. Connect → see `{type:"warming", ...}` messages, status badge shows WARMING.
2. See `{type:"ready"}` → client immediately sends `set_reference_image`, then `set_prompt`, then begins `{type:"frame", frame_b64:"..."}` at ~12 fps. Status badge flips to RUNNING.
3. Output frames render on remote canvas.
4. Throttle network in devtools → outgoing frame send rate drops (backpressure skipping); no unbounded memory growth.
5. Force worker error → status flips to FAILED with the error message; Retry button works.

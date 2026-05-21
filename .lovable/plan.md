
## Goal

Make the Live Cam client speak the protocol the FluxRT worker actually understands so real try-on (camera frame + clothing reference + prompt) works end-to-end.

## Problem

The worker expects three JSON message types with base64 payloads:

- `{ type: "set_reference_image", image_b64 }`
- `{ type: "set_prompt", prompt }`
- `{ type: "frame", frame_b64 }` → reply `{ type: "frame", frame_b64 }`

The current `useLiveCamSession.ts` sends `init`, `reference` (+ binary), and `frame` (+ binary), and never sends `set_prompt`. So the worker ignores everything and never gets a real try-on prompt.

## Changes (frontend only, one file)

`src/components/ai-studio/live-cam/useLiveCamSession.ts`:

1. **Drop the `init` handshake.** Worker doesn't use it. Resolution/FPS stay client-side only.
2. **Reference image** — replace the `{type:'reference'}` JSON + binary pair with one JSON message:
   ```
   { type: "set_reference_image", image_b64: <base64 of reference image> }
   ```
   Convert the existing `refBuf: ArrayBuffer` to base64 (no data URL prefix).
3. **Prompt** — immediately after the reference, send:
   ```
   { type: "set_prompt", prompt: <resolved prompt> }
   ```
   Resolution order (per-garment from DB, as you chose):
   - `garment.promptHint` if present (already populated from `live_cam_garment_settings.prompt_hint` by `LiveCamGarmentPicker`), otherwise
   - a strong hardcoded fallback in the client:
     > "Apply the clothing item from the reference image onto the person in the live camera frame. Preserve the person's face, body pose, background, skin tone, and lighting. Make the garment look naturally worn, fitted, and realistic."
4. **Frame send loop** — replace the JSON-meta + binary pair with a single message per frame:
   ```
   { type: "frame", frame_b64: <base64 JPEG, no data: prefix> }
   ```
   Keep the existing 12 fps cap, 576×320 capture canvas, and 0.7 JPEG quality. Drop `seq`/`ts`/`width`/`height` (worker doesn't use them).
5. **Incoming message handler** — replace paired (JSON meta → ArrayBuffer) logic with single-message handling:
   - Parse text frame as JSON; if `type === "frame"` and `frame_b64` present, decode base64 to a Blob and draw via `createImageBitmap` onto `remoteCanvasRef` (reuse existing `renderRemoteFrame`, refactored to take a base64 string instead of ArrayBuffer + meta).
   - Drop `pendingMetaRef`.
   - Latency tracking: keep a client-side `sentAt` map keyed by a local sequence counter we attach to each outgoing frame as a second field (`seq`) — but since the worker doesn't echo it, instead measure RTT as `(now - lastSendTs)` on each received frame (rough but matches what we can observe).
6. **Helpers** — add small `arrayBufferToBase64` and `blobToBase64` utilities (chunked `String.fromCharCode` over `Uint8Array`, then `btoa`) inside the hook file.

## Out of scope

- Worker code, RunPod image, `live-cam-session-start` edge function, DB schema, RLS, auth.
- `liveCamTypes.ts` — types describe the old protocol but are internal to the hook; can be updated opportunistically but isn't required to ship the fix. Will update the three message-shape types to match the new protocol since it's a few lines.

## Secrets

None required. No new env vars; prompt fallback lives in client code.

## Verification

1. Start a Live Cam session with any garment.
2. In browser devtools WS frames: confirm we send `set_reference_image`, then `set_prompt`, then a stream of `{type:"frame", frame_b64:"..."}`.
3. Confirm remote canvas paints output frames returned as `{type:"frame", frame_b64:"..."}`.
4. Confirm a garment with a populated `live_cam_garment_settings.prompt_hint` uses that prompt instead of the fallback.

## Files touched

- `src/components/ai-studio/live-cam/useLiveCamSession.ts` (main change)
- `src/components/ai-studio/live-cam/liveCamTypes.ts` (update three message-shape interfaces)

# Live Cam tab — AI Studio (additive only)

## Scope guardrails

- Only one existing file is edited: `src/components/AiStudioModal.tsx` (note: actual path is `src/components/AiStudioModal.tsx`, not `src/components/ai-studio/AiStudioModal.tsx` as referenced in the brief — please confirm this is the correct target).
- Picture tab, Video tab, wardrobe, auth, navigation, shared UI, existing tables/RLS/functions/buckets: untouched.
- All new DB/storage/function names prefixed `live_cam_` / `live-cam-`.
- Live Cam tab visible only when `user.role === 'shopper'` using the same role resolution already used elsewhere in the app (`useAuth()` from `AuthContext`).

## 1. Database migration (single new migration)

New tables, all additive:
- `public.live_cam_sessions` — session lifecycle (user_id, garment_id, garment_source, pod_id, ws_url, status, error_message, started_at, ended_at)
- `public.live_cam_snapshots` — captured frames (session_id, user_id, garment_id, storage_path)
- `public.live_cam_garment_settings` — per-garment reference image + prompt hint (read-only to clients)

RLS:
- Sessions/snapshots: owner-only select/insert/update.
- Garment settings: read by authenticated; writes service-role only.

Storage:
- Private bucket `live-cam-snapshots`.
- Policies: only owner can read/write objects under `${auth.uid()}/` prefix.

## 2. Edge function secrets

Two new secrets (placeholders, user will paste real values into Supabase):
- `ORCHESTRATOR_URL`
- `ORCHESTRATOR_API_KEY`

Never shipped to browser; only read via `Deno.env.get(...)` inside the new edge functions.

## 3. Edge functions (new, under `supabase/functions/`)

### `live-cam-session-start`
- Requires Supabase JWT; resolves `user_id` from JWT (ignores any client-sent user_id).
- Input: `{ garment_id, garment_source }` with `garment_source ∈ {product, event_brand_product, wardrobe_item}`.
- Read-only access check against the matching existing table (uses anon client with caller JWT so existing RLS enforces access — no policy changes).
- Insert `live_cam_sessions` row with `status='starting'`.
- POST `${ORCHESTRATOR_URL}/session/start` with bearer auth and `{ user_id, garment_id }`.
- On success → update row with `pod_id`, `ws_url`, `status='running'`; return `{ session_id, ws_url, pod_id }`.
- On failure → update row with `status='failed'`, `error_message`; return 502.
- Full CORS headers via `npm:@supabase/supabase-js@2/cors`.

### `live-cam-session-end`
- Input: `{ session_id }`. Verifies session belongs to caller.
- POST Worker `/session/end` with stored `pod_id`.
- Updates row: `status='ended'`, `ended_at=now()`. Idempotent.

### `live-cam-snapshot-save`
- `multipart/form-data`: `session_id`, `image` (PNG/JPEG ≤ 2 MB; validated).
- Uploads to `live-cam-snapshots/${user_id}/${session_id}/${ts}.jpg`.
- Inserts `live_cam_snapshots` row. Returns `{ snapshot_id, storage_path }`.

## 4. Frontend (all new files under `src/components/ai-studio/live-cam/`)

- `liveCamTypes.ts` — typed WS messages, session state enum, garment selection types. No `any`.
- `useLiveCamSession.ts` — orchestrates: call `live-cam-session-start` → open WS → send FluxRT init handshake (576×320, `use_reference_image: true`) → send reference image (numpy-encoded buffer matching server.py) → stream webcam frames at capped 12 fps → render returned frames to remote canvas → measure latency → on teardown stop tracks, close WS, call `live-cam-session-end`.
- `LiveCamCameraView.tsx` — uses existing `src/ar/core/CameraManager.ts` (`startCamera`/`stopCamera`) for the local preview; pairs it with a remote canvas. No parallel camera manager.
- `LiveCamGarmentPicker.tsx` — reuses the same hooks the Picture tab uses for products / event_brand_products / wardrobe_items (imported, not forked). Reads optional `reference_image_url` / `prompt_hint` from `live_cam_garment_settings`.
- `LiveCamSnapshotButton.tsx` — grabs current remote frame, POSTs to `live-cam-snapshot-save`, brief freeze + toast.
- `LiveCamTab.tsx` — composes the above. Layout: garment picker (left), local + remote preview (right), bottom controls (Start / Stop / Capture / status badge / latency ms).

State machine: `idle → starting (spinner "Spinning up GPU…", 90s timeout → error + Retry) → running → ended | failed`.

Teardown triggers (all call `live-cam-session-end`):
- Stop button
- Modal close
- Tab switch away from Live Cam (effect cleanup)
- `beforeunload`
- Logout (auth state change to no-user)

Mobile fallback: if `!navigator.mediaDevices?.getUserMedia` or `!window.WebSocket`, render a single-line notice; no crash.

## 5. `AiStudioModal.tsx` edit (minimal, additive)

Only changes:
1. Import `LiveCamTab` and `useAuth`.
2. Widen the `Tabs` value type from `'picture' | 'video'` to `'picture' | 'video' | 'live-cam'`.
3. Change `TabsList` `grid-cols-2` → `grid-cols-3` only when `role === 'shopper'`; otherwise leave as-is.
4. Append a third `<TabsTrigger value="live-cam">` (conditional on shopper) after Video trigger.
5. Append `<TabsContent value="live-cam"><LiveCamTab /></TabsContent>` after Video content.

No reordering of existing tabs. No styling changes to Picture/Video.

## Technical notes

- WS auth: the orchestrator-returned `ws_url` goes directly to the RunPod proxy; no bearer needed on the WS itself (per Worker contract). The bearer stays server-side.
- Frame protocol: matches the existing `server.py` numpy-buffer format already verified end-to-end; client encodes downscaled video frames to that format.
- Latency: round-trip measured on each frame echo, exponential moving average displayed.
- All edge function responses include CORS headers on success and error paths.

## Open questions before implementation

1. Confirm the correct modal path — the brief says `src/components/ai-studio/AiStudioModal.tsx` but the actual file is `src/components/AiStudioModal.tsx`. I will edit the actual existing file.
2. Should the Live Cam tab be hidden entirely on mobile, or shown with the graceful fallback notice as planned? (Brief says show with fallback — confirming.)
3. The exact reference-image binary format and WS init message shape are taken from `server.py` / `config_with_reference.json` — these aren't in the repo. I will define `liveCamTypes.ts` from the brief and your verified format; please share the message schema or point me to it before I wire `useLiveCamSession.ts`.

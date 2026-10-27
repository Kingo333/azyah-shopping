# Pop-up Virtual Fitting Stand — MVP

Status: proposal. No code yet. **Engine decided 2026-10-27: Live Cam (JoyAI) only.**

## Goal
At a pop-up, a passer-by sees a participating brand's garments on a screen, chooses to try them, and sees themselves wearing them in real time, without changing clothes. Brands upload garments through Azyah; operators run the stand.

## What exists to build on
- Events: `retail_events` (retailer-owned), `event_brands`, `event_brand_products` (garment image + `garment_type`), public read for active events. 1 event, 5 event products today.
- Live Cam (JoyAI / FluxRT) already accepts event products as a garment source (`LiveCamGarmentPicker.tsx`, `garment_source = event_brand_product`).
- AR overlay `/ar/:eventId/:brandId` (3D models, client-only, no GPU cost). **Not used at the kiosk:** owner decided 2026-10-27 that the kiosk runs on Live Cam only. If the GPU isn't ready, the stand shows its attract screen and a "warming up" message, not AR.

## Engine facts that shape the MVP
- **One session per GPU worker** (JoyAI). One stand = one worker.
- **Cold start takes minutes** (new image 5–10 min; warm worker restart faster). A stand needs a kept-warm worker (RunPod *Active workers ≥ 1*) during event hours.
- Cost while warm: RTX 5090 ≈ **$1.58/hr**, RTX PRO 6000 ≈ $3.49/hr (from the brief). An 8-hour day on a 5090 ≈ **$12.60 per stand**, paid even when idle. RunPod balance was −$0.02 on Oct 25: top-up needed before any test.
- Single participant per frame. Multi-person, harsh lighting and occlusion are untested; do not promise them.
- `MAX_SESSION_SECONDS=300` on the worker today; kiosk sessions should be shorter (e.g. 120 s) and restartable.

## MVP scope
**In:** one stand per event, one person at a time, approved garments from one or more participating brands, live try-on with garment switching, attract mode, operator setup and diagnostics, automatic reset, optional QR hand-off for a snapshot.
**Out (later):** multiple people in frame, analytics beyond counts, sizing/fit claims, payments at the stand, face-based anything.

## Workflows
**Brand:** verified partner → Products → mark garments "Try-on ready" (front photo on white or flat-lay, ≥ 768 px, garment type set; automatic background clean-up) → request to join event → retailer/organiser approves.
**Organiser (retailer):** Events → event → Brands (approve) → Kiosk collection (pick approved garments, order) → Stands (create stand, get pairing code) → "Warm up" (operator instruction to set Active workers = 1; later automated) → Preview.
**Operator at the stand:** open `/kiosk/:standId` on the stand device → enter pairing code / operator PIN → readiness checklist (camera found, GPU ready, network latency) → Start attract mode. Long-press corner + PIN to exit.
**Customer:** attract loop → "Tap to try on" → notice: *"This camera shows you wearing the clothes. Nothing is recorded or kept. Tap Start to begin."* → Start → live view, big garment buttons → End or 60 s idle → reset. Optional: "Get your photo" → separate consent → QR → snapshot link expires in 24 h.

## Privacy by design
- Camera frames are processed only after the customer taps Start; nothing before.
- No face recognition, no identity matching, no biometric storage. No camera frames stored by default; only explicit snapshots, behind a second consent, in a private bucket with 24 h expiry.
- Kiosk sessions are anonymous (no user account); a kiosk device token, scoped to one stand and event, signs session requests.
- Visible signage at the stand; staff instructions for children (an adult must start the session).
- Session counts only (start/end, duration, garment ids) for analytics.

## Technical design
- New route shell `/kiosk/:standId` (full screen, no app nav, wake-lock, auto-reconnect).
- New tables (proposal): `kiosk_stands (id, event_id, name, device_token_hash, status)`, `kiosk_collections (event_id, product_ref, sort)`, `kiosk_sessions (id, stand_id, started_at, ended_at, garment_ids)`. RLS: event retailer manages; kiosk device reads its own collection through an Edge Function using the device token, never the service key on the device.
- Session start: a `kiosk-session-start` Edge Function (or a mode of `live-cam-session-start`) that authenticates the device token instead of a user JWT, then calls the same Worker. **No change to the WebSocket protocol.**
- Garment switching uses the existing mid-session reference/prompt messages.
- Recovery: on WS drop, show "Reconnecting…", retry, then return to attract mode; never show raw errors.

## Acceptance for MVP
1. Organiser can publish a collection of ≥ 3 approved garments to a stand.
2. Stand reaches "Ready" from a warm worker in < 30 s.
3. Customer can start, switch 3 garments, and end; stand resets automatically after 60 s idle.
4. No image is stored unless the customer opts in to the QR snapshot.
5. Kill network for 10 s → stand recovers to attract mode without operator help.

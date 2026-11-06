# Live Cam Premium HD — manual test checklist

> **Superseded (Nov 2026).** The app no longer has Standard / Premium HD tiers. There is one
> "Live Try-On" for everyone, free for now. The RunPod endpoint picks the engine (JoyAI or
> FluxRT, `LIVECAM_ENGINE`), and the app always sends `tier = standard`. The server-side
> tier code (edge function `tier.ts`, the Worker, the `tier` / `tier_served` columns) is
> unchanged, so this list is kept for reference only. Current checks:
>
> - [ ] No quality picker, no "Premium HD" / "Beta" labels anywhere in Live Try-On.
> - [ ] Start on a cold endpoint: the loading card says the first start takes about 2–5 minutes;
>       the elapsed timer counts up; it goes live (JoyAI cold starts take several minutes).
> - [ ] **Cancel** while it starts: back to idle, no error, no "aborted"; the session row ends.
> - [ ] A start that never becomes ready fails after 15 minutes with
>       "We couldn’t get your mirror ready this time. Try again, it’s usually much quicker the second time."
> - [ ] During the start: no camera light, the card shows the five steps, the Try on tab shows an amber ring; locking the phone and coming back continues the same start.
> - [ ] Once live: the dotted head-and-shoulders guide shows for a few seconds (not for shoes or bags), a tap hides it, and it returns when nobody is in view.
> - [ ] Switching outfits while live is quick (no restart).
> - [ ] A cold start longer than about 5 minutes (JoyAI) still gives the full 5 minutes of try-on once the mirror opens. The console shows "[live-cam] long start-up: fresh session so the full try-on time is kept"; the card stays on "Last touches" for a second or two, then opens.
> - [ ] `live_cam_sessions` row: `tier = standard`.

Run after each deploy step (migration → edge function → Worker → app).
Use two accounts: one free, one with `profiles.is_premium = true` (set by the
service role / webhook, not from the app).

## Standard is unchanged
- [ ] Standard selected (default) → Start → "Spinning up GPU…" → "Warming up GPU… up to 3 min" → frames stream.
- [ ] Status row shows `RUNNING` + `Standard`, no "Running on Standard" badge.
- [ ] `live_cam_sessions` row: `tier = standard`, `tier_served = standard`.
- [ ] Stop ends the session (`status = ended`).
- [ ] After 5 minutes of streaming the stream stops with "Session ended: 5-minute limit reached" (needs the hardened fluxrt-serverless image).

## Premium with fallback on (`LIVE_CAM_PREMIUM_ACCESS=all`, `PREMIUM_FALLBACK_TO_STANDARD=true`, no premium endpoint)
- [ ] Premium HD (Beta) → Start → runs on the FluxRT endpoint.
- [ ] Status row shows `Standard` and the amber **Running on Standard** badge.
- [ ] Row: `tier = premium`, `tier_served = standard`.
- [ ] Selector is disabled while starting and while running.

## Premium with fallback off (`PREMIUM_FALLBACK_TO_STANDARD` unset/false, no premium endpoint)
- [ ] Premium → "Premium HD is coming soon." + **Start Standard instead**.
- [ ] Row: `status = failed`, `error_message` starts with `premium_not_configured`.
- [ ] "Start Standard instead" switches the selector to Standard and starts a Standard session.

## Access switch
- [ ] `LIVE_CAM_PREMIUM_ACCESS=off` (or unset, or a typo) → Premium shows "coming soon" (403 `premium_disabled`); Standard still works.
- [ ] `premium_only` + free account → "Premium HD is included with Azyah Premium." + **Upgrade** → `/dashboard/upgrade` (403 `premium_required`).
- [ ] `premium_only` + premium account → Premium starts.
- [ ] `premium_only` + premium account whose `premium_expires_at` is in the past → blocked.

## Tokens
- [ ] Forged token: open `wss://<worker>/ws?token=<edit one char of a real token>` → HTTP 401 `invalid_or_expired_token`.
- [ ] Expired token: reuse a `ws_url` after its connect window (300 s Standard / 360 s Premium) → 401.
- [ ] Token with `tier` changed from `standard` to `premium` (signature not updated) → 401.
- [ ] GPU worker directly: `/warmup`, `/api/load`, `/debug/startup` without `X-Session-Token` → 401; `/ping` → 200 (FluxRT) / 204-200 (JoyAI).

## Security fix (premium self-grant)
- [ ] As a signed-in free user, in the browser console:
      `await supabase.from('profiles').update({ is_premium: true }).eq('id', user.id)` → error `premium fields can only be set by the server`.
- [ ] `await supabase.from('subscriptions').insert({ user_id: user.id, status: 'active', current_period_end: '2030-01-01' })` → error.
- [ ] Editing other profile fields (name, avatar) still works.
- [ ] A sandbox purchase/restore on iOS still activates Premium (via the RevenueCat webhook) within a few seconds.

## Engine flip on the RunPod endpoint (fluxrt-serverless `livecam-dual-v1`)
- [ ] Endpoint image `livecam-dual-v1-<sha>`, `LIVECAM_ENGINE=fluxrt`, 48 GB GPU → Standard behaves exactly as before.
- [ ] Flip: `LIVECAM_ENGINE=joyai`, 32 GB PRO GPU, `azyah-joyai` volume attached, Worker `PREMIUM_RUNPOD_LB_ENDPOINT_ID` = same endpoint ID.
- [ ] Warm it (`POST /admin/load {"tier":"premium"}`), then Premium HD → frames stream at 480×840, no "Running on Standard" badge.
- [ ] Session stops at 5 minutes with the limit message.
- [ ] Flip back: `LIVECAM_ENGINE=fluxrt`, 48 GB GPU, clear `PREMIUM_RUNPOD_LB_ENDPOINT_ID` → Standard works; Premium shows the badge again.

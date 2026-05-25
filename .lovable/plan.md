## Switch closet analysis to Gemini-only (testing mode)

Goal: pause FashionCLIP end-to-end, route everything (upload trigger + Profile "Analyze" button + Live Cam read) through Gemini Vision, and drop the merge layer so we only use the existing `prompt_hint` field.

Nothing is deleted — FashionCLIP code and DB columns stay intact so we can re-enable later by reversing the toggle.

### What FashionCLIP currently owns (audited)

DB triggers on `wardrobe_items`:
- `wardrobe_items_fashionclip_dispatch_ins` (AFTER INSERT)
- `wardrobe_items_fashionclip_dispatch_upd` (AFTER UPDATE of image_url, image_bg_removed_url, category)

Both call `public.dispatch_fashionclip_analysis()`, which HTTP-POSTs to `analyze-wardrobe-fashionclip`.

Edge functions in play:
- `analyze-wardrobe-fashionclip`
- `reanalyze-wardrobe-fashionclip-batch` (the one wired to the Profile "Analyze closet items" button)

Tables/columns FashionCLIP writes to in `wardrobe_garment_analysis`:
- `status`, `metadata`, `prompt_hint`, `confidence`, `model_name`, `analysis_version`, `image_hash`, `source_image_url`, `error`

Gemini-only columns we'll keep for traceability (no merge):
- `gemini_metadata`, `gemini_status`, `gemini_error`, `gemini_version`, `primary_provider`

Merge columns we'll stop writing (left in place, unused, so we can re-enable later):
- `final_metadata`, `final_prompt_hint`, `fashionclip_metadata`

### Changes

1. **DB trigger repoint (migration)**
   Update `dispatch_fashionclip_analysis()` body to POST to `/functions/v1/analyze-wardrobe-gemini` instead of `/analyze-wardrobe-fashionclip`. Trigger names stay the same so nothing else needs updating. To re-enable FashionCLIP later we just flip the URL back.

2. **`analyze-wardrobe-gemini` edge function** — drop the merge layer
   - Stop writing `final_metadata` / `final_prompt_hint`.
   - Write Gemini's composed prompt directly into the existing `prompt_hint` column, plus mirror Gemini's raw JSON into `metadata`, set `status='complete'`, `confidence`, `model_name=gemini-2.5-flash`, `analysis_version=gemini-vision-v1`.
   - Continue to set `gemini_metadata`/`gemini_status`/`gemini_version`/`primary_provider='gemini'` for traceability.
   - Dedup logic (normalized URL hash) and twin fan-out unchanged.
   - On failure: set `gemini_status='failed'` and leave `prompt_hint`/`status` untouched (so any stale FashionCLIP value isn't overwritten); Live Cam either keeps prior value or runs without hint.

3. **`useWardrobeItems` hook** — revert to read `prompt_hint` only
   Remove the `final_prompt_hint` fallback I added last step. Live Cam goes back to the simple original read path, which now sees Gemini output because step 2 writes there.

4. **Profile `AnalyzeClosetButton`** — point to Gemini batch
   - Switch `supabase.functions.invoke('reanalyze-wardrobe-fashionclip-batch', …)` → `'reanalyze-wardrobe-gemini-batch'`.
   - Coverage check stays as-is (`status='complete'` + non-empty `prompt_hint`) — still accurate because Gemini now writes those fields.
   - Smoke-test branch calls the Gemini batch with `{ mode: 'smoke-test' }` (already supported).
   - Label/disabled behavior unchanged: "Analyze N closet items" → "All items up to date".

5. **FashionCLIP — paused, not deleted**
   - Edge functions `analyze-wardrobe-fashionclip` and `reanalyze-wardrobe-fashionclip-batch` remain in repo and stay deployed but receive no traffic.
   - Their DB columns remain populated for historical rows.
   - To resume later: flip the trigger URL back and restore the button's function name.

### Acceptance

- New closet uploads call Gemini only; no FashionCLIP HTTP call fires.
- Profile "Analyze closet items" button runs Gemini backfill on remaining unique images and shows the same counters.
- Live Cam picks up Gemini's prompt automatically from `prompt_hint` with no Live Cam edits.
- If Gemini fails on an item, Live Cam either keeps the existing prompt or runs without one — no crash.

### Out of scope (unchanged)

FluxRT/RunPod, FashionCLIP worker, Cloudflare, camera capture, scheduler, WebSocket protocol, Discover/event products, payments/auth, VITE env vars.

Approve and I'll run the trigger migration first, then the three code edits in one pass.
# Safe Live Cam hardening + compact Gemini detail booster + backfill reset

Small, additive changes only. No FluxRT/RunPod/Worker/WS/camera/scheduler/auth/schema changes.

## 1. Live Cam: `set_prompt` dedupe + safe instrumentation

File: `src/components/ai-studio/live-cam/useLiveCamSession.ts`

- Add module-scope helper `hashPrompt(s)` (djb2 → 8-char hex).
- Add `SetPromptReason` type (`initial_start | duplicate_skipped | garment_changed | manual_override_changed | analysis_refresh | unknown`).
- Inside the hook, add two refs:
  - `lastPromptHashRef: useRef<string | null>(null)`
  - `setPromptCountRef: useRef<number>(0)`
- In `cleanupLocal()`, reset both to `null` / `0`.
- In `runHandshake()`, right before the existing `set_prompt` send:
  - Compute `hash = hashPrompt(finalPrompt)`.
  - If `hash === lastPromptHashRef.current` and session id unchanged → skip the send AND the `waitForAck('set_prompt')`; log `reason=duplicate_skipped` and return into `startFrameLoop()` directly. (No-op today; protects future regressions.)
  - Otherwise send, await ack, then `lastPromptHashRef.current = hash`, `setPromptCountRef.current += 1`.
- Replace the existing `console.log('[live-cam] set_prompt ack=true')` with a single structured log:
  ```
  [live-cam] set_prompt sent ts=<iso> sessionId=<id> garmentId=<id> len=<n> hash=<8hex> count=<n> reason=initial_start
  ```
  No full prompt, no base64, no URLs, no tokens.

Frame loop, WS protocol, ack registry, retry logic unchanged.

## 2. Gemini: compact detail booster + length safety

File: `supabase/functions/analyze-wardrobe-gemini/index.ts`

Add a new helper above `composeFinalPromptHint`:

```ts
function buildCompactDetailBooster(g: any, existingHint: string): string {
  // Return one short sentence (≤250 chars) or '' for plain/unknown/duplicative cases.
}
```

Detection — booster only if at least one is true:
- `pattern_type` present and not in {solid, plain, none, unknown}
- `important_visual_details` array has ≥1 meaningful entry
- `surface_texture` meaningful (not in {smooth, unknown})
- `construction_details` array has ≥1 meaningful entry
- `accent_colors` array has ≥1 entry
- `pattern_placement` meaningful
- `logo_or_text === true`

Skip if:
- existingHint already contains the same color word(s) AND "preserve" — avoids duplication
- final composed hint would exceed length cap

Sentence shape (assemble only non-empty parts, cap at 250 chars):
```
Preserve the <pattern_placement+pattern_type> placement, <main_colors[0..1]> base color, <sleeve_length>, <neckline_or_collar>, and <surface_texture+material_appearance> texture. Keep details on the garment and follow the reference image.
```
Use only fields that pass `cleanTextureValue`. Truncate to 250 chars at last space.

Update `composeFinalPromptHint(g)`:
```ts
const parts = [
  UNIVERSAL_BASE,
  `Replace only the ${region}.`,
  detail,
  texture,
  buildCompactDetailBooster(g, detail),  // NEW
  REFERENCE_TRUTH,
].filter(Boolean);
let hint = parts.join(' ');
// Length guard — drop booster first if over 700 chars.
if (hint.length > 700) {
  hint = [UNIVERSAL_BASE, `Replace only the ${region}.`, detail, texture, REFERENCE_TRUTH]
    .filter(Boolean).join(' ');
}
return hint;
```

Add safe debug log after compose (no full prompt):
```
[gemini] composed wardrobe_item_id=<id> hintLen=<n> boosterAdded=<bool> boosterSkipReason=<str|''>
```

No JSON dumping. No second Gemini call. No FashionCLIP merge. No schema changes.

## 3. Reset Gemini backfill (data-only migration)

Single `UPDATE` on `wardrobe_garment_analysis` setting these to NULL across all rows:
`gemini_status, gemini_metadata, gemini_error, gemini_version, primary_provider, final_metadata, final_prompt_hint, prompt_hint, metadata, status, confidence, model_name, analysis_version, error`.

This clears every analysis so the next click of **Analyze with Gemini** re-runs the new composer (with compact booster) on all 10 unique image hashes; the 3 other accounts auto-fan-out via image_hash twin cache.

## 4. Test plan (after approval + build)

Pick 2 items in `shopper@test.com`:
- 1 plain garment (e.g. a solid bottom)
- 1 detailed garment (e.g. dress with pattern or top with graphic)

Trigger Gemini analyze on just those 2 (not full backfill). Then for each, report:
- old vs new `final_prompt_hint` (length + booster added/skipped + skip reason)
- final prompt length after `buildTryOnPrompt()`
- a 30-second Live Cam session: confirm exactly one `[live-cam] set_prompt sent count=1 reason=initial_start` log
- Live Cam responsiveness unchanged

Only after that, run full backfill.

## Out of scope (not modified)

FluxRT, RunPod, Cloudflare Worker, WebSocket protocol, camera capture, frame loop, scheduler, Gemini auth/trigger flow, DB schema, FashionCLIP worker, Live Cam endpoint, payments, auth, Discover/event products.

# Gemini-only Live Cam test — implementation plan

Scope: Live Cam reads Gemini `final_prompt_hint` only for Gemini-complete rows during this test. FashionCLIP stays in DB as backup but is NOT merged into the Live Cam prompt for those rows. Manual per-garment override still wins.

## 1. `src/hooks/useWardrobeItems.ts`
Extend `WardrobeGarmentAnalysis` and the analysis projection to include:
`final_prompt_hint`, `final_metadata`, `primary_provider`, `gemini_metadata`, `gemini_status`, `gemini_error` (alongside existing `status`, `prompt_hint`, `confidence`, `analysis_version`). Map them through into `it.analysis`.

## 2. `src/components/ai-studio/live-cam/LiveCamGarmentPicker.tsx`
Replace `analysisPromptHint` derivation with Gemini-first logic:

```ts
const a = it.analysis;
const geminiReady =
  a?.primary_provider === 'gemini' &&
  a?.gemini_status === 'complete' &&
  !!a?.final_prompt_hint;
const analysisPromptHint = geminiReady
  ? a!.final_prompt_hint!
  : (a?.status === 'complete' ? (a?.final_prompt_hint ?? a?.prompt_hint ?? undefined) : undefined);
```

Update `handlePick` so when `geminiReady` is true, **do NOT concatenate FashionCLIP `prompt_hint`** — only optionally append the manual `override.prompt_hint`:

```ts
const combinedHint = geminiReady
  ? [opt.analysisPromptHint, override?.prompt_hint].filter(Boolean).join(' ').trim() || undefined
  : [opt.analysisPromptHint, override?.prompt_hint].filter(Boolean).join(' ').trim() || undefined;
```
(geminiReady branch never includes FashionCLIP text because `analysisPromptHint` is already Gemini-only.) Track `geminiReady` on the option so handlePick can branch.

Non-Gemini rows keep existing behavior so the 3 failed-429 items still work via FashionCLIP `prompt_hint`.

## 3. `supabase/functions/analyze-wardrobe-gemini/index.ts`
On Gemini success, also write:
- `final_metadata = gemini` (full JSON)
- `final_prompt_hint = composeFinalPromptHint(gemini)`
- `primary_provider = 'gemini'` (already set)

Apply the same to the cross-row twin fan-out branch (write `final_metadata`, `final_prompt_hint` from twin). Keep writing legacy `prompt_hint` / `metadata` for backward compatibility.

## 4. `supabase/functions/reanalyze-wardrobe-gemini-batch/index.ts`
Add:
- `onlyFailed429: boolean` body flag. When true, restrict candidate hashes to those where an existing `wardrobe_garment_analysis` row has `gemini_status='failed'` AND `gemini_error LIKE 'gemini_429%'` (or just equals `'gemini_429'`).
- Slow pacing: when `chunkSize === 1`, `await sleep(6800)` between items in the queue (not before the first). Use a small `sleep = (ms) => new Promise(r => setTimeout(r, ms))`.
- Echo `onlyFailed429` and the candidate count in the response.

## 5. One-time data sync (no Gemini re-call)
Run via insert/update tool for the 7 Gemini-complete rows missing `final_*`:

```sql
UPDATE wardrobe_garment_analysis
   SET final_prompt_hint = COALESCE(final_prompt_hint, prompt_hint),
       final_metadata    = COALESCE(final_metadata, gemini_metadata),
       primary_provider  = COALESCE(primary_provider, 'gemini')
 WHERE gemini_status = 'complete'
   AND gemini_metadata IS NOT NULL
   AND (final_prompt_hint IS NULL OR final_metadata IS NULL OR primary_provider IS NULL);
```

## 6. Retry only the 3 failed 429 rows (after deploy)
User triggers from the Profile button (or curl) with:
```json
{ "provider": "gemini_only", "limit": 1, "chunkSize": 1, "force": true, "onlyFailed429": true }
```
Three times, one item each, ~7s pacing handled server-side.

## Not changed
FluxRT, FashionCLIP worker, RunPod, Cloudflare, camera capture, scheduler, WebSocket streaming, Discover/event products, FashionCLIP DB rows.

## Post-implementation report (will produce)
- Live Cam reads `final_prompt_hint` first (yes/no).
- Gemini-complete rows use Gemini-only hints (yes/no, no FC merge).
- Count of rows with `final_prompt_hint` populated.
- Count of rows with `primary_provider='gemini'`.
- Whether each of the 3 429 rows was retried and outcome.
- One sample Gemini-only `final_prompt_hint`.
- Side-by-side: that item's old FashionCLIP `prompt_hint` vs new Gemini `final_prompt_hint` (no merging in Live Cam).

Switch to build mode to apply.

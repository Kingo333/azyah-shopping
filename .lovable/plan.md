
# Extend Gemini metadata with texture & fabric attributes

Scope: edit only `supabase/functions/analyze-wardrobe-gemini/index.ts`. No DB schema change (existing `gemini_metadata`, `final_metadata`, `metadata` columns are `jsonb` and absorb new keys automatically). No changes to FluxRT, RunPod, Cloudflare, Live Cam, FashionCLIP, scheduler, secrets, or trigger auth.

## 1. Extend `RESPONSE_SCHEMA`

Add these properties (alongside existing ones, nothing removed):

- `material_appearance` — string (already present, keep)
- `surface_texture` — string
- `fabric_structure` — string (enum-ish: flowy | draped | soft | structured | stiff | tailored | unknown)
- `fabric_weight` — string (lightweight | midweight | heavy | unknown)
- `opacity` — string (opaque | semi-sheer | sheer | unknown)
- `finish` — string (matte | slightly glossy | glossy | metallic | brushed | unknown)
- `construction_details` — array of strings
- `texture_confidence` — number

Add `surface_texture`, `fabric_structure`, `finish` to `required` so Gemini reliably returns them (others remain optional → safe to be "unknown" or omitted).

## 2. Lightly extend `GEMINI_PROMPT`

Append a short bullet group after the existing visual-facts list — no rewrite:

```
Also describe how the fabric looks and behaves:
- material_appearance (knit, woven, denim, satin-like, chiffon-like, jersey, lace, mesh, leather-like, unknown)
- surface_texture (ribbed, smooth, fuzzy, quilted, pleated, crinkled, embroidered, glossy, matte, unknown)
- fabric_structure (flowy, draped, soft, structured, stiff, tailored, unknown)
- fabric_weight, opacity, finish
- construction_details (ribbing, pleats, ruffles, smocking, quilting, gathering, embroidery, lace overlay, visible seams)
Use "unknown" when not clearly visible. Do not invent.
```

Existing wording, schema requirements, and `tryon_prompt_hint` instruction stay intact.

## 3. Extend `composeFinalPromptHint(g)`

Keep current structure (`UNIVERSAL_BASE` + region + `tryon_prompt_hint` + `REFERENCE_TRUTH`). Insert one optional sentence built from the new fields, only when values exist and are not "unknown":

```ts
function textureSentence(g) {
  const parts = [];
  const tex = clean(g.surface_texture);
  const mat = clean(g.material_appearance);
  if (tex && mat) parts.push(`${tex} ${mat} texture`);
  else if (mat) parts.push(`${mat} texture`);
  else if (tex) parts.push(`${tex} texture`);
  const struct = clean(g.fabric_structure);
  if (struct) parts.push(`${struct} fabric structure`);
  const fin = clean(g.finish);
  if (fin) parts.push(`${fin} surface finish`);
  const details = (g.construction_details || []).filter(d => clean(d)).slice(0, 4);
  if (details.length) parts.push(`with ${details.join(', ')}`);
  if (!parts.length) return '';
  return `Preserve the ${parts.join(', ')}.`;
}
```
where `clean(v)` returns trimmed lowercase string or empty when missing / "unknown".

Sentence is appended between `tryon_prompt_hint` and `REFERENCE_TRUTH`. If all fields unknown → nothing added (existing prompt unchanged).

## 4. Persistence

No code change needed beyond what's already there: `upsertAnalysis` writes the whole Gemini object into `gemini_metadata`, `final_metadata`, and `metadata`. New fields ride along automatically. `final_prompt_hint` updates because `composeFinalPromptHint` now includes the texture sentence when applicable.

## 5. Testing (post-approval, build mode)

After redeploy:
1. Pick 1–3 items via `supabase--read_query` filtering for visually distinct garments (ribbed/knit, flowy, structured).
2. Invoke `analyze-wardrobe-gemini` with `{ wardrobe_item_id, force: true }` for each (service-role curl with `x-trigger-secret` from vault).
3. Read back `gemini_metadata`, `final_metadata`, `final_prompt_hint` and report:
   - New fields present and populated when visible
   - `unknown` values gracefully omitted from `final_prompt_hint`
   - Existing fields (category, garment_type, colors, etc.) untouched
   - Live Cam still only reads `final_prompt_hint` (no new analyzer calls)

## Hard rules respected

No edits to FluxRT, RunPod, Cloudflare, camera capture, scheduler, WebSocket, FashionCLIP worker, Live Cam endpoint, Gemini API key, or trigger-secret auth. No DB migration. No full backfill — only 1–3 targeted force re-analyses.

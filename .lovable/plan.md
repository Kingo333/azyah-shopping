## Goal
Revert the Gemini prompt composer to the previous stable shape and add one small optional placement/detail sentence. Reset the Gemini backfill so every row is rebuilt with the new composer.

No changes to FluxRT, RunPod, Cloudflare Worker, WebSocket protocol, camera/frame loop, scheduler, Gemini trigger/auth, DB schema, FashionCLIP worker, Live Cam endpoint, payments, auth, or Discover products.

---

## 1. `supabase/functions/analyze-wardrobe-gemini/index.ts`

### 1a. Shorten `REFERENCE_TRUTH`
Replace the current long sentence with the simpler version the user specified:
```ts
const REFERENCE_TRUTH =
  'The reference image is the source of truth. If any text description conflicts with the reference image, follow the reference image.';
```

### 1b. Append a small instruction to `GEMINI_PROMPT`
Do not rewrite the prompt. Append, after the existing "Do not change category if uncertain." line:
```
If the garment has a visible graphic, logo, text, embroidery, border, trim, stripe, floral print,
or other design detail, identify its simple placement using detail_location, detail_type,
detail_scale, detail_orientation, and detail_confidence. Use "unknown" when uncertain.
The reference image remains the source of truth.
```

### 1c. Add 5 optional fields to `RESPONSE_SCHEMA` (not in `required`)
Inside `properties`:
```ts
detail_location:    { type: 'string' },
detail_type:        { type: 'string' },
detail_scale:       { type: 'string' },
detail_orientation: { type: 'string' },
detail_confidence:  { type: 'number' },
```
`required` array is unchanged — Gemini may omit these for plain garments.

### 1d. Replace `buildCompactDetailBooster` with `buildSmallPlacementSentence`
New helper (single short sentence, only when Gemini is confident about a visible design detail):

```ts
function buildSmallPlacementSentence(g: any, existingHint: string)
  : { sentence: string; skipReason: string } {

  const conf = typeof g?.detail_confidence === 'number' ? g.detail_confidence : 0;
  if (conf < 0.6) return { sentence: '', skipReason: 'low_confidence' };

  const loc  = cleanTextureValue(g?.detail_location);
  const type = cleanTextureValue(g?.detail_type);
  if (!loc || !type) return { sentence: '', skipReason: 'unknown_location_or_type' };

  const scale = cleanTextureValue(g?.detail_scale);   // small | medium | large | ''
  const orient = cleanTextureValue(g?.detail_orientation); // upright | horizontal | vertical | diagonal | repeated | ''

  // Build a short, type-aware sentence (≤180 chars).
  let sentence: string;
  if (type === 'graphic' || type === 'logo' || type === 'text') {
    const size = scale && scale !== 'unknown' ? `${scale} ` : '';
    sentence = `Keep the ${size}${type} on the ${loc} and contained within the garment area.`;
  } else if (type === 'embroidery' || type === 'trim' || type === 'border') {
    sentence = `Preserve the ${type} placement along the ${loc}.`;
  } else if (type === 'stripes' || type === 'floral print' || type === 'texture') {
    const dir = orient && orient !== 'unknown' ? `${orient} ` : '';
    sentence = `Keep the ${dir}${type} placement on the ${loc}.`;
  } else {
    sentence = `Preserve the ${type} placement on the ${loc}.`;
  }

  if (sentence.length > 180) sentence = sentence.slice(0, 178).replace(/\s+\S*$/, '') + '.';

  // Duplication guard — skip if existing tryon_prompt_hint already mentions both.
  const lower = (existingHint || '').toLowerCase();
  if (lower.includes(type) && lower.includes(loc)) {
    return { sentence: '', skipReason: 'duplicate_of_hint' };
  }
  return { sentence, skipReason: '' };
}
```

### 1e. Restore the previous stable `composeFinalPromptHint`
```ts
function composeFinalPromptHint(g: any, debugCtx?: { wardrobe_item_id?: string }): string {
  const region  = (g?.body_region_to_replace || 'garment region').toString();
  const detail  = (g?.tryon_prompt_hint || '').toString().trim();
  const texture = buildTextureSentence(g);
  const { sentence: placement, skipReason } = buildSmallPlacementSentence(g, detail);

  const withPlacement = [
    UNIVERSAL_BASE,
    `Replace only the ${region}.`,
    detail,
    texture,
    placement,
    REFERENCE_TRUTH,
  ].filter(Boolean).join(' ');

  let finalHint = withPlacement;
  let added = !!placement;
  let reason = skipReason;

  // Length guard — drop placement sentence first if hint exceeds 700 chars.
  if (finalHint.length > 700 && added) {
    finalHint = [
      UNIVERSAL_BASE,
      `Replace only the ${region}.`,
      detail,
      texture,
      REFERENCE_TRUTH,
    ].filter(Boolean).join(' ');
    added = false;
    reason = 'length_guard_dropped';
  }

  console.log('[gemini] composed', {
    wardrobe_item_id: debugCtx?.wardrobe_item_id ?? null,
    hintLen: finalHint.length,
    placementAdded: added,
    placementSkipReason: reason,
  });
  return finalHint;
}
```

Delete the now-unused `buildCompactDetailBooster`, `isMeaningful`, and `meaningfulArray` helpers.

No other file in the function changes. The Gemini API call, dedup/fan-out, upsert, error handling, and 503 paths are untouched.

---

## 2. Reset the Gemini backfill (data-only migration)

One migration that nulls the analysis columns on every `wardrobe_garment_analysis` row, so the next "Analyze with Gemini" click rebuilds all 10 unique image hashes with the new composer:

```sql
UPDATE public.wardrobe_garment_analysis
SET gemini_status     = NULL,
    gemini_metadata   = NULL,
    gemini_error      = NULL,
    gemini_version    = NULL,
    primary_provider  = NULL,
    final_metadata    = NULL,
    final_prompt_hint = NULL,
    prompt_hint       = NULL,
    metadata          = NULL,
    confidence        = NULL,
    model_name        = NULL,
    analysis_version  = NULL,
    error             = NULL,
    status            = 'pending';
```

`status` is NOT NULL, so we set it to `'pending'` instead of NULL. No rows deleted; no schema changes.

---

## 3. Live Cam — no changes needed
Already shipped: hashing + dedupe in `useLiveCamSession.ts` (set_prompt sent once per session). Verified that the Live Cam picker reads only `final_prompt_hint` for Gemini-ready rows. Nothing to modify here.

---

## 4. Test plan (after build)
Pick 2 wardrobe items:
- one plain garment (solid color, no print)
- one detailed garment (visible graphic, stripe, embroidery, or border)

Click "Analyze with Gemini" for each. Verify in edge function logs (`[gemini] composed`):
- plain item → `placementAdded=false`, skip reason `low_confidence` or `unknown_location_or_type`
- detailed item → `placementAdded=true`, hint length under 700
- both `final_prompt_hint` values include UNIVERSAL_BASE + region + tryon_prompt_hint + texture + REFERENCE_TRUTH

Then a 30-second Live Cam session on the detailed item — confirm exactly one `[live-cam] set_prompt sent count=1 reason=initial_start` log and that responsiveness is unchanged.

Only after that, run the full backfill button.
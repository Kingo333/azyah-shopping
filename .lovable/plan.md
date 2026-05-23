## Goal

Make Live Cam try-on prompts category-aware using existing metadata only. No AI vision, no schema changes, no protocol changes. New items added to Discover or My Closet are picked up automatically because the picker already reads from the database — the prompt builder uses whatever category/title/description is stored.

## Files to change

1. `src/components/ai-studio/live-cam/liveCamTypes.ts`
2. `src/components/ai-studio/live-cam/LiveCamGarmentPicker.tsx`
3. `src/components/ai-studio/live-cam/useLiveCamSession.ts`
4. New: `src/components/ai-studio/live-cam/buildTryOnPrompt.ts`

## 1. Extend `LiveCamGarmentSelection`

Add optional metadata fields used only for prompt building:

```ts
category?: string;        // raw value from DB (slug, label, garment_type)
description?: string;
```

`label` already carries the display name and is reused as the item name in the prompt.

## 2. Picker — read existing metadata

Confirmed available columns (no schema changes):

- `products`: `title`, `description`, `category_slug`
- `wardrobe_items`: `name`, `brand`, `category`
- `event_brand_products`: `garment_type` (no description)

Update the two `supabase.from(...).select(...)` calls and the wardrobe mapping to also pull these columns, and pass `category` + `description` into the `LiveCamGarmentSelection` returned by `handlePick`. Nothing else in the picker UI changes.

This is the "self-aware" hook: any new row added to these tables flows into the picker and into the prompt builder automatically, with no code change needed.

## 3. New `buildTryOnPrompt.ts`

Pure function, no network, no AI:

```ts
type Category = 'tops' | 'bottoms' | 'dresses' | 'outerwear' | 'shoes' | 'bags' | 'accessories';

export function buildTryOnPrompt(input: {
  category?: string;
  name?: string;
  description?: string;
  promptHint?: string;
}): string
```

Steps:

a. **Normalize category** with a keyword map applied to a lowercased input:

```text
tops       → top, shirt, tee, t-shirt, blouse, sweater, hoodie, jumper, cardigan, polo, tank, crop
bottoms    → bottom, pant, trouser, jean, short, skirt, legging, jogger, chino
dresses    → dress, gown, kaftan, abaya, jumpsuit, romper
outerwear  → jacket, coat, blazer, parka, puffer, trench, vest, outerwear
shoes      → shoe, sneaker, boot, heel, sandal, loafer, mule, footwear
bags       → bag, purse, tote, clutch, backpack, handbag
accessories→ accessory, hat, cap, scarf, belt, sunglass, glove, watch, jewel, ring, necklace, bracelet, earring
```

If no match, return `null` → universal base only.

b. **Compose prompt** in this order:

1. Universal base (the new wording from the request).
2. Category-specific block (the 7 blocks verbatim from the request).
3. `Selected item name: {name}.` if name present.
4. `Item description: {description}.` if description present.
5. `Additional item guidance: {promptHint}.` if promptHint present.

Joined with single spaces. Missing fields are skipped silently — never guessed.

## 4. `useLiveCamSession.ts`

- Replace the current `DEFAULT_TRYON_PROMPT` constant + inline `hint ? ... : ...` with a call to `buildTryOnPrompt({ category, name: garment.label, description, promptHint })`.
- Existing handshake order is already correct (ready → set_reference_image + ack → set_prompt + ack → frames) and is preserved as-is.
- Add the requested temporary logs alongside the existing ones (no base64, no full prompt text):

```text
[live-cam] item id=<id> category=<raw> source=<source>
[live-cam] name exists=<bool> description exists=<bool> promptHint exists=<bool>
[live-cam] final prompt length=<n>
[live-cam] set_reference_image ack=<bool>
[live-cam] set_prompt ack=<bool>
```

The ack logs already exist; the rest are added at the same call sites.

## Acceptance

- Bottoms / tops / dresses / shoes / bags / accessories / outerwear each get their dedicated preservation clause.
- Unknown or missing category falls back to universal base only.
- `promptHint` is still appended.
- New Discover or Closet items automatically benefit — no per-item code.
- No schema, RunPod, Cloudflare, Supabase function, WS, capture, or render changes.

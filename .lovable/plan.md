# Fix Enhance — align with working video try-on TNB format

## Root cause
The working `thenewblack-picture` / `thenewblack-video` functions authenticate by passing `?api_key=${THE_NEW_BLACK_API_KEY}` in the **URL query string** and only send the workflow inputs in `FormData`.

The `enhance-wardrobe-item` function still uses the old contract: it appends `email` and `password` to FormData and posts to a clean URL. TNB now rejects this with `400 MISSING_DATA`. The API key itself is fine — it's the format that's wrong.

## Changes (1 file)

### `supabase/functions/enhance-wardrobe-item/index.ts`

1. **Auth swap** — replace email/password with `api_key` in URL, mirroring `thenewblack-picture`:
   ```ts
   const apiKey = Deno.env.get('THE_NEW_BLACK_API_KEY');
   if (!apiKey) throw new Error('THE_NEW_BLACK_API_KEY not configured');

   const formData = new FormData();
   formData.append('image', item.image_url);
   formData.append('type', clothingType);

   const newBlackResponse = await fetch(
     `https://thenewblack.ai/api/1.1/wf/image-to-ghost?api_key=${apiKey}`,
     { method: 'POST', body: formData }
   );
   ```
   Remove the `THE_NEW_BLACK_EMAIL` / `THE_NEW_BLACK_PASSWORD` env reads entirely.

2. **Credit deduction moved to after success** — validate `wardrobe_credits >= 1` up front (return early if not), but only call `deduct_wardrobe_credit` AFTER TNB + Picsart + upload + DB update all succeed. Prevents users losing a credit on a TNB or Picsart failure.

3. **Better error surfacing** — include TNB/Picsart HTTP status and response body snippet in the thrown error so the UI toast shows the real reason:
   ```ts
   throw new Error(`The New Black API ${newBlackResponse.status}: ${errorText.slice(0, 200)}`);
   ```

## Out of scope
- No frontend changes (`WardrobeItemDetailModal`, `useEnhanceWardrobeItem` untouched).
- Picsart step unchanged.
- No DB / RLS / config.toml changes.

## Verification
After deploy: click Enhance on a wardrobe item → TNB returns 200 with a ghost-mannequin URL → Picsart removes bg → image saved to `wardrobe-items` bucket → `image_bg_removed_url` updated → 1 wardrobe credit deducted. On any failure, no credit is deducted and the toast shows the upstream status.

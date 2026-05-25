## Plan

1. Add a shared defensive URL normalization helper inside both FashionCLIP Edge Functions:
   - Read `FASHIONCLIP_WORKER_URL`
   - `trim()` whitespace
   - Strip one layer of surrounding single or double quotes
   - Remove trailing slashes
   - Validate with `new URL(cleanedValue)`

2. Update diagnostics returned by both functions:
   - `workerUrlValid: true | false`
   - `workerUrlError: null | "invalid_absolute_url"`
   - `workerHost`
   - `workerPathShape`
   - Never log or return the full worker URL

3. Use only the cleaned, validated base URL for worker calls:
   - `GET {base}/ping`
   - `POST {base}/analyze`
   - If invalid, return a clear diagnostic immediately instead of attempting fetch and reporting generic `unreachable`.

4. Preserve Live Cam / Cloudflare isolation:
   - Touch only:
     - `supabase/functions/analyze-wardrobe-fashionclip/index.ts`
     - `supabase/functions/reanalyze-wardrobe-fashionclip-batch/index.ts`
   - No changes to Cloudflare livestream, FluxRT, camera, or streaming code paths.

5. Validation after you re-save the secret exactly as:
   - `FASHIONCLIP_WORKER_URL=https://ik55d90xltg9id.api.runpod.ai`
   - Run only **Smoke test worker**.
   - Do not run **Analyze 3 closet items** until smoke test returns a valid `workerHost` and real ping/analyze HTTP statuses.
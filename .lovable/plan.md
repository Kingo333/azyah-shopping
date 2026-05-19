# Live Cam wiring fixes

Three deterministic edits, no DB/bucket/Worker changes.

## 1. Edge functions (all three)

Files:
- `supabase/functions/live-cam-session-start/index.ts`
- `supabase/functions/live-cam-session-end/index.ts`
- `supabase/functions/live-cam-snapshot-save/index.ts`

Changes in each:
- Remove `import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';`
- Add inline at top:
  ```ts
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
  ```
- Replace `supabase.auth.getClaims(token)` with `supabase.auth.getUser(token)`; read user id as `data.user.id` (with appropriate null/error guarding, returning 401 on failure).

Then redeploy all three functions.

## 2. AiStudioModal.tsx — gate Live Cam tab

`src/components/AiStudioModal.tsx` line 56:

```ts
const isShopper = !!user && (user.user_metadata?.role ?? 'shopper') === 'shopper';
```

Prevents guests from seeing the tab (avoids guaranteed 401).

## Out of scope
No changes to picture/video tabs, wardrobe, DB schema, RLS, storage buckets, Worker, or auth.

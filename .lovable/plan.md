## Goal

Restore the original FashionCLIP "Analyze closet items" button exactly as it was, and add a **parallel** Gemini Vision backfill button next to it. The two paths never touch each other.

## Scope guardrails

- **Do NOT modify** `analyze-wardrobe-fashionclip`, `reanalyze-wardrobe-fashionclip-batch`, the `dispatch_fashionclip_analysis` trigger, FashionCLIP secrets, FluxRT, RunPod, Cloudflare, camera, scheduler, payments, or auth.
- All changes live in the Gemini lane + one revert of the FashionCLIP button to its original behavior.

## Changes

### 1. Revert `AnalyzeClosetButton.tsx` to original FashionCLIP behavior
- Invokes `reanalyze-wardrobe-fashionclip-batch`.
- Coverage gated on `status='complete' && prompt_hint` (existing column).
- Labels: "Analyze N closet items" / "All items up to date".
- Remove all Gemini references from this file.

### 2. New `AnalyzeClosetGeminiButton.tsx` (sibling, identical UX)
- Invokes `reanalyze-wardrobe-gemini-batch`.
- Coverage gated on `gemini_status='complete' && gemini_metadata` (already-existing columns from prior Gemini migration).
- Labels: "Analyze N items with Gemini" / "All items analyzed (Gemini)".
- Same smoke + batch + expandable result panel UI as the FashionCLIP button.

### 3. Profile page — render both buttons stacked
Where `AnalyzeClosetButton` currently mounts, render `AnalyzeClosetButton` then `AnalyzeClosetGeminiButton` underneath. No other Profile changes.

### 4. Fix the Gemini 401 (root cause of the `http_401` errors)
The vault read via `admin.schema('vault').from('decrypted_secrets')` returns `null` from edge runtime (vault is not exposed through PostgREST), so the `x-trigger-secret` header is empty and both Gemini functions fall through to a Bearer path that `getClaims` rejects.

**Migration** — new SECURITY DEFINER RPC:
```sql
create or replace function public.get_fashionclip_trigger_secret()
returns text language plpgsql security definer set search_path = public, vault as $$
declare s text;
begin
  select decrypted_secret into s from vault.decrypted_secrets where name = 'FASHIONCLIP_TRIGGER_SECRET' limit 1;
  return s;
end $$;
revoke all on function public.get_fashionclip_trigger_secret() from public, anon, authenticated;
grant execute on function public.get_fashionclip_trigger_secret() to service_role;
```

**Edge function edits (Gemini lane only):**
- `reanalyze-wardrobe-gemini-batch/index.ts` — replace its vault `.from('decrypted_secrets')` call with `admin.rpc('get_fashionclip_trigger_secret')`, then send it in `x-trigger-secret` when invoking `analyze-wardrobe-gemini`.
- `analyze-wardrobe-gemini/index.ts` — keep the `x-trigger-secret` check as the primary auth path (now actually populated). Leave the user-JWT branch untouched for direct calls.

FashionCLIP functions are not edited.

### 5. `useWardrobeItems` — no change
It already reads `prompt_hint`, which FashionCLIP populates. Gemini writes to its own `gemini_metadata` + (parallel) `prompt_hint`, so Live Cam keeps working off whichever ran last; we can later choose a winner.

## Out of scope
FashionCLIP code/config, scheduler, AR, camera, payments, auth, UI restyling beyond adding the second button.

Confirm and I'll implement.

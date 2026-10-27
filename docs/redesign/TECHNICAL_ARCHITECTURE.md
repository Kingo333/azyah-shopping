# Technical Architecture

## Keep the stack
React 18 + Vite + TypeScript + Tailwind/shadcn + React Query + Capacitor (iOS) + Supabase. No framework change is justified; the problems are structure and duplication, not the stack.

## Target folder structure (incremental, file moves only when a feature is touched)
```
src/
  app/            router (lazy routes), providers, shells (ShopperShell, PartnerShell, KioskShell)
  features/
    discover/     for-you, search, globe
    try-on/       TryOnScreen, garment sources, live/ (current live-cam code moved as-is), photo/, video/
    community/    feed, create, outfit detail, canvas entry
    profile/
    partner/
    kiosk/
  shared/         ui (shadcn), cards, hooks (auth, role, flags), lib (supabase client, query keys)
```
`src/components/ai-studio/live-cam/*` moves to `src/features/try-on/live/` **without code changes** in the same PR as its tests, so the engine contract stays identical.

## Boundaries
| Boundary | Rule |
|---|---|
| UI ↔ try-on providers | UI talks to a `TryOnSession` interface: `start(garment)`, `setGarment(garment)`, `stop()`, events `status/ready/error/frame`. Live = existing `useLiveCamSession`. Photo/Video = existing The New Black calls in `src/lib/tryon/providers/`. |
| Garment input | One type `GarmentRef = { source: 'product' | 'wardrobe' | 'event_product', id }`, resolved to image URL + name + description + analysis hint. Passed via URL (`/try-on?product=…`) so it survives reloads and deep links. |
| Live Cam session orchestration | Unchanged: app → `live-cam-session-start` → Worker `fluxrt-orchestrator` (signed token) → RunPod LB endpoint → WS `/ws`. |
| Roles | One hook `useRole()` reading `user_roles` (today's `roleCache`). Remove `user_metadata.role` reads for UI decisions. Backend authorization stays in RLS and Edge Functions. |
| Data access | Feature hooks own query keys (`['products', filters]`, `['fits','public']` …) defined in one `queryKeys.ts`. |
| Feature flags | Existing `FeatureFlagsContext`; every hidden legacy feature gets a named flag documented in FEATURE_DECISIONS.md. |

## Performance
- Route-level `React.lazy` for every page (today all ~50 pages load up front → 2.84 MB main chunk). Target: initial JS < 600 KB gzip on Discover, measured with `vite build` output and Lighthouse on a mid-range phone.
- three.js / MediaPipe / echarts only in the chunks that need them (Globe, AR, Partner analytics).
- Bounded queries: Explore currently selects `country` for every user and `country_code` for every brand; replace with grouped counts via an RPC.

## Live Cam — reliability notes for the Try On redesign (no engine changes)
Existing behaviour to preserve: cold-start retry with backoff until a tier-specific warm-up timeout (`useLiveCamSession.ts:276–365`), mid-session garment swap without reconnect, engine hints from `ready` (JoyAI 480×840 @24 fps; FluxRT 288×512 @12 fps), snapshot save, session end call.
UI additions only: explicit status states, Cancel during warm-up, stop on tab hide / app background, one session at a time. Quality ideas from the brief (Gemini detail sentences in the JoyAI instruction, garment clean-up to white 1024 px, WebRTC/H.264) are listed in IMPLEMENTATION_PLAN.md Phase 5b as **separate, engine-side** PRs.

## Edge Functions
Bring the 41 live-only functions into git (read-only download) before any retirement. Retire unused ones (BitStudio, beauty, ASOS variants, legacy payments) only with approval.

## Build hygiene
- Fix `package-lock.json` drift; pick one package manager.
- The Lovable MCP Vite plugin rewrites `supabase/functions/mcp/index.ts` when `VITE_SUPABASE_PROJECT_ID` is unset: set it in CI/local env or take ownership of that file (delete its banner line, per the plugin's own comment).
- Move the 10+ root-level `SECURITY_*`, `AR_*`, `EVENT_TRYON_*` docs into `docs/archive/` with a note that they may be outdated.

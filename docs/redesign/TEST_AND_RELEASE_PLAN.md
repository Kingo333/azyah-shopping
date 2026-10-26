# Test and Release Plan

## Tooling found
- **Vitest** (`vitest.config.ts`): 12 test files, 134 tests, all passing at baseline (2026-10-26).
- **Playwright** configured (`playwright.config.ts`, `playwright-fixture.ts`); no suite confirmed in CI yet.
- **CI**: only `.github/workflows/expo-build.yml` (no test job runs on PRs); Vercel builds previews per PR; Codemagic for iOS (`codemagic.yaml`). Adding a test+build workflow is part of Phase 2.
- Install requires `npm install --legacy-peer-deps` (lockfile drift) — fix in Phase 6 or earlier if CI needs it.

## Baseline evidence (keep updating)
| Metric | Baseline | Target |
|---|---|---|
| Unit tests | 134/134 pass | all pass + new tests per phase |
| Main JS chunk | 2,844 KB (753 KB gzip) | Discover initial load < 600 KB gzip |
| Build time | ~48 s | — |
| Supabase advisors | 173 anon + 173 authenticated SECURITY DEFINER warnings, 14 search_path, leaked-password off, PG patch pending | Critical ones (S1–S4) closed; trend down each phase |
| Live Cam | 5 sessions / 60 days, all `ended` | Owner phone test passes each Try On PR |

## Coverage by area
| Area | How |
|---|---|
| Signup / login / reset / callback | Playwright on preview with test accounts; deep link manual test on iOS |
| Role permissions (shopper/brand/retailer) | SQL probe scripts run as `anon` / test users on a Supabase branch (RLS + RPC) |
| Guest browsing | Playwright: Discover, Search, Globe, Community, share pages without login |
| Search & filters | Unit tests for query builders; Playwright result smoke |
| Swipe, likes, saves, follows, comments | Existing component tests + Playwright |
| Post creation, canvas save/reload, publish visibility | Playwright + RLS probe (private fit not visible to others) |
| Globe | Regression tests of today's behaviour first (Phase 2.0): 4 tabs Brands/Follow/People/Deals (no Fit), `?tab=` deep links, country drawer opens on pin tap, Following/Deals drawers open; render smoke; no location prompt |
| Product → Try On handoff | Unit (GarmentRef resolution) + Playwright (URL param preselects garment) |
| Camera denied / unsupported | Playwright with permissions denied |
| Live session start/stop, swap, disconnect, cold start | Mocked WebSocket tests for state machine; **owner phone test** on preview against a warm worker |
| Event publishing, kiosk reset/cleanup | Phase 5 tests (KIOSK_MVP.md acceptance) |
| Old URLs / deep links | Redirect table test |
| Responsive | Playwright at 390×844, 768×1024, 1440×900 |
| Accessibility | axe checks in Playwright; keyboard nav on desktop |
| Existing data | Manual check of all 8 accounts after each release |

## Release & rollback
1. Every change on a branch → draft PR → Vercel preview → tests + build green → owner review → owner says merge.
2. Database changes: Supabase branch first → owner approval → production → probes → advisors.
3. Edge Functions / Worker / RunPod: only with owner approval; RunPod via a Chrome-extension prompt.
4. Rollback: frontend = revert the merge commit (Vercel redeploys) or switch the feature flag off; database = the matching file in `supabase/rollbacks/`; functions = redeploy previous version.

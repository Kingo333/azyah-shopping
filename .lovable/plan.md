

## Audit: AR Try-On Implementation vs. Spec

### What's Done Correctly

| Area | Status | Notes |
|------|--------|-------|
| **Database migration** | Done | `ar_model_url`, `ar_enabled`, `ar_scale`, `ar_position_offset`, `ar_model_format` columns added to `event_brand_products`. Types file reflects them. |
| **Storage bucket** | Done | `event-ar-models` bucket created with RLS policies |
| **Edge function** | Done | `thenewblack-event-tryon` deployed with proper CORS, auth validation, The New Black API call, result storage, job tracking |
| **EventTryOnModal rewrite** | Done | Polling removed, direct sync call to `thenewblack-event-tryon`, clean upload-then-generate flow |
| **BrandProductManager 3D upload** | Done | `.glb/.gltf` upload section added, writes to `event-ar-models` bucket, updates `ar_model_url` and `ar_enabled` |
| **EventARButton + QR** | Done | QR code modal with canvas rendering, correct `/ar/:eventId/:brandId` URL, conditional rendering based on `hasARProducts` |
| **Events.tsx integration** | Done | AR button added per brand, `hasARProducts` check uses `ar_model_url && ar_enabled` |
| **ARExperience page** | Done | Camera feed, Three.js overlay, MediaPipe pose tracking, product selector carousel |
| **App.tsx route** | Done | `/ar/:eventId/:brandId` route added outside ProtectedRoute |

### Issues Found

**1. BrandProductManager still has BitStudio upload logic (lines 433-517)**
The outfit image upload handler still imports and calls `BitStudioClient.uploadImage()`, sets `try_on_provider: 'bitstudio'`, and saves `outfit_bitstudio_id`. Since the event try-on now uses The New Black, this is dead code that will confuse retailers and waste BitStudio API calls. It should be simplified to just upload to Supabase storage and set the outfit URL — no BitStudio involvement needed.

**2. Edge function uses `getUser()` instead of `getClaims()`**
Line 41 uses `await userClient.auth.getUser(token)` which makes a server round-trip. Per Supabase best practices, this should use `getClaims(token)` for faster JWT validation. Not a blocker but a performance issue.

**3. AR route is inside the Router but accessibility unclear**
The `/ar/:eventId/:brandId` route is added at line 280 of App.tsx. Need to confirm it's outside `<ProtectedRoute>` wrapper — from the search results it appears to be placed correctly alongside other public routes.

**4. No `name` field on ARProduct or product selector**
The `ARExperience.tsx` `ARProduct` interface lacks a `name` field. The product selector thumbnails show images but no product names — minor UX gap.

### Recommended Fixes

1. **Remove BitStudio from BrandProductManager outfit upload** — Simplify the outfit upload handler (lines 433-517) to only upload to Supabase storage and save the URL. Remove `BitStudioClient` import, `outfit_bitstudio_id`, and `try_on_provider: 'bitstudio'`. Set `try_on_provider: 'thenewblack'` instead.

2. **Switch edge function auth to `getClaims()`** — Replace `getUser(token)` with `getClaims(token)` for faster validation.

3. **Add product name to AR experience** — Include `name` in the AR product query and display it below the selected product thumbnail.

### Overall Verdict

The implementation is **functionally complete and logically sound**. All 4 spec changes are implemented. The main cleanup needed is removing the leftover BitStudio logic from BrandProductManager's outfit upload flow, which contradicts the "replace BitStudio/Gemini with The New Black" goal.


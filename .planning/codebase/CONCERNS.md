# Codebase Concerns

**Analysis Date:** 2026-03-29

## Tech Debt

**Extensive Use of `any` Type:**
- Issue: 656 instances of `any` type used in TypeScript codebase, defeating type safety benefits
- Files: Widespread across `src/components/` and `src/hooks/`
  - `src/components/AddProductModal.tsx`: Lines 29, 257, 285, 286, 290
  - `src/components/AiStudioModal.tsx`: Multiple error handlers using `error: any`
  - `src/components/AiTryOnModal.tsx`: Multiple parameters and error catches with `any`
  - `src/components/AnalyticsDashboard.tsx`: Icon configuration with `Record<string, any>`
  - `src/components/brand/ServicesMarketplace.tsx`: Data transformation with `(item: any) =>`
- Impact: Reduces type safety; refactoring and debugging harder; IDE autocomplete ineffective; potential runtime errors not caught at compile time
- Fix approach: Gradually replace `any` with proper TypeScript interfaces. Start with error handlers using custom Error types, then move to component props

**Monolithic Generated Types File:**
- Issue: `src/integrations/supabase/types.ts` is 6,878 lines of auto-generated code
- Files: `src/integrations/supabase/types.ts`
- Impact: Slow IDE performance, difficult to navigate, makes diffs hard to review when schema changes
- Fix approach: Keep as-is but consider splitting into logical modules if schema continues to grow. Use TypeScript path aliases for cleaner imports

**Inconsistent Error Handling Patterns:**
- Issue: Mix of error handling approaches - some components use try/catch, others use .catch(), some don't handle errors at all
- Files:
  - `src/components/AddProductModal.tsx`: Lines 257, 322 use `error: any` with custom message extraction
  - `src/components/AiStudioConnectionTest.tsx`: Async errors caught but inconsistently
  - `src/components/AiTryOnModal.tsx`: Multiple async operations without uniform error handling
- Impact: Unpredictable error propagation; inconsistent user feedback; debugging difficulties
- Fix approach: Create a standardized error handling wrapper/utility. Establish error types for different failure modes (network, permission, validation)

**Widespread Use of `any` in Error Handlers:**
- Issue: Most error handlers use `catch (error: any)` instead of proper typing
- Files:
  - `src/components/AddProductModal.tsx`: Line 257, 322
  - `src/components/AiStudioConnectionTest.tsx`
  - `src/components/AiTryOnModal.tsx`: Lines 337, 539, 571, 663
- Impact: Loss of type information; error properties accessed without validation; potential undefined property access
- Fix approach: Define common error types; create custom error classes; use type guards to extract error messages

## Known Bugs

**Session Health Check Overly Aggressive:**
- Issue: Session health check in `src/contexts/AuthContext.tsx` and `src/utils/sessionHealthCheck.ts` performs repeated checks on startup that may discard valid sessions
- Symptoms: Users occasionally logged out after app restart despite valid session token
- Files:
  - `src/contexts/AuthContext.tsx`: Lines 46-63 (health check logic)
  - `src/utils/sessionHealthCheck.ts`: Lines 77-120 (validation logic)
- Workaround: Health check now requires 3+ consecutive failures before clearing auth state (less aggressive than before)
- Root cause: Initial version checked session once per app load; legitimate temporary network issues could force logout

**Auto-Logout Logic Not Fully Documented:**
- Issue: Auto-logout triggered on token expiry or network failures, but conditions and recovery paths are complex
- Symptoms: Users may experience unexpected logouts
- Files: `src/contexts/AuthContext.tsx` lines 94-101, 103-110
- Related commit: `176e0c0a` Fix auto-logout logic (indicates this was recently addressed)
- Fix: Session recovery now attempts graceful navigation instead of forced full logout

**Memory Leak Risk in Image URL Management:**
- Issue: While `useObjectUrl` and `useObjectUrls` hooks have cleanup, multiple image uploads may still accumulate URLs if components unmount unexpectedly
- Symptoms: Performance degradation after many uploads; increased memory usage
- Files:
  - `src/hooks/useObjectUrl.ts`: Cleanup logic at lines 19-21, 45-47
  - `src/components/AddProductModal.tsx`: Bulk upload at line 55-57
- Risk: If modal is quickly opened/closed during upload, cleanup may not execute
- Mitigation: Hooks have proper cleanup; consider adding session storage reset on app init

## Security Considerations

**Supabase Secrets in Client Code:**
- Risk: Supabase public API key and URL are visible in `src/integrations/supabase/client.ts`
- Files: `src/integrations/supabase/client.ts`
- Current mitigation: Uses public key (not secret key). Supabase provides RLS (Row Level Security) on database
- Recommendations:
  - Ensure all tables have proper RLS policies in Supabase
  - Regularly audit RLS rules to prevent unauthorized data access
  - Never commit `.env.local` files with secret keys
  - Monitor Supabase dashboard for unauthorized access attempts

**User Profile Data Exposure:**
- Risk: Social media handles and personal data stored in `socials` JSON field in profiles
- Files: `src/pages/ProfileSettings.tsx` lines 36-47 (ProfileData interface)
- Current mitigation: RLS should restrict profile visibility based on user preferences
- Recommendations:
  - Add explicit privacy controls (already planned: `src/pages/ProfileSettings.tsx` line 74 `isVisibleOnGlobe`)
  - Audit globe visibility queries to ensure they respect privacy settings
  - Consider encryption for sensitive social media data

**Unvalidated Image Uploads:**
- Risk: Image uploads validated only on client side (file type/size checks)
- Files: `src/components/AddProductModal.tsx` line 151 (file upload), `src/components/AiStudioModal.tsx` (image validation)
- Current mitigation: Supabase storage has server-side validation
- Recommendations:
  - Implement server-side MIME type validation
  - Scan uploaded images for malicious content (consider third-party service)
  - Implement rate limiting on image uploads per user

**No CSRF Protection Visible:**
- Risk: Form submissions via fetch/Supabase without explicit CSRF tokens
- Files: Widespread across components using `supabase.from()` calls
- Current mitigation: Supabase handles CSRF internally; session-based auth provides implicit protection
- Recommendations:
  - Document CSRF protection strategy in security notes
  - Consider adding explicit anti-CSRF headers for sensitive mutations

## Performance Bottlenecks

**Large Monolithic Components:**
- Problem: Several page/modal components exceed 1000 lines, making them slow to render and hard to optimize
- Files:
  - `src/pages/ProfileSettings.tsx`: 1,198 lines
  - `src/components/AiStudioModal.tsx`: 1,186 lines
  - `src/pages/onboarding/IntroCarousel.tsx`: 980 lines
  - `src/pages/Landing.tsx`: 921 lines
  - `src/pages/DressMeWardrobe.tsx`: 819 lines
  - `src/pages/BrandPortal.tsx`: 807 lines
  - `src/components/globe/CountryDrawer.tsx`: 776 lines
  - `src/components/AiTryOnModal.tsx`: 765 lines
- Cause: Multiple sections/features combined into single component; numerous useState calls (ProfileSettings has 15+ state variables)
- Improvement path:
  1. Break into smaller sub-components (Tab Sections, Modals as separate components)
  2. Use React.memo on child components to prevent unnecessary re-renders
  3. Implement code splitting with React.lazy for off-screen sections

**Excessive State Variables in Large Components:**
- Problem: ProfileSettings has 15+ state variables (lines 55-91); AiStudioModal has 20+ state variables (lines 52-86)
- Cause: Multiple features and UI states packed into single component
- Impact: Complex state management; risk of stale state; difficult to reason about re-renders
- Improvement path:
  - Consolidate related state (e.g., all upload states into one object)
  - Extract state management to custom hooks (useProfileForm, useAiStudioState)
  - Consider Reducer pattern for complex state interactions

**Heavy Polling Intervals Not Coordinated:**
- Problem: Multiple independent polling mechanisms running without coordination
- Files:
  - `src/hooks/useTryOnJobMonitor.ts`: 30-second poll (line 113)
  - `src/hooks/useSessionMonitor.ts`: Unspecified poll interval
  - `src/components/ImportWizardModal.tsx`: Unspecified async polling
  - Multiple components with `setInterval` (175+ instances found)
- Impact: Battery drain on mobile; excessive API calls; server load spikes
- Improvement path:
  1. Create centralized poll scheduler that deduplicates polling
  2. Pause polling when app is backgrounded (already implemented in `useSwipePerformance.ts` lines 43-48)
  3. Implement exponential backoff for failing polls
  4. Add metrics to understand total active intervals

**Unoptimized React Query Configuration:**
- Problem: Default retry is set to 1 (package.json not shown, but App.tsx line 84 shows `retry: 1`)
- Impact: Network errors may fail immediately; user experience degraded on flaky networks
- Improvement path:
  - Increase retry to 3 with exponential backoff
  - Implement circuit breaker for consistently failing endpoints
  - Add request timeout configuration

## Fragile Areas

**AI Studio Modal State Management:**
- Files: `src/components/AiStudioModal.tsx` (1,186 lines)
- Why fragile:
  - Multiple upload states (uploadingPerson, uploadingOutfit, uploadingVideoPerson, uploadingVideoOutfit, uploadingDirectImage) that must stay in sync
  - Complex mode switching (person-outfit vs direct image for video) with implicit state coupling
  - Asset expiry logic at line 36 repeated in multiple places
  - Job status polling with sessionStorage + localStorage mixed tracking (getActiveVideoJob/clearVideoJob called multiple times)
- Safe modification:
  - Extract upload state into reducer (consolidate 5 upload flags into one object)
  - Create enum for upload modes instead of magic strings ('person-outfit', 'direct')
  - Extract asset expiry logic into utility function
  - Centralize job ID management (don't mix sessionStorage/localStorage)
- Test coverage: Likely incomplete - modal has many conditional paths (tab switching, upload modes, job polling)

**Profile Settings Page State Complexity:**
- Files: `src/pages/ProfileSettings.tsx` (1,198 lines)
- Why fragile:
  - 15+ boolean state flags for section open/close states (lines 57-72)
  - 4+ loading states for different form sections (lines 67-71)
  - 1 ProfileData object with nested socials object (lines 79-88)
  - Referral code and stats loaded separately (lines 76-78)
  - Image upload with separate file and URL states
  - No clear boundaries between form sections
- Safe modification:
  - Extract each collapsible section into separate component with own state
  - Use useReducer for ProfileData to simplify updates
  - Create custom hook for social links management
  - Separate upload logic into custom hook (useProfileImageUpload)
- Test coverage: Very likely incomplete - many error paths and edge cases (invalid images, permission errors)

**Session Health Check Recovery:**
- Files: `src/contexts/AuthContext.tsx`, `src/utils/sessionHealthCheck.ts`
- Why fragile:
  - Recovery strategy changed from aggressive clearing to allowing 3 failures
  - Navigation callback mechanism uses mutable reference (setNavigationCallback at line 14)
  - Hard-coded recovery cooldown (60 seconds) and max failures (3) magic numbers
  - Mixed use of localStorage, sessionStorage, and Supabase session state
  - Recovery only works if navigation callback is registered
- Safe modification:
  - Extract recovery logic to dedicated module with clear interface
  - Make magic numbers configurable (RECOVERY_COOLDOWN_MS, MAX_CONSECUTIVE_FAILURES)
  - Use context provider for recovery callbacks instead of mutable reference
  - Add comprehensive logging at each recovery step
- Test coverage: Recovery flows likely untested - hard to simulate network failures

**Image Upload Pipeline:**
- Files:
  - `src/components/AddProductModal.tsx`: uploadImageToStorage (custom)
  - `src/components/AiStudioModal.tsx`: uploadImage (from hook)
  - `src/hooks/useObjectUrl.ts`: Object URL creation/cleanup
  - Multiple components with Dropzone integration
- Why fragile:
  - Multiple upload implementations across codebase (no single source of truth)
  - No validation of uploaded file after receiving from server
  - Error states may leave files in limbo (partially uploaded, not visible)
  - Memory management relies on component unmounting (what if user keeps modal open?)
  - Bulk upload in AddProductModal at line 200+ lacks rollback if one product fails
- Safe modification:
  - Create single uploadImage hook/service used everywhere
  - Implement upload progress tracking with clear states (pending, uploading, success, failed)
  - Add server-side validation confirmation
  - Implement cleanup on tab close/app close
- Test coverage: Likely incomplete for error paths (network failure mid-upload, invalid file type rejection)

**Error Boundary Coverage:**
- Files: `src/components/ErrorBoundary.tsx`
- Why fragile:
  - ErrorBoundary exists but need to check if wrapped around major route/feature sections
  - No indication of error boundary placement in routing (App.tsx line 98+)
  - SwipeErrorBoundary suggests game-specific error handling but coverage unclear
- Safe modification:
  - Audit all route definitions to ensure Error Boundaries wrap major features
  - Add error boundary around each router section (user flows, brand portal, etc.)
  - Test recovery from async errors (Error Boundaries only catch render errors, not async)
- Test coverage: Render errors likely covered, but async error recovery uncertain

## Scaling Limits

**Database Connection Pool:**
- Current capacity: Not specified in codebase; Supabase default
- Limit: Concurrent connections may hit Supabase tier limits under heavy usage
- Scaling path:
  - Monitor active connection count in Supabase dashboard
  - Implement connection pooling on backend (Supabase doesn't limit connections for paid tiers)
  - If hitting limits, upgrade Supabase tier or implement edge function caching

**Session Storage for Job Tracking:**
- Current capacity: localStorage stores unlimited jobs in JSON array (`src/hooks/useTryOnJobMonitor.ts` line 42)
- Limit: Browser localStorage typically 5-10MB; large job arrays may cause performance degradation or quota exceeded errors
- Scaling path:
  - Implement job cleanup (remove completed/failed jobs after 24 hours)
  - Limit array size to last 100 jobs only
  - Consider IndexedDB instead of localStorage for larger datasets

**Image Storage Quota:**
- Current capacity: Supabase storage quota (depends on tier)
- Limit: Bulk product imports and user uploads may quickly consume quota
- Scaling path:
  - Monitor storage usage metrics
  - Implement image size optimization (compression, resizing)
  - Set per-user upload quotas
  - Archive old/deleted product images

**API Rate Limiting:**
- Current capacity: Supabase default rate limits
- Limit: Polling intervals (30 seconds for try-on jobs) × user count may hit rate limits
- Scaling path:
  - Implement exponential backoff for polling
  - Add jitter to polling intervals to prevent thundering herd
  - Consider server-sent events instead of polling for real-time updates

**Memory Usage in Large Lists:**
- Current capacity: Likely hundreds of items before degradation
- Limit: SwipeDeck, Fashion Feed, and other infinite scroll components keep all rendered items in memory
- Scaling path:
  - Implement virtual scrolling (react-window or similar)
  - Limit simultaneous rendered items to viewport + buffer
  - Clean up off-screen item state

## Dependencies at Risk

**Old React Error Boundary:**
- Risk: `react-error-boundary@6.0.0` is a major version; next version may have breaking changes
- Impact: Error boundaries might not work; render errors unhandled
- Migration plan: Monitor releases; update to v7+ when released and test thoroughly

**HuggingFace Transformers (3.7.1):**
- Risk: Machine learning library in package.json; heavy dependency with potential security updates
- Impact: Known vulnerabilities could enable code execution
- Migration plan: Monitor HF release notes; update regularly; consider if WASM models needed or could use API endpoint instead

**Sharp Image Library:**
- Risk: Native dependency (builds C++ bindings); installation issues on different platforms
- Impact: Build failures on certain OS/architecture combinations
- Recommendation: Ensure CI/CD tests on multiple platforms; consider serverless image optimization instead

**Capacitor iOS/Android:**
- Risk: Mobile framework with OS-level integrations; version mismatches between CLI and plugins
- Impact: Build failures; plugin incompatibilities; platform-specific bugs (like safe area fix in `721ec44a`)
- Recommendation: Lock Capacitor versions; test iOS/Android builds in CI before release

**Apollo Client (3.13.9):**
- Risk: GraphQL caching library; minimal usage in codebase (see grep results - mostly missing)
- Impact: Leftover dependency; unused code path; potential security updates ignored
- Recommendation: Determine if GraphQL needed; if not, remove dependency entirely; if yes, refactor to use consistently

## Missing Critical Features

**No Input Validation Framework:**
- Problem: Form validation scattered across components; no centralized schema validation
- Blocks: Complex multi-step forms; server-side validation sync difficult
- Evidence: AddProductModal has manual validation; ProfileSettings has no visible validation logic
- Recommendation: Implement Zod schema validation (already in package.json!) at all form boundaries

**No Comprehensive Logging System:**
- Problem: console.log statements found; no structured logging; no error tracking service
- Blocks: Production debugging; error aggregation; performance monitoring
- Evidence: SessionHealthCheck has console logs but no centralized tracking
- Recommendation: Add service like Sentry or custom logging middleware; implement structured logging with timestamps and context

**No Offline Support:**
- Problem: No service worker for offline caching; network failures cause blank screens
- Blocks: Works offline; background sync; resilience
- Evidence: Multiple polling mechanisms fail silently on network errors
- Recommendation: Implement service worker with cache-first strategy for critical resources

**No Rate Limiting UI:**
- Problem: Users may hit API limits with rapid submissions
- Blocks: Bulk operations; batch imports
- Evidence: BulkAsosImportManager and ImportWizardModal lack per-operation rate limits
- Recommendation: Add visual rate limit indicators; queue pending operations

**No Analytics Dashboard:**
- Problem: No built-in product/user analytics
- Blocks: Product performance visibility; user engagement tracking
- Recommendation: Integrate Mixpanel, Amplitude, or self-hosted analytics

## Test Coverage Gaps

**Auth Flow Untested:**
- What's not tested: Login, logout, token refresh, session expiry recovery
- Files: `src/contexts/AuthContext.tsx`, `src/utils/sessionHealthCheck.ts`
- Risk: Breaking changes to auth flow released without detection; users locked out
- Priority: HIGH - Auth is critical path

**Large Component State Interactions:**
- What's not tested: All state transitions in ProfileSettings, AiStudioModal, large pages
- Files: `src/pages/ProfileSettings.tsx`, `src/components/AiStudioModal.tsx` and others
- Risk: Breaking state changes introduced; UI becomes unresponsive
- Priority: HIGH - Common user-facing features

**Error Boundary Recovery:**
- What's not tested: Error boundary rendering fallback; recovery from render errors
- Files: `src/components/ErrorBoundary.tsx`
- Risk: Error boundary itself might error; users see white screen
- Priority: MEDIUM - Safety mechanism

**Async Job Polling:**
- What's not tested: Job completion detection; stale job detection; localStorage state consistency
- Files: `src/hooks/useTryOnJobMonitor.ts`
- Risk: Jobs stuck in "processing" forever; duplicate notifications
- Priority: MEDIUM - Feature completeness

**Image Upload Error Paths:**
- What's not tested: Network failures during upload; file too large; invalid type after upload
- Files: `src/components/AddProductModal.tsx`, `src/components/AiStudioModal.tsx`
- Risk: Confusing error messages; orphaned file states
- Priority: MEDIUM - User experience

**Form Submission Race Conditions:**
- What's not tested: User submits form, clicks submit again before response
- Files: Multiple modal/form components
- Risk: Duplicate submissions; race condition bugs; inconsistent state
- Priority: MEDIUM - Data integrity

**Mobile Navigation Edge Cases:**
- What's not tested: Deep linking; back button behavior; app backgrounding/foregrounding
- Files: `src/hooks/useDeepLinkHandler.ts`, `src/components/BottomNavigation.tsx`
- Risk: Broken mobile experience; users unable to navigate
- Priority: MEDIUM - Mobile platform is primary

---

*Concerns audit: 2026-03-29*


## Fix: Fully Silent Background AI Asset Fetching

### The Problem

`useAiAssets.ts` currently shows 3 different destructive error toasts when `fetchAssets` fails:

1. **Line 77-81** — `"Authentication Error: Please sign in again to view your AI assets."` — fires on JWT errors
2. **Line 86-91** — `"Error Loading Assets: Unable to fetch your AI assets. Retrying..."` — fires on DB errors
3. **Line 111-116** — `"Connection Error: Network error while fetching AI assets. Retrying..."` — fires on network errors

None of these should ever show to the user. `fetchAssets` is a **silent background load** that runs automatically when the AI Studio modal opens. There are two completely normal reasons it can fail or return nothing:

- Assets expired and were deleted by the 48-hour cron job — this is expected, not an error
- A brief auth/network blip on app startup before the session is ready — self-resolves quickly

### What Changes (`src/hooks/useAiAssets.ts` only)

**1. Remove all 3 error toasts from `fetchAssets`**
Replace every `toast({...})` call inside `fetchAssets` with a `console.log(...)` only. The user sees nothing — the Previous Results panel just shows empty or whatever came back.

**2. Fix the retry loop that causes infinite re-renders**
`retryCount` is currently in `useState` AND listed as a dependency of `useCallback`. This means:
- `retryCount` increments → `fetchAssets` is recreated → `useEffect` fires again → fetch runs again → increments again → loop

Fix: Replace `const [retryCount, setRetryCount] = useState(0)` with `const retryCountRef = useRef(0)`. A ref update does **not** trigger re-renders, so the loop breaks. Update all `retryCount` reads and `setRetryCount` calls to use `retryCountRef.current` and direct assignment instead.

**3. Simplify retry to 1 quiet attempt**
Since failures are expected (expiry, startup race), reduce from 3 retries to 1 quiet retry after 1.5 seconds. No toast on retry either.

**4. Keep toasts for `saveAsset` and `deleteAssets`**
These are explicit user-triggered actions — users need feedback when those fail. These toasts stay untouched.

### What the User Experiences

| Scenario | Before | After |
|----------|--------|-------|
| Assets expired (cron deleted them) | 🔴 "Error Loading Assets" toast | ✅ Empty results panel, no toast |
| Auth not ready on modal open | 🔴 "Authentication Error" toast | ✅ Silent, 1 quiet retry after 1.5s |
| Network blip on load | 🔴 "Connection Error" toast | ✅ Silent, 1 quiet retry after 1.5s |
| Save fails | 🔴 "Save Failed" toast | 🔴 "Save Failed" toast (kept — user action) |
| Delete fails | 🔴 "Delete Failed" toast | 🔴 "Delete Failed" toast (kept — user action) |

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useAiAssets.ts` | Remove all 3 error toasts from `fetchAssets`; replace `useState` retry counter with `useRef`; simplify to 1 quiet retry |

No other files need changing. This is a pure error-handling fix with no UI or database changes.

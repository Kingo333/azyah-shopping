

# Fix: AR Mode Stuck at "NONE" Despite Valid 2D Assets

## Root Cause Analysis

The user's screenshot proves:
- Camera works (video feed visible)
- Pose detection works (green "Tracking" dot)
- But `arMode` is stuck at `'none'` — meaning Effect 2 (model/overlay loading) either never reached `setArMode(resolvedMode)` or resolved as `'none'`

The DB confirms the product HAS `ar_overlay_url` set with `ar_preferred_mode: '2d'`. So `resolveARMode()` SHOULD return `'2d'`.

**Most likely cause**: Effect 2 silently fails or hangs. The animation loop falls through to the 3D path (line 431+), which sets `trackingState('tracking_active')` even without a model loaded — showing the green badge with `(NONE)`.

There are two bugs working together:

1. **Effect 2 may be failing silently** — if the 2D overlay image fails to load (CORS, 404, timeout), the catch block logs to console but the user on mobile can't see console logs. We need visible diagnostics.

2. **3D path sets "tracking_active" even with no model** — the tracking state logic at lines 451-466 runs regardless of whether a model is loaded, making it appear everything is working when nothing is rendering.

## Fix Plan

### 1. Add visible debug info to the AR UI (temporary diagnostic)
**File**: `src/pages/ARExperience.tsx`

Add a small debug panel visible in the AR view showing:
- `arMode` value
- `selectedProduct.ar_overlay_url` (truncated)  
- `selectedProduct.ar_model_url` (truncated)
- Effect 2 status (pending/loading/loaded/error)
- Any error messages from overlay/model loading

This lets the user report exactly what's happening without needing console access.

### 2. Prevent 3D path from claiming "tracking_active" when no model exists
**File**: `src/pages/ARExperience.tsx` (animate loop, around line 431)

Add a guard: if `arModeRef.current === 'none'` or `(!imageOverlayRef.current && !modelRef.current)`, don't set tracking state to active. Instead show a "loading" or "waiting" state.

### 3. Add timeout + error surfacing to Effect 2
**File**: `src/pages/ARExperience.tsx` (Effect 2)

- Add a 15-second timeout on the `sceneReadyPromise` await so it doesn't hang forever
- After `resolveARMode`, log the result visibly (already done, but also set it in a debug state)
- In the 2D catch block, surface the error more prominently (not just console.error)

### 4. Add overlay URL validation before attempting load
**File**: `src/pages/ARExperience.tsx` (Effect 2, 2D branch)

Before calling `overlay.loadGarment(url)`, validate the URL is reachable with a HEAD request. If it 404s, show a specific error instead of a generic load failure.

### 5. Ensure `ar_overlay_url` is correctly passed through the data pipeline
**File**: `src/pages/ARExperience.tsx` (Effect 0, mapping)

Add `console.log('[AR] Mapped products:', mapped)` right after the mapping to confirm `ar_overlay_url` is present in the mapped data. Also add it to the visible debug panel.

## Files to Edit

| File | Change |
|------|--------|
| `src/pages/ARExperience.tsx` | Add debug panel, fix tracking_active guard, add timeout to Effect 2, add URL validation |

## Verification

After these changes, the user opens the AR view and can see:
- What mode was resolved
- Whether the overlay URL exists
- Whether the overlay image loaded or what error occurred
- The exact point where the pipeline stalled

This diagnostic data tells us the exact fix needed. Without it, we're guessing at which of the 3 possible failure points is the actual culprit.

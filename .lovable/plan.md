# Fix: Live Cam output disappears when expanding preview

## Root cause

`LiveCamCameraView.tsx` returns two completely separate JSX trees for `expanded` vs compact mode. Each tree mounts its **own** `<canvas>` and `<video>` element. Toggling expand causes React to unmount the old DOM nodes and mount new ones. Result:

- `remoteCanvasRef.current` now points to a fresh, blank canvas — the painted AI frame is gone.
- `localVideoRef.current` is a new `<video>` with no `srcObject`, so the local feed goes dark until something reattaches the stream.
- The hook only repaints when the next WebSocket `frame` arrives, which can take 100–500ms, and on cold/slow frames the expanded view looks empty.
- No cached last frame exists to redraw immediately.

WebSocket, camera, and protocol are untouched — only DOM identity is the problem.

## Fix strategy (frontend only, no backend / WS / protocol changes)

Keep **one** `<canvas>` and **one** `<video>` mounted for the lifetime of the tab, and switch layout via CSS classes only. Plus cache the last decoded frame so any layout change or resize repaints instantly without waiting on the next WS message.

### 1. `LiveCamCameraView.tsx` — single DOM, CSS-only layout switch

Replace the `if (expanded) return …; return …;` branching with a single tree:

- One outer wrapper that toggles classes based on `expanded`:
  - Compact: `grid grid-cols-2 gap-3` (current behavior).
  - Expanded: `relative w-full rounded-xl overflow-hidden bg-black` with explicit dimensions:
    - Mobile: `aspect-[9/16]` (per requirement).
    - Desktop (`sm:` and up): `sm:aspect-auto sm:h-[calc(100vh-160px)]` plus `sm:max-h-[calc(100vh-160px)]`.
- Inside that, two persistent slots:
  - `<video ref={localVideoRef} …>` — same node always, only its wrapper classes change (full tile in compact, PiP bottom-right in expanded).
  - `<canvas ref={remoteCanvasRef} …>` — same node always, classes switch from compact tile to full-bleed `absolute inset-0 w-full h-full object-contain` in expanded.
- Parent of the canvas must be `relative` in both modes so `absolute inset-0` works in expanded.
- Z-index: canvas at `z-0`, PiP video wrapper at `z-10`, expand/collapse button at `z-20`, status chips `z-20`.
- Keep `object-contain` on canvas (preserves AI output aspect, never crops).
- Both Maximize2/Minimize2 buttons collapse into one button whose icon switches on `expanded`.

This guarantees `remoteCanvasRef.current` and `localVideoRef.current` keep pointing to the same DOM node across expand toggles, so the painted bitmap survives.

### 2. `useLiveCamSession.ts` — cache last frame and redraw on demand

- Add `lastFrameB64Ref = useRef<string | null>(null)`. Set it inside `renderRemoteFrame` whenever a frame is decoded successfully (store the b64 string, not the bitmap, so it survives canvas resizes).
- Expose a stable `redrawLastFrame()` callback from the hook that, if `lastFrameB64Ref.current` is set, re-runs the existing decode-and-draw path on the current `remoteCanvasRef`. No WS traffic, no camera restart.
- Return `redrawLastFrame` from the hook.

### 3. `LiveCamTab.tsx` — repaint on expand toggle and on canvas resize

- Pull `redrawLastFrame` from `useLiveCamSession`.
- Wrap `setExpanded` so that after the state flip we call `requestAnimationFrame(() => redrawLastFrame())`. This guarantees the canvas has its new layout box before we redraw.
- Add a `ResizeObserver` on the remote canvas in `LiveCamCameraView` (or in the tab) that calls `redrawLastFrame` on size changes — covers window resize, orientation change, mobile keyboard, etc.

### 4. Keep camera and WS alive across toggle

No changes needed in the hook's lifecycle: `start`/`stop` are not called on expand toggle, and `useEffect` cleanup is unmount-only. Verified `cleanupLocal` is not invoked from any path triggered by the expand state. Just confirming we don't accidentally key the camera component on `expanded`.

## Files to change

| File | Change |
|---|---|
| `src/components/ai-studio/live-cam/LiveCamCameraView.tsx` | Collapse two JSX branches into one. Same `<video>` and `<canvas>` always mounted. CSS-only switch between compact grid and expanded full-bleed layout with explicit mobile `aspect-[9/16]` + desktop `h-[calc(100vh-160px)]`. Add `relative` parent, `absolute inset-0 w-full h-full object-contain` on canvas in expanded mode. Add `ResizeObserver` to call `onCanvasResize` prop. |
| `src/components/ai-studio/live-cam/useLiveCamSession.ts` | Add `lastFrameB64Ref`, set on each successful decode; export `redrawLastFrame()` that repaints from cache. |
| `src/components/ai-studio/live-cam/LiveCamTab.tsx` | Consume `redrawLastFrame`. Call it via `requestAnimationFrame` after `setExpanded`. Pass `onCanvasResize={redrawLastFrame}` to `LiveCamCameraView`. |

## Out of scope (not touched)

- RunPod, Cloudflare Worker, Supabase edge functions.
- WebSocket protocol, message shapes, frame loop, FPS, prompts, reference image upload.
- `live-cam-session-start`, `live-cam-session-end`, `live-cam-snapshot-save`.
- Camera acquisition (`startCamera` / `stopCamera`).

## Acceptance check

- Start session in compact view → AI frame visible.
- Click expand → same canvas node, last frame redrawn within one rAF tick, then live frames continue painting on top. No black flash.
- Click collapse → same behavior in reverse.
- Resize window / rotate device → canvas redraws cached frame, then live frames continue.
- WebSocket and camera are not torn down at any point during expand toggle (verifiable via DevTools Network → no new WS, and `getUserMedia` not re-prompted).
- Mobile portrait shows `9:16`, desktop fills viewport minus chrome.

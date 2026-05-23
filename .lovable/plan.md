# Live Cam: centered contain-fit, no zoom/crop

Frontend-only. RunPod, Cloudflare, Supabase, edge functions, WebSocket protocol untouched.

## Root cause
- Capture is 576×320 landscape but FluxRT output is 288×512 portrait → mismatch.
- `renderRemoteFrame` resizes the visible canvas bitmap to match each incoming frame, then `object-contain` is applied to a wrapper whose aspect ratio (16:9 compact, free in expanded) doesn't match → output looks zoomed/stretched.
- Local PiP video uses `object-cover` (correct for camera) but AI canvas needs strict contain-fit on a black backdrop.

## Changes

### 1. `src/components/ai-studio/live-cam/useLiveCamSession.ts`
- `TARGET_WIDTH = 288`, `TARGET_HEIGHT = 512` (was 576×320). Capture matches FluxRT input.
- `renderRemoteFrame`:
  - Keep cache canvas sized to incoming bitmap.
  - **Pin visible canvas bitmap to 288×512** (set once, do not mutate per frame).
  - Replace `ctx.drawImage(bitmap, 0, 0, w, h)` with contain-fit + black fill:
    ```
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / bw, canvas.height / bh);
    const dw = bw * scale, dh = bh * scale;
    ctx.drawImage(bitmap, (canvas.width-dw)/2, (canvas.height-dh)/2, dw, dh);
    ```
- `redrawLastFrame`: same contain-fit + black fill, drawn synchronously from `lastFrameCanvasRef`. Do not change visible canvas dimensions.
- No changes to WS lifecycle, retry, ready/frame handling, cleanup.

### 2. `src/components/ai-studio/live-cam/LiveCamCameraView.tsx`
- Visible `<canvas>` HTML attrs: `width={288} height={512}`. CSS: `w-full h-full object-contain` on a **black** wrapper.
- Wrappers (revert to centered-in-black, no forced portrait):
  - **Compact**: `grid grid-cols-2 gap-3` with each cell `aspect-[16/9] bg-black flex items-center justify-center`. AI canvas inside is `max-w-full max-h-full object-contain` → output centered, black bars top/bottom.
  - **Expanded**: `relative w-full bg-black rounded-xl overflow-hidden aspect-[9/16] sm:aspect-auto sm:h-[calc(100vh-160px)] flex items-center justify-center`. Canvas centered with `max-w-full max-h-full object-contain`. Local PiP overlay unchanged.
- `<video>` and `<canvas>` remain mounted across expand toggles (no remount, no black flash).
- ResizeObserver continues to call `onCanvasResize` → `redrawLastFrame`.

### 3. `src/components/ai-studio/live-cam/LiveCamTab.tsx`
- No logic changes. Existing double-rAF call to `redrawLastFrame` on toggle and resize is correct.

## Acceptance
- AI output drawn at native 288×512 ratio, centered on black, full frame always visible.
- No zoom, no crop, no stretch.
- Expand/minimize only resizes the wrapper; cached frame repaints synchronously. No WS or camera restart, no black-out.

Waiting for approval before making changes.

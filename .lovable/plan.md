## Goal
Keep the expanded outer wrapper as portrait (3:4) — unchanged. Inside it, render the try-on video stream in its native landscape rectangle (centered, with black space above/below), instead of letting the canvas fill the full portrait box.

## Change — `src/components/ai-studio/live-cam/LiveCamCameraView.tsx`

In expanded mode, wrap the canvas in an inner landscape container so the stream displays as a centered rectangle within the portrait frame.

- `remoteWrapClass` (expanded): keep `absolute inset-0 z-0 flex items-center justify-center bg-black` (unchanged).
- Inside that wrapper, when `expanded` is true, add an inner div with `w-full aspect-[16/9]` (or match FluxRT's native ratio) that contains the canvas. The canvas keeps `max-w-full max-h-full object-contain`.
- Compact mode unchanged.
- Outer expanded wrapper stays `aspect-[3/4]` — not touched.

Result: portrait outer frame with a landscape video rectangle centered inside (black bars top/bottom of the video rectangle, frame edges intact left/right).

No prompt, session, or stream-resolution changes.

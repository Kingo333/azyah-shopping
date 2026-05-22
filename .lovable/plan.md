## Goal
Stream is natively 512×288 (16:9 landscape). Render it as a centered landscape rectangle inside the unchanged portrait expanded frame, displayed at native aspect with no zoom/upscale-stretch. The current inner wrapper exists but the canvas (`max-w-full max-h-full w-auto h-auto object-contain`) lets the canvas's intrinsic bitmap drive size — if the canvas's internal bitmap is portrait, it renders portrait. We need to force the visible box to 16:9 regardless of bitmap dims.

## Change — `src/components/ai-studio/live-cam/LiveCamCameraView.tsx`

In expanded mode, replace the inner wrapper + canvas pair so the canvas itself fills a 16:9 box:

- Expanded inner wrapper: `w-full aspect-[16/9] bg-black` (centered via the existing flex parent).
- Canvas inside expanded inner wrapper: `w-full h-full object-contain` (no `max-w/max-h`, no `w-auto/h-auto`) — this forces the visible canvas element to the wrapper's 16:9 box, and `object-contain` letterboxes the bitmap into it without zoom/crop.
- Compact mode unchanged.

Result: portrait outer frame (3:4) preserved; inside it a centered 16:9 landscape rectangle holds the stream at native ratio with black space above/below the rectangle. No prompt, session, or stream-resolution changes.

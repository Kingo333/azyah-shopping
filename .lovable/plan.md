## Goal
In the Live Cam tab, add an expand icon on the "Try-on" preview pane. Clicking it enlarges the try-on view, and the surrounding AI Studio layout adapts to the larger size. Clicking again collapses back to the default side-by-side view.

## Changes

**1. `src/components/ai-studio/live-cam/LiveCamCameraView.tsx`**
- Add a new prop `expanded: boolean` and `onToggleExpand: () => void`.
- Add a small expand/collapse icon button (lucide `Maximize2` / `Minimize2`) at the top-right of the Try-on pane.
- Layout:
  - Default (`expanded=false`): current `grid grid-cols-2` side-by-side, both panes `aspect-[16/9]`.
  - Expanded (`expanded=true`): switch to vertical stack — Try-on pane becomes large (e.g. `aspect-[3/4]` or `h-[70vh]` with `object-contain`) and full width; the local "You" pane shrinks to a small picture-in-picture thumbnail (absolute top-left, ~`w-32`) overlaid on the try-on, OR collapses to a small row above. Final: PiP overlay is cleaner.

**2. `src/components/ai-studio/live-cam/LiveCamTab.tsx`**
- Add `const [expanded, setExpanded] = useState(false);`
- Pass `expanded` and `onToggleExpand={() => setExpanded(v => !v)}` to `LiveCamCameraView`.
- When `expanded`, add a wrapper class so the tab container can grow (e.g. remove width clamp / allow the camera view section to use full available width). Other controls (garment picker, status row, buttons) remain below unchanged.

## Out of scope
- No changes to WebSocket, session logic, edge functions, garment picker, or snapshot logic.
- No changes to Picture/Video tabs.
- No backend or DB changes.

## Acceptance
- Expand icon visible on Try-on preview.
- Click → try-on enlarges, "You" view becomes PiP thumbnail, surrounding layout adapts.
- Click again → returns to default 2-up layout.
- Works while idle, starting, warming, and running.



# Fix AR Camera/Loading Failure — Rewrite Init Architecture

## Root Cause

The "Camera Error — AR scene failed to initialize" happens because of a **20-second timeout race condition**:

1. At component mount (line 62), a `setTimeout` starts a 20s countdown to reject `sceneReadyPromise`
2. `initPipeline` (Effect 1) downloads MediaPipe WASM runtime (~3MB) + pose model (~4MB), each with their own 15s timeout — total worst case is 30s
3. If the downloads take longer than 20s combined, the sceneReadyPromise timeout fires first
4. Effect 2 catches the rejection, sees `trackingState` is still `initializing` (not a specific error), and overwrites it to `camera_error` with "AR scene failed to initialize"

The camera permission is granted and working fine — the error message is misleading. The real failure is the pose model download timing out or the arbitrary 20s limit being hit.

## Plan

### File 1: `src/pages/ARExperience.tsx` — Rewrite init synchronization

**Change A: Remove the 20s timeout from sceneReadyPromise**
The promise should only resolve (on success) or reject (on explicit failure). Every failure path already calls `sceneReadyRejectRef.current?.()`, so the timeout is redundant and causes false failures. Replace with a promise that has no timeout.

**Change B: Add diagnostic logging throughout initPipeline**
Add `console.log('[AR]')` at every step: WebGL check, camera start, pose start, camera result, pose result, scene creation, render loop start. This lets us diagnose exactly which step fails when users report issues.

**Change C: Make the catch block in initPipeline also reject the sceneReadyPromise**
Currently if the outer `catch` at line 420 fires (unexpected error), it sets `camera_error` but doesn't reject sceneReadyPromise — leaving Effect 2 hanging forever. Add `sceneReadyRejectRef.current?.(err)` in the catch block.

**Change D: Fix Effect 2's error handling**
When sceneReadyPromise rejects, check the rejection error message to display something useful instead of the generic "AR scene failed to initialize". If the error says "camera" show camera guidance, if "pose" show pose guidance, etc.

**Change E: Add an unhandled promise rejection catcher on the sceneReadyPromise**
Add `.catch(() => {})` to prevent unhandled promise rejection warnings in the console (the rejection is handled by Effect 2, but the promise itself can fire before Effect 2 attaches its handler).

### File 2: `src/ar/core/PoseProcessor.ts` — Add logging

Add `console.log('[PoseProcessor]')` before WASM download and before model download so we can see which step is slow/failing.

### Summary of changes
- Remove the race-condition-causing 20s timeout (the actual root cause)
- Add console logging at every init step for debuggability
- Ensure all failure paths properly reject the scene-ready promise
- Show meaningful error messages instead of generic "AR scene failed to initialize"


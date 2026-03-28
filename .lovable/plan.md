

## Fix: AR Tracking Failure — Migrate to New MediaPipe API

### Root Cause

The AR system uses the **deprecated** `@mediapipe/pose` package (v0.5, last updated 2023). This legacy package relies on CDN-hosted WASM/model files that are unreliable and frequently fail to initialize, causing the "AR Tracking Failed — Could not initialize body tracking" error.

Google has replaced it with `@mediapipe/tasks-vision`, which uses `PoseLandmarker` — a newer, actively maintained API with better browser support and reliability.

### What Changes

**1. Swap npm dependency**
- Remove: `@mediapipe/pose`
- Add: `@mediapipe/tasks-vision`

**2. Rewrite pose initialization in `src/pages/ARExperience.tsx`**

Replace the old `Pose` class with `PoseLandmarker`:

```text
OLD (broken):
  import { Pose } from '@mediapipe/pose'
  new Pose({ locateFile: ... })
  pose.setOptions(...)
  pose.onResults(callback)
  pose.send({ image: video })

NEW (working):
  import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
  const vision = await FilesetResolver.forVisionTasks(CDN_WASM_PATH)
  const landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: POSE_MODEL_URL },
    runningMode: 'VIDEO',
    numPoses: 1
  })
  // In render loop:
  const result = landmarker.detectForVideo(video, timestamp)
  // result.landmarks[0] contains the 33 pose points
```

The new API is synchronous per-frame (no callback pattern), so the render loop simplifies: call `detectForVideo()` each frame, read landmarks directly from the return value, and pass them to the existing `updateModel()` function.

**3. Landmark format mapping**

The new API returns landmarks in the same normalized 0-1 coordinate format. The landmark indices (11=left shoulder, 12=right shoulder, 23=left hip, 24=right hip) are identical. The `visibility` field is still present. The existing `updateModel()` function needs no changes.

**4. Model file**

Use the official hosted model: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`

This is hosted by Google on stable infrastructure (unlike the old CDN-dependent WASM files).

### Files Changed

| File | Change |
|------|--------|
| `package.json` | Remove `@mediapipe/pose`, add `@mediapipe/tasks-vision` |
| `src/pages/ARExperience.tsx` | Replace Pose init + callback with PoseLandmarker + detectForVideo loop |


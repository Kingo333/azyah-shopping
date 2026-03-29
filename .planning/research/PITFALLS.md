# Domain Pitfalls

**Domain:** Web-based AR garment try-on (MediaPipe + Three.js)
**Researched:** 2026-03-29
**Confidence:** HIGH for code-verified pitfalls, MEDIUM for general domain knowledge (web search unavailable; analysis based on codebase inspection + training data)

---

## Critical Pitfalls

Mistakes that cause visible broken behavior, garment misalignment, or require architectural rewrites.

---

### Pitfall 1: Double-Mirror / Inconsistent Mirror Axis Between Video and Canvas

**What goes wrong:** The video element and Three.js canvas are both CSS-flipped with `scaleX(-1)` to create a "selfie mirror" effect. Meanwhile, the `updateModel()` function also applies a programmatic `mirrorX = (x) => 1 - x` to landmark X coordinates before mapping to Three.js world space. This creates a correct result *today* because the CSS flip and the coordinate flip cancel each other for the 4-point shirt anchor. But when you add garment-type-specific anchoring that uses arms (landmarks 13-16), legs (25-28), or wrists (15-16), any inconsistency in which landmarks get mirrored and which don't will produce garments that lean the wrong direction or have sleeves on the wrong side.

**Why it happens:** MediaPipe's normalized landmarks report coordinates relative to the *input image frame* (0,0 at top-left, 1,1 at bottom-right). "Left shoulder" (landmark 11) is the person's actual left shoulder. When the video is CSS-mirrored for selfie display, the image's pixel-left becomes screen-right. The current code mirrors X in the math (`1 - x`) and also mirrors via CSS (`scaleX(-1)`) on the canvas, which means the final on-screen result depends on both transforms being consistent. Adding new landmark pairs (left elbow / right elbow) without rigorously tracking which transform applies where will break left/right garment alignment.

**Consequences:**
- Sleeves or pant legs anchor to the wrong side of the body
- Garment rotation direction inverts when user turns
- Bug is intermittent and hard to reproduce because it depends on which landmarks are visible

**Prevention:**
1. Establish a single canonical coordinate system. Pick ONE place to handle mirroring. Recommended: mirror once in the coordinate mapping function, and keep CSS `scaleX(-1)` only on the video element. Remove `scaleX(-1)` from the Three.js canvas and handle all mirroring in code.
2. Create a `toLandmarkWorldCoords(landmark, visibleDims)` utility that encapsulates the full transform (mirror + normalized-to-world mapping) so every garment type uses the same pipeline.
3. Write a visual debug mode that draws colored dots at each landmark's computed world position on the Three.js canvas. If the dots don't visually align with the person's joints on screen, the mirroring is wrong.

**Detection (warning signs):**
- Garment appears correct when facing camera but flips or shifts when user turns sideways
- Left-arm and right-arm anchors produce crossed/swapped positions
- Shoulder rotation angle (`shoulderAngle`) inverts sign unexpectedly

**Phase mapping:** Must be resolved in Phase 1 (foundation) before any garment-type-specific anchoring is built on top.

---

### Pitfall 2: Renderer/Camera Size vs Video Size Mismatch

**What goes wrong:** The current code sets the Three.js renderer size to `window.innerWidth x window.innerHeight`, but computes the visible-world dimensions from the *video* aspect ratio (`vw / vh`). If the video aspect ratio differs from the window aspect ratio (which it almost always does -- e.g., 1280x720 video on a 390x844 phone screen), the coordinate mapping produces a systematic offset. The garment drifts left/right or up/down relative to where it should be on the body.

**Why it happens:** MediaPipe landmarks are normalized [0,1] relative to the video frame dimensions. The Three.js camera frustum is based on the camera's FOV and aspect ratio. The video is displayed with `object-fit: cover` which crops the video to fill the screen. The current code does not account for the crop offset -- it assumes the full video frame maps 1:1 to the screen, but `object-cover` hides parts of the video that don't fit the screen's aspect ratio.

**Specific code issue (ARExperience.tsx):**
```
// Line 159: camera uses video aspect ratio
const camera = new THREE.PerspectiveCamera(63, aspectRatio, 0.1, 1000);
// Line 169: renderer uses window dimensions
renderer.setSize(window.innerWidth, window.innerHeight);
```
These two aspect ratios will differ. The visible-world calculation at line 166 uses the video-based camera, but the renderer canvas covers the full window. The `object-fit: cover` CSS on the video element crops the video, but the landmark coordinates still reference the uncropped video.

**Consequences:**
- Garment position is offset by 5-15% horizontally or vertically
- Offset magnitude varies between devices (worse on taller phones like iPhone 15 Pro Max)
- Appears to "work" on devices where video ratio happens to match window ratio

**Prevention:**
1. Calculate the crop offset that `object-fit: cover` applies. Given video dimensions (vw, vh) and display dimensions (dw, dh), compute the visible sub-rectangle of the video, then map landmarks only within that sub-rectangle.
2. Alternatively, set the Three.js camera aspect ratio to match the *window* (not video), and apply the cover-crop transform to landmarks before converting to world coordinates.
3. Test on at least 3 different screen aspect ratios: 16:9 (standard Android), 19.5:9 (modern iPhone), and 4:3 (iPad).

**Detection:**
- Garment visibly offset from body center on devices with unusual aspect ratios
- Model position drifts when switching between landscape and portrait (resize handler at line 382 updates renderer but not visible dims)

**Phase mapping:** Phase 1 (foundation). The coordinate pipeline must be correct before any garment anchoring can be trusted.

---

### Pitfall 3: One-Size-Fits-All Anchoring Breaks for Non-Shirt Garments

**What goes wrong:** The entire `updateModel()` function is hardcoded for a shirt: it anchors between shoulders and hips, adds 15% horizontal padding for "shirt extends past shoulders," and uses torso height for vertical scaling. Applying this to an abaya (shoulder-to-ankle), pants (hip-to-ankle), or accessories (wrist, neck, head) will produce fundamentally wrong placement -- an abaya would be compressed into the torso region, pants would float at chest height.

**Why it happens:** The system was built for a single garment type and the anchoring logic was never abstracted. The comment `// Shirt anchor points` at line 301 confirms it. There is no garment-type metadata in the data model (the `garment_type` column is "pending" per PROJECT.md).

**Consequences:**
- Abayas look like compressed shirts (most important garment type for this market)
- Pants anchor at the torso instead of the hip-to-ankle region
- Accessories have no sensible anchor point at all
- Retailer trust erodes because "AR doesn't work" for their specific garment

**Prevention:**
1. Define a garment-type enum with explicit anchor strategies:
   - `shirt`: shoulders (11,12) to hips (23,24) -- current behavior
   - `abaya/dress`: shoulders (11,12) to ankles (27,28) -- full-body drape
   - `pants`: hips (23,24) to ankles (27,28) -- lower body
   - `accessory_head`: nose (0) or ears (7,8)
   - `accessory_wrist`: wrists (15,16)
2. Each strategy defines: anchor landmarks, scale reference landmarks, padding multipliers, and vertical center computation.
3. Build the abstraction BEFORE adding new garment types. Don't fork `updateModel()` with if/else chains -- use a strategy pattern or config object.

**Detection:**
- Any new garment type that doesn't look right on first try
- Retailers reporting "the AR doesn't fit my product" for non-shirt items

**Phase mapping:** Phase 2 (garment-type system), but the abstraction layer/interface should be designed in Phase 1.

---

### Pitfall 4: 3D Model Origin/Scale Inconsistency From External Tools

**What goes wrong:** Retailers upload `.glb` files from external tools (Meshy.ai, Tripo3D). These tools produce models with wildly different conventions: origin might be at the model's feet, center of mass, or an arbitrary point; scale might be in centimeters, meters, or arbitrary units; Y-up vs Z-up varies; normals may be flipped. The current bounding-box normalization (lines 192-202) centers the model at its geometric center, but this creates different visual results depending on the original model structure. A shirt model with long sleeves has a different bounding box center than a tight-fit shirt -- the normalization places them differently relative to the anchor point.

**Why it happens:** There is no standard for "garment 3D model" origin conventions. Meshy.ai, Tripo3D, Blender exports, and CLO3D exports all use different assumptions. The current code does `model.position.sub(center)` which re-centers to the bounding box center, but for a garment, the meaningful anchor point isn't the geometric center -- it's the neckline (for shirts), the waistband (for pants), or the shoulder line (for abayas).

**Consequences:**
- Model visually offset from anchor point (shirt hangs too low or too high)
- Each retailer's model requires manual ar_position_offset tuning to look right
- Non-uniform scale distorts models with asymmetric bounding boxes (e.g., a model with a hood has a tall bounding box, so centering places the torso too low)

**Prevention:**
1. Define anchor-point conventions per garment type. For shirts: the origin should be at the neckline center. For pants: at the waistband center. For abayas: at the shoulder-line center.
2. On upload, either:
   - (a) Provide a preview tool where the retailer marks the anchor point on their model, or
   - (b) Use heuristic detection: for a shirt, find the topmost geometry (likely neckline), set that as the offset anchor.
3. Store the computed anchor offset in the database alongside the model URL so it only needs to be computed once.
4. Add model validation on upload: check that the model has reasonable dimensions (not 0.001 units or 10000 units), has valid normals, and has a texture/material.

**Detection:**
- New model uploads that look misaligned despite correct anchor configuration
- Retailer-provided ar_position_offset values that are very large (suggests normalization is fighting the model's inherent offset)
- Models that appear inside-out or black (flipped normals, missing materials)

**Phase mapping:** Phase 2-3. Model validation on upload should be early; anchor-point convention system requires the garment-type system to be in place first.

---

### Pitfall 5: MediaPipe Z-Coordinate Misinterpretation

**What goes wrong:** The current code uses MediaPipe's `z` coordinate directly: `const targetZ = avgZ * 2 - 1` (line 326). MediaPipe's normalized landmark `z` represents depth relative to the *hip midpoint depth*, measured in roughly the same scale as `x`. It is NOT a world-space depth in meters, and it is NOT calibrated to the Three.js camera's coordinate system. Using it as a direct Z position in Three.js world space produces unpredictable depth placement -- the model may appear in front of or behind the video feed unexpectedly.

**Why it happens:** MediaPipe's documentation states that `z` uses "roughly the same scale as x" and represents depth with the midpoint of the hips as the origin. This is a relative depth hint, not an absolute depth. The `* 2 - 1` transform maps [0,1] to [-1,1], but MediaPipe `z` values are often in the range [-0.5, 0.5] relative to the hip center, not [0, 1]. The current formula doesn't match MediaPipe's actual output range.

**Consequences:**
- Model clips through the camera near-plane or disappears behind far-plane on some poses
- Depth doesn't respond meaningfully to user stepping forward/backward
- On poses where arms extend toward camera, the Z average shifts dramatically and the model jumps forward

**Prevention:**
1. For a 2D-overlay-style AR (which this effectively is), set Z to a constant value (e.g., 0) and don't use MediaPipe's Z at all for positioning. The visual result will be better because the model stays at a consistent depth.
2. If depth is needed for 3D realism (parallax when turning), use the Z *difference* between landmarks (e.g., left shoulder Z - right shoulder Z) for body-turn estimation, not the absolute Z values for positioning.
3. Use `worldLandmarks` (the world-coordinate output from PoseLandmarker) for Z-depth if actual metric depth is needed -- these are in meters and are more stable than the normalized Z.

**Detection:**
- Model randomly jumps forward or backward
- Model disappears when user extends arms toward camera
- Model appears at inconsistent depths across different users/distances

**Phase mapping:** Phase 1 (coordinate pipeline). Fixing Z handling is part of the foundation work.

---

### Pitfall 6: Mobile WebGL Performance Collapse Under Combined Load

**What goes wrong:** Running MediaPipe pose detection, Three.js WebGL rendering, and live camera feed simultaneously on a mobile device easily exceeds the GPU/CPU budget. The current code runs pose detection every 66ms (line 246: `time - lastPoseTime > 66`, which is ~15 FPS for pose), but the render loop runs at `requestAnimationFrame` speed (60 FPS). On mid-range phones, this combination drops total frame rate to 5-10 FPS, causes thermal throttling within 30-60 seconds, and drains battery rapidly.

**Why it happens:** Three factors compound:
1. MediaPipe WASM runs on the main thread and blocks rendering during detection
2. Three.js re-renders every frame even when nothing changed (no dirty-checking)
3. The renderer pixel ratio is set to `Math.min(devicePixelRatio, 2)` -- on modern phones with 3x DPR, even capping at 2x means rendering at 2x the CSS pixel count, which is 4x the fill rate

**Consequences:**
- Dropped frames and visible jitter/stutter
- Phone heats up, OS throttles GPU, performance cascades downward
- Users abandon AR try-on after 10-15 seconds of poor performance
- On low-end Android devices (a significant market in Middle East), may become completely unusable

**Prevention:**
1. Reduce renderer pixel ratio to 1.0 on mobile (or 1.5 max). The AR overlay doesn't need retina sharpness -- it sits on top of a camera feed that is already at camera resolution.
2. Only render Three.js frames when the model actually moved. Use a dirty flag set by `updateModel()` and skip `renderer.render()` on clean frames.
3. Throttle pose detection dynamically: start at 15 FPS, drop to 10 FPS if frame time exceeds budget, increase if headroom exists.
4. Use `renderer.setAnimationLoop()` instead of manual `requestAnimationFrame` to let Three.js manage the loop more efficiently (though both are similar in practice).
5. Offload MediaPipe to a Web Worker if supported (MediaPipe Tasks Vision supports OffscreenCanvas in some configurations). This unblocks the main thread for rendering.
6. Profile on actual target devices (Samsung A-series, Xiaomi budget phones) not just flagship iPhones.

**Detection:**
- FPS counter shows < 15 FPS during active tracking
- Phone becomes hot within 1 minute of AR use
- Tracking becomes "jerky" after extended use (thermal throttling)
- `performance.now()` timing shows single-frame spikes > 100ms

**Phase mapping:** Phase 3 (performance optimization), but the pixel ratio and render-on-dirty optimizations should be applied in Phase 1 as low-effort wins.

---

### Pitfall 7: Smoothing Introduces Persistent Lag and "Swimming" Effect

**What goes wrong:** The current LERP smoothing (`SMOOTHING = 0.3`) applies equally to position, scale, and rotation. At 15 FPS for pose updates, a smoothing factor of 0.3 means the model reaches 90% of the target position only after ~7 frames (~470ms). This creates a noticeable "swimming" lag where the garment trails behind the user's movements. Worse, the smoothing is applied per-frame of the render loop, not per-pose-update, so the effective smoothing depends on the render frame rate -- if rendering runs at 60 FPS but pose updates at 15 FPS, the model continues interpolating toward a stale target between pose updates, creating uneven motion.

**Why it happens:** Simple LERP smoothing is frame-rate-dependent. The smoothing constant 0.3 was tuned for one particular frame rate. When FPS varies (which it does on mobile), the smoothing behavior changes. Additionally, applying the same smoothing to scale and position means that when the user steps closer (larger scale), the garment "inflates" slowly over half a second instead of responding instantly.

**Consequences:**
- Garment appears to "float" or "swim" behind the user's torso
- Fast movements create visible desync between body and garment
- Scale changes (stepping forward/back) feel sluggish and unresponsive
- Different smoothing perception on different devices due to frame rate differences

**Prevention:**
1. Use time-based (delta-time) smoothing instead of frame-based LERP: `smoothed += (target - smoothed) * (1 - Math.pow(1 - factor, deltaTime * 60))`. This makes smoothing behavior independent of frame rate.
2. Apply different smoothing factors for different properties: position needs more smoothing (to reduce jitter), scale needs less (to feel responsive), rotation needs moderate smoothing.
3. Only apply smoothing when pose data updates. Between pose updates, hold the last smoothed position -- don't keep interpolating toward a stale target.
4. Implement a "snap" threshold: if the target position jumps more than a threshold (e.g., user re-enters frame), skip smoothing and snap directly.
5. Consider a Kalman filter or exponential moving average with velocity prediction for more natural-feeling tracking.

**Detection:**
- Visible lag between user movement and garment following
- Garment "catches up" after user stops moving
- Garment motion feels different on fast vs slow phones

**Phase mapping:** Phase 1-2. Time-based smoothing fix should be in the coordinate pipeline foundation. Advanced smoothing (Kalman, velocity prediction) can be Phase 3.

---

## Moderate Pitfalls

Mistakes that cause degraded quality or require significant rework but don't completely break the system.

---

### Pitfall 8: Resize Handler Doesn't Update Visible Dimensions

**What goes wrong:** The resize handler (lines 382-392) updates the renderer size and camera aspect, but does NOT recalculate `visibleDimsRef.current`. Since `visibleDims` is used in every frame for landmark-to-world mapping, rotating the phone or resizing the browser window causes the garment to be placed at the wrong scale and position until the component remounts.

**Prevention:** Recalculate `visibleDimsRef` in the resize handler using the same FOV formula:
```typescript
const vFov = (camera.fov * Math.PI) / 180;
const visibleHeight = 2 * Math.tan(vFov / 2) * camera.position.z;
const visibleWidth = visibleHeight * camera.aspect;
visibleDimsRef.current = { w: visibleWidth, h: visibleHeight };
```

**Phase mapping:** Phase 1 -- trivial fix, should be in the first pass.

---

### Pitfall 9: Using `@latest` for MediaPipe WASM URL

**What goes wrong:** The WASM URL uses `@latest` (line 10: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm`). This means a MediaPipe update could break the app at any time without a code change. WASM binary format and the JavaScript API must be version-matched. A mismatch causes silent failures or cryptic WASM errors.

**Prevention:**
1. Pin the WASM URL to a specific version that matches the `@mediapipe/tasks-vision` version in `package.json`.
2. Self-host the WASM files in Supabase storage or a CDN for offline resilience and version control.
3. Add error handling around `FilesetResolver.forVisionTasks()` that detects version mismatches.

**Detection:**
- Sudden "AR Tracking Failed" errors that weren't present before
- WASM-related console errors after a CDN cache expires

**Phase mapping:** Phase 1 -- quick fix with high impact on reliability.

---

### Pitfall 10: Abaya Full-Body Anchoring Requires All 33 Landmarks Visible

**What goes wrong:** For abayas (shoulder-to-ankle), the system needs ankles (landmarks 27, 28) visible. On a mobile phone, getting a full-body view means the user must stand far from the camera. At that distance, the person is small in the frame, MediaPipe's accuracy degrades, and landmark jitter increases. Users naturally hold the phone at chest height, which rarely captures ankles.

**Prevention:**
1. Design a fallback estimation chain: if ankles aren't visible, estimate ankle position from hips + known body proportions (hip-to-ankle is roughly 50% of total body height). If hips aren't visible, estimate from shoulders.
2. Use the landmarks that ARE visible and interpolate the rest. Don't require all anchor landmarks to be present simultaneously.
3. Provide clear user guidance: "Step back so your full body is visible" with a silhouette overlay showing what needs to be in frame.
4. Consider a progressive reveal: start placing the garment with available landmarks and extend it as more landmarks become visible.

**Detection:**
- Abaya garments flicker or disappear frequently (landmarks dropping below visibility threshold)
- Users must stand unreasonably far from camera to get full-body tracking

**Phase mapping:** Phase 2 (abaya-specific anchoring). The estimation fallback is critical for the primary garment type.

---

### Pitfall 11: `traverse` for Material Opacity Called Every Frame

**What goes wrong:** Lines 372-377 call `modelRef.current.traverse()` on every render frame to update material opacity. For complex .glb models (hundreds of meshes), this traversal is expensive. It also sets `material.transparent = true` every frame, which in Three.js causes the material to be re-compiled on the first call and changes the render order (transparent objects render after opaque).

**Prevention:**
1. Set `material.transparent = true` ONCE during model load, not every frame.
2. Cache the list of meshes during model load: `const meshes = []; model.traverse(c => c.isMesh && meshes.push(c))`. Then iterate only the cached list on each frame.
3. Only update opacity when it actually changes (compare to a stored previous value).
4. Consider using a single uniform for opacity via a custom shader material instead of per-mesh traversal.

**Detection:**
- Frame time increases linearly with model complexity
- GPU profiler shows excessive draw calls or state changes

**Phase mapping:** Phase 3 (performance), but the one-time setup should be done when model loading is refactored.

---

### Pitfall 12: No Garment-Type Fallback for Legacy Products

**What goes wrong:** Adding a `garment_type` column to the database is planned, but existing products won't have this field set. If the new anchoring system requires `garment_type` and doesn't handle null/missing values, all existing AR products will break.

**Prevention:**
1. Default `garment_type` to `'shirt'` (current behavior) when the column is null or missing.
2. Add a database migration that sets `garment_type = 'shirt'` for all existing AR-enabled products.
3. The new garment-type-aware `updateModel()` must have the current shirt behavior as its default code path, ensuring backward compatibility.
4. Add the garment_type selector to the retailer UI but make it optional with a default.

**Detection:**
- Existing AR products stop working or look different after deployment
- Regression in products that previously worked correctly

**Phase mapping:** Phase 2 (database migration), but plan for it in Phase 1 design.

---

### Pitfall 13: Camera FOV Assumption Doesn't Match Actual Device Camera

**What goes wrong:** The Three.js camera FOV is hardcoded to 63 degrees (line 159). The actual FOV of a phone's front camera varies significantly: iPhone front cameras are ~80 degrees, many Android front cameras are 70-90 degrees. If the Three.js camera FOV doesn't match the actual camera FOV, the mapping from normalized landmark coordinates to world coordinates will be systematically wrong -- garments will appear too large or too small.

**Why it happens:** There is no reliable way to query a webcam's actual FOV from the browser. `getUserMedia` doesn't expose lens characteristics.

**Prevention:**
1. Use a self-calibrating approach: measure the observed shoulder width in pixels and compare to known average shoulder widths. Or, derive the effective FOV from the relationship between video resolution and the MediaPipe world-landmark coordinates (which are in meters).
2. Alternatively, don't rely on FOV for positioning at all. Instead, map landmarks directly from normalized [0,1] coordinates to screen pixel coordinates, then overlay the Three.js canvas using an orthographic camera (or a perspective camera positioned to match pixel-space). This sidesteps the FOV problem entirely.
3. If sticking with perspective projection, make the FOV a tunable parameter and provide reasonable defaults per device category.

**Detection:**
- Garments are consistently too large or too small on certain phone models
- Scaling feels correct on one device but off on another, even with the same person

**Phase mapping:** Phase 2-3. Switching to an orthographic projection or FOV-independent mapping would be ideal but is a larger architectural change.

---

## Minor Pitfalls

Issues that cause inconvenience or minor quality degradation.

---

### Pitfall 14: Effect Dependency Causes Full Reinit on Product Switch

**What goes wrong:** The main `useEffect` (line 116) has `selectedProduct` in its dependency array. When the user switches products, the entire AR pipeline reinitializes: camera stops and restarts, MediaPipe re-initializes, Three.js scene rebuilds. This causes a 2-5 second blackout between products.

**Prevention:** Separate the pipeline into layers:
- Camera + MediaPipe = initialized once, independent of product
- 3D model = loaded/swapped independently
Split into two effects: one for camera/pose (runs once), one for model loading (runs on product change). The model swap should be near-instant if the pipeline is already running.

**Phase mapping:** Phase 1 (architecture). Separating concerns early prevents a painful refactor later.

---

### Pitfall 15: No Model Caching or Preloading

**What goes wrong:** Each time a product is selected, the .glb model is fetched from Supabase storage over the network. There is no browser caching strategy, no preloading of likely-next models, and no CDN. On slow mobile networks (common in event venues), model loading takes 3-10 seconds per switch.

**Prevention:**
1. Set appropriate Cache-Control headers on Supabase storage responses.
2. Preload the next 1-2 products' models in the background after the current model loads.
3. Use IndexedDB for persistent client-side model caching.
4. Consider Draco or meshopt compression for .glb files to reduce download size.
5. Add a loading progress indicator so users know the model is coming.

**Phase mapping:** Phase 3 (performance optimization).

---

### Pitfall 16: Landmark Visibility Threshold Too Binary

**What goes wrong:** The current code uses hard visibility thresholds: 0.5 for shoulders, 0.3 for hips. When a landmark hovers near the threshold (common when body parts are partially occluded), the model rapidly toggles between visible and hidden, creating a flickering effect.

**Prevention:**
1. Use hysteresis: require visibility > 0.5 to show, but only hide when visibility < 0.3. This prevents rapid toggling.
2. Maintain a "confidence history" over the last N frames and use the average rather than the instantaneous value.
3. When transitioning from visible to hidden, fade out gradually over 5-10 frames rather than instantly disappearing.

**Phase mapping:** Phase 2 (tracking quality improvements).

---

### Pitfall 17: World Landmarks Not Used (Missed Opportunity)

**What goes wrong:** MediaPipe PoseLandmarker outputs both `landmarks` (normalized, image-relative) and `worldLandmarks` (metric, 3D coordinates in meters). The current code only uses `landmarks`. World landmarks provide actual body dimensions in meters, which would eliminate the need to guess FOV-to-world mapping and produce more accurate garment sizing.

**Prevention:**
1. Access `result.worldLandmarks[0]` alongside `result.landmarks[0]`.
2. Use world landmarks for scale computation (shoulder width in meters maps directly to model scale).
3. Use normalized landmarks for screen-space positioning (where to place the model on screen).
4. This hybrid approach gives the best of both: accurate sizing from world coords, accurate positioning from normalized coords.

**Phase mapping:** Phase 2 (improved anchoring system). This is a significant improvement opportunity, not just a pitfall.

---

### Pitfall 18: No Graceful Degradation for Unsupported Browsers

**What goes wrong:** WebGL, getUserMedia, and WASM are all required. Some browsers (older Samsung Internet, in-app browsers like Instagram/Facebook webview) don't support all three. The current code has no feature detection beyond catching errors in the init flow.

**Prevention:**
1. Check for `navigator.mediaDevices.getUserMedia`, `WebGLRenderingContext`, and `WebAssembly` before entering the AR flow.
2. Show a clear "Your browser doesn't support AR try-on. Open in Chrome or Safari." message.
3. Fall back to the 2D garment overlay (ARGarmentOverlay component) when 3D AR isn't available.

**Phase mapping:** Phase 1 -- add capability detection at entry point.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Coordinate pipeline foundation | Double-mirror bug (Pitfall 1), Renderer/video size mismatch (Pitfall 2), Z-depth misinterpretation (Pitfall 5) | Establish single coordinate transform utility; test on 3+ screen sizes; use constant Z |
| Garment-type anchor system | One-size-fits-all anchoring (Pitfall 3), full-body landmark requirement for abayas (Pitfall 10), legacy product fallback (Pitfall 12) | Strategy pattern for anchoring; fallback estimation for missing landmarks; database migration with defaults |
| 3D model handling | Model origin inconsistency (Pitfall 4), no caching (Pitfall 15) | Anchor-point convention per garment type; upload-time validation; model preloading |
| Performance optimization | Mobile WebGL collapse (Pitfall 6), per-frame traversal (Pitfall 11), full reinit on product switch (Pitfall 14) | Reduce pixel ratio; render-on-dirty; separate pipeline layers; cache meshes |
| Tracking quality | Smoothing lag (Pitfall 7), visibility flickering (Pitfall 16), FOV mismatch (Pitfall 13) | Time-based smoothing; hysteresis thresholds; orthographic projection or FOV calibration |
| Reliability | `@latest` WASM URL (Pitfall 9), browser support (Pitfall 18) | Pin WASM version; add feature detection at entry |

---

## Confidence Notes

| Pitfall | Confidence | Basis |
|---------|-----------|-------|
| 1 (Double-mirror) | HIGH | Verified in codebase: both CSS scaleX(-1) and mirrorX() are present |
| 2 (Size mismatch) | HIGH | Verified in codebase: renderer uses window dims, camera uses video dims |
| 3 (One-size anchoring) | HIGH | Verified in codebase: comment says "Shirt anchor points", no branching |
| 4 (Model origin) | HIGH | Verified in codebase: bounding box center used, no garment-type-aware offset |
| 5 (Z-coordinate) | MEDIUM | MediaPipe Z behavior from training data; formula `avgZ * 2 - 1` likely incorrect for normalized landmark z range, but could not verify current MediaPipe docs |
| 6 (Performance) | HIGH | Known mobile WebGL constraints; verified DPR cap at 2, pose at 15 FPS, render at 60 FPS |
| 7 (Smoothing) | HIGH | Verified in codebase: frame-based LERP with constant factor, applied on render not pose |
| 8 (Resize handler) | HIGH | Verified in codebase: visibleDimsRef not updated in resize handler |
| 9 (@latest WASM) | HIGH | Verified in codebase: line 10 uses @latest |
| 10 (Full-body abayas) | MEDIUM | Domain knowledge about selfie camera ergonomics; not tested with actual users |
| 11 (traverse per frame) | HIGH | Verified in codebase: traverse called in updateModel which runs every pose frame |
| 12 (Legacy fallback) | HIGH | Verified: PROJECT.md states garment_type column is pending |
| 13 (FOV mismatch) | MEDIUM | Known WebRTC limitation; hardcoded 63 degrees verified in code |
| 14 (Full reinit) | HIGH | Verified: useEffect depends on selectedProduct, entire init runs |
| 15 (No caching) | HIGH | Verified: GLTFLoader.load called on every product selection |
| 16 (Visibility flicker) | MEDIUM | Common MediaPipe pattern; thresholds verified at 0.5 and 0.3 |
| 17 (World landmarks) | MEDIUM | MediaPipe PoseLandmarker does output worldLandmarks; training data confirms |
| 18 (Browser support) | MEDIUM | Known WebGL/WASM compatibility landscape; no feature detection found in code |

---

*Pitfalls audit: 2026-03-29. Web search unavailable during research; all pitfalls verified against codebase or based on domain expertise. Confidence levels assigned accordingly.*

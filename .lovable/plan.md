

## Fix AR Model Anchoring — Proper Body-Mapped Placement

### Problem Analysis

The current `updateModel()` function has several fundamental issues that prevent the 3D garment from appearing correctly on the person:

1. **No bounding box normalization**: The loaded GLB model is used as-is. If its origin is at the floor or an arbitrary point, the position calculations will be wrong. The model must be centered and normalized before positioning.

2. **Arbitrary coordinate multipliers**: The mapping from MediaPipe normalized coords (0-1) to Three.js world coords uses hardcoded magic numbers (`* 4`, `* 3`, `* 2`, `* 5`) that don't account for the Three.js camera's actual FOV and distance. This means the model drifts away from the body.

3. **No garment-type awareness**: A shirt should anchor between shoulders at the top and hips at the bottom. The current code averages all four points into a single center, which places the model at the torso midpoint but doesn't stretch/fit it to the actual body shape.

4. **Scale is based only on width**: `bodyW * 5` tries to match shoulder width, but ignores the vertical torso height, so the model's aspect ratio is wrong.

---

### What Changes

**File: `src/pages/ARExperience.tsx`**

#### A. Normalize the 3D model on load (after GLTFLoader)

After loading the GLB, compute its bounding box and:
- Re-center the model so its geometric center is at origin (0,0,0)
- Calculate its natural width/height/depth for proper scaling later
- Store these dimensions for use in `updateModel()`

```text
const box = new THREE.Box3().setFromObject(model);
const size = box.getSize(new THREE.Vector3());
const center = box.getCenter(new THREE.Vector3());
model.position.sub(center); // center at origin

// Wrap in a group so position.sub doesn't fight with runtime positioning
const wrapper = new THREE.Group();
wrapper.add(model);
scene.add(wrapper);
// Store size for scaling: modelDims = { w: size.x, h: size.y, d: size.z }
```

#### B. Compute proper NDC-to-world coordinate mapping

Instead of arbitrary multipliers, calculate the visible world dimensions at the camera's z-distance using the FOV:

```text
// At camera z=2, with FOV=63 (adjusted), the visible area is:
const vFov = (camera.fov * Math.PI) / 180;
const visibleHeight = 2 * Math.tan(vFov / 2) * camera.position.z;
const visibleWidth = visibleHeight * aspectRatio;

// Then map normalized coords:
targetX = (cx - 0.5) * visibleWidth;
targetY = -(cy - 0.5) * visibleHeight;
```

#### C. Garment-aware anchor points for shirts

For a shirt/top garment (the primary use case), use these MediaPipe landmarks:

```text
Landmark reference:
  11 = left shoulder    12 = right shoulder
  23 = left hip         24 = right hip

Shirt anchor strategy:
  - Horizontal center: midpoint of shoulders (mirrored for selfie cam)
  - Vertical center: midpoint between shoulder-center and hip-center
  - Width: shoulder-to-shoulder distance → scale model width to match
  - Height: shoulder-to-hip distance → scale model height to match
  - Rotation: shoulder angle for body turn
```

The model will be scaled **non-uniformly** (scaleX from shoulder width, scaleY from torso height) using the normalized model dimensions from step A, so the shirt actually stretches to fit the person's body proportions rather than using a single uniform scale.

#### D. Improved `updateModel()` function

Replace the current function with:

```text
function updateModel(landmarks, modelDims, visibleWidth, visibleHeight):
  ls = landmarks[11]  // left shoulder
  rs = landmarks[12]  // right shoulder
  lh = landmarks[23]  // left hip
  rh = landmarks[24]  // right hip

  // Require shoulders visible
  if shoulders not visible: hide model, return

  // Mirror X for selfie camera
  mirrorX = (x) => 1 - x

  // Shoulder midpoint (horizontal anchor)
  shoulderCX = (mirrorX(ls.x) + mirrorX(rs.x)) / 2
  shoulderCY = (ls.y + rs.y) / 2

  // Hip midpoint (vertical bottom anchor)
  if hips visible:
    hipCY = (lh.y + rh.y) / 2
  else:
    hipCY = shoulderCY + 0.25  // estimate

  // Torso center = midpoint between shoulders and hips
  centerX = shoulderCX
  centerY = (shoulderCY + hipCY) / 2

  // Map to world coordinates using camera FOV
  worldX = (centerX - 0.5) * visibleWidth
  worldY = -(centerY - 0.5) * visibleHeight

  // Scale: match shoulder width and torso height independently
  shoulderWidthNorm = abs(mirrorX(rs.x) - mirrorX(ls.x))
  torsoHeightNorm = hipCY - shoulderCY
  
  shoulderWidthWorld = shoulderWidthNorm * visibleWidth
  torsoHeightWorld = torsoHeightNorm * visibleHeight

  // Scale model to match body proportions
  scaleX = (shoulderWidthWorld / modelDims.w) * ar_scale * 1.15  // slight padding
  scaleY = (torsoHeightWorld / modelDims.h) * ar_scale
  scaleZ = (scaleX + scaleY) / 2  // average for depth

  // Apply with smoothing (existing lerp logic)
  model.position.set(smoothed worldX + offset.x, smoothed worldY + offset.y, ...)
  model.scale.set(smoothed scaleX, smoothed scaleY, smoothed scaleZ)
  model.rotation.y = smoothed shoulderAngle
```

#### E. Add smooth scale vector (minor ref change)

Change `smoothScale` from a single number to `{ x, y, z }` to support non-uniform scaling.

---

### What Stays the Same

- Camera setup, video mirroring, MediaPipe initialization — all unchanged
- Visibility-based opacity fading — unchanged
- Product selector UI — unchanged
- Database schema — no changes needed (the existing `ar_scale` and `ar_position_offset` fields are sufficient as multipliers on top of the auto-calculated fit)

### Files Changed

| File | Change |
|------|--------|
| `src/pages/ARExperience.tsx` | Normalize model bounding box on load; FOV-based coordinate mapping; body-proportional scaling in `updateModel()` |


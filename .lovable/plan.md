

## Audit: Dual Upload Flow + MediaPipe AR Functionality

### Findings

**1. Shared loading state bug (BrandProductManager.tsx)**
Both the outfit image upload (line 402) and the 3D model upload (line 542) use the same `uploadingOutfit` state variable. This means:
- If a retailer is uploading a try-on photo, the AR upload button is disabled (and vice versa)
- The loading spinner text says "Uploading..." for both, which is confusing for the AR upload
- Not a data corruption issue (they write to separate DB fields), but a UX bug

**Fix:** Add a separate `uploadingARModel` state variable for the 3D upload section.

**2. Data isolation is correct**
- Try-on photo upload writes to: `try_on_data`, `try_on_config`, `try_on_provider`, `try_on_ready`
- AR 3D upload writes to: `ar_model_url`, `ar_enabled`
- These are completely separate columns — no interference.

**3. MediaPipe pose tracking — functional but limited**
The current implementation:
- Tracks shoulders only (landmarks 11 and 12) for position and scale
- Missing hip landmarks (23, 24) which are needed for full-body garments (dresses, pants, full outfits)
- Missing torso rotation — if the user turns slightly, the 3D model doesn't rotate to match
- No `ar_position_offset` usage — the column exists in the DB but the AR page ignores it

**Fix:** Add hip tracking for better vertical positioning and body proportion mapping. Use the `ar_position_offset` field. Add model rotation based on shoulder angle.

**4. Video mirroring mismatch**
Camera uses `facingMode: 'user'` (front camera) but the video element has no CSS `transform: scaleX(-1)`. The video appears mirrored (natural for selfie), but the Three.js overlay is not mirrored — so the 3D model will move in the opposite direction from the user's body.

**Fix:** Mirror the canvas to match the video, or adjust the coordinate mapping.

### Implementation Plan

**File 1: `src/components/BrandProductManager.tsx`**
- Add `const [uploadingARModel, setUploadingARModel] = useState(false)` state
- Replace `setUploadingOutfit` with `setUploadingARModel` in the 3D upload handler (lines 542, 596)
- Update the AR upload disabled check to use `uploadingARModel`
- Add a separate loading indicator for AR upload

**File 2: `src/pages/ARExperience.tsx`**
- Add hip landmarks (23, 24) to the pose results handler for better vertical positioning
- Mirror the video element with `style={{ transform: 'scaleX(-1)' }}` and invert X in the pose callback so overlay matches
- Use `ar_position_offset` from the product data to apply per-product offset adjustments
- Add shoulder angle calculation for model Y-rotation so the garment follows body turns
- Update the `ARProduct` interface to include `ar_position_offset`
- Fetch `ar_position_offset` in the product query

### Technical Detail

Updated pose handler logic:
```
Shoulders: landmarks[11], landmarks[12] → horizontal center + width
Hips: landmarks[23], landmarks[24] → vertical extent
Torso center: midpoint of shoulders and hips → model Y position
Shoulder angle: atan2(dy, dx) between shoulders → model Y rotation
ar_position_offset: applied as additive offset to final position
Video mirror: scaleX(-1) on video + invert centerX calculation
```


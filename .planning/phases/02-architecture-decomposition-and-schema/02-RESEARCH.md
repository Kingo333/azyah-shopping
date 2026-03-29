# Phase 2: Architecture Decomposition and Schema - Research

**Researched:** 2026-03-29
**Domain:** React component decomposition, Three.js scene lifecycle, Supabase schema migration, mobile rendering performance
**Confidence:** HIGH

## Summary

Phase 2 transforms a 563-line monolithic `ARExperience.tsx` page into bounded modules and adds garment-type metadata to the database. The monolith currently mixes six concerns in a single `useEffect`: camera acquisition, Three.js scene setup, GLB model loading, MediaPipe pose initialization, the render loop, and cleanup. The critical architectural insight is that **the main effect depends on `[isLoading, selectedProduct]`**, meaning switching products tears down the camera, pose detector, scene, renderer, and model -- then rebuilds everything from scratch. This is the root cause of requirements ARCH-03 and ARCH-04.

The decomposition follows a clear separation: (1) camera lifecycle is independent of product selection, (2) pose detection depends only on a running camera, (3) the Three.js scene/renderer should persist across product switches, (4) only the 3D model should reload when the product changes. The database task is straightforward: add a `garment_type` TEXT column with a CHECK constraint and default value, add a dropdown to the retailer upload UI, and update the TypeScript types manually (since the Lovable platform auto-generates types.ts, but we can edit it directly for immediate development).

**Primary recommendation:** Split the monolith's single `useEffect` into three independent effects with different dependency arrays -- camera+pose (runs once), scene persistence (runs once), and model loading (runs on product change). Add `garment_type` via a Supabase SQL migration. Implement the three PERF requirements as part of the scene manager extraction since they are render-loop concerns.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ARCH-01 | Decompose ARExperience.tsx monolith into bounded components | Monolith analysis below identifies 5 extractable concerns with clear interfaces |
| ARCH-03 | Scene persistence -- reuse Three.js scene/renderer when switching products | Scene manager pattern: renderer/scene/camera created once, only model swaps on product change |
| ARCH-04 | Separate pose detection effect from model loading | Three independent effects pattern with different dependency arrays |
| RETL-01 | Add garment_type column to event_brand_products | SQL migration pattern identified from existing migrations; CHECK constraint enum |
| RETL-02 | Add garment type dropdown in BrandProductManager upload UI | shadcn Select component exists; insertion point in 3D model upload section identified |
| RETL-04 | Migrate existing AR products -- default garment_type to 'shirt' | DEFAULT clause in ALTER TABLE handles this automatically for existing rows |
| PERF-01 | Cap DPR at 1.0 on mobile | One-line change in scene setup: `Math.min(window.devicePixelRatio, 1)` on mobile |
| PERF-02 | Render-on-dirty -- only render when pose data changes | Dirty flag pattern in extracted render loop; skip `renderer.render()` when no new pose |
| PERF-03 | Cache material traversal | Cache material references on model load instead of traversing every frame |
</phase_requirements>

## Standard Stack

### Core (Already Installed -- No Changes)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^18.3.1 | UI framework | Existing project stack |
| Three.js | ^0.160.1 | 3D rendering | Existing AR renderer. No upgrade needed. |
| @mediapipe/tasks-vision | ^0.10.34 | Pose detection | Existing pose detector. Pinned WASM in Phase 1. |
| Supabase JS | (installed) | Database + storage | Existing backend. Migrations via SQL files. |
| shadcn/ui | (installed) | UI components | `select.tsx` component already available for garment type dropdown |

### Supporting (Already Available)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| GLTFLoader | three/examples | Load .glb models | Already used in ARExperience for model loading |
| OneEuroFilter | src/ar/utils/ | Landmark smoothing | Created in Phase 1; used by PoseProcessor/LandmarkSmoother |
| coordinateUtils | src/ar/utils/ | NDC-to-world transforms | Created in Phase 1; used by extracted anchor computation |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual effect splitting | Custom hooks (useCamera, usePose, useScene) | Hooks add indirection but improve reusability. Use hooks only if the component gets complex; start with plain effect splitting inside ARExperience. |
| Manual TypeScript type update | `npx supabase gen types` CLI | CLI requires local Supabase CLI setup. Since this is a Lovable project with auto-generated types, manually adding the column to types.ts is faster and avoids toolchain complexity. |
| Text CHECK constraint | Postgres ENUM type | Text with CHECK is simpler to migrate (adding new values is ALTER TABLE, not ALTER TYPE). This project's existing columns use text, not custom types. |

**Installation:** No new packages required.

## Architecture Patterns

### Current Monolith Analysis (ARExperience.tsx, 563 lines)

The file has one massive `useEffect` (lines 122-296) with dependency array `[isLoading, selectedProduct]`. This effect handles:

1. **Camera acquisition** (lines 140-158): `getUserMedia`, stream setup, `video.play()`
2. **Three.js scene creation** (lines 173-195): Scene, PerspectiveCamera, WebGLRenderer, lighting
3. **3D model loading** (lines 198-234): GLTFLoader, bounding box normalization, centering
4. **MediaPipe pose init** (lines 237-258): FilesetResolver, PoseLandmarker creation
5. **Render loop** (lines 261-284): requestAnimationFrame, pose detection, updateModel, renderer.render
6. **Cleanup** (lines 289-295): Stream stop, landmarker close, renderer dispose

**The problem:** Because `selectedProduct` is in the dependency array, ALL of this tears down and rebuilds when the user taps a different product thumbnail. The camera restarts (visible flicker), MediaPipe re-initializes (500ms+ delay), and the scene/renderer are recreated (unnecessary allocation/GC).

### Recommended Decomposition

```
src/
  ar/
    utils/
      OneEuroFilter.ts          # Phase 1 (exists)
      coordinateUtils.ts        # Phase 1 (exists)
    core/
      CameraManager.ts          # Camera stream lifecycle (getUserMedia, cleanup)
      PoseProcessor.ts          # MediaPipe init + per-frame detection
      SceneManager.ts           # Three.js scene, renderer, camera, lighting, resize
      ModelLoader.ts            # GLTFLoader, bounding box normalization, material cache
    types.ts                    # Shared AR types (TrackingState, ARProduct, etc.)
  pages/
    ARExperience.tsx            # Slim orchestrator (~150 lines): refs, effects, UI
```

### Pattern 1: Three Independent Effects

**What:** Split the monolith's single `useEffect` into three effects with different dependency arrays so concerns have independent lifecycles.

**When to use:** When a single effect mixes concerns that should react to different state changes.

```typescript
// Effect 1: Camera + Pose (runs once when component mounts with valid refs)
useEffect(() => {
  if (!videoRef.current || !canvasRef.current) return;
  const camera = CameraManager.start(videoRef.current);
  const pose = PoseProcessor.init(videoRef.current);
  return () => { camera.stop(); pose.close(); };
}, []); // NO dependency on selectedProduct

// Effect 2: Scene persistence (runs once)
useEffect(() => {
  if (!canvasRef.current) return;
  const scene = SceneManager.create(canvasRef.current);
  return () => scene.dispose();
}, []);

// Effect 3: Model loading (runs when product changes)
useEffect(() => {
  if (!selectedProduct || !sceneRef.current) return;
  const model = ModelLoader.load(selectedProduct.ar_model_url, sceneRef.current);
  filterRefs.resetAll(); // Reset smoothing on product switch
  return () => model.remove();
}, [selectedProduct]);
```

### Pattern 2: Scene Persistence (ARCH-03)

**What:** The Three.js WebGLRenderer, Scene, and PerspectiveCamera are created once and persist for the lifetime of the AR experience. Only the loaded 3D model swaps when the user selects a different product.

**When to use:** Always for this AR use case. WebGLRenderer creation is expensive (GPU context allocation). Disposing and recreating it causes visible flicker and GC pressure.

```typescript
// SceneManager.ts - created once, persists across product switches
export class SceneManager {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private currentModel: THREE.Object3D | null = null;

  create(canvas: HTMLCanvasElement): void {
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    // Cap DPR at 1.0 on mobile (PERF-01)
    const isMobile = /Android|iPhone|iPad/.test(navigator.userAgent);
    const dpr = isMobile ? 1.0 : Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(dpr);
    // ... camera, lighting setup
  }

  swapModel(newModel: THREE.Object3D): void {
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      // Dispose old model's geometry/materials to free GPU memory
      this.disposeModel(this.currentModel);
    }
    this.scene.add(newModel);
    this.currentModel = newModel;
  }
}
```

### Pattern 3: Render-on-Dirty (PERF-02)

**What:** The render loop calls `renderer.render()` only when new pose data arrives, not every animation frame. Currently the renderer runs at 60fps but pose detection runs at ~15fps, meaning ~75% of render calls are wasted (same frame, same model position).

```typescript
// In the render loop
let dirty = false;

function onPoseResult(landmarks: NormalizedLandmark[]) {
  updateModelTransform(landmarks);
  dirty = true;
}

function animate() {
  // Pose detection still runs on its own cadence
  if (dirty) {
    renderer.render(scene, camera);
    dirty = false;
  }
  requestAnimationFrame(animate);
}
```

### Pattern 4: Material Cache (PERF-03)

**What:** When a model loads, traverse its mesh tree once to collect all materials. Store the material references. On each frame, update opacity directly from the cached array instead of calling `model.traverse()` every frame.

```typescript
// On model load (once):
const materials: THREE.Material[] = [];
model.traverse((child: THREE.Object3D) => {
  if ((child as THREE.Mesh).isMesh) {
    const mesh = child as THREE.Mesh;
    const mat = mesh.material as THREE.Material;
    mat.transparent = true;
    materials.push(mat);
  }
});

// On each frame (fast -- no traversal):
function updateOpacity(opacity: number) {
  for (const mat of materials) {
    (mat as THREE.MeshStandardMaterial).opacity = opacity;
  }
}
```

### Anti-Patterns to Avoid

- **Recreating WebGLRenderer on product switch:** GPU context allocation is expensive. Create once, persist.
- **Putting selectedProduct in the camera/pose effect deps:** This causes camera restart on product switch.
- **Over-abstracting into too many files:** Keep the component count for Phase 2 to 4-5 files max. BodySkeleton and AnchorResolver are Phase 3 concerns.
- **Using React state for per-frame data:** Position, scale, rotation change 15+ times/second. Use refs, not useState. The current code already does this correctly.
- **Traversing model tree every frame:** O(n) per frame for material updates. Cache on load instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Garment type validation | Custom validation logic | Postgres CHECK constraint | Database enforces valid values; client can't insert garbage |
| UI dropdown | Custom dropdown component | shadcn `<Select>` (already in project) | Accessible, styled, tested |
| Model bounding box | Manual vertex iteration | `THREE.Box3().setFromObject()` | Already used in current code; handles all mesh types correctly |
| Smooth filter | New smoothing implementation | OneEuroFilter from Phase 1 | Already built and tested in `src/ar/utils/` |

**Key insight:** Phase 2 is about reorganizing existing code, not writing new algorithms. The coordinate pipeline and smoothing are solved. The anchor strategy system is Phase 3. Phase 2 creates the structure that Phase 3 will fill.

## Common Pitfalls

### Pitfall 1: Effect Dependency Array Mistakes
**What goes wrong:** React's exhaustive-deps lint rule flags missing dependencies, developer adds them, and the effect now runs too often (e.g., camera restarts on product change).
**Why it happens:** The linter doesn't understand that some refs/values are intentionally excluded.
**How to avoid:** Use `// eslint-disable-next-line react-hooks/exhaustive-deps` with a comment explaining why the dependency is intentionally excluded. Store stable references in refs rather than state.
**Warning signs:** Camera flicker when switching products, MediaPipe "already initialized" errors.

### Pitfall 2: WebGLRenderer Disposal Race Condition
**What goes wrong:** The cleanup function disposes the renderer while a requestAnimationFrame callback is still pending. The callback tries to call `renderer.render()` on a disposed renderer, throwing a WebGL error.
**Why it happens:** `cancelAnimationFrame` and `renderer.dispose()` run asynchronously.
**How to avoid:** Use a `cleanedUp` boolean ref (already present in current code) and check it at the top of the animation loop AND before any renderer calls. Dispose renderer AFTER canceling the animation frame.
**Warning signs:** "WebGL: INVALID_OPERATION" console errors when navigating away from AR.

### Pitfall 3: Supabase Types Out of Sync
**What goes wrong:** Adding `garment_type` column via SQL migration but forgetting to update `src/integrations/supabase/types.ts`. TypeScript doesn't know the column exists, so `.select('garment_type')` gets type errors.
**Why it happens:** This is a Lovable project where `types.ts` is auto-generated from the Supabase schema. But the auto-generation may not happen immediately after a dashboard migration.
**How to avoid:** After applying the SQL migration, manually add `garment_type` to the Row, Insert, and Update interfaces in `types.ts`. Also add it to the `ARProduct` interface in ARExperience.tsx and the `EventBrandProduct` interface in BrandProductManager.tsx.
**Warning signs:** TypeScript errors mentioning unknown column; runtime data returning without the new field.

### Pitfall 4: Mobile DPR Detection
**What goes wrong:** Using `window.devicePixelRatio` to detect "mobile" is wrong -- some desktop monitors have DPR 2.0+. Using user agent to detect mobile catches some devices but not all (iPads report desktop UA in some modes).
**Why it happens:** No single reliable "is mobile" check exists.
**How to avoid:** For PERF-01, cap DPR based on a combination: (1) screen width < 768, OR (2) `navigator.maxTouchPoints > 0` AND `screen.width < 1024`. This catches phones and most tablets without penalizing desktop retina displays. Alternatively, cap at 1.0 unconditionally for the AR page since it is only used on mobile in practice.
**Warning signs:** Desktop AR preview looks blurry (DPR capped too aggressively) or mobile still overheats (DPR not capped).

### Pitfall 5: Garment Type Enum Value Mismatch
**What goes wrong:** The database uses one set of enum values (e.g., 'top') while the frontend uses another (e.g., 'shirt'), or the STACK research uses 'top' while REQUIREMENTS.md specifies 'shirt'.
**Why it happens:** Research documents were written independently and used inconsistent naming.
**How to avoid:** Use the REQUIREMENTS.md-specified enum values exactly: `shirt, abaya, pants, jacket, headwear, accessory`. The database CHECK constraint, TypeScript type union, frontend dropdown options, and anchor strategy keys MUST all use the same strings.
**Warning signs:** Products saved with one garment type value load with null on the frontend.

## Code Examples

### Database Migration (SQL)

```sql
-- Migration: Add garment_type to event_brand_products
-- Enum values per REQUIREMENTS.md RETL-01: shirt, abaya, pants, jacket, headwear, accessory

ALTER TABLE public.event_brand_products
ADD COLUMN garment_type TEXT NOT NULL DEFAULT 'shirt'
CHECK (garment_type IN ('shirt', 'abaya', 'pants', 'jacket', 'headwear', 'accessory'));

-- RETL-04: All existing rows automatically get 'shirt' from the DEFAULT clause.
-- No separate data migration needed.

COMMENT ON COLUMN public.event_brand_products.garment_type IS
  'Type of garment for AR anchor strategy selection. Determines which landmarks and scaling to use.';
```

### TypeScript Type Update (types.ts addition)

```typescript
// Add to event_brand_products.Row:
garment_type: string  // 'shirt' | 'abaya' | 'pants' | 'jacket' | 'headwear' | 'accessory'

// Add to event_brand_products.Insert:
garment_type?: string

// Add to event_brand_products.Update:
garment_type?: string
```

### Garment Type Dropdown (BrandProductManager)

```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const GARMENT_TYPES = [
  { value: 'shirt', label: 'Shirt / Top' },
  { value: 'abaya', label: 'Abaya / Dress' },
  { value: 'pants', label: 'Pants / Bottoms' },
  { value: 'jacket', label: 'Jacket / Outerwear' },
  { value: 'headwear', label: 'Headwear' },
  { value: 'accessory', label: 'Accessory' },
] as const;

// In the 3D Model Upload section, before or after the file input:
<div>
  <label className="text-sm font-medium">Garment Type</label>
  <p className="text-xs text-muted-foreground mb-2">
    Select the type of garment to optimize AR placement.
  </p>
  <Select
    value={garmentType}
    onValueChange={setGarmentType}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select garment type" />
    </SelectTrigger>
    <SelectContent>
      {GARMENT_TYPES.map(t => (
        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

### CameraManager Extract

```typescript
// src/ar/core/CameraManager.ts
export interface CameraResult {
  stream: MediaStream;
  videoWidth: number;
  videoHeight: number;
}

export async function startCamera(
  video: HTMLVideoElement,
  constraints?: MediaStreamConstraints
): Promise<CameraResult> {
  const stream = await navigator.mediaDevices.getUserMedia(
    constraints ?? {
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
    }
  );
  video.srcObject = stream;
  await video.play();

  // Wait for dimensions
  await new Promise<void>((resolve) => {
    if (video.videoWidth > 0) { resolve(); return; }
    video.onloadedmetadata = () => resolve();
  });

  return {
    stream,
    videoWidth: video.videoWidth || window.innerWidth,
    videoHeight: video.videoHeight || window.innerHeight,
  };
}

export function stopCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}
```

### SceneManager Extract (with PERF-01, PERF-02, PERF-03)

```typescript
// src/ar/core/SceneManager.ts
import * as THREE from 'three';

export class SceneManager {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  private currentModel: THREE.Object3D | null = null;
  private cachedMaterials: THREE.Material[] = [];
  dirty = false; // PERF-02: render-on-dirty flag

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(63, aspect, 0.1, 1000);
    this.camera.position.z = 2;

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // PERF-01: Cap DPR at 1.0 on mobile
    const isMobile = window.innerWidth < 768 || navigator.maxTouchPoints > 0;
    this.renderer.setPixelRatio(isMobile ? 1.0 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    // Lighting
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(0, 1, 1);
    this.scene.add(dir);
  }

  get visibleDims() {
    const vFov = (this.camera.fov * Math.PI) / 180;
    const h = 2 * Math.tan(vFov / 2) * this.camera.position.z;
    return { w: h * this.camera.aspect, h };
  }

  // PERF-03: Cache materials on model swap
  swapModel(newModel: THREE.Object3D | null): void {
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      // Dispose geometry and materials of old model
      this.currentModel.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
    }
    this.cachedMaterials = [];
    if (newModel) {
      this.scene.add(newModel);
      // Cache material references for fast per-frame opacity updates
      newModel.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.Material;
          mat.transparent = true;
          this.cachedMaterials.push(mat);
        }
      });
    }
    this.currentModel = newModel;
  }

  updateOpacity(opacity: number): void {
    for (const mat of this.cachedMaterials) {
      (mat as any).opacity = opacity;
    }
  }

  // PERF-02: Only render when dirty
  renderIfDirty(): void {
    if (this.dirty) {
      this.renderer.render(this.scene, this.camera);
      this.dirty = false;
    }
  }

  handleResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  dispose(): void {
    this.swapModel(null);
    this.renderer.dispose();
  }
}
```

## State of the Art

| Old Approach (Current) | Current Approach (Phase 2) | When Changed | Impact |
|------------------------|---------------------------|--------------|--------|
| Single monolithic useEffect | Three independent effects with different dep arrays | This phase | Products switch without camera restart |
| Recreate renderer per product | Persistent scene, swap only model | This phase | No GPU context churn, no flicker |
| DPR = devicePixelRatio (up to 3x) | DPR capped at 1.0 on mobile | This phase | 3-9x fewer pixels rendered, less thermal throttle |
| renderer.render() every animation frame | Render only when pose data changes | This phase | ~75% fewer render calls (pose at ~15fps vs display at 60fps) |
| model.traverse() every frame for opacity | Cached material array, direct update | This phase | O(1) per frame instead of O(meshCount) traversal |

**Deprecated/outdated:**
- Nothing deprecated in this phase. The patterns are straightforward React and Three.js refactoring.

## Open Questions

1. **Supabase type regeneration in Lovable**
   - What we know: `types.ts` and `client.ts` are marked as auto-generated. The Lovable platform regenerates them when schema changes are applied through the Supabase dashboard.
   - What's unclear: Whether manually editing `types.ts` will be overwritten on next Lovable sync.
   - Recommendation: Manually update `types.ts` for immediate development AND apply the migration through the Supabase dashboard so the next auto-generation includes the column. Add a comment near the manual edit.

2. **How much decomposition to do in Phase 2 vs Phase 3**
   - What we know: Phase 3 needs AnchorResolver, BodySkeleton, per-garment strategies. Phase 2 ARCH-01 says "bounded components."
   - What's unclear: Whether Phase 2 should create placeholder files for Phase 3 components.
   - Recommendation: Phase 2 creates CameraManager, PoseProcessor, SceneManager, ModelLoader (the 4 extractable concerns). Do NOT create AnchorResolver or BodySkeleton stubs -- that is Phase 3 scope. Phase 2's `updateModel()` function stays as-is (shirt-only logic) but lives in a clearly-named location ready for Phase 3 to replace with the strategy pattern.

3. **Render loop ownership**
   - What we know: The render loop currently lives inside the main `useEffect`. It needs to move somewhere persistent.
   - What's unclear: Whether the render loop should be part of SceneManager or remain in ARExperience.
   - Recommendation: Keep the `requestAnimationFrame` loop in ARExperience (the orchestrator) since it coordinates between PoseProcessor (which produces landmarks) and SceneManager (which renders). SceneManager provides `renderIfDirty()` but doesn't own the loop.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright (e2e only -- no unit test framework installed) |
| Config file | `playwright.config.ts` (Lovable-provided, minimal config) |
| Quick run command | `npx playwright test --headed` |
| Full suite command | `npx playwright test` |

**Note:** This project has NO unit test framework (no vitest, jest, or mocha). No test files exist under `src/`. The only test infrastructure is Playwright for e2e, configured via a Lovable wrapper. For Phase 2, unit testing the extracted modules would require installing vitest.

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARCH-01 | Monolith decomposed into modules | structural / manual | Verify file structure exists | N/A |
| ARCH-03 | Scene persists when switching products | manual-only | Observe: no camera flicker on product switch | N/A -- requires camera + visual |
| ARCH-04 | Camera does not restart on product change | manual-only | Observe: video stream continues when tapping different product | N/A -- requires camera |
| RETL-01 | garment_type column exists in DB | smoke | `SELECT garment_type FROM event_brand_products LIMIT 1` (Supabase SQL editor) | N/A -- DB level |
| RETL-02 | Garment type dropdown visible in upload UI | e2e | `npx playwright test e2e/garment-type.spec.ts` | Wave 0 |
| RETL-04 | Existing products default to 'shirt' | smoke | `SELECT DISTINCT garment_type FROM event_brand_products` | N/A -- DB level |
| PERF-01 | DPR capped at 1.0 on mobile | unit | `vitest run src/ar/core/SceneManager.test.ts` | Wave 0 |
| PERF-02 | Render only when dirty flag set | unit | `vitest run src/ar/core/SceneManager.test.ts` | Wave 0 |
| PERF-03 | Material cache populated on model load | unit | `vitest run src/ar/core/SceneManager.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** Verify `npm run build` succeeds (catches TS errors, import resolution)
- **Per wave merge:** `npm run build` + manual AR test on mobile device
- **Phase gate:** Full build + manual verification of all 4 success criteria from ROADMAP

### Wave 0 Gaps

- [ ] Install vitest: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom` -- if unit testing is desired
- [ ] `vitest.config.ts` -- configure with jsdom environment and path aliases
- [ ] Add `"test": "vitest run"` to package.json scripts

**Pragmatic recommendation:** Given that the AR modules depend on WebGL (Three.js), MediaPipe WASM, and camera APIs -- all of which are hard to mock -- the highest-value validation is `npm run build` (catches structural/type errors) plus manual testing on device. Installing a full unit test framework may be deferred unless the team explicitly wants it. The planner should treat `npm run build` as the primary automated validation gate.

## Sources

### Primary (HIGH confidence)

- **Current codebase** -- `src/pages/ARExperience.tsx` (563 lines, fully read and analyzed)
- **Current codebase** -- `src/components/BrandProductManager.tsx` (628 lines, fully read)
- **Current codebase** -- `src/integrations/supabase/types.ts` (event_brand_products schema analyzed)
- **Current codebase** -- `src/ar/utils/OneEuroFilter.ts` and `coordinateUtils.ts` (Phase 1 outputs)
- **Project planning** -- `.planning/research/ARCHITECTURE.md` (decomposition pattern reference)
- **Project planning** -- `.planning/research/STACK.md` (technology decisions)

### Secondary (MEDIUM confidence)

- **Three.js WebGLRenderer lifecycle** -- Based on Three.js 0.160 API knowledge: `dispose()` releases GPU resources, `setPixelRatio()` accepts any float value
- **Postgres ALTER TABLE with DEFAULT** -- Standard SQL behavior: adding NOT NULL column with DEFAULT backfills existing rows automatically
- **React effect dependency arrays** -- Documented React 18 behavior: effects re-run when any dependency changes

### Tertiary (LOW confidence)

- **Lovable auto-generation behavior** -- Inference from `client.ts` "automatically generated" comment. Exact regeneration triggers unverified.
- **Mobile DPR detection heuristic** -- `navigator.maxTouchPoints` combined with screen width is pragmatic but not guaranteed accurate on all devices

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new libraries needed; all tools already in project
- Architecture: HIGH -- Decomposition follows directly from reading the monolith's effect structure
- Pitfalls: HIGH -- Identified from actual code patterns (effect deps, WebGL disposal, type sync)
- Database: HIGH -- Standard Postgres ALTER TABLE; migration pattern matches existing project migrations
- Performance: HIGH -- PERF-01/02/03 are mechanical optimizations with clear implementation paths

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable domain; no fast-moving API changes)

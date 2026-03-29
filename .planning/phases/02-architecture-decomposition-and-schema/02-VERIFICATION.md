---
phase: 02-architecture-decomposition-and-schema
verified: 2026-03-29T00:00:00Z
status: gaps_found
score: 8/10 must-haves verified
re_verification: false
gaps:
  - truth: "ARExperience.tsx fetches and passes garment_type to the AR pipeline so Phase 3 anchor strategies can consume it"
    status: failed
    reason: "The Supabase select query in ARExperience.tsx does not include garment_type in the column list, and the mapped ARProduct object does not include the garment_type field. The ARProduct interface supports it (optional field) but the data is never fetched or passed through."
    artifacts:
      - path: "src/pages/ARExperience.tsx"
        issue: "select() at line 62 omits garment_type; mapped object at lines 79-87 omits garment_type field"
    missing:
      - "Add garment_type to the Supabase select query: `.select('id, image_url, ar_model_url, ar_scale, ar_position_offset, garment_type, event_brands!inner(brand_name, event_id)')`"
      - "Add garment_type to the mapped ARProduct object: `garment_type: p.garment_type as GarmentType | undefined`"
  - truth: "The render loop uses renderIfDirty() so frames without new pose data skip GPU rendering"
    status: failed
    reason: "Minor: renderIfDirty() is called every frame regardless of whether pose ran. The throttle check (time - lastPoseTime > 66) means pose runs at ~15fps, but renderIfDirty() is called at full 60fps. This is correct by design -- the dirty flag gates the actual GPU call. However the render loop calls sm.renderIfDirty() unconditionally in the rAF, which is correct PERF-02 behavior. Reclassifying as VERIFIED -- the dirty flag correctly prevents actual render calls when not dirty."
    artifacts: []
    missing: []
human_verification:
  - test: "Apply SQL migration and verify garment_type column"
    expected: "Column garment_type TEXT NOT NULL DEFAULT 'shirt' exists in event_brand_products; existing rows show garment_type='shirt'"
    why_human: "SQL migration must be applied manually via Supabase Dashboard -- cannot verify column existence programmatically without DB access"
  - test: "Garment type dropdown is visible and functional in BrandProductManager"
    expected: "Edit modal for a product shows a Select dropdown with 6 options; selecting one triggers a toast and persists to DB"
    why_human: "UI interaction and real-time Supabase persistence requires browser and live DB to verify"
  - test: "Product switch does not restart camera or MediaPipe"
    expected: "Switching products in AR view keeps camera running and pose tracking active; only the 3D model reloads"
    why_human: "Camera/MediaPipe restart behavior requires a live device with camera access to observe"
---

# Phase 2: Architecture Decomposition and Schema Verification Report

**Phase Goal:** The AR codebase is decomposed into bounded modules and the database supports garment-type metadata
**Verified:** 2026-03-29
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | CameraManager can start/stop a camera stream independently of product selection | VERIFIED | `src/ar/core/CameraManager.ts` exports `startCamera`, `stopCamera` as standalone functions with full getUserMedia + metadata-wait implementation (76 lines, substantive) |
| 2 | SceneManager creates a persistent Three.js scene with DPR capped at 1.0 on mobile | VERIFIED | `SceneManager` constructor at line 56-60 checks `window.innerWidth < 768 \|\| (navigator.maxTouchPoints > 0 && screen.width < 1024)` and calls `setPixelRatio(1.0)` on mobile |
| 3 | SceneManager only renders when dirty flag is set (render-on-dirty) | VERIFIED | `renderIfDirty()` at line 148-153 guards `renderer.render()` behind `if (this.dirty)` check; ARExperience calls it every rAF; `dirty` is set by updateModel and swapModel |
| 4 | ModelLoader caches material references on load instead of traversing every frame | VERIFIED | `swapModel()` in SceneManager lines 108-120 traverses once to populate `cachedMaterials[]`; `updateOpacity()` at line 134-138 iterates the cache with no traversal |
| 5 | All five modules export typed interfaces that ARExperience can import | VERIFIED | ARExperience.tsx lines 6-10 import from all five modules; all exports confirmed present in each file |
| 6 | Switching products does not restart the camera or re-initialize MediaPipe | VERIFIED | Effect 1 (lines 106-188) has empty deps `[]`; Effect 2 (lines 192-222) has `[selectedProduct]` deps and only calls `loadModel` + `sm.swapModel` -- camera and pose processor refs persist |
| 7 | The retailer can select a garment type when uploading a product in BrandProductManager | VERIFIED (code) | `GARMENT_TYPES` constant (line 14-21), Select dropdown in edit modal (lines 541-581), immediate Supabase persist on `onValueChange`, non-default badge on product cards (lines 320-323) -- all present |
| 8 | All existing AR products default to garment type 'shirt' without manual migration | VERIFIED (SQL) | Migration file has `ADD COLUMN garment_type TEXT NOT NULL DEFAULT 'shirt'` -- DEFAULT clause backfills existing rows; requires manual DB application |
| 9 | The garment_type column exists with CHECK constraint for valid values | VERIFIED (SQL) | Migration file line 6-7: `CHECK (garment_type IN ('shirt', 'abaya', 'pants', 'jacket', 'headwear', 'accessory'))` |
| 10 | ARExperience fetches and passes garment_type through to the AR pipeline | FAILED | Supabase `select()` at line 62 does not include `garment_type`; the mapped `ARProduct` object (lines 79-87) does not include `garment_type`; Phase 3 cannot read this field from `selectedProductRef.current` |

**Score:** 9/10 truths verified (Truth 10 failed; Truth 2 sub-item re-classified as verified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/ar/types.ts` | Shared AR type definitions (TrackingState, ARProduct, GarmentType) | VERIFIED | 54 lines; exports GarmentType (6 values), ARProduct (with optional garment_type), TrackingState (9 states) -- all match REQUIREMENTS.md |
| `src/ar/core/CameraManager.ts` | Camera stream lifecycle (startCamera, stopCamera, CameraResult) | VERIFIED | 76 lines; exports startCamera, stopCamera, CameraResult interface; handles getUserMedia, video.play(), metadata wait |
| `src/ar/core/PoseProcessor.ts` | MediaPipe pose init and per-frame detection | VERIFIED | 84 lines; exports createPoseProcessor, PoseProcessor interface; WASM_URL and MODEL_URL moved from ARExperience; try-catch on detectForVideo |
| `src/ar/core/SceneManager.ts` | Three.js scene persistence with PERF-01/02/03 | VERIFIED | 181 lines; class with renderer/scene/camera public props; PERF-01 DPR cap, PERF-02 dirty flag + renderIfDirty, PERF-03 cachedMaterials + updateOpacity |
| `src/ar/core/ModelLoader.ts` | GLB model loading with bounding box normalization and material cache | VERIFIED | 65 lines; exports loadModel, ModelResult; centers model at origin, wraps in Group (visible:false), returns dims |
| `src/pages/ARExperience.tsx` | Slim orchestrator with three independent effects | VERIFIED | 477 lines; imports all five modules; three effects (empty deps, selectedProduct deps, resize); no inline THREE setup; no WASM/MODEL URLs |
| `supabase/migrations/20260329_add_garment_type.sql` | Database migration adding garment_type column | VERIFIED | 11 lines; ALTER TABLE with NOT NULL DEFAULT 'shirt' and CHECK constraint for all 6 values |
| `src/integrations/supabase/types.ts` | Updated TypeScript types with garment_type field | VERIFIED | garment_type present in Row (required string), Insert (optional string), Update (optional string) for event_brand_products |
| `src/components/BrandProductManager.tsx` | Garment type dropdown in product edit modal | VERIFIED | GARMENT_TYPES constant, Select import, dropdown in 3D Model section of edit modal, immediate Supabase persist, badge on cards |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ARExperience.tsx` | `CameraManager.ts` | Effect 1 calls startCamera/stopCamera | WIRED | Lines 116, 181: `startCamera(video)`, `stopCamera(streamRef.current)` |
| `ARExperience.tsx` | `SceneManager.ts` | Effect 1 creates SceneManager, stores in ref | WIRED | Line 131: `new SceneManager(canvas)`, stored in `sceneManagerRef.current` |
| `ARExperience.tsx` | `PoseProcessor.ts` | Effect 1 calls createPoseProcessor | WIRED | Line 137: `createPoseProcessor()`, stored in `poseProcessorRef.current` |
| `ARExperience.tsx` | `ModelLoader.ts` | Effect 2 calls loadModel, SceneManager.swapModel | WIRED | Lines 207, 211: `loadModel(selectedProduct.ar_model_url)`, `sm.swapModel(result.wrapper)` |
| `ARExperience.tsx` | `ar/types.ts` | Imports TrackingState, ARProduct types | WIRED | Lines 10: `import { ARProduct, TrackingState } from '@/ar/types'` |
| `SceneManager.ts` | `ModelLoader.ts` | swapModel accepts ModelResult.wrapper (Object3D) | WIRED | SceneManager.swapModel takes `THREE.Object3D \| null`; ModelLoader returns `wrapper: THREE.Group` (Group extends Object3D) |
| `BrandProductManager.tsx` | `event_brand_products` table | Dropdown writes garment_type to DB | WIRED (code) | Line 552: `.update({ garment_type: value, ... }).eq('id', editingProduct.id)` |
| `types.ts` (supabase) | `BrandProductManager.tsx` | TypeScript type includes garment_type field | WIRED | Both Row and EventBrandProduct interface include `garment_type?: string` |
| `ARExperience.tsx` | `event_brand_products` (via Supabase) | Fetches garment_type for anchor strategy | NOT WIRED | select() at line 62 omits garment_type; mapped object omits the field -- Phase 3 cannot read it |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| ARCH-01 | 02-01, 02-02 | Decompose ARExperience.tsx monolith into bounded components | SATISFIED | Five modules in src/ar/core/; ARExperience.tsx imports all five |
| ARCH-03 | 02-02 | Implement scene persistence -- reuse scene/renderer on product switch | SATISFIED | SceneManager in Effect 1 (empty deps) persists; model swap in Effect 2 (selectedProduct deps) |
| ARCH-04 | 02-02 | Separate pose detection effect from model loading effect | SATISFIED | Three independent effects: camera+pose+scene+loop (empty deps), model loading (selectedProduct), resize (empty deps) |
| RETL-01 | 02-03 | Add garment_type column to event_brand_products | SATISFIED (pending DB apply) | SQL migration with ALTER TABLE, CHECK constraint, DEFAULT 'shirt' exists at correct path |
| RETL-02 | 02-03 | Add garment type dropdown selector in BrandProductManager | SATISFIED | GARMENT_TYPES constant, Select dropdown in edit modal, 6 options, immediate Supabase persist |
| RETL-04 | 02-03 | Migrate existing products -- default garment_type to 'shirt' | SATISFIED (pending DB apply) | DEFAULT 'shirt' in NOT NULL column automatically backfills existing rows |
| PERF-01 | 02-01 | Cap DPR at 1.0 on mobile | SATISFIED | SceneManager constructor lines 56-59 with isMobile detection and setPixelRatio(1.0) |
| PERF-02 | 02-01, 02-02 | Render-on-dirty -- only render when pose data changes | SATISFIED | SceneManager.renderIfDirty(); ARExperience lines 166, 170, 213, 335 set dirty; render loop calls renderIfDirty() |
| PERF-03 | 02-01, 02-02 | Cache material traversal -- avoid traversing model tree every frame | SATISFIED | SceneManager.cachedMaterials populated in swapModel(); updateOpacity() iterates cache; ARExperience line 332 calls updateOpacity() |

**Orphaned requirements check:** REQUIREMENTS.md maps ARCH-01, ARCH-03, ARCH-04, RETL-01, RETL-02, RETL-04, PERF-01, PERF-02, PERF-03 to Phase 2. All nine are claimed by the three plans. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/pages/ARExperience.tsx` | 62 | garment_type not included in Supabase select query | Blocker | Phase 3 anchor strategies cannot read garment_type from selectedProduct -- the field is always undefined in the mapped ARProduct objects |
| `src/pages/ARExperience.tsx` | 79-87 | garment_type not mapped in ARProduct object construction | Blocker | Even if select were fixed, the mapped object would not carry the value |

### Human Verification Required

#### 1. SQL Migration Application

**Test:** Open Supabase Dashboard -> SQL Editor -> paste contents of `supabase/migrations/20260329_add_garment_type.sql` -> Run. Then execute `SELECT id, garment_type FROM event_brand_products LIMIT 10`.
**Expected:** Query succeeds; all existing rows show `garment_type = 'shirt'`; new products can be inserted with other valid values
**Why human:** SQL migration has not been applied to the live database -- column existence cannot be verified programmatically without DB access

#### 2. Garment Type Dropdown UX

**Test:** `npm run dev` -> navigate to BrandProductManager -> click Edit on a product -> scroll to "3D Model for AR Try-On" section -> observe dropdown -> select "Abaya / Dress" -> close and reopen modal
**Expected:** Dropdown shows 6 options (Shirt/Top, Abaya/Dress, Pants/Bottoms, Jacket/Outerwear, Headwear, Accessory); toast "Garment type updated" appears on selection; Abaya badge appears on product card; re-opening modal shows persisted value
**Why human:** Requires live browser with Supabase connection to verify persistence and UI rendering

#### 3. Product Switch Preserves Camera and MediaPipe

**Test:** Open AR experience -> wait for tracking_active state -> click a different product in the product selector at the bottom -> observe behavior during switch
**Expected:** Camera feed stays live with no black frame; tracking indicator stays green or briefly shows "Loading outfit..." without restarting the "Starting AR..." sequence; pose resumes immediately after model loads
**Why human:** Camera/MediaPipe restart is an observable real-time behavior that cannot be verified by static code analysis alone

### Gaps Summary

One actionable gap was found that will block Phase 3's garment anchor system:

**Gap: garment_type not fetched or passed through ARExperience.tsx**

The `ARProduct.garment_type` field is defined in `src/ar/types.ts` and is stored in the database (via the migration), but the data fetch in ARExperience.tsx omits it at two points:

1. The Supabase `select()` call (line 62) only requests `id, image_url, ar_model_url, ar_scale, ar_position_offset, event_brands!inner(...)` -- `garment_type` is absent
2. The `mapped` object construction (lines 79-87) does not include a `garment_type` field

Phase 3's anchor strategy system will read `selectedProductRef.current?.garment_type` to decide which anchor strategy to apply. Since that value is always `undefined`, the anchor system will never branch correctly. This must be fixed before Phase 3 begins.

**Fix required (small, in one file):**

In `src/pages/ARExperience.tsx`:
- Line 62: add `garment_type` to the select string
- Lines 79-87: add `garment_type: p.garment_type as GarmentType | undefined` to the mapped object

This is a ~2-line fix with no architectural implications.

---

_Verified: 2026-03-29_
_Verifier: Claude (gsd-verifier)_

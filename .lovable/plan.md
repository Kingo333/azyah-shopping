

# In-Depth AR System Analysis + ZERO10 Comparison

## Current AR System Architecture

Your AR system is a **client-side, browser-based** AR experience built with:
- **MediaPipe PoseLandmarker** (WASM) for 2D/3D body pose detection
- **Three.js** for 3D model rendering (WebGLRenderer with alpha overlay)
- **GLTFLoader** for loading `.glb` models from Supabase Storage
- Camera feed via `getUserMedia` displayed as a `<video>` background

### Initialization Pipeline (Sequential — This Is the Bottleneck)

The `initPipeline()` function in `ARExperience.tsx` runs these steps **one after another**:

```text
Step 1: startCamera()          — getUserMedia + wait for metadata  (~1-3s)
Step 2: new SceneManager()     — WebGL renderer + lights           (~instant)
Step 3: createPoseProcessor()  — Download WASM (~4MB) + ML model   (~3-8s on mobile)
Step 4: [waiting for product selection, then Effect 2 fires]
Step 5: loadModel()            — Download GLB from Supabase Storage (~2-30s for 30MB)
```

**Total wall-clock time: 6-40+ seconds**, during which the user sees "Starting AR... Preparing camera and tracking".

### Critical Issues Found

**1. Sequential initialization (biggest problem)**
Steps 1 and 3 are independent but run sequentially. Camera acquisition and WASM/model download could run in parallel, saving 3-8 seconds.

**2. 3D model download starts LATE**
The GLB download (Effect 2) only begins after `selectedProduct` state is set AND `sceneManagerRef.current` exists. But the product data is fetched in a separate effect that completes before `initPipeline` finishes. This means the model download waits for the entire pose processor initialization before starting.

**3. Large GLB files on mobile networks**
You allow up to 50MB GLB files. A 30MB file on a mobile 4G connection (5 Mbps) takes ~48 seconds. The 60-second timeout in ModelLoader will barely catch this.

**4. No model compression (Draco/meshopt)**
The `GLTFLoader` is used without `DRACOLoader` or `MeshoptDecoder` extensions. These can reduce GLB file sizes by 60-90%, dramatically cutting download times.

**5. No preloading or CDN optimization**
Models are served from Supabase Storage without CDN edge caching, `Content-Length` headers (progress shows "X MB" instead of "%"), or preloading hints.

**6. Pose detection at 15fps cap**
The render loop throttles pose detection to every 66ms (~15fps). This is intentional for performance but creates visible lag in garment tracking compared to 30fps systems.

---

## How This Compares to ZERO10 AR Mirror

| Aspect | Your System | ZERO10 AR Mirror |
|--------|------------|-----------------|
| **Platform** | Browser (WebGL + WASM) | Dedicated hardware (GPU-accelerated) |
| **Tracking** | MediaPipe PoseLandmarker Lite (33 landmarks, 2D+3D) | Custom CV pipeline, likely full body mesh with dense vertices |
| **Rendering** | Three.js WebGLRenderer, GLB models overlaid on video | Real-time 3D cloth simulation with physics, lighting matching |
| **Frame rate** | ~15fps pose, 60fps render (skip when clean) | 30-60fps full pipeline |
| **Cloth physics** | None — static 3D model positioned on landmarks | Full cloth simulation (draping, folding, movement) |
| **Body mesh** | No body mesh — landmarks only (33 points) | Dense body mesh for realistic garment wrapping |
| **Occlusion** | None — model always renders on top | Body-aware occlusion (arms in front of garment) |
| **Lighting** | Basic adaptive (ambient + directional from video brightness) | Environment map matching, PBR with scene-matched reflections |
| **Latency** | 6-40s cold start | Near-instant (pre-loaded, dedicated hardware) |
| **Sizing** | Landmark-distance scaling (shoulder width, torso height) | Likely volumetric body scan |

### Key Gaps vs ZERO10

1. **No cloth simulation** — Your garments are rigid GLB meshes positioned/scaled on landmarks. ZERO10 simulates fabric draping in real-time.
2. **No body mesh/occlusion** — Your model renders on top of everything. ZERO10 handles arm-over-garment occlusion.
3. **No environment matching** — Your lighting is a simple brightness-mapped ambient/directional pair. ZERO10 matches store lighting and reflections.
4. **Browser constraints** — You're limited by WASM execution speed, WebGL capabilities, and network-dependent model loading. ZERO10 runs on dedicated GPU hardware with pre-loaded assets.

### What's Realistic to Fix (Browser-Based)

Closing the gap to ZERO10 fully is **not possible** in a browser — they use dedicated hardware with custom CV pipelines. However, the **loading time** issue is absolutely fixable, and tracking quality can be improved.

---

## Proposed Fixes (Priority Order)

### Fix 1: Parallelize Initialization
Run camera acquisition and WASM/pose model download simultaneously instead of sequentially. This alone saves 3-8 seconds.

### Fix 2: Start GLB Download Early  
Begin downloading the GLB model as soon as product data is fetched (in Effect 1), don't wait for the pose processor to finish. Store the promise and await it in Effect 2.

### Fix 3: Add Draco/Meshopt Decompression
Add `DRACOLoader` to the `GLTFLoader` pipeline. Retailers should be guided to upload Draco-compressed GLBs. A 30MB uncompressed GLB becomes ~5-8MB compressed.

### Fix 4: Better Progress UX
Show granular progress stages: "Starting camera..." → "Loading body tracking..." → "Downloading outfit (45%)..." instead of one generic spinner.

### Fix 5: Recommend Model Size Limits
Add guidance in the retailer upload modal: warn above 10MB, suggest Draco compression, and link to tools like `gltf-transform` for optimization.

### Files Changed
- `src/pages/ARExperience.tsx` — Parallelize init, early model prefetch, granular progress
- `src/ar/core/ModelLoader.ts` — Add DRACOLoader support
- `src/ar/core/PoseProcessor.ts` — No changes needed
- `src/components/BrandProductManager.tsx` — Add compression guidance in upload UI


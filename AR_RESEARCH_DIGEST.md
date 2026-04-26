# AR Research Digest — Source-Verified Findings

Consolidated output from reading source files of the 14 repos in `azyah_master_technical_documentation.md` + 10 Snap Lens Studio doc pages. Only findings that are **verifiable from source/docs** are included (no README marketing copy, no unverified claims).

This digest feeds two plans:
- [AR_SYSTEM_PLAN.md](AR_SYSTEM_PLAN.md) — web AR runtime (Three.js + MediaPipe)
- `C:\Users\King\.claude\plans\check-and-do-this-snazzy-nebula.md` — Blender → Lens Studio garment prep recipe

---

## Part 1 — Web AR runtime findings

### 1A. nawodyaishan/ar-fashion-tryon (MIT, verified)

**MediaPipe Tasks API init (exact, pinned versions):**
```ts
const vision = await FilesetResolver.forVisionTasks(
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
);
const modelPath = `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`;
const landmarker = await PoseLandmarker.createFromOptions(vision, {
  baseOptions: { modelAssetPath: modelPath, delegate: 'GPU' },
  runningMode: 'VIDEO',
  numPoses: 1,
  minPoseDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
  minPosePresenceConfidence: 0.5
});
```

Detect loop skips duplicate frames via `videoElement.currentTime !== lastVideoTimeRef.current`.

**Camera-mirror trick (critical gotcha):** CSS mirrors the video with `scale-x-[-1]`. To keep landmarks aligned with the visible image, the hook flips X after detection:
```ts
landmarks: landmarks.map(l => ({ x: 1 - l.x, y: l.y, z: l.z, visibility: l.visibility }))
```
Because the landmarks are pre-flipped, `Math.atan2(right.y-left.y, right.x-left.x)` yields the correct rotation with no sign negation.

**Alignment math (`pose-utils.ts`):**
- Shoulder rotation: `atan2(...) * 180/π`, then **clamp ±45°**
- Simple mode: `targetWidth = shoulderWidth * 1.8` (180% of shoulder), `scale = clamp(targetWidth/200, 0.5, 3.0)`, Y offset = `-0.15 * baseWidth * scale` (upward 15%)
- Keypoint mode: `scale = clamp(bodyShoulderWidth / garmentShoulderWidth, 0.5, 2.0)`, `rotation = clamp(bodyAngle - garmentAngle, -45, 45)`
- `MIN_CONFIDENCE = 0.5` for keypoints, below which auto-align silently falls back to geometric mode

**Throttling (`ContinuousTracker.tsx`):**
```ts
if (now - lastUpdateRef.current < 100) return;  // 10 FPS hard cap
if (!isConfidentPose(landmarks)) return;        // requires ≥3/4 critical landmarks at visibility > 0.5
```

**Camera constraints (`camera.ts`):**
```ts
{ video: { width:{ideal:1280}, height:{ideal:720}, facingMode:'user', frameRate:{ideal:30} } }
// with automatic fallback to { video: true } on OverconstrainedError
```

**HTTPS requirement — extends to local IPs:** `getSecurityWarning()` explicitly warns for `192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`. `getUserMedia` only permissive on `localhost`/`127.0.0.1` without HTTPS.

**Other non-obvious choices:**
- `pose_landmarker_lite.task` (smallest model, float16) hard-coded — explicitly chosen over `full`/`heavy` for real-time
- `react-rnd` with 15px magnetic snap to center/shoulder line
- Rotation applied via CSS `transform: rotate(${deg}deg)` on the garment `<img>`, not canvas
- Double permission check: `navigator.permissions.query({name:'camera'})` before `getUserMedia` to avoid re-prompt
- `detectForVideo` errors are swallowed silently (`console.error` only) — loop keeps running
- No Three.js, no depth occlusion in this repo — 2D image overlay only

### 1B. sarthar3/Virtual-Clothes-TryOn (no license — default copyright)

**Stack:** Uses **BlazePose via `@tensorflow-models/pose-detection`** (not Tasks API):
```js
detector = await poseDetection.createDetector(poseDetection.SupportedModels.BlazePose, {
  runtime: 'mediapipe',
  solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/pose'
});
```

**Alignment math (differs from nawodyaishan):**
- Shirt width = **2× shoulder distance** (nawodyaishan uses 1.8×)
- Shirt height = 1.8× (leftHip.y − leftShoulder.y)
- Y offset = 0.2× height upward (nawodyaishan: 0.15×)
- No rotation clamping

**Renders via canvas 2D** (not Three.js — the imported `three.min.js` is dead code).

**No throttling** — raw `requestAnimationFrame(detectPose)` every frame; cadence bound by `estimatePoses` latency.

**No mirroring** — video shown as-is, landmarks used directly. Different convention from nawodyaishan.

### 1C. khomotsojane/TryOn (MIT)

Mostly a façade — `CameraFeed.tsx`, `ClothingViewer.tsx`, `TryOnRoom.tsx` are **all 0-byte stubs**. Real logic lives in `src/pages/TryOn.tsx`.

**Documented bug to avoid:** uses `@mediapipe/tasks-vision@latest` in the WASM CDN URL — pulls the latest published version, will break on any breaking change. **Always pin the version.**

**Hardcoded overlay position**: clothing rendered at `top-[30%] left-[35%] w-[30%]` — no landmark-to-overlay math at all. Skeleton drawn on canvas for visual effect only. Not useful as implementation reference.

**Size recommendation bug**: thresholds `<120 → S`, `<160 → M` in **raw image pixels** — not resolution-independent.

**Performance bug**: `poseLandmarker.close()` called after each detection, re-creating landmarker on every photo upload. Expensive.

### 1D. WebAR-rocks/WebAR.rocks.hand (MIT)

**Not MediaPipe.** Custom WebGL2 neural net (`.json.gz` files in `/neuralNets/`).

**Soft-occluder pattern (actionable for accessory category):**
```js
const occluderMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(occluderRadius, occluderRadius, 48, 32, 1, true),
  new THREE.MeshNormalMaterial()
);
occluderMesh.scale.set(1.0, 1.0, 0.6);  // flatten cylinder → ellipse around wrist
HandTrackerThreeHelper.add_threeSoftOccluder(occluderMesh, occluderRadius, dr, debug);
// dr = [4, 4.7] — soft fade band: interior full transparency, exterior full opacity
```
An invisible mesh with `colorWrite: false` writes only to the depth buffer — the watch mesh renders AROUND the wrist ellipse with a gradient fade. **No segmentation ML needed.** This is a lightweight alternative to MediaPipe Selfie Segmentation for accessories.

**Stabilizer (One-Euro-like, exact constants):**
```js
stabilizerOptions: { minCutOff: 0.001, beta: 4, freqRange: [2, 144] }
qualityFactorRange: [0.9, 0.98]  // high quality → heavy smoothing; low → fast response
```

**Quaternion order — Blender→Three.js convention (common first-attempt bug):**
```js
// model with d = [x,y,z] and q = [w,x,y,z] (Blender)
const displacement = new THREE.Vector3(d[0], d[2], -d[1]);  // Y,Z swap + negate Y
me.quaternion.set(q[0], q[2], -q[1], q[3]);                 // Three.js uses X,Y,Z,W
```

**iOS quirk workaround (from source):**
```js
VTOCanvas.backgroundColor = 'darkblue';  // 10ms on init
// Author comment: "crappy workaround for iOS 15 Safari" — canvas composition fails otherwise
```

**Other:**
- Dual-canvas architecture: one canvas for the NN-sampled video texture (shared WebGL ctx), a second stacked on top for Three.js rendering — aligned via CSS
- `threshold: 0.97` detection sensitivity (lowering → false positives)
- `forceFilterNNInputPxRange: [2.5, 6]` — forces smoothing when detected object is small
- Gzip the `.json` NN weights + service-worker preload during initial page load

### 1E. jeeliz/jeelizGlassesVTOWidget (proprietary — see LICENSE)

**Commercial license limits (exact clauses from LICENSE):**
- Section 1 — free use only if ANY of:
  - Non-commercial
  - **"The Software is used for less than 10 models"**
  - **"The Software is not deployed publicly yet"**
- Section 2.b — no reverse-engineering
- Section 2.c — no sublicense/redistribute/transfer
- Section 7 — French law

**Legacy widget.** README states the newer jeeliz.com product (auto-generates glasses models from product images) is what's recommended for new integrations — not this widget.

**Tracking stack:** WebGL shader neural net (not MediaPipe). PBR + raytraced shadows + deferred shading + temporal AA. WebGL2 preferred; WebGL1 requires `OES_TEXTURE_FLOAT` or `OES_TEXTURE_HALF_FLOAT`.

**Unusable for shirts/dresses — glasses-only face tracking.**

### 1F. Zheng-Chong/CatVTON (CC BY-NC-SA 4.0 — non-commercial)

**License blocks commercial use.** Any derivative must also use CC BY-NC-SA 4.0 (ShareAlike virus). Base model SD v1.5 adds OpenRAIL-M. Eval datasets (VITON-HD, DressCode) are academic-only. **Do not ship in Azyah production.**

**If used in internal tooling (hero shots, not customer-facing):**
- Gradio app signature: `submit_function(person_image, cloth_image, cloth_type, num_inference_steps, guidance_scale, seed, show_type)`
- `cloth_type` choices: **`["upper", "lower", "overall"]`** (matches our garment categories roughly)
- Defaults: steps=50, CFG=2.5, seed=42 (-1 = random), bf16 mixed precision
- VRAM: <8GB for 1024×768 bf16
- 899M total params; **49.57M trainable** (efficient LoRA-style fine-tune)
- Mask blur factor = 9 before inpaint
- Person image: resize+crop; cloth image: resize+padding (preserves full garment)

---

## Part 2 — Blender MCP + 3D pipeline findings

### 2A. ahujasid/blender-mcp (MIT)

**MCP tool surface (from `server.py` FastMCP decorators):**
- `get_scene_info()` — no args
- `get_object_info(object_name: str)`
- `get_viewport_screenshot(max_size: int = 800)` — returns `mcp.Image`, writes PNG to `tempfile.gettempdir()/blender_screenshot_<pid>.png` then deletes
- `execute_blender_code(code: str)` — the workhorse
- Poly Haven: `get_polyhaven_categories`, `search_polyhaven_assets`, `download_polyhaven_asset(asset_id, asset_type, resolution="1k", file_format=None)`, `set_texture(object_name, texture_id)`
- Hyper3D Rodin: `create_rodin_job`, `poll_rodin_job_status`, `import_generated_asset`
- Sketchfab: `search_sketchfab_models`, `get_sketchfab_model_preview`, `download_sketchfab_model`
- Hunyuan3D: `create_hunyuan_job`, `poll_hunyuan_job_status`, `import_generated_asset_hunyuan`

**Transport limits (important pitfalls):**
- Socket: TCP `localhost:9876`, `settimeout(1.0)` on accept, `recv` in 8192-byte chunks
- Framing: "receive until JSON parses" (no length prefix)
- **Hard 180s timeout on both sides** (`sock.settimeout(180.0)`). Heavy cloth bakes / dense-mesh ops that exceed 180s drop the socket. Server returns: `"Timeout waiting for Blender response - try simplifying your request"`.
- `execute_code` uses `exec(code, {"bpy": bpy})` with a **fresh namespace per call** — imports/helpers do NOT persist between tool calls. Must `import bpy` (and any other modules) in every snippet.
- Everything scheduled via `bpy.app.timers.register(..., first_interval=0.0)` → runs on Blender main thread → blocks UI while executing
- No undo rollback on exception — failed ops leave partial state

**README explicit warning:** *"ALWAYS save your work before using [execute_blender_code]"*

**Telemetry:** every tool wrapped with `@telemetry_tool(...)`. Disable with env `DISABLE_TELEMETRY=true`.

### 2B. poly-mcp/Blender-MCP-Server (MIT)

**Transport:** HTTP via FastAPI on `0.0.0.0:8000`, POST `/mcp/invoke/{tool_name}`.

**`add_cloth_simulation` full signature (from source):**
```
add_cloth_simulation(object_name,
  quality=5, mass=0.3,
  tension_stiffness=15.0, compression_stiffness=15.0,
  shear_stiffness=5.0, bending_stiffness=0.5,
  damping_tension=5.0, damping_compression=5.0,
  damping_shear=5.0, damping_bending=0.5,
  air_damping=1.0,
  use_collision=True, collision_distance=0.015,
  use_self_collision=False, self_collision_distance=0.015,
  vertex_group_mass=None, pin_vertex_group=None)
```

**BUG in source:** `pin_vertex_group` silently writes to `cloth.vertex_group_mass` (wrong attribute — Blender's pin attribute is `cloth.vertex_group_pin`). **If you need vertex pinning, use `execute_blender_code` from ahujasid instead.**

**`export_file` GLB bug:** the glb branch only passes `filepath, use_selection, export_apply, export_format='GLB'` — no control over `export_yup`, `export_skins`, `export_animations`, `export_tangents`. For Lens Studio / Three.js use `execute_blender_code` with explicit flags.

**`@thread_safe` decorator:** all ops serialized onto an OperationQueue worker. Effectively single-threaded despite being "enterprise-grade".

### 2C. youichi-uda/blender-mcp-pro ($15 paid)

Public repo contains only `addon/` + README. The MCP server (with the rigging tools) is paid and **not in the public repo**. Actual rigging tool names not disclosed publicly.

README mentions: rig health check, bone naming fix, weight normalization, bone mirroring — but no signatures. Cannot verify without purchase.

**Lazy loading:** 15 core tools exposed at startup. Need to call `list_tool_categories()` then `enable_tools(category)` for the rest. Env `BLENDER_MCP_PRO_EAGER=1` for clients that don't support `notifications/tools/list_changed`.

Transport: TCP `localhost:9877` (note: **different from ahujasid's 9876** — both can coexist).

### 2D. PatrykIti/blender-ai-mcp (Apache 2.0)

Goal-first three-tier architecture: atomic → macro → workflow. On the `llm-guided` surface, only 8 visible tools (`router_set_goal`, `router_get_status`, `browse_workflows`, `reference_images`, `search_tools`, `call_tool`, `list_prompts`, `get_prompt`). The rest are hidden until unlocked by `search_tools`.

Useful for structured exploration; less useful for direct scripting (opposite of ahujasid's philosophy).

### 2E. HurtzDonutStudios/ai-forge-mcp (proprietary, $35-$149/mo)

No public source. README claims:
- ForgeRig (6 tools) wraps UniRig (VAST-AI, SIGGRAPH 2025)
- Cloth/hair/fluid sim lives inside ForgeBlender (185 tools total)
- 565 tools total across 16 servers
- ForgeAnim wraps HY-Motion (1B-param DiT, Tencent)

**Cannot verify claims.** Overkill for Azyah.

---

## Part 3 — Snap Lens Studio official docs (source-verified)

All quotes verbatim from `developers.snap.com`.

### 3A. Vertex color convention (CORRECTED from iteration-13 assumption)

From **Cloth Simulation Try-On template** doc:
> "The **white part of the mesh is binded to the body**, as set up in the Vertex Bindings section above, whereas the **red part of the mesh is driven by cloth simulation**."

**So the canonical Snap convention is: WHITE = pinned to body, RED = cloth-simulated.**

The iteration-13 "RED = pinned, BLACK = simulated" breakthrough works because the R-only Color Mask + `binding.color = (1,0,0,1)` redefines the binding semantics — any vert with R≥0.5 binds regardless of G/B. Both conventions produce working pins; they're different coordinates in a 2-dim (color × mask) space, not different "correct" answers.

If you ever need to match the Dress-pack template verbatim (e.g., to re-use its shader graph), switch to WHITE=pinned with default RGB mask.

### 3B. Reference poses — two poses in one pipeline (subtle)

- **Garment source mesh → A-pose** (Preparing External Mesh doc): *"Modeling your external mesh to match the A-pose usually results in better deformation... an A-pose ensures reduced stretching of the clothes under arms and better fitting on the legs."*
- **Character skeleton for `Object Tracking 3D` → T-pose** (3D Body Tracking template doc): arms extended horizontally, zero rotations on parent.

If a retailer ships a T-pose garment: deformation under arms will stretch visibly. Reject at QA.

### 3C. Cloth simulation runtime APIs (confirms Path A in iteration 11)

From Cloth Simulation doc:
```js
// Bind a single vertex by index to a follow object
clothVisual.setVertexBinding(vertexIndex, followObject);

// Pick vertex indices by color match
clothVisual.getPointIndicesByColor(color, mask);
// color = new vec4(1.0, 0.0, 0.0, 1.0)  — red
// mask  = new vec4b(true, false, false, false)  — R-only (iter 13's breakthrough, now doc-confirmed)

// Per-vertex overrides
const s = ClothVisual.createVertexSettings();
clothVisual.setVertexSettings(index, s);

// Reset
clothVisual.resetSimulation();
```

**Enums:** `ClothVisual.BendMode.Isometric` (others not enumerated).

### 3D. Cloth sim mesh limits (hard numbers)

- **Max 3000 triangles** per cloth mesh (Snap recommendation)
- **Single-sided geometry + two-sided material** (two-sidedness is a material flag, not duplicated geometry)
- Reference sample `tutu.fbx`: 1388 triangles = "relatively good"
- Our `orange_shirt_cloth.fbx` @ ~2421 verts ≈ ~4800 tris — **above the cap**. Decimate to <3000 tris for best perf.

### 3E. Gravity / physics — NOT the world physics

> "not everything in the Physics system applies to [cloth] (such as gravity and wind settings)"

Cloth uses its OWN `clothVisual.gravity` property. Setting world Physics gravity has no effect. Current value `(0, -200, 0)` in the recipe is cloth-internal; the unit is engine-scale, **not SI units**.

Example values from doc:
- `gravity: new vec3(0, -100, 0)` (doc example, not a default)
- `iterationsPerStep: 60`
- `repulsionOffset: 0.1`, `repulsionStiffness: 0.1`, `repulsionFriction: 0.1`

**No official defaults or bounds are published** for `stretchStiffness`, `bendStiffness`, `collisionOffset`, etc. — only qualitative descriptions ("lower = less rigid"). The iteration-14 tuned values are empirical, not spec-deviations.

### 3F. External Body Mesh — Bind Distance is RELATIVE

From Cloth Simulation Try-On template doc:
> "Bind Distance Field is on a 0-1 scale **relative to the External Body Mesh's max distance**."

So `VertexDistanceController.bindDistance = 0.85` with BodyMesh `Max Distance = 20 cm` effectively means `0.85 × 20 = 17 cm` absolute binding radius.

**Tune `Max Distance` FIRST, then VDC `bindDistance`** — in that order, else the ratio blows up.

### 3G. Blender FBX export — published hard limits

From the Blender Export doc:
- Scene ≤ **10,000 triangles** (recommended)
- Animation rig ≤ **100 joints**
- **4 bones/vertex** hard cap
- Scene FPS = **30** (Lens Studio assumption)
- Textures: same folder as FBX, square, power-of-2 (128/256/512/1024)
- Axis convention (from Preparing External Mesh doc): **Forward = -Z, Up = Y**
- Geometries tab: Apply Modifiers + Use Modifiers Render Setting

### 3H. URL corrections (the master doc has several broken links)

Working URLs (verified 2026-04):
- `/features/ar-tracking/body/preparing-external-mesh` — NOT `/features/try-on/preparing-external-mesh`
- `/features/ar-tracking/body/body-templates/3d-body-tracking` — NOT `/features/try-on/3d-body-tracking`
- `/assets-pipeline/3d/importing-content/fbx-3d-object-import` — NOT `/assets-pipeline/3d/fbx`

### 3I. Carousel outfit rules (often-missed gotcha)

From Clothing Try-On doc:
- Each outfit scene object's **local position MUST be `(0,0,0)`** — the carousel script auto-aligns children and misplaces non-origin children
- For carousel items, reference the **source mesh** (`tshirt_mesh`), **not the `_body_mesh`**. `_body_mesh` is internal to the Body Mesh component only.
- Blendshapes (zipper open/close, hood up/down) ride on the `_body_mesh`, NOT the source mesh
- An `ExternalMesh` blendshape auto-appears on the Body Mesh — morphs between base and external

### 3J. Lens Studio AI MCP — what's actually documented

- Endpoint: `http://localhost:8732/mcp` ✅
- Menu: AI Assistant → MCP → Configure Server → Start Server (must click Start before use)
- Config block includes a generated **`Authorization` bearer token** header — required in the MCP client config
- Only tool name verbatim on the dev-mode page: **"Get Scene Graph"**
- The tools `scene-graphql`, `asset-graphql`, `ExecuteEditorCode`, `CapturePanelScreenshotTool`, `FileReadTool` are real and in-use but **not enumerated in official docs** — they're community/SDK knowledge
- ChatTools plugin: extend the `ChatTool` class; install from Asset Library or manually

---

## Part 4 — Items already well-covered in existing plans (no action)

Checked against [AR_SYSTEM_PLAN.md](AR_SYSTEM_PLAN.md) and the nebula plan — these are **already present** and need no additions:
- Garment category anchor strategies
- One Euro filter + outlier rejection
- PBR material settings
- DRACO loader singleton
- Sanity-gate approach in nebula plan
- `hide_select=True` selection-leak bug (iter-5 landmine)
- `bpy.ops.ed.undo()` MCP-crash caveat (iter-12 landmine)
- ClothVisual setProperty paths (Quick reference table)

## Part 5 — Items intentionally omitted

- CatVTON integration details (non-commercial license blocks use)
- jeeliz glasses tracker (paid beyond 10 models, legacy product)
- HurtzDonuts ForgeRig (no public source to verify)
- Most of `@react-three/fiber` React patterns (project already uses plain Three.js via Capacitor; R3F migration isn't this round's scope)

---

*Digest compiled from parallel reads of 14 GitHub repos + 10 Snap doc pages. All code snippets and numeric values verified against source unless otherwise noted. Last updated 2026-04-21.*

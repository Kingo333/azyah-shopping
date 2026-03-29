/**
 * Three.js scene lifecycle management for the AR pipeline.
 *
 * Owns the WebGLRenderer, Scene, PerspectiveCamera, and lighting. Persists
 * across product switches -- only the loaded 3D model swaps via swapModel().
 *
 * Implements three performance requirements:
 * - PERF-01: DPR capped at 1.0 on mobile to reduce GPU pixel fill
 * - PERF-02: Render-on-dirty -- only calls renderer.render() when dirty flag is set
 * - PERF-03: Cached material array for O(1) per-frame opacity updates
 *
 * Extracted from ARExperience.tsx lines 173-195 (scene setup) and the
 * resize handler at lines 396-421.
 */
import * as THREE from 'three';

export class SceneManager {
  /** The WebGLRenderer instance. Public for direct ref access by orchestrator. */
  renderer: THREE.WebGLRenderer;
  /** The Three.js scene graph. Public for direct ref access by orchestrator. */
  scene: THREE.Scene;
  /** The perspective camera. Public for direct ref access by orchestrator. */
  camera: THREE.PerspectiveCamera;

  /**
   * PERF-02: Dirty flag. Set to true when pose data changes or a resize occurs.
   * The orchestrator's render loop calls renderIfDirty() each frame.
   */
  dirty = false;

  /** The currently loaded 3D model in the scene, or null. */
  private currentModel: THREE.Object3D | null = null;
  /** PERF-03: Cached material references for fast per-frame opacity updates. */
  private cachedMaterials: THREE.Material[] = [];

  /**
   * Create a new SceneManager bound to a canvas element.
   *
   * Sets up the renderer, camera (FOV 63, display aspect, z=2), ambient and
   * directional lights, and applies the DPR cap.
   *
   * @param canvas - The HTMLCanvasElement to render into.
   */
  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(63, aspect, 0.1, 1000);
    this.camera.position.z = 2;

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // PERF-01: Cap DPR at 1.0 on mobile to reduce pixel fill rate.
    // Detection: small screen width OR touch-capable device with narrow screen.
    const isMobile =
      window.innerWidth < 768 ||
      (navigator.maxTouchPoints > 0 && screen.width < 1024);
    this.renderer.setPixelRatio(isMobile ? 1.0 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Lighting
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(0, 1, 1);
    this.scene.add(dirLight);
  }

  /**
   * Compute the visible world dimensions at the camera's z-distance.
   *
   * Used by the coordinate pipeline to convert normalized landmark coordinates
   * into Three.js world units based on the camera's field of view.
   */
  get visibleDims(): { w: number; h: number } {
    const vFov = (this.camera.fov * Math.PI) / 180;
    const h = 2 * Math.tan(vFov / 2) * this.camera.position.z;
    return { w: h * this.camera.aspect, h };
  }

  /**
   * Swap the current 3D model in the scene.
   *
   * Removes and disposes the old model's geometry and materials (freeing GPU
   * resources), then adds the new model and caches its material references
   * for PERF-03 fast opacity updates.
   *
   * @param newModel - The new model to add, or null to remove without replacing.
   */
  swapModel(newModel: THREE.Object3D | null): void {
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      // Dispose geometry and materials of old model to free GPU memory
      this.currentModel.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            (mesh.material as THREE.Material)?.dispose();
          }
        }
      });
    }

    // PERF-03: Reset and rebuild cached material array
    this.cachedMaterials = [];

    if (newModel) {
      this.scene.add(newModel);
      // Cache material references for fast per-frame opacity updates
      newModel.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          mat.transparent = true;
          mat.depthWrite = true;           // VIS-05: Keep depth write for self-occlusion within the garment
          mat.side = THREE.DoubleSide;     // VIS-05: Render both sides for better visual quality
          this.cachedMaterials.push(mat);
        }
      });
      // VIS-05: Set renderOrder on the model so garment renders after scene background
      newModel.renderOrder = 1;
    }

    this.currentModel = newModel;
    this.dirty = true;
  }

  /**
   * Update opacity on all cached materials without scene traversal.
   *
   * PERF-03: Iterates the pre-built material cache instead of calling
   * model.traverse() on every frame.
   *
   * @param opacity - The opacity value to apply (0.0 to 1.0).
   */
  updateOpacity(opacity: number): void {
    for (const mat of this.cachedMaterials) {
      (mat as any).opacity = opacity;
    }
  }

  /**
   * PERF-02: Render only when the dirty flag is set.
   *
   * The orchestrator's requestAnimationFrame loop calls this each frame.
   * If no pose data has changed and no resize occurred, the render call
   * is skipped, saving ~75% of GPU render calls (pose runs at ~15fps
   * while the display runs at 60fps).
   */
  renderIfDirty(): void {
    if (this.dirty) {
      this.renderer.render(this.scene, this.camera);
      this.dirty = false;
    }
  }

  /**
   * Handle window resize events.
   *
   * Updates the renderer size, camera aspect ratio, and projection matrix,
   * then marks the scene as dirty so it re-renders with the new dimensions.
   */
  handleResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  /**
   * Dispose the scene manager and release all GPU resources.
   *
   * Removes and disposes the current model, then disposes the renderer.
   * Call this when the AR experience unmounts.
   */
  dispose(): void {
    this.swapModel(null);
    this.renderer.dispose();
  }
}

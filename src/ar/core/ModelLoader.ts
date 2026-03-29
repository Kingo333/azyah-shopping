/**
 * GLB model loading with bounding box normalization and caching.
 *
 * Loads a 3D model via GLTFLoader, computes its bounding box, centers
 * the geometry at the origin, and wraps it in a Group for runtime
 * positioning without conflicting with the centering offset.
 *
 * Caching behavior (PERF-04):
 * - Models are cached by URL in a module-level Map<string, ModelResult>.
 * - On cache hit, a deep clone of the cached wrapper Group is returned.
 *   Materials are also cloned per instance so that per-instance opacity
 *   changes (via SceneManager.updateOpacity) do not bleed across copies.
 * - On cache miss, the model is loaded, stored pristine in the cache,
 *   and a clone is returned (the original stays untouched in cache).
 * - Call clearModelCache() on unmount to dispose cached GPU resources.
 *
 * Does NOT handle scene.add or opacity -- that is SceneManager.swapModel's job.
 *
 * Extracted from ARExperience.tsx lines 198-234.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Result of a successful model load.
 */
export interface ModelResult {
  /** Wrapper Group containing the centered model. Set to visible:false by default. */
  wrapper: THREE.Group;
  /** Natural dimensions of the model's bounding box in world units. */
  dims: { w: number; h: number; d: number };
}

/**
 * Progress callback for model loading.
 * @param loaded - Bytes loaded so far.
 * @param total - Total bytes (0 if unknown).
 * @param percent - Percentage complete (0-100, or -1 if total is unknown).
 */
export type ModelProgressCallback = (loaded: number, total: number, percent: number) => void;

/** Default timeout for model loading (60 seconds — large GLBs need time on mobile). */
const MODEL_LOAD_TIMEOUT_MS = 60_000;

/**
 * Module-level cache: URL -> pristine ModelResult.
 * The cached wrapper is never added to a scene directly; clones are returned.
 */
const modelCache = new Map<string, ModelResult>();

/**
 * Create a deep clone of a ModelResult.
 *
 * Uses wrapper.clone(true) for the full hierarchy, then traverses the
 * clone to also clone materials so per-instance opacity/color changes
 * do not bleed back to the cached original.
 */
function cloneModelResult(cached: ModelResult): ModelResult {
  const clonedWrapper = cached.wrapper.clone(true);
  clonedWrapper.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((m) => m.clone());
      } else {
        mesh.material = (mesh.material as THREE.Material).clone();
      }
    }
  });
  return {
    wrapper: clonedWrapper,
    dims: { ...cached.dims },
  };
}

/**
 * Load a GLB/GLTF model from a URL, with transparent caching.
 *
 * On first call for a given URL, the model is fetched, centered, wrapped,
 * and stored in an in-memory cache. Subsequent calls with the same URL
 * return a deep clone instantly (no network request or GLB parsing).
 *
 * The returned wrapper is always a fresh clone, so callers can mutate
 * transforms and materials freely without affecting the cache or other
 * instances.
 *
 * @param url - The URL of the .glb or .gltf model to load.
 * @param onProgress - Optional callback for download progress updates.
 * @returns A ModelResult with the wrapper Group and bounding box dimensions.
 * @throws Error if the model fails to load (network error, invalid file, timeout).
 */
export async function loadModel(url: string, onProgress?: ModelProgressCallback): Promise<ModelResult> {
  // Cache hit: return a clone immediately
  if (modelCache.has(url)) {
    onProgress?.(1, 1, 100);
    return cloneModelResult(modelCache.get(url)!);
  }

  // Cache miss: load from network with timeout
  const loader = new GLTFLoader();

  const gltf = await new Promise<any>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Model loading timed out. The file may be too large for this connection. Try a smaller model (under 10MB).'));
    }, MODEL_LOAD_TIMEOUT_MS);

    loader.load(
      url,
      (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      (event) => {
        // Progress callback — event.total may be 0 if server doesn't send Content-Length
        if (onProgress) {
          const percent = event.total > 0 ? Math.round((event.loaded / event.total) * 100) : -1;
          onProgress(event.loaded, event.total, percent);
        }
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });

  const model = gltf.scene;

  // Compute bounding box and center model at origin
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);

  // Extract natural dimensions for body-proportional scaling
  const dims = {
    w: size.x || 1,
    h: size.y || 1,
    d: size.z || 1,
  };

  // Wrap in a Group so centering offset does not conflict with runtime positioning
  const wrapper = new THREE.Group();
  wrapper.add(model);
  wrapper.visible = false;

  // Store the pristine copy in cache
  const pristineResult: ModelResult = { wrapper, dims };
  modelCache.set(url, pristineResult);

  // Return a clone (cache keeps the original untouched)
  return cloneModelResult(pristineResult);
}

/**
 * Dispose all cached models and clear the cache.
 *
 * Iterates every cached ModelResult, traverses the wrapper hierarchy,
 * and disposes all geometry and materials to free GPU resources.
 * Call this when the AR experience unmounts to prevent memory leaks.
 */
export function clearModelCache(): void {
  modelCache.forEach((result) => {
    result.wrapper.traverse((child) => {
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
  });
  modelCache.clear();
}

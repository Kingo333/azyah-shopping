/**
 * GLB model loading with bounding box normalization, caching, and Draco support.
 *
 * DRACOLoader is a MODULE-LEVEL SINGLETON — created once, reused across all loads.
 * Uses WASM decoder (10-100x faster than JS) with automatic fallback.
 *
 * Caching behavior (PERF-04):
 * - Models are cached by URL in a module-level Map<string, ModelResult>.
 * - On cache hit, a deep clone of the cached wrapper Group is returned.
 * - On cache miss, the model is loaded, stored pristine, and a clone is returned.
 * - Call clearModelCache() on unmount to dispose cached GPU resources.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export interface ModelResult {
  wrapper: THREE.Group;
  dims: { w: number; h: number; d: number };
  /** Whether the model contains a skeleton (SkinnedMesh). */
  isRigged: boolean;
  /** The skeleton from the first SkinnedMesh, or null for static models. */
  skeleton: THREE.Skeleton | null;
  /** Bone names for debug/mapping. */
  boneNames: string[];
}

export type ModelProgressCallback = (loaded: number, total: number, percent: number) => void;

/** Timeout for the GLB download+parse (excludes Draco decoder init which is preloaded). */
const MODEL_LOAD_TIMEOUT_MS = 60_000;

// ── DRACOLoader Singleton ──
// Created once, reused for all model loads. Uses WASM decoder for speed.
let dracoLoader: DRACOLoader | null = null;

function getDracoLoader(): DRACOLoader {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    dracoLoader.setDecoderConfig({ type: 'wasm' });
    dracoLoader.preload(); // Start downloading WASM decoder immediately
  }
  return dracoLoader;
}

// ── Model Cache ──
const modelCache = new Map<string, ModelResult>();

// ── In-flight prefetch promises ──
const prefetchPromises = new Map<string, Promise<ModelResult>>();

function cloneModelResult(cached: ModelResult): ModelResult {
  let clonedWrapper: THREE.Group;

  if (cached.isRigged) {
    // SkeletonUtils.clone properly handles SkinnedMesh skeleton references
    clonedWrapper = SkeletonUtils.clone(cached.wrapper) as THREE.Group;
  } else {
    clonedWrapper = cached.wrapper.clone(true);
  }

  // Clone materials so per-instance changes don't bleed across copies
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

  // Extract skeleton from clone (SkeletonUtils creates new skeleton references)
  let skeleton: THREE.Skeleton | null = null;
  if (cached.isRigged) {
    clonedWrapper.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isSkinnedMesh && !skeleton) {
        skeleton = (child as THREE.SkinnedMesh).skeleton;
      }
    });
  }

  return {
    wrapper: clonedWrapper,
    dims: { ...cached.dims },
    isRigged: cached.isRigged,
    skeleton,
    boneNames: cached.boneNames,
  };
}

/**
 * Internal load implementation — shared by loadModel and prefetchModel.
 */
function doLoad(url: string, onProgress?: ModelProgressCallback): Promise<ModelResult> {
  // Cache hit
  if (modelCache.has(url)) {
    onProgress?.(1, 1, 100);
    return Promise.resolve(cloneModelResult(modelCache.get(url)!));
  }

  // In-flight prefetch — return existing promise (don't double-download)
  if (prefetchPromises.has(url)) {
    return prefetchPromises.get(url)!.then(() => cloneModelResult(modelCache.get(url)!));
  }

  const loader = new GLTFLoader();
  loader.setDRACOLoader(getDracoLoader());
  // Meshopt support — required for assets compressed by gltf-transform's
  // default `optimize` pipeline (EXT_meshopt_compression).
  loader.setMeshoptDecoder(MeshoptDecoder);

  const promise = new Promise<ModelResult>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Model loading timed out. The file may be too large for this connection. Try a smaller model (under 10MB).'));
    }, MODEL_LOAD_TIMEOUT_MS);

    loader.load(
      url,
      (gltf) => {
        clearTimeout(timeoutId);

        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        // Diagnostic: surface the actual runtime bbox values so we can see why
        // the Z-up auto-fix below either fires or doesn't. Visible in browser
        // devtools / Safari Web Inspector.
        console.info(
          `[ModelLoader] Bbox before any correction — ` +
          `size: x=${size.x.toFixed(3)} y=${size.y.toFixed(3)} z=${size.z.toFixed(3)} | ` +
          `center: x=${center.x.toFixed(3)} y=${center.y.toFixed(3)} z=${center.z.toFixed(3)} | ` +
          `Z-up condition (size.z > size.y * 1.5): ${size.z.toFixed(3)} > ${(size.y * 1.5).toFixed(3)} = ${size.z > size.y * 1.5}`
        );

        model.position.sub(center);

        const wrapper = new THREE.Group();
        wrapper.add(model);
        wrapper.visible = false;

        // Z-up detection: if Z extent is more than 1.5× Y extent, the GLB was
        // exported from Blender without correctly applying the Y-up transform
        // to vertex data. Rotating the wrapper -90° around X maps Blender's
        // Z (up) to three.js Y (up). Skinning matrices inherit the wrapper's
        // rotation through matrixWorld so the rig follows the geometry.
        if (size.z > size.y * 1.5) {
          console.warn(
            `[ModelLoader] Z-up GLB detected (size.z=${size.z.toFixed(3)} > size.y=${size.y.toFixed(3)}). ` +
            `Applying -π/2 rotation around X to convert to Y-up.`
          );
          wrapper.rotation.x = -Math.PI / 2;
          wrapper.updateMatrixWorld(true);
          box.setFromObject(wrapper);
          box.getSize(size);
          console.info(
            `[ModelLoader] Z-up rotation applied. Post-rotation size: ` +
            `x=${size.x.toFixed(3)} y=${size.y.toFixed(3)} z=${size.z.toFixed(3)}`
          );
        }

        const dims = { w: size.x || 1, h: size.y || 1, d: size.z || 1 };
        console.info(
          `[ModelLoader] Final dims: w=${dims.w.toFixed(3)} h=${dims.h.toFixed(3)} d=${dims.d.toFixed(3)} | ` +
          `cached as pristineResult for url=…${url.slice(-40)}`
        );

        // Detect rigged model (SkinnedMesh with skeleton)
        let skeleton: THREE.Skeleton | null = null;
        const boneNames: string[] = [];
        model.traverse((child) => {
          if ((child as THREE.SkinnedMesh).isSkinnedMesh && !skeleton) {
            skeleton = (child as THREE.SkinnedMesh).skeleton;
            if (skeleton) {
              skeleton.bones.forEach((b) => boneNames.push(b.name));
            }
          }
        });
        const isRigged = skeleton !== null && boneNames.length > 0;
        if (isRigged) {
          console.info(`[ModelLoader] Rigged model detected: ${boneNames.length} bones [${boneNames.slice(0, 5).join(', ')}${boneNames.length > 5 ? '...' : ''}]`);
        }

        const pristineResult: ModelResult = { wrapper, dims, isRigged, skeleton, boneNames };
        modelCache.set(url, pristineResult);
        prefetchPromises.delete(url);

        resolve(cloneModelResult(pristineResult));
      },
      (event) => {
        if (onProgress) {
          const percent = event.total > 0 ? Math.round((event.loaded / event.total) * 100) : -1;
          onProgress(event.loaded, event.total, percent);
        }
      },
      (error) => {
        clearTimeout(timeoutId);
        prefetchPromises.delete(url);
        reject(error);
      },
    );
  });

  prefetchPromises.set(url, promise);
  return promise;
}

/**
 * Load a GLB/GLTF model with caching and Draco decompression.
 */
export async function loadModel(url: string, onProgress?: ModelProgressCallback): Promise<ModelResult> {
  return doLoad(url, onProgress);
}

/**
 * Start downloading a model early (before scene exists).
 * Returns the same promise — if called multiple times with the same URL,
 * only one download runs. Safe to call and ignore the promise.
 */
export function prefetchModel(url: string, onProgress?: ModelProgressCallback): Promise<ModelResult> {
  return doLoad(url, onProgress);
}

/**
 * Dispose all cached models, in-flight prefetches, and Draco decoder.
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
  prefetchPromises.clear();

  if (dracoLoader) {
    dracoLoader.dispose();
    dracoLoader = null;
  }
}

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import type {
  ARAssetNormalization,
  GarmentCalibration,
  GarmentFitRefs,
} from '../types';
import { loadGarmentCalibration } from '../utils/garmentCalibration';

export interface ModelResult {
  wrapper: THREE.Group;
  dims: { w: number; h: number; d: number };
  /** Effective fitting refs used by anchoring — calibrated values when available, raw bbox dims otherwise. */
  fitRefs: Required<GarmentFitRefs>;
  isRigged: boolean;
  skeleton: THREE.Skeleton | null;
  boneNames: string[];
  calibration: GarmentCalibration | null;
  normalization: ARAssetNormalization;
}

export type ModelProgressCallback = (loaded: number, total: number, percent: number) => void;

const MODEL_LOAD_TIMEOUT_MS = 60_000;

let dracoLoader: DRACOLoader | null = null;

function getDracoLoader(): DRACOLoader {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    dracoLoader.setDecoderConfig({ type: 'wasm' });
    dracoLoader.preload();
  }
  return dracoLoader;
}

const modelCache = new Map<string, ModelResult>();
const prefetchPromises = new Map<string, Promise<ModelResult>>();

function cloneModelResult(cached: ModelResult): ModelResult {
  let clonedWrapper: THREE.Group;

  if (cached.isRigged) {
    clonedWrapper = SkeletonUtils.clone(cached.wrapper) as THREE.Group;
  } else {
    clonedWrapper = cached.wrapper.clone(true);
  }

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
    fitRefs: { ...cached.fitRefs },
    isRigged: cached.isRigged,
    skeleton,
    boneNames: [...cached.boneNames],
    calibration: cached.calibration ? structuredClone(cached.calibration) : null,
    normalization: structuredClone(cached.normalization),
  };
}

/**
 * Default pivot is zero — sidecar calibration is the only source of non-zero
 * pivot. Predictable behavior for un-calibrated GLBs (no surprise upward shift).
 */
function resolveAnchorPivot(
  calibration: GarmentCalibration | null,
  _size: THREE.Vector3,
): { x: number; y: number; z: number } {
  if (calibration?.anchorPivot) {
    return calibration.anchorPivot;
  }
  return { x: 0, y: 0, z: 0 };
}

function resolveFitRefs(
  calibration: GarmentCalibration | null,
  dims: { w: number; h: number; d: number },
): Required<GarmentFitRefs> {
  return {
    shoulderWidth: calibration?.fit?.shoulderWidth ?? dims.w,
    torsoHeight: calibration?.fit?.torsoHeight ?? dims.h,
    hipWidth: calibration?.fit?.hipWidth ?? dims.w,
  };
}

async function doLoad(url: string, onProgress?: ModelProgressCallback): Promise<ModelResult> {
  if (modelCache.has(url)) {
    onProgress?.(1, 1, 100);
    return Promise.resolve(cloneModelResult(modelCache.get(url)!));
  }

  if (prefetchPromises.has(url)) {
    return prefetchPromises.get(url)!.then(() => cloneModelResult(modelCache.get(url)!));
  }

  const loader = new GLTFLoader();
  loader.setDRACOLoader(getDracoLoader());
  loader.setMeshoptDecoder(MeshoptDecoder);

  const promise = new Promise<ModelResult>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Model loading timed out. The file may be too large for this connection. Try a smaller model (under 10MB).'));
    }, MODEL_LOAD_TIMEOUT_MS);

    loader.load(
      url,
      async (gltf) => {
        clearTimeout(timeoutId);

        try {
          const calibration = await loadGarmentCalibration(url);
          const model = gltf.scene;

          model.traverse((o) => {
            if ((o as THREE.SkinnedMesh).isSkinnedMesh) {
              (o as THREE.SkinnedMesh).computeBoundingBox?.();
            }
          });

          const originalBox = new THREE.Box3().setFromObject(model);
          const size = originalBox.getSize(new THREE.Vector3());
          const center = originalBox.getCenter(new THREE.Vector3());

          console.info(
            `[ModelLoader] Bbox before correction size=(${size.x.toFixed(3)}, ${size.y.toFixed(3)}, ${size.z.toFixed(3)}) center=(${center.x.toFixed(3)}, ${center.y.toFixed(3)}, ${center.z.toFixed(3)})`,
          );

          model.position.sub(center);

          const wrapper = new THREE.Group();
          wrapper.add(model);
          wrapper.visible = false;

          // Z-up auto-fix: Blender skinned-mesh exports often leave geometry in
          // Z-up despite export_yup. Rotate the wrapper -π/2 around X. Box3 on a
          // SkinnedMesh after ancestor rotation does NOT reliably return updated
          // extents — manually swap Y and Z (rotation maps (x,y,z)→(x,z,-y)).
          let upAxis: ARAssetNormalization['upAxis'] = 'unknown';
          if (size.z > size.y * 1.0) {
            wrapper.rotation.x = -Math.PI / 2;
            wrapper.updateMatrixWorld(true);
            const preY = size.y;
            const preZ = size.z;
            size.y = preZ;
            size.z = preY;
            upAxis = 'z-up-corrected';
          } else {
            upAxis = 'y-up';
          }

          const dims = { w: size.x || 1, h: size.y || 1, d: size.z || 1 };
          const fitRefs = resolveFitRefs(calibration, dims);
          const anchorPivot = resolveAnchorPivot(calibration, size);

          // Bake anchorPivot AND placementOffset into the inner model's local
          // position. The wrapper stays at origin so GarmentRenderer.handleFrame3D
          // can drive it to the per-frame anchor without wiping these load-time
          // offsets. (Source patch put pivot on wrapper.position; wrong because
          // the per-frame update overwrites that every tick.)
          const placementOffset = calibration?.placementOffset ?? {};
          model.position.add(new THREE.Vector3(
            anchorPivot.x - (placementOffset.x ?? 0),
            anchorPivot.y - (placementOffset.y ?? 0),
            anchorPivot.z - (placementOffset.z ?? 0),
          ));

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

          const normalization: ARAssetNormalization = {
            upAxis,
            originalCenter: { x: center.x, y: center.y, z: center.z },
            normalizedCenter: { x: 0, y: 0, z: 0 },
            anchorPivot,
          };

          const pristineResult: ModelResult = {
            wrapper,
            dims,
            fitRefs,
            isRigged,
            skeleton,
            boneNames,
            calibration,
            normalization,
          };

          modelCache.set(url, pristineResult);
          prefetchPromises.delete(url);
          resolve(cloneModelResult(pristineResult));
        } catch (err) {
          prefetchPromises.delete(url);
          reject(err);
        }
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

export async function loadModel(url: string, onProgress?: ModelProgressCallback): Promise<ModelResult> {
  return doLoad(url, onProgress);
}

export function prefetchModel(url: string, onProgress?: ModelProgressCallback): Promise<ModelResult> {
  return doLoad(url, onProgress);
}

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

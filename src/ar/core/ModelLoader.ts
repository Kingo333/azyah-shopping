/**
 * GLB model loading with bounding box normalization.
 *
 * Loads a 3D model via GLTFLoader, computes its bounding box, centers
 * the geometry at the origin, and wraps it in a Group for runtime
 * positioning without conflicting with the centering offset.
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
 * Load a GLB/GLTF model from a URL.
 *
 * The loaded model is centered at the origin (bounding box center subtracted
 * from position), wrapped in a THREE.Group (initially invisible), and its
 * natural dimensions are computed for body-proportional scaling.
 *
 * @param url - The URL of the .glb or .gltf model to load.
 * @returns A ModelResult with the wrapper Group and bounding box dimensions.
 * @throws Error if the model fails to load (network error, invalid file, etc.).
 */
export async function loadModel(url: string): Promise<ModelResult> {
  const loader = new GLTFLoader();

  const gltf = await new Promise<any>((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
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

  return { wrapper, dims };
}

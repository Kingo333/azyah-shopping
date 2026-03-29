/**
 * GLB model validation utility.
 *
 * Validates a GLB/GLTF file before upload by checking structure (meshes exist,
 * vertices present), normals (presence and orientation), scale (reasonable
 * bounding box dimensions), and file size. Returns blocking errors and
 * non-blocking warnings so the retailer upload UI can gate or advise.
 *
 * Cleans up all GPU resources (geometry, materials) and revokes the object URL
 * after validation completes.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Result of a GLB model validation pass.
 */
export interface ModelValidationResult {
  /** Whether the model is valid for upload (no blocking errors). */
  valid: boolean;
  /** Blocking issues that prevent upload. */
  errors: string[];
  /** Non-blocking advisories the retailer should be aware of. */
  warnings: string[];
}

/**
 * Validate a GLB/GLTF file for structural correctness, normals orientation,
 * reasonable scale, and file size before uploading to storage.
 *
 * @param file - The File object selected by the retailer.
 * @returns A ModelValidationResult with errors (blocking) and warnings (advisory).
 */
export async function validateGLBModel(file: File): Promise<ModelValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // --- File size checks (run before parsing) ---
  const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
  if (file.size > 25 * 1024 * 1024) {
    errors.push(
      `Model file is ${sizeMB}MB — too large for mobile AR (max 25MB). Reduce polygon count or compress textures. Use https://gltf.report/ to optimize.`
    );
  } else if (file.size > 10 * 1024 * 1024) {
    warnings.push(
      `Model file is ${sizeMB}MB. Files over 10MB load slowly on mobile. Consider optimizing at https://gltf.report/`
    );
  }

  // If file is already too large, we can still parse for structural issues
  // but early-return is not warranted -- retailer benefits from all feedback.

  const objectUrl = URL.createObjectURL(file);

  try {
    const loader = new GLTFLoader();
    const gltf = await new Promise<any>((resolve, reject) => {
      loader.load(objectUrl, resolve, undefined, reject);
    });

    const scene: THREE.Object3D = gltf.scene;

    // --- Structure checks ---
    const meshes: THREE.Mesh[] = [];
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        meshes.push(child as THREE.Mesh);
      }
    });

    if (meshes.length === 0) {
      errors.push('Model contains no 3D geometry (no meshes found).');
    } else {
      // Check each mesh for vertex data
      for (const mesh of meshes) {
        const geometry = mesh.geometry as THREE.BufferGeometry;
        const position = geometry.attributes.position;
        if (!position || position.count === 0) {
          const name = mesh.name || 'unnamed';
          errors.push(`Mesh '${name}' has no vertex data.`);
        }
      }
    }

    // --- Normals checks ---
    for (const mesh of meshes) {
      const geometry = mesh.geometry as THREE.BufferGeometry;
      const name = mesh.name || 'unnamed';

      if (!geometry.attributes.normal) {
        warnings.push(
          `Mesh '${name}' has no normals -- lighting may appear incorrect.`
        );
        continue;
      }

      // Inverted normals heuristic: sample up to 20 faces and check if
      // normals point outward from the mesh center.
      const posAttr = geometry.attributes.position;
      const normAttr = geometry.attributes.normal;
      if (!posAttr || posAttr.count === 0) continue;

      // Compute mesh-local bounding box center
      geometry.computeBoundingBox();
      const center = new THREE.Vector3();
      if (geometry.boundingBox) {
        geometry.boundingBox.getCenter(center);
      }

      const faceCount = geometry.index
        ? Math.floor(geometry.index.count / 3)
        : Math.floor(posAttr.count / 3);

      if (faceCount === 0) continue;

      const sampleCount = Math.min(20, faceCount);
      const step = Math.max(1, Math.floor(faceCount / sampleCount));
      let outwardCount = 0;
      let testedCount = 0;

      const v0 = new THREE.Vector3();
      const v1 = new THREE.Vector3();
      const v2 = new THREE.Vector3();
      const faceNormal = new THREE.Vector3();
      const faceCenter = new THREE.Vector3();
      const toCenter = new THREE.Vector3();

      for (let fi = 0; fi < faceCount && testedCount < sampleCount; fi += step) {
        let i0: number, i1: number, i2: number;
        if (geometry.index) {
          i0 = geometry.index.getX(fi * 3);
          i1 = geometry.index.getX(fi * 3 + 1);
          i2 = geometry.index.getX(fi * 3 + 2);
        } else {
          i0 = fi * 3;
          i1 = fi * 3 + 1;
          i2 = fi * 3 + 2;
        }

        v0.fromBufferAttribute(posAttr, i0);
        v1.fromBufferAttribute(posAttr, i1);
        v2.fromBufferAttribute(posAttr, i2);

        // Use the stored normal from the first vertex of the face
        faceNormal.fromBufferAttribute(normAttr, i0);

        // Face center
        faceCenter.copy(v0).add(v1).add(v2).divideScalar(3);

        // Vector from bounding box center to face center
        toCenter.copy(faceCenter).sub(center);

        // If normal points in roughly the same direction as outward vector, it's correct
        if (faceNormal.dot(toCenter) > 0) {
          outwardCount++;
        }
        testedCount++;
      }

      if (testedCount > 0 && outwardCount / testedCount < 0.6) {
        warnings.push(
          `Mesh '${name}' may have inverted normals -- model could appear inside-out.`
        );
      }
    }

    // --- Scale / bounding box checks ---
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());

    if (size.x === 0 || size.y === 0 || size.z === 0) {
      errors.push('Model has zero size in one or more dimensions.');
    } else {
      const maxDim = Math.max(size.x, size.y, size.z);
      const minDim = Math.min(size.x, size.y, size.z);

      if (maxDim > 100) {
        errors.push(
          `Model is extremely large (max dimension: ${maxDim.toFixed(2)} units). Expected models under 10 units. Re-export at a smaller scale.`
        );
      } else if (maxDim < 0.001) {
        errors.push(
          `Model is extremely small (max dimension: ${maxDim.toFixed(6)} units). It may not be visible in AR.`
        );
      } else if (maxDim > 10) {
        warnings.push(
          `Model is quite large (${maxDim.toFixed(2)} units). This may cause scaling issues in AR.`
        );
      }

      if (minDim > 0 && maxDim / minDim > 20) {
        const ratio = (maxDim / minDim).toFixed(1);
        warnings.push(
          `Model has extreme proportions (${ratio}:1). This may look distorted.`
        );
      }
    }

    // --- Cleanup GPU resources ---
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else if (mesh.material) {
          mesh.material.dispose();
        }
      }
    });
  } catch (error: any) {
    return {
      valid: false,
      errors: [`Failed to parse model file: ${error.message || error}`],
      warnings: [],
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

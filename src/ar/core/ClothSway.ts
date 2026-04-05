/**
 * Procedural cloth sway — lightweight vertex displacement for fabric movement.
 *
 * Adds sine-wave-based vertex displacement to the bottom portion of garment
 * meshes, making abayas sway, shirts ripple slightly, and pants flow.
 *
 * Amplitude and frequency vary by garment type:
 * - Abaya: high amplitude (flowing fabric)
 * - Shirt: low amplitude (subtle)
 * - Pants: medium amplitude (leg movement)
 * - Accessories: none
 *
 * Uses a custom vertex shader injected via material.onBeforeCompile.
 * Zero dependencies, ~2ms per frame overhead.
 */
import * as THREE from 'three';
import type { GarmentType } from '../types';

interface SwayConfig {
  /** Maximum displacement in world units. 0 = no sway. */
  amplitude: number;
  /** Wave frequency — higher = faster sway. */
  frequency: number;
  /** How far down the model (0-1) sway starts. 0 = top, 1 = bottom only. */
  startHeight: number;
}

const SWAY_CONFIGS: Record<GarmentType, SwayConfig> = {
  shirt:     { amplitude: 0.008, frequency: 2.0, startHeight: 0.6 },
  abaya:     { amplitude: 0.025, frequency: 1.5, startHeight: 0.3 },
  pants:     { amplitude: 0.012, frequency: 2.0, startHeight: 0.5 },
  jacket:    { amplitude: 0.010, frequency: 2.0, startHeight: 0.6 },
  headwear:  { amplitude: 0.000, frequency: 0.0, startHeight: 1.0 },
  accessory: { amplitude: 0.000, frequency: 0.0, startHeight: 1.0 },
};

/** Uniform shared across all sway materials. */
const swayUniforms = {
  uTime: { value: 0 },
  uAmplitude: { value: 0.01 },
  uFrequency: { value: 2.0 },
  uStartHeight: { value: 0.5 },
};

/**
 * Apply cloth sway to all MeshStandardMaterial in a model.
 *
 * Injects a vertex shader snippet via onBeforeCompile that displaces
 * vertices based on their Y position (height) and time.
 */
export function applyClothSway(model: THREE.Object3D, garmentType: GarmentType): void {
  const config = SWAY_CONFIGS[garmentType];
  if (config.amplitude === 0) return; // No sway for this garment type

  // Compute model bounding box to normalize vertex heights
  const box = new THREE.Box3().setFromObject(model);
  const minY = box.min.y;
  const height = box.max.y - box.min.y || 1;

  model.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    for (const mat of materials) {
      if (!(mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) continue;
      const stdMat = mat as THREE.MeshStandardMaterial;

      // Store uniforms on the material for per-frame updates
      (stdMat.userData as any).swayUniforms = {
        uTime: { value: 0 },
        uAmplitude: { value: config.amplitude },
        uFrequency: { value: config.frequency },
        uStartHeight: { value: config.startHeight },
        uMinY: { value: minY },
        uHeight: { value: height },
      };

      stdMat.onBeforeCompile = (shader) => {
        const uniforms = (stdMat.userData as any).swayUniforms;
        Object.assign(shader.uniforms, uniforms);

        // Inject sway displacement before the main vertex transform
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          float normalizedY = (transformed.y - uMinY) / uHeight;
          float swayFactor = smoothstep(uStartHeight, 1.0, normalizedY);
          float sway = sin(uTime * uFrequency + transformed.x * 10.0) * uAmplitude * swayFactor;
          float swayZ = cos(uTime * uFrequency * 0.7 + transformed.z * 8.0) * uAmplitude * 0.5 * swayFactor;
          transformed.x += sway;
          transformed.z += swayZ;
          `,
        );

        // Declare uniforms in the vertex shader
        shader.vertexShader = `
          uniform float uTime;
          uniform float uAmplitude;
          uniform float uFrequency;
          uniform float uStartHeight;
          uniform float uMinY;
          uniform float uHeight;
        ` + shader.vertexShader;
      };

      stdMat.needsUpdate = true;
    }
  });
}

/**
 * Update the time uniform for cloth sway animation.
 * Call once per frame in the render loop.
 */
export function updateClothSwayTime(model: THREE.Object3D, time: number): void {
  model.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    for (const mat of materials) {
      const uniforms = (mat.userData as any)?.swayUniforms;
      if (uniforms?.uTime) {
        uniforms.uTime.value = time;
      }
    }
  });
}

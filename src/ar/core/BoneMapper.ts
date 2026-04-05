/**
 * Maps MediaPipe pose landmarks to Three.js skeleton bones for garment deformation.
 *
 * When a GLB model contains a skeleton (SkinnedMesh), the BoneMapper drives
 * bone rotations from detected body landmark positions, making the garment
 * bend at elbows, shoulders, and hips as the user moves.
 *
 * Safety guardrails:
 * 1. Confidence gating — only update bones when driving landmarks are visible (>0.5)
 * 2. Angle clamps — max rotation delta per frame prevents explosion on bad frames
 * 3. Parent chain order — spine → shoulder → arm → forearm (never child before parent)
 * 4. Rig validation — minimum required bones must exist or fallback to static
 */
import * as THREE from 'three';
import { BONE_DEFS, MIN_REQUIRED_BONES, type BoneDef } from '../config/boneMapping';

interface MappedBone {
  bone: THREE.Bone;
  def: BoneDef;
  restQuat: THREE.Quaternion;
  lastQuat: THREE.Quaternion;
}

/** Landmark data from MediaPipe (normalized or world). */
interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export class BoneMapper {
  private mappedBones: Map<string, MappedBone> = new Map();
  private updateOrder: string[] = []; // topological sort (parents first)

  /**
   * Create a BoneMapper from a Three.js Skeleton.
   *
   * Fuzzy-matches skeleton bone names against BONE_DEFS patterns.
   * Returns null if minimum required bones are not found (rig invalid).
   */
  static create(skeleton: THREE.Skeleton): BoneMapper | null {
    const mapper = new BoneMapper();

    // Match skeleton bones to our definitions using regex patterns
    for (const [key, def] of Object.entries(BONE_DEFS)) {
      const matchedBone = skeleton.bones.find((bone) =>
        def.patterns.some((pattern) => pattern.test(bone.name))
      );
      if (matchedBone) {
        mapper.mappedBones.set(key, {
          bone: matchedBone,
          def,
          restQuat: matchedBone.quaternion.clone(),
          lastQuat: matchedBone.quaternion.clone(),
        });
      }
    }

    // Validate: minimum required bones must be present
    const foundKeys = [...mapper.mappedBones.keys()];
    const hasRequired = MIN_REQUIRED_BONES.every((k) => foundKeys.includes(k));
    if (!hasRequired) {
      console.warn(
        `[BoneMapper] Rig validation failed. Found: [${foundKeys.join(', ')}]. ` +
        `Required: [${MIN_REQUIRED_BONES.join(', ')}]. Falling back to static.`
      );
      return null;
    }

    // Build topological update order (parents before children)
    mapper.updateOrder = mapper.buildUpdateOrder();

    console.info(
      `[BoneMapper] Mapped ${mapper.mappedBones.size} bones: ` +
      `[${foundKeys.join(', ')}]. Update order: [${mapper.updateOrder.join(' → ')}]`
    );

    return mapper;
  }

  /**
   * Update bone rotations from current landmark positions.
   *
   * Uses world landmarks for direction computation (metric scale, more stable).
   * Applies confidence gating, angle clamping, and slerp smoothing.
   */
  update(worldLandmarks: LandmarkPoint[]): void {
    if (!worldLandmarks || worldLandmarks.length < 33) return;

    const fromDir = new THREE.Vector3();
    const toDir = new THREE.Vector3();
    const targetQuat = new THREE.Quaternion();
    const restDir = new THREE.Vector3(0, 1, 0); // default "up" rest direction

    for (const key of this.updateOrder) {
      const mapped = this.mappedBones.get(key);
      if (!mapped) continue;

      const { bone, def, restQuat, lastQuat } = mapped;
      const fromLm = worldLandmarks[def.fromLandmark];
      const toLm = worldLandmarks[def.toLandmark];

      // Confidence gating: skip if driving landmarks not visible
      const fromVis = fromLm?.visibility ?? 0;
      const toVis = toLm?.visibility ?? 0;
      if (fromVis < 0.5 || toVis < 0.5) {
        // Keep last stable rotation
        continue;
      }

      // Compute direction from→to in world space
      fromDir.set(fromLm.x, fromLm.y, fromLm.z);
      toDir.set(toLm.x, toLm.y, toLm.z);
      toDir.sub(fromDir).normalize();

      // Compute quaternion that rotates rest direction to target direction
      targetQuat.setFromUnitVectors(restDir, toDir);

      // Combine with rest pose
      targetQuat.premultiply(restQuat);

      // Angle clamp: limit rotation delta per frame
      const angleDelta = lastQuat.angleTo(targetQuat);
      if (angleDelta > def.maxDeltaPerFrame) {
        // Clamp by slerping only up to max delta
        const clampT = def.maxDeltaPerFrame / angleDelta;
        targetQuat.copy(lastQuat).slerp(targetQuat, clampT);
      }

      // Slerp smoothing
      bone.quaternion.copy(lastQuat).slerp(targetQuat, def.slerpFactor);

      // Store for next frame
      lastQuat.copy(bone.quaternion);
    }
  }

  /** Reset all bones to their rest pose. */
  reset(): void {
    for (const mapped of this.mappedBones.values()) {
      mapped.bone.quaternion.copy(mapped.restQuat);
      mapped.lastQuat.copy(mapped.restQuat);
    }
  }

  /** Build topological sort of bone keys (parents before children). */
  private buildUpdateOrder(): string[] {
    const order: string[] = [];
    const visited = new Set<string>();

    const visit = (key: string) => {
      if (visited.has(key)) return;
      const mapped = this.mappedBones.get(key);
      if (!mapped) return;
      if (mapped.def.parent && this.mappedBones.has(mapped.def.parent)) {
        visit(mapped.def.parent);
      }
      visited.add(key);
      order.push(key);
    };

    for (const key of this.mappedBones.keys()) {
      visit(key);
    }

    return order;
  }
}

import * as THREE from 'three';
import { BONE_DEFS, MIN_REQUIRED_BONES, type BoneDef } from '../config/boneMapping';
import type { RigProfile } from '../config/rigProfiles';
import { toVector3 } from '../config/rigProfiles';

interface MappedBone {
  bone: THREE.Bone;
  def: BoneDef;
  restQuat: THREE.Quaternion;
  lastQuat: THREE.Quaternion;
  restAxis: THREE.Vector3;
}

interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export class BoneMapper {
  private mappedBones: Map<string, MappedBone> = new Map();
  private updateOrder: string[] = [];
  private rigProfileName: string | null = null;

  static create(skeleton: THREE.Skeleton, rigProfile?: RigProfile | null): BoneMapper | null {
    const mapper = new BoneMapper();
    mapper.rigProfileName = rigProfile?.name ?? null;

    for (const [key, def] of Object.entries(BONE_DEFS)) {
      const matchedBone = skeleton.bones.find((bone) =>
        def.patterns.some((pattern) => pattern.test(bone.name)),
      );
      if (!matchedBone) continue;

      const profileAxis = rigProfile?.bones[key]?.restAxis;
      mapper.mappedBones.set(key, {
        bone: matchedBone,
        def,
        restQuat: matchedBone.quaternion.clone(),
        lastQuat: matchedBone.quaternion.clone(),
        restAxis: toVector3(profileAxis),
      });
    }

    const foundKeys = [...mapper.mappedBones.keys()];
    const hasRequired = MIN_REQUIRED_BONES.every((k) => foundKeys.includes(k));
    if (!hasRequired) {
      console.warn(
        `[BoneMapper] Rig validation failed. Found: [${foundKeys.join(', ')}]. Required: [${MIN_REQUIRED_BONES.join(', ')}]. Falling back to static.`,
      );
      return null;
    }

    mapper.updateOrder = mapper.buildUpdateOrder();

    console.info(
      `[BoneMapper] Mapped ${mapper.mappedBones.size} bones using profile=${mapper.rigProfileName ?? 'none'}: ` +
      `[${foundKeys.join(', ')}]`,
    );

    return mapper;
  }

  update(worldLandmarks: LandmarkPoint[]): void {
    if (!worldLandmarks || worldLandmarks.length < 33) return;

    const fromDir = new THREE.Vector3();
    const toDir = new THREE.Vector3();
    const targetQuat = new THREE.Quaternion();

    for (const key of this.updateOrder) {
      const mapped = this.mappedBones.get(key);
      if (!mapped) continue;

      const { bone, def, restQuat, lastQuat, restAxis } = mapped;
      const fromLm = worldLandmarks[def.fromLandmark];
      const toLm = worldLandmarks[def.toLandmark];

      const fromVis = fromLm?.visibility ?? 0;
      const toVis = toLm?.visibility ?? 0;
      if (fromVis < 0.5 || toVis < 0.5) continue;

      // MediaPipe worldLandmarks use Y-DOWN; negate Y so direction math stays
      // in three.js Y-UP convention with the per-profile restAxis.
      fromDir.set(fromLm.x, -fromLm.y, fromLm.z);
      toDir.set(toLm.x, -toLm.y, toLm.z);
      toDir.sub(fromDir).normalize();
      if (toDir.lengthSq() < 1e-6) continue;

      targetQuat.setFromUnitVectors(restAxis, toDir);
      targetQuat.premultiply(restQuat);

      const angleDelta = lastQuat.angleTo(targetQuat);
      if (angleDelta > def.maxDeltaPerFrame) {
        const clampT = def.maxDeltaPerFrame / angleDelta;
        targetQuat.copy(lastQuat).slerp(targetQuat, clampT);
      }

      bone.quaternion.copy(lastQuat).slerp(targetQuat, def.slerpFactor);
      lastQuat.copy(bone.quaternion);
    }
  }

  get boneCount(): number {
    return this.mappedBones.size;
  }

  get profileName(): string | null {
    return this.rigProfileName;
  }

  reset(): void {
    for (const mapped of this.mappedBones.values()) {
      mapped.bone.quaternion.copy(mapped.restQuat);
      mapped.lastQuat.copy(mapped.restQuat);
    }
  }

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

import * as THREE from 'three';

export interface RigBoneAxisProfile {
  /** Bone local-space rest axis that points from parent toward child. */
  restAxis: { x: number; y: number; z: number };
}

export interface RigProfile {
  name: string;
  requiredBonePatterns: RegExp[];
  bones: Partial<Record<string, RigBoneAxisProfile>>;
}

/**
 * Start small and safe.
 *
 * This is NOT trying to support every possible rig.
 * It is an allowlist for rigs you explicitly trust.
 */
export const RIG_PROFILES: RigProfile[] = [
  {
    name: 'mixamo-top-v1',
    requiredBonePatterns: [
      /mixamorig.*hips/i,
      /mixamorig.*spine/i,
      /mixamorig.*leftarm/i,
      /mixamorig.*rightarm/i,
    ],
    bones: {
      spine: { restAxis: { x: 0, y: 1, z: 0 } },
      hips: { restAxis: { x: 1, y: 0, z: 0 } },
      leftShoulder: { restAxis: { x: -1, y: 0, z: 0 } },
      rightShoulder: { restAxis: { x: 1, y: 0, z: 0 } },
      leftArm: { restAxis: { x: -1, y: 0, z: 0 } },
      rightArm: { restAxis: { x: 1, y: 0, z: 0 } },
      leftForeArm: { restAxis: { x: -1, y: 0, z: 0 } },
      rightForeArm: { restAxis: { x: 1, y: 0, z: 0 } },
    },
  },
  {
    name: 'azyah-garment-v1',
    requiredBonePatterns: [
      /hips|pelvis|root/i,
      /spine|torso|chest/i,
      /left.*arm|arm.*l|l_arm/i,
      /right.*arm|arm.*r|r_arm/i,
    ],
    bones: {
      spine: { restAxis: { x: 0, y: 1, z: 0 } },
      hips: { restAxis: { x: 1, y: 0, z: 0 } },
      leftShoulder: { restAxis: { x: -1, y: 0, z: 0 } },
      rightShoulder: { restAxis: { x: 1, y: 0, z: 0 } },
      leftArm: { restAxis: { x: -1, y: 0, z: 0 } },
      rightArm: { restAxis: { x: 1, y: 0, z: 0 } },
      leftForeArm: { restAxis: { x: -1, y: 0, z: 0 } },
      rightForeArm: { restAxis: { x: 1, y: 0, z: 0 } },
    },
  },
];

export function resolveRigProfile(
  boneNames: string[],
  explicitProfile?: string,
): RigProfile | null {
  if (explicitProfile) {
    const matched = RIG_PROFILES.find((p) => p.name === explicitProfile);
    if (!matched) return null;
    const ok = matched.requiredBonePatterns.every((pattern) =>
      boneNames.some((name) => pattern.test(name)),
    );
    return ok ? matched : null;
  }

  for (const profile of RIG_PROFILES) {
    const ok = profile.requiredBonePatterns.every((pattern) =>
      boneNames.some((name) => pattern.test(name)),
    );
    if (ok) return profile;
  }

  return null;
}

export function toVector3(axis?: { x: number; y: number; z: number }): THREE.Vector3 {
  const v = new THREE.Vector3(axis?.x ?? 0, axis?.y ?? 1, axis?.z ?? 0);
  if (v.lengthSq() < 1e-6) return new THREE.Vector3(0, 1, 0);
  return v.normalize();
}

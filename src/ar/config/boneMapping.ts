/**
 * Bone name → MediaPipe landmark mapping with regex-based fuzzy matching.
 *
 * Supports 10+ naming conventions: Mixamo, Blender Rigify, Maya, CLO3D,
 * Unity Humanoid, and generic. Each bone maps to the landmark indices
 * that drive its rotation.
 *
 * The BoneMapper uses these patterns to auto-detect which bones in a
 * GLB skeleton correspond to which body landmarks, enabling garment
 * deformation that follows the user's body movement.
 */

/** A single bone mapping: patterns to match the bone name + landmark indices. */
export interface BoneDef {
  /** Human-readable label for debug display. */
  label: string;
  /** Regex patterns that match this bone across naming conventions. */
  patterns: RegExp[];
  /** MediaPipe landmark index for the "from" end of the bone direction. */
  fromLandmark: number;
  /** MediaPipe landmark index for the "to" end of the bone direction. */
  toLandmark: number;
  /** Slerp smoothing factor (0=no change, 1=instant snap). Lower = more stable. */
  slerpFactor: number;
  /** Max rotation delta per frame in radians. Prevents explosion on bad frames. */
  maxDeltaPerFrame: number;
  /** Parent bone key — ensures parent is updated before child. */
  parent: string | null;
}

/**
 * Bone definitions ordered top-down (spine → shoulders → arms).
 * Parent chain order is critical: never rotate a child without a stable parent.
 */
export const BONE_DEFS: Record<string, BoneDef> = {
  spine: {
    label: 'Spine',
    patterns: [/^spine\d?$/i, /^torso$/i, /^chest$/i, /^spine$/i],
    fromLandmark: 23, // hip midpoint (computed)
    toLandmark: 11,   // shoulder midpoint (computed)
    slerpFactor: 0.2,
    maxDeltaPerFrame: 0.08, // ~5°
    parent: null,
  },
  leftShoulder: {
    label: 'Left Shoulder',
    patterns: [/left.*shoulder/i, /shoulder.*l$/i, /lshldr/i, /mixamorig.*leftshoulder/i],
    fromLandmark: 11, // left shoulder
    toLandmark: 13,   // left elbow
    slerpFactor: 0.3,
    maxDeltaPerFrame: 0.12, // ~7°
    parent: 'spine',
  },
  rightShoulder: {
    label: 'Right Shoulder',
    patterns: [/right.*shoulder/i, /shoulder.*r$/i, /rshldr/i, /mixamorig.*rightshoulder/i],
    fromLandmark: 12, // right shoulder
    toLandmark: 14,   // right elbow
    slerpFactor: 0.3,
    maxDeltaPerFrame: 0.12,
    parent: 'spine',
  },
  leftArm: {
    label: 'Left Upper Arm',
    patterns: [/left.*(upper)?arm/i, /arm.*l$/i, /mixamorig.*leftarm/i, /l_arm/i],
    fromLandmark: 11,
    toLandmark: 13,
    slerpFactor: 0.35,
    maxDeltaPerFrame: 0.15,
    parent: 'leftShoulder',
  },
  rightArm: {
    label: 'Right Upper Arm',
    patterns: [/right.*(upper)?arm/i, /arm.*r$/i, /mixamorig.*rightarm/i, /r_arm/i],
    fromLandmark: 12,
    toLandmark: 14,
    slerpFactor: 0.35,
    maxDeltaPerFrame: 0.15,
    parent: 'rightShoulder',
  },
  leftForeArm: {
    label: 'Left Forearm',
    patterns: [/left.*fore.*arm/i, /forearm.*l$/i, /mixamorig.*leftforearm/i, /l_forearm/i],
    fromLandmark: 13, // left elbow
    toLandmark: 15,   // left wrist
    slerpFactor: 0.5,
    maxDeltaPerFrame: 0.20, // ~11° — fast response for arms
    parent: 'leftArm',
  },
  rightForeArm: {
    label: 'Right Forearm',
    patterns: [/right.*fore.*arm/i, /forearm.*r$/i, /mixamorig.*rightforearm/i, /r_forearm/i],
    fromLandmark: 14,
    toLandmark: 16,
    slerpFactor: 0.5,
    maxDeltaPerFrame: 0.20,
    parent: 'rightArm',
  },
  hips: {
    label: 'Hips',
    patterns: [/^hip/i, /pelvis/i, /^root$/i, /mixamorig.*hips/i],
    fromLandmark: 24, // right hip
    toLandmark: 23,   // left hip
    slerpFactor: 0.2,
    maxDeltaPerFrame: 0.08,
    parent: null,
  },
};

/** Minimum bones required for rigging to activate. */
export const MIN_REQUIRED_BONES = ['spine', 'leftShoulder', 'rightShoulder'];

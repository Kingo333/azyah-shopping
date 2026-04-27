/**
 * Static GarmentConfig presets for each garment type.
 *
 * These presets define the anchor parameters (required landmarks, padding,
 * reference measurements) that each garment type's anchor strategy uses
 * to compute position and scale on the body.
 *
 * Values are sourced from the Phase 3 research document (03-RESEARCH.md)
 * and match anthropometric standards for garment fitting.
 */
import type { GarmentType } from '../types';
import type { GarmentConfig } from '../anchoring/types';

/**
 * Garment configuration presets indexed by garment type.
 *
 * Every GarmentType value must have a corresponding entry.
 */
export const GARMENT_PRESETS: Record<GarmentType, GarmentConfig> = {
  shirt: {
    type: 'shirt',
    requiredLandmarks: [11, 12],
    optionalLandmarks: [23, 24],
    // 0.5 was too strict in real-device tests — front-facing shoulders
    // often returned 0.35-0.45 confidence at typical try-on distances,
    // leaving the user stuck on "Show Upper Body". 0.3 still gates true
    // off-frame shoulders out without rejecting genuine in-frame poses.
    visibilityThreshold: 0.3,
    widthPadding: 1.15,
    heightPadding: 1.1,
    verticalOffset: 0,
    widthRef: 'shoulder',
    heightRef: 'torso',
    defaultOffset: { x: 0, y: 0, z: 0 },
    scaleMultiplier: 1.0,
    maxScaleDeltaPerFrame: 0.05,
  },
  abaya: {
    type: 'abaya',
    requiredLandmarks: [11, 12],
    optionalLandmarks: [23, 24, 25, 26, 27, 28],
    visibilityThreshold: 0.4,
    widthPadding: 1.2,
    heightPadding: 1.05,
    verticalOffset: -0.05,
    widthRef: 'shoulder',
    heightRef: 'shoulder_to_ankle',
    defaultOffset: { x: 0, y: -0.02, z: 0 },
    scaleMultiplier: 1.05,
    maxScaleDeltaPerFrame: 0.03,
  },
  pants: {
    type: 'pants',
    requiredLandmarks: [23, 24],
    optionalLandmarks: [25, 26, 27, 28],
    visibilityThreshold: 0.4,
    widthPadding: 1.1,
    heightPadding: 1.05,
    verticalOffset: 0,
    widthRef: 'hip',
    heightRef: 'hip_to_ankle',
    defaultOffset: { x: 0, y: 0, z: 0 },
    scaleMultiplier: 1.0,
    maxScaleDeltaPerFrame: 0.04,
  },
  jacket: {
    type: 'jacket',
    requiredLandmarks: [11, 12],
    optionalLandmarks: [23, 24, 13, 14],
    visibilityThreshold: 0.3,
    widthPadding: 1.25,
    heightPadding: 1.1,
    verticalOffset: 0,
    widthRef: 'shoulder',
    heightRef: 'torso',
    defaultOffset: { x: 0, y: 0, z: 0 },
    scaleMultiplier: 1.05,
    maxScaleDeltaPerFrame: 0.05,
  },
  headwear: {
    type: 'headwear',
    requiredLandmarks: [0],
    optionalLandmarks: [7, 8],
    visibilityThreshold: 0.6,
    widthPadding: 1.3,
    heightPadding: 1.5,
    verticalOffset: -0.5,
    widthRef: 'ear',
    heightRef: 'head',
    defaultOffset: { x: 0, y: 0, z: 0 },
    scaleMultiplier: 1.0,
    maxScaleDeltaPerFrame: 0.06,
  },
  accessory: {
    type: 'accessory',
    requiredLandmarks: [11, 12],
    optionalLandmarks: [0],
    visibilityThreshold: 0.5,
    widthPadding: 0.6,
    heightPadding: 0.3,
    verticalOffset: -0.15,
    widthRef: 'shoulder',
    heightRef: 'torso',
    defaultOffset: { x: 0, y: 0, z: 0 },
    scaleMultiplier: 1.0,
    maxScaleDeltaPerFrame: 0.06,
  },
};

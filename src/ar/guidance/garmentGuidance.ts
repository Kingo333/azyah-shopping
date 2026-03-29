/**
 * Pure functions mapping garment type + tracking state to guidance messages.
 *
 * Provides garment-specific user instructions for the AR try-on experience.
 * An abaya needs full body visibility, pants need legs, headwear needs face --
 * the guidance must match the garment being tried on.
 *
 * These functions are pure (no side effects, no state) and can be tested
 * in isolation without React or DOM dependencies.
 */
import type { GarmentType, TrackingState } from '../types';
import { GARMENT_PRESETS } from '../config/garmentPresets';

/**
 * Human-readable names for body part landmark indices.
 *
 * Pairs of landmarks (left/right) map to the same name so that
 * deduplication produces a single entry (e.g., "shoulders" not
 * "left shoulder, right shoulder").
 */
const BODY_PART_NAMES: Record<number, string> = {
  0: 'face',
  7: 'ears',
  8: 'ears',
  11: 'shoulders',
  12: 'shoulders',
  13: 'elbows',
  14: 'elbows',
  23: 'hips',
  24: 'hips',
  25: 'knees',
  26: 'knees',
  27: 'ankles',
  28: 'ankles',
};

/**
 * Garment-specific guidance messages for waiting_for_pose state.
 *
 * Indexed by garment type. Each entry provides a title and subtitle
 * telling the user what body region to show for the garment.
 */
const WAITING_GUIDANCE: Record<GarmentType, { title: string; subtitle: string }> = {
  shirt: {
    title: 'Show Upper Body',
    subtitle: 'Stand back so your shoulders and torso are visible',
  },
  jacket: {
    title: 'Show Upper Body',
    subtitle: 'Stand back so your shoulders and torso are visible',
  },
  abaya: {
    title: 'Show Full Body',
    subtitle: 'Step back so your entire body is in frame',
  },
  pants: {
    title: 'Show Your Legs',
    subtitle: 'Step back so your hips and legs are visible',
  },
  headwear: {
    title: 'Show Your Face',
    subtitle: 'Make sure your face is clearly visible',
  },
  accessory: {
    title: 'Show Upper Body',
    subtitle: 'Stand back so your shoulders are visible',
  },
};

/**
 * Garment-specific tracking_lost messages.
 *
 * Each garment type gets a subtitle that tells the user which body
 * region to show when moving back into frame.
 */
const TRACKING_LOST_SUBTITLE: Record<GarmentType, string> = {
  shirt: 'Move back into frame -- show your upper body',
  jacket: 'Move back into frame -- show your upper body',
  abaya: 'Move back into frame -- show your full body',
  pants: 'Move back into frame -- show your legs',
  headwear: 'Move back into frame -- show your face',
  accessory: 'Move back into frame -- show your upper body',
};

/**
 * Returns garment-specific guidance text for waiting_for_pose, partial_tracking,
 * and tracking_lost states.
 *
 * For other states (initializing, camera_denied, etc.), returns null to indicate
 * the caller should use its own default messages.
 *
 * @param garmentType - The garment being tried on
 * @param trackingState - Current tracking state
 * @param missingParts - Missing body parts (only used for partial_tracking)
 * @returns Guidance title and subtitle, or null for unhandled states
 */
export function getTrackingGuidance(
  garmentType: GarmentType,
  trackingState: TrackingState,
  missingParts: string[] = [],
): { title: string; subtitle: string } | null {
  switch (trackingState) {
    case 'waiting_for_pose':
      return WAITING_GUIDANCE[garmentType] || WAITING_GUIDANCE.shirt;

    case 'partial_tracking': {
      const base = WAITING_GUIDANCE[garmentType] || WAITING_GUIDANCE.shirt;
      const subtitle = missingParts.length > 0
        ? `Also show: ${missingParts.join(', ')}`
        : base.subtitle;
      return {
        title: base.title,
        subtitle,
      };
    }

    case 'tracking_lost':
      return {
        title: 'Tracking Lost',
        subtitle: TRACKING_LOST_SUBTITLE[garmentType] || TRACKING_LOST_SUBTITLE.shirt,
      };

    default:
      return null;
  }
}

/**
 * Identifies which body parts are missing (below visibility threshold)
 * for a given garment type.
 *
 * Checks both required and optional landmarks from the garment preset.
 * Left/right pairs are deduplicated (e.g., if both left and right shoulder
 * are missing, only "shoulders" appears once).
 *
 * @param garmentType - The garment being tried on
 * @param visibility - Per-landmark visibility scores (0-1)
 * @param visibilityThreshold - Minimum visibility to consider a landmark visible
 * @returns Array of human-readable body part names that are missing
 */
export function getMissingBodyParts(
  garmentType: GarmentType,
  visibility: Record<number, number>,
  visibilityThreshold: number,
): string[] {
  const preset = GARMENT_PRESETS[garmentType];
  if (!preset) return [];

  const allLandmarks = [...preset.requiredLandmarks, ...preset.optionalLandmarks];
  const missingSet = new Set<string>();

  for (const index of allLandmarks) {
    const vis = visibility[index] ?? 0;
    if (vis < visibilityThreshold) {
      const partName = BODY_PART_NAMES[index];
      if (partName) {
        missingSet.add(partName);
      }
    }
  }

  return Array.from(missingSet);
}

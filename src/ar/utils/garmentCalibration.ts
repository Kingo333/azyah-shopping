import type {
  ARStabilityMode,
  GarmentCalibration,
  GarmentType,
  RigValidationResult,
} from '../types';
import { resolveRigProfile } from '../config/rigProfiles';

const calibrationCache = new Map<string, GarmentCalibration | null>();

export function getCalibrationUrl(modelUrl: string): string {
  const queryIndex = modelUrl.indexOf('?');
  const cleanUrl = queryIndex >= 0 ? modelUrl.slice(0, queryIndex) : modelUrl;
  return cleanUrl.replace(/\.(glb|gltf)$/i, '.ar.json');
}

export async function loadGarmentCalibration(modelUrl: string): Promise<GarmentCalibration | null> {
  if (calibrationCache.has(modelUrl)) {
    return calibrationCache.get(modelUrl)!;
  }

  const url = getCalibrationUrl(modelUrl);

  try {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) {
      calibrationCache.set(modelUrl, null);
      return null;
    }
    const json = await response.json();
    const calibration = json as GarmentCalibration;
    calibrationCache.set(modelUrl, calibration);
    console.info(`[Calibration] loaded sidecar for ${url.slice(-40)}`);
    return calibration;
  } catch {
    calibrationCache.set(modelUrl, null);
    return null;
  }
}

/**
 * Safe default policy.
 * Tops stay anchor-only unless explicitly approved.
 */
export function getDefaultModeForGarment(garmentType: GarmentType): ARStabilityMode {
  switch (garmentType) {
    case 'shirt':
    case 'jacket':
    case 'abaya':
      return 'anchor-only';
    case 'pants':
      return 'anchor-plus-yaw';
    case 'headwear':
    case 'accessory':
      return 'anchor-plus-yaw';
    default:
      return 'anchor-only';
  }
}

export function resolveStabilityMode(
  garmentType: GarmentType,
  calibration: GarmentCalibration | null,
): ARStabilityMode {
  return calibration?.preferredMode ?? getDefaultModeForGarment(garmentType);
}

export function validateRigForMode(params: {
  boneNames: string[];
  isRigged: boolean;
  calibration: GarmentCalibration | null;
  mode: ARStabilityMode;
}): RigValidationResult {
  const { boneNames, isRigged, calibration, mode } = params;

  if (!isRigged || boneNames.length === 0) {
    return { enabled: false, reason: 'not-rigged' };
  }

  if (mode !== 'anchor-plus-safe-rig' && mode !== 'full-rig-experimental') {
    return { enabled: false, reason: 'mode-disallows-rigging' };
  }

  if (!calibration?.allowBoneRetargeting) {
    return { enabled: false, reason: 'calibration-disallows-rigging' };
  }

  const profile = resolveRigProfile(boneNames, calibration?.rigProfile);
  if (!calibration?.rigProfile && !profile) {
    return { enabled: false, reason: 'no-profile' };
  }
  if (calibration?.rigProfile && !profile) {
    return { enabled: false, reason: 'profile-mismatch' };
  }

  return {
    enabled: true,
    reason: 'validated',
    rigProfile: profile?.name,
  };
}

/**
 * Body measurement computation from MediaPipe pose landmarks.
 *
 * Extracts body proportions from landmarks once per frame, producing a
 * BodyMeasurements object consumed by all anchor strategies.
 *
 * Strict separation:
 * - World-space measurements (meters) come from MediaPipe worldLandmarks
 * - Screen-space positions (Three.js world units) come from normalized landmarks + cover crop
 *
 * @see types.ts for BodyMeasurements interface
 * @see 03-RESEARCH.md Pitfall 4 for visibility-weighted midpoint rationale
 */
import { LANDMARK } from '../config/landmarkIndices';
import { landmarkToWorld } from '../utils/coordinateUtils';
import type { CoverCropInfo } from '../utils/coordinateUtils';
import type { BodyMeasurements } from './types';

/** Landmark type from MediaPipe */
interface LandmarkData {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

/** Visibility threshold for shoulder landmarks */
const SHOULDER_VIS_THRESHOLD = 0.5;

/** Visibility threshold for lower body landmarks (less reliable) */
const LOWER_BODY_VIS_THRESHOLD = 0.3;

/** Visibility threshold for head landmarks */
const HEAD_VIS_THRESHOLD = 0.5;

/** Minimum visibility floor for weighted midpoints (prevents asymmetric drift) */
const VISIBILITY_FLOOR = 0.3;

/**
 * Compute Euclidean distance between two 3D points.
 */
function dist3D(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

/**
 * Compute 3D midpoint of two world landmarks.
 */
function worldMidpoint(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): { x: number; y: number; z: number } {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  };
}

/**
 * Compute visibility-weighted midpoint in screen space.
 *
 * Floors visibility at VISIBILITY_FLOOR (0.3) per research Pitfall 4
 * to prevent asymmetric drift when one landmark has very low visibility.
 *
 * @param posA - Screen position of landmark A
 * @param posB - Screen position of landmark B
 * @param visA - Visibility of landmark A (0-1)
 * @param visB - Visibility of landmark B (0-1)
 * @returns Weighted midpoint in screen space
 */
function weightedMidpoint(
  posA: { x: number; y: number },
  posB: { x: number; y: number },
  visA: number,
  visB: number,
): { x: number; y: number } {
  const wA = Math.max(visA, VISIBILITY_FLOOR);
  const wB = Math.max(visB, VISIBILITY_FLOOR);
  const total = wA + wB;
  return {
    x: (posA.x * wA + posB.x * wB) / total,
    y: (posA.y * wA + posB.y * wB) / total,
  };
}

/**
 * Compute body measurements from MediaPipe pose landmarks.
 *
 * This is a pure function called once per frame. It produces a BodyMeasurements
 * object consumed by all anchor strategies via the AnchorResolver.
 *
 * @param normalizedLandmarks - 33 MediaPipe normalized landmarks (video-space [0,1])
 * @param worldLandmarks - 33 MediaPipe world landmarks (metric-scale meters)
 * @param coverCrop - Cover crop info for video-to-display mapping
 * @param visibleDims - Visible world dimensions at camera Z distance
 * @returns BodyMeasurements with all derived body proportions and positions
 */
export function computeBodyMeasurements(
  normalizedLandmarks: LandmarkData[],
  worldLandmarks: LandmarkData[],
  coverCrop: CoverCropInfo,
  visibleDims: { w: number; h: number },
): BodyMeasurements {
  // Extract key landmarks
  const nlLS = normalizedLandmarks[LANDMARK.LEFT_SHOULDER];
  const nlRS = normalizedLandmarks[LANDMARK.RIGHT_SHOULDER];
  const nlLH = normalizedLandmarks[LANDMARK.LEFT_HIP];
  const nlRH = normalizedLandmarks[LANDMARK.RIGHT_HIP];
  const nlLK = normalizedLandmarks[LANDMARK.LEFT_KNEE];
  const nlRK = normalizedLandmarks[LANDMARK.RIGHT_KNEE];
  const nlLA = normalizedLandmarks[LANDMARK.LEFT_ANKLE];
  const nlRA = normalizedLandmarks[LANDMARK.RIGHT_ANKLE];
  const nlNose = normalizedLandmarks[LANDMARK.NOSE];
  const nlLE = normalizedLandmarks[LANDMARK.LEFT_EAR];
  const nlRE = normalizedLandmarks[LANDMARK.RIGHT_EAR];

  const wlLS = worldLandmarks[LANDMARK.LEFT_SHOULDER];
  const wlRS = worldLandmarks[LANDMARK.RIGHT_SHOULDER];
  const wlLH = worldLandmarks[LANDMARK.LEFT_HIP];
  const wlRH = worldLandmarks[LANDMARK.RIGHT_HIP];
  const wlLA = worldLandmarks[LANDMARK.LEFT_ANKLE];
  const wlRA = worldLandmarks[LANDMARK.RIGHT_ANKLE];

  // Build visibility map for all key landmarks
  const visibility: Record<number, number> = {};
  const keyIndices = [
    LANDMARK.NOSE, LANDMARK.LEFT_EAR, LANDMARK.RIGHT_EAR,
    LANDMARK.LEFT_SHOULDER, LANDMARK.RIGHT_SHOULDER,
    LANDMARK.LEFT_HIP, LANDMARK.RIGHT_HIP,
    LANDMARK.LEFT_KNEE, LANDMARK.RIGHT_KNEE,
    LANDMARK.LEFT_ANKLE, LANDMARK.RIGHT_ANKLE,
  ];
  for (const idx of keyIndices) {
    visibility[idx] = normalizedLandmarks[idx].visibility;
  }

  // Compute has-flags using appropriate thresholds
  const hasShoulders =
    nlLS.visibility >= SHOULDER_VIS_THRESHOLD &&
    nlRS.visibility >= SHOULDER_VIS_THRESHOLD;
  const hasHips =
    nlLH.visibility >= LOWER_BODY_VIS_THRESHOLD &&
    nlRH.visibility >= LOWER_BODY_VIS_THRESHOLD;
  const hasKnees =
    nlLK.visibility >= LOWER_BODY_VIS_THRESHOLD &&
    nlRK.visibility >= LOWER_BODY_VIS_THRESHOLD;
  const hasAnkles =
    nlLA.visibility >= LOWER_BODY_VIS_THRESHOLD &&
    nlRA.visibility >= LOWER_BODY_VIS_THRESHOLD;
  const hasHead = nlNose.visibility >= HEAD_VIS_THRESHOLD;

  // --- Metric distances (from worldLandmarks, in meters) ---

  const shoulderWidthMetric = dist3D(wlLS, wlRS);

  // Shoulder and hip midpoints in world space
  const shoulderMidWorld = worldMidpoint(wlLS, wlRS);
  const hipMidWorld = worldMidpoint(wlLH, wlRH);

  const torsoHeightMetric = hasHips
    ? dist3D(shoulderMidWorld, hipMidWorld)
    : 0;

  const hipWidthMetric = dist3D(wlLH, wlRH);

  // Ankle midpoint in world space (if visible)
  const ankleMidWorld = hasAnkles ? worldMidpoint(wlLA, wlRA) : null;

  const shoulderToAnkleMetric = ankleMidWorld
    ? dist3D(shoulderMidWorld, ankleMidWorld)
    : 0;

  const hipToAnkleMetric = ankleMidWorld
    ? dist3D(hipMidWorld, ankleMidWorld)
    : 0;

  // --- Screen-space positions (from normalized landmarks via landmarkToWorld) ---

  const lsScreen = landmarkToWorld(nlLS, coverCrop, visibleDims);
  const rsScreen = landmarkToWorld(nlRS, coverCrop, visibleDims);
  const shoulderCenter = weightedMidpoint(lsScreen, rsScreen, nlLS.visibility, nlRS.visibility);

  let hipCenter: { x: number; y: number };
  if (hasHips) {
    const lhScreen = landmarkToWorld(nlLH, coverCrop, visibleDims);
    const rhScreen = landmarkToWorld(nlRH, coverCrop, visibleDims);
    hipCenter = weightedMidpoint(lhScreen, rhScreen, nlLH.visibility, nlRH.visibility);
  } else {
    // Estimate hip center below shoulder center
    hipCenter = { x: shoulderCenter.x, y: shoulderCenter.y - visibleDims.h * 0.25 };
  }

  let kneeCenter: { x: number; y: number } | null = null;
  if (hasKnees) {
    const lkScreen = landmarkToWorld(nlLK, coverCrop, visibleDims);
    const rkScreen = landmarkToWorld(nlRK, coverCrop, visibleDims);
    kneeCenter = weightedMidpoint(lkScreen, rkScreen, nlLK.visibility, nlRK.visibility);
  }

  let ankleCenter: { x: number; y: number } | null = null;
  if (hasAnkles) {
    const laScreen = landmarkToWorld(nlLA, coverCrop, visibleDims);
    const raScreen = landmarkToWorld(nlRA, coverCrop, visibleDims);
    ankleCenter = weightedMidpoint(laScreen, raScreen, nlLA.visibility, nlRA.visibility);
  }

  let nosePosition: { x: number; y: number } | null = null;
  if (hasHead) {
    nosePosition = landmarkToWorld(nlNose, coverCrop, visibleDims);
  }

  let earMidpoint: { x: number; y: number } | null = null;
  if (nlLE.visibility >= HEAD_VIS_THRESHOLD && nlRE.visibility >= HEAD_VIS_THRESHOLD) {
    const leScreen = landmarkToWorld(nlLE, coverCrop, visibleDims);
    const reScreen = landmarkToWorld(nlRE, coverCrop, visibleDims);
    earMidpoint = weightedMidpoint(leScreen, reScreen, nlLE.visibility, nlRE.visibility);
  }

  // --- Rotation ---

  // bodyTurnY: from shoulder Z difference
  const shoulderZDiff = wlRS.z - wlLS.z;
  const shoulderWidthWorld = shoulderWidthMetric;
  const bodyTurnY = shoulderWidthWorld > 0.001
    ? Math.atan2(shoulderZDiff, shoulderWidthWorld)
    : 0;

  // shoulderTiltZ: from shoulder Y difference in world
  const shoulderTiltZ = Math.atan2(wlRS.y - wlLS.y, wlRS.x - wlLS.x);

  return {
    shoulderWidthMetric,
    torsoHeightMetric,
    hipWidthMetric,
    shoulderToAnkleMetric,
    hipToAnkleMetric,
    shoulderCenter,
    hipCenter,
    kneeCenter,
    ankleCenter,
    nosePosition,
    earMidpoint,
    visibility,
    bodyTurnY,
    shoulderTiltZ,
    hasShoulders,
    hasHips,
    hasKnees,
    hasAnkles,
    hasHead,
  };
}

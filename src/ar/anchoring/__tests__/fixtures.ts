/**
 * Shared mock landmark data for anchor system tests.
 *
 * Provides factory functions and preset pose constants for testing
 * anchor strategies, body measurements, and landmark-based computations
 * without requiring a live MediaPipe instance.
 */

/** Default landmark with centered position and good visibility. */
const DEFAULT_NORMALIZED = { x: 0.5, y: 0.5, z: 0, visibility: 0.9 };

/** Default world landmark at origin with good visibility. */
const DEFAULT_WORLD = { x: 0, y: 0, z: 0, visibility: 0.9 };

/**
 * Create a 33-element array of mock normalized landmarks.
 * All landmarks default to center position with 0.9 visibility.
 *
 * @param overrides - Map of landmark index to partial override values.
 */
export function createMockLandmarks(
  overrides?: Record<number, Partial<typeof DEFAULT_NORMALIZED>>,
): Array<{ x: number; y: number; z: number; visibility: number }> {
  const landmarks = Array.from({ length: 33 }, () => ({ ...DEFAULT_NORMALIZED }));
  if (overrides) {
    for (const [index, values] of Object.entries(overrides)) {
      landmarks[Number(index)] = { ...landmarks[Number(index)], ...values };
    }
  }
  return landmarks;
}

/**
 * Create a 33-element array of mock world landmarks (metric-scale).
 * All landmarks default to origin with 0.9 visibility.
 *
 * @param overrides - Map of landmark index to partial override values.
 */
export function createMockWorldLandmarks(
  overrides?: Record<number, Partial<typeof DEFAULT_WORLD>>,
): Array<{ x: number; y: number; z: number; visibility: number }> {
  const landmarks = Array.from({ length: 33 }, () => ({ ...DEFAULT_WORLD }));
  if (overrides) {
    for (const [index, values] of Object.entries(overrides)) {
      landmarks[Number(index)] = { ...landmarks[Number(index)], ...values };
    }
  }
  return landmarks;
}

/**
 * Standing pose: person facing camera, full body visible.
 *
 * Normalized landmarks use video-normalized coordinates (0-1).
 * World landmarks use metric-scale coordinates (meters from hip center).
 */
export const STANDING_POSE = {
  normalized: createMockLandmarks({
    0:  { x: 0.5,  y: 0.2,  visibility: 0.98 }, // Nose
    7:  { x: 0.55, y: 0.2,  visibility: 0.9 },  // Left ear
    8:  { x: 0.45, y: 0.2,  visibility: 0.9 },  // Right ear
    11: { x: 0.6,  y: 0.35, visibility: 0.95 }, // Left shoulder
    12: { x: 0.4,  y: 0.35, visibility: 0.95 }, // Right shoulder
    23: { x: 0.55, y: 0.55, visibility: 0.85 }, // Left hip
    24: { x: 0.45, y: 0.55, visibility: 0.85 }, // Right hip
    25: { x: 0.55, y: 0.70, visibility: 0.75 }, // Left knee
    26: { x: 0.45, y: 0.70, visibility: 0.75 }, // Right knee
    27: { x: 0.55, y: 0.85, visibility: 0.65 }, // Left ankle
    28: { x: 0.45, y: 0.85, visibility: 0.65 }, // Right ankle
  }),
  world: createMockWorldLandmarks({
    0:  { x: 0,     y: 0.55,  visibility: 0.98 }, // Nose
    7:  { x: 0.08,  y: 0.55,  visibility: 0.9 },  // Left ear
    8:  { x: -0.08, y: 0.55,  visibility: 0.9 },  // Right ear
    11: { x: 0.15,  y: 0.3,   visibility: 0.95 }, // Left shoulder
    12: { x: -0.15, y: 0.3,   visibility: 0.95 }, // Right shoulder
    23: { x: 0.10,  y: -0.1,  visibility: 0.85 }, // Left hip
    24: { x: -0.10, y: -0.1,  visibility: 0.85 }, // Right hip
    25: { x: 0.10,  y: -0.35, visibility: 0.75 }, // Left knee
    26: { x: -0.10, y: -0.35, visibility: 0.75 }, // Right knee
    27: { x: 0.10,  y: -0.6,  visibility: 0.65 }, // Left ankle
    28: { x: -0.10, y: -0.6,  visibility: 0.65 }, // Right ankle
  }),
};

/**
 * Upper body only: knees and ankles have low visibility (below threshold).
 * Simulates a chest-up selfie camera view.
 */
export const UPPER_BODY_ONLY = {
  normalized: createMockLandmarks({
    0:  { x: 0.5,  y: 0.2,  visibility: 0.98 }, // Nose
    7:  { x: 0.55, y: 0.2,  visibility: 0.9 },  // Left ear
    8:  { x: 0.45, y: 0.2,  visibility: 0.9 },  // Right ear
    11: { x: 0.6,  y: 0.35, visibility: 0.95 }, // Left shoulder
    12: { x: 0.4,  y: 0.35, visibility: 0.95 }, // Right shoulder
    23: { x: 0.55, y: 0.55, visibility: 0.85 }, // Left hip
    24: { x: 0.45, y: 0.55, visibility: 0.85 }, // Right hip
    25: { x: 0.55, y: 0.70, visibility: 0.1 },  // Left knee (not visible)
    26: { x: 0.45, y: 0.70, visibility: 0.1 },  // Right knee (not visible)
    27: { x: 0.55, y: 0.85, visibility: 0.1 },  // Left ankle (not visible)
    28: { x: 0.45, y: 0.85, visibility: 0.1 },  // Right ankle (not visible)
  }),
  world: createMockWorldLandmarks({
    0:  { x: 0,     y: 0.55,  visibility: 0.98 }, // Nose
    7:  { x: 0.08,  y: 0.55,  visibility: 0.9 },  // Left ear
    8:  { x: -0.08, y: 0.55,  visibility: 0.9 },  // Right ear
    11: { x: 0.15,  y: 0.3,   visibility: 0.95 }, // Left shoulder
    12: { x: -0.15, y: 0.3,   visibility: 0.95 }, // Right shoulder
    23: { x: 0.10,  y: -0.1,  visibility: 0.85 }, // Left hip
    24: { x: -0.10, y: -0.1,  visibility: 0.85 }, // Right hip
    25: { x: 0.10,  y: -0.35, visibility: 0.1 },  // Left knee (not visible)
    26: { x: -0.10, y: -0.35, visibility: 0.1 },  // Right knee (not visible)
    27: { x: 0.10,  y: -0.6,  visibility: 0.1 },  // Left ankle (not visible)
    28: { x: -0.10, y: -0.6,  visibility: 0.1 },  // Right ankle (not visible)
  }),
};

/**
 * Shoulders only: only shoulders visible (>0.5), everything else low visibility.
 * Simulates a very tight crop or heavily occluded view.
 */
export const SHOULDERS_ONLY = {
  normalized: createMockLandmarks({
    0:  { x: 0.5,  y: 0.2,  visibility: 0.1 },  // Nose (not visible)
    7:  { x: 0.55, y: 0.2,  visibility: 0.1 },  // Left ear (not visible)
    8:  { x: 0.45, y: 0.2,  visibility: 0.1 },  // Right ear (not visible)
    11: { x: 0.6,  y: 0.35, visibility: 0.95 }, // Left shoulder
    12: { x: 0.4,  y: 0.35, visibility: 0.95 }, // Right shoulder
    23: { x: 0.55, y: 0.55, visibility: 0.1 },  // Left hip (not visible)
    24: { x: 0.45, y: 0.55, visibility: 0.1 },  // Right hip (not visible)
    25: { x: 0.55, y: 0.70, visibility: 0.1 },  // Left knee (not visible)
    26: { x: 0.45, y: 0.70, visibility: 0.1 },  // Right knee (not visible)
    27: { x: 0.55, y: 0.85, visibility: 0.1 },  // Left ankle (not visible)
    28: { x: 0.45, y: 0.85, visibility: 0.1 },  // Right ankle (not visible)
  }),
  world: createMockWorldLandmarks({
    0:  { x: 0,     y: 0.55,  visibility: 0.1 },  // Nose (not visible)
    7:  { x: 0.08,  y: 0.55,  visibility: 0.1 },  // Left ear (not visible)
    8:  { x: -0.08, y: 0.55,  visibility: 0.1 },  // Right ear (not visible)
    11: { x: 0.15,  y: 0.3,   visibility: 0.95 }, // Left shoulder
    12: { x: -0.15, y: 0.3,   visibility: 0.95 }, // Right shoulder
    23: { x: 0.10,  y: -0.1,  visibility: 0.1 },  // Left hip (not visible)
    24: { x: -0.10, y: -0.1,  visibility: 0.1 },  // Right hip (not visible)
    25: { x: 0.10,  y: -0.35, visibility: 0.1 },  // Left knee (not visible)
    26: { x: -0.10, y: -0.35, visibility: 0.1 },  // Right knee (not visible)
    27: { x: 0.10,  y: -0.6,  visibility: 0.1 },  // Left ankle (not visible)
    28: { x: -0.10, y: -0.6,  visibility: 0.1 },  // Right ankle (not visible)
  }),
};

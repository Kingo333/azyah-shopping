/**
 * Tests for PantsAnchor strategy.
 *
 * PantsAnchor positions a pants garment model from hips to ankles,
 * with hip-width scaling and fallback estimation when ankles are occluded.
 */
import { describe, it, expect } from 'vitest';
import { PantsAnchor } from '../PantsAnchor';
import { computeBodyMeasurements } from '../../BodyMeasurement';
import {
  STANDING_POSE,
  UPPER_BODY_ONLY,
  SHOULDERS_ONLY,
  createMockLandmarks,
  createMockWorldLandmarks,
} from '../../__tests__/fixtures';
import { GARMENT_PRESETS } from '../../../config/garmentPresets';
import type { CoverCropInfo } from '../../../utils/coordinateUtils';

const coverCrop: CoverCropInfo = { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
const visibleDims = { w: 4, h: 4 };
const modelDims = { w: 1, h: 2.5, d: 0.5 };
const pantsConfig = GARMENT_PRESETS.pants;

describe('PantsAnchor', () => {
  const anchor = new PantsAnchor();

  it('returns null when hasHips is false', () => {
    const measurements = computeBodyMeasurements(
      SHOULDERS_ONLY.normalized,
      SHOULDERS_ONLY.world,
      coverCrop,
      visibleDims,
    );
    expect(measurements.hasHips).toBe(false);

    const result = anchor.compute(measurements, pantsConfig, modelDims);
    expect(result).toBeNull();
  });

  it('positions model at midpoint of hipCenter and ankleCenter', () => {
    const measurements = computeBodyMeasurements(
      STANDING_POSE.normalized,
      STANDING_POSE.world,
      coverCrop,
      visibleDims,
    );
    const result = anchor.compute(measurements, pantsConfig, modelDims);
    expect(result).not.toBeNull();

    // Position should be midpoint of hipCenter and ankleCenter
    const midX = (measurements.hipCenter.x + measurements.ankleCenter!.x) / 2;
    const midY = (measurements.hipCenter.y + measurements.ankleCenter!.y) / 2;
    expect(result!.position.x).toBeCloseTo(midX, 1);
    expect(result!.position.y).toBeCloseTo(midY, 1);
  });

  it('scales X by (hipWidthMetric * widthPadding 1.1) / modelDims.w', () => {
    const measurements = computeBodyMeasurements(
      STANDING_POSE.normalized,
      STANDING_POSE.world,
      coverCrop,
      visibleDims,
    );
    const result = anchor.compute(measurements, pantsConfig, modelDims);
    expect(result).not.toBeNull();

    const expectedScaleX =
      (measurements.hipWidthMetric * pantsConfig.widthPadding) / modelDims.w;
    expect(result!.scale.x).toBeCloseTo(expectedScaleX, 4);
    expect(pantsConfig.widthPadding).toBe(1.1);
  });

  it('scales Y by (hipToAnkleMetric * heightPadding) / modelDims.h', () => {
    const measurements = computeBodyMeasurements(
      STANDING_POSE.normalized,
      STANDING_POSE.world,
      coverCrop,
      visibleDims,
    );
    const result = anchor.compute(measurements, pantsConfig, modelDims);
    expect(result).not.toBeNull();

    const expectedScaleY =
      (measurements.hipToAnkleMetric * pantsConfig.heightPadding) / modelDims.h;
    expect(result!.scale.y).toBeCloseTo(expectedScaleY, 4);
  });

  it('estimates ankle position when hasAnkles=false, marks degraded=true', () => {
    const measurements = computeBodyMeasurements(
      UPPER_BODY_ONLY.normalized,
      UPPER_BODY_ONLY.world,
      coverCrop,
      visibleDims,
    );
    expect(measurements.hasAnkles).toBe(false);
    expect(measurements.hasHips).toBe(true);

    const result = anchor.compute(measurements, pantsConfig, modelDims);
    expect(result).not.toBeNull();
    expect(result!.degraded).toBe(true);

    // Should use torsoHeightMetric * 1.2 for estimated hip-to-ankle
    const estimatedHeight = measurements.torsoHeightMetric * 1.2;
    const expectedScaleY = (estimatedHeight * pantsConfig.heightPadding) / modelDims.h;
    expect(result!.scale.y).toBeCloseTo(expectedScaleY, 4);
  });

  it('estimates from knees when hasKnees but no ankles', () => {
    // Create pose with knees visible but ankles not
    const normalized = createMockLandmarks({
      11: { x: 0.6,  y: 0.35, visibility: 0.95 },
      12: { x: 0.4,  y: 0.35, visibility: 0.95 },
      23: { x: 0.55, y: 0.55, visibility: 0.85 },
      24: { x: 0.45, y: 0.55, visibility: 0.85 },
      25: { x: 0.55, y: 0.70, visibility: 0.75 },
      26: { x: 0.45, y: 0.70, visibility: 0.75 },
      27: { x: 0.55, y: 0.85, visibility: 0.1 },  // Not visible
      28: { x: 0.45, y: 0.85, visibility: 0.1 },  // Not visible
    });
    const world = createMockWorldLandmarks({
      11: { x: 0.15,  y: 0.3,   visibility: 0.95 },
      12: { x: -0.15, y: 0.3,   visibility: 0.95 },
      23: { x: 0.10,  y: -0.1,  visibility: 0.85 },
      24: { x: -0.10, y: -0.1,  visibility: 0.85 },
      25: { x: 0.10,  y: -0.35, visibility: 0.75 },
      26: { x: -0.10, y: -0.35, visibility: 0.75 },
      27: { x: 0.10,  y: -0.6,  visibility: 0.1 },
      28: { x: -0.10, y: -0.6,  visibility: 0.1 },
    });

    const measurements = computeBodyMeasurements(normalized, world, coverCrop, visibleDims);
    expect(measurements.hasKnees).toBe(true);
    expect(measurements.hasAnkles).toBe(false);

    const result = anchor.compute(measurements, pantsConfig, modelDims);
    expect(result).not.toBeNull();
    expect(result!.degraded).toBe(true);
    expect(result!.scale.y).toBeGreaterThan(0);
  });

  it('uses bodyTurnY for rotation', () => {
    const measurements = computeBodyMeasurements(
      STANDING_POSE.normalized,
      STANDING_POSE.world,
      coverCrop,
      visibleDims,
    );
    const result = anchor.compute(measurements, pantsConfig, modelDims);
    expect(result).not.toBeNull();
    expect(result!.rotationY).toBe(measurements.bodyTurnY);
  });

  it('sets z position to 0', () => {
    const measurements = computeBodyMeasurements(
      STANDING_POSE.normalized,
      STANDING_POSE.world,
      coverCrop,
      visibleDims,
    );
    const result = anchor.compute(measurements, pantsConfig, modelDims);
    expect(result).not.toBeNull();
    expect(result!.position.z).toBe(0);
  });
});

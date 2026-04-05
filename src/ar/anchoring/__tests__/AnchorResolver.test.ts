/**
 * Tests for the AnchorResolver dispatch class.
 *
 * Verifies that AnchorResolver correctly dispatches to registered strategies,
 * falls back to shirt for unknown types, and returns null when no strategy matches.
 */
import { describe, it, expect, vi } from 'vitest';
import { AnchorResolver } from '../AnchorResolver';
import type { AnchorStrategy, AnchorResult, BodyMeasurements, GarmentConfig } from '../types';
import type { GarmentType } from '../../types';

/** Create a mock AnchorStrategy that returns a fixed result. */
function createMockStrategy(result: AnchorResult | null): AnchorStrategy {
  return {
    compute: vi.fn().mockReturnValue(result),
  };
}

/** Minimal BodyMeasurements for testing dispatch (content doesn't matter for resolver). */
const mockMeasurements: BodyMeasurements = {
  shoulderWidthMetric: 0.3,
  torsoHeightMetric: 0.4,
  hipWidthMetric: 0.2,
  shoulderToAnkleMetric: 0.9,
  hipToAnkleMetric: 0.5,
  shoulderCenter: { x: 0, y: 0.6 },
  hipCenter: { x: 0, y: -0.2 },
  kneeCenter: null,
  ankleCenter: null,
  nosePosition: null,
  earMidpoint: null,
  visibility: {},
  bodyTurnY: 0,
  shoulderTiltZ: 0,
  hasShoulders: true,
  hasHips: true,
  hasKnees: false,
  hasAnkles: false,
  hasHead: false,
};

const mockConfig: GarmentConfig = {
  type: 'shirt',
  requiredLandmarks: [11, 12],
  optionalLandmarks: [23, 24],
  visibilityThreshold: 0.5,
  widthPadding: 1.15,
  heightPadding: 1.1,
  verticalOffset: 0,
  widthRef: 'shoulder',
  heightRef: 'torso',
  defaultOffset: { x: 0, y: 0, z: 0 },
  scaleMultiplier: 1.0,
  maxScaleDeltaPerFrame: 0.05,
};

const mockModelDims = { w: 1, h: 2, d: 0.5 };

const sampleResult: AnchorResult = {
  position: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
  rotationY: 0,
  confidence: 0.9,
  degraded: false,
};

describe('AnchorResolver', () => {
  it('dispatches to registered strategy', () => {
    const resolver = new AnchorResolver();
    const strategy = createMockStrategy(sampleResult);
    resolver.register('shirt', strategy);

    const result = resolver.resolve('shirt', mockMeasurements, mockConfig, mockModelDims);

    expect(result).toEqual(sampleResult);
    expect(strategy.compute).toHaveBeenCalledWith(mockMeasurements, mockConfig, mockModelDims);
  });

  it('dispatches to correct strategy when multiple are registered', () => {
    const resolver = new AnchorResolver();
    const shirtStrategy = createMockStrategy(sampleResult);
    const pantsResult: AnchorResult = { ...sampleResult, confidence: 0.7 };
    const pantsStrategy = createMockStrategy(pantsResult);

    resolver.register('shirt', shirtStrategy);
    resolver.register('pants', pantsStrategy);

    const pantsConfig: GarmentConfig = { ...mockConfig, type: 'pants' };
    const result = resolver.resolve('pants', mockMeasurements, pantsConfig, mockModelDims);

    expect(result).toEqual(pantsResult);
    expect(pantsStrategy.compute).toHaveBeenCalled();
    expect(shirtStrategy.compute).not.toHaveBeenCalled();
  });

  it('falls back to shirt for unknown garment type', () => {
    const resolver = new AnchorResolver();
    const shirtStrategy = createMockStrategy(sampleResult);
    resolver.register('shirt', shirtStrategy);

    const jacketConfig: GarmentConfig = { ...mockConfig, type: 'jacket' };
    const result = resolver.resolve('jacket' as GarmentType, mockMeasurements, jacketConfig, mockModelDims);

    expect(result).toEqual(sampleResult);
    expect(shirtStrategy.compute).toHaveBeenCalled();
  });

  it('returns null when no strategy registered and no shirt fallback', () => {
    const resolver = new AnchorResolver();

    const result = resolver.resolve('abaya', mockMeasurements, mockConfig, mockModelDims);

    expect(result).toBeNull();
  });

  it('returns null when unknown type and shirt strategy is not registered', () => {
    const resolver = new AnchorResolver();
    const pantsStrategy = createMockStrategy(sampleResult);
    resolver.register('pants', pantsStrategy);

    const jacketConfig: GarmentConfig = { ...mockConfig, type: 'jacket' };
    const result = resolver.resolve('jacket' as GarmentType, mockMeasurements, jacketConfig, mockModelDims);

    expect(result).toBeNull();
  });
});

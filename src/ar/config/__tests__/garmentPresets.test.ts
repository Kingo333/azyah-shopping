/**
 * Tests for garment preset configuration and landmark indices.
 *
 * Verifies that every GarmentType has a corresponding preset with all
 * required GarmentConfig fields, and that specific presets have the
 * correct values per the anchoring research document.
 */
import { describe, it, expect } from 'vitest';
import { GARMENT_PRESETS } from '../garmentPresets';
import { LANDMARK } from '../landmarkIndices';
import type { GarmentType } from '../../types';

const ALL_GARMENT_TYPES: GarmentType[] = [
  'shirt', 'abaya', 'pants', 'jacket', 'headwear', 'accessory',
];

const REQUIRED_FIELDS = [
  'type',
  'requiredLandmarks',
  'optionalLandmarks',
  'visibilityThreshold',
  'widthPadding',
  'heightPadding',
  'verticalOffset',
  'widthRef',
  'heightRef',
] as const;

describe('GARMENT_PRESETS', () => {
  it('has an entry for every GarmentType', () => {
    for (const type of ALL_GARMENT_TYPES) {
      expect(GARMENT_PRESETS).toHaveProperty(type);
    }
  });

  it.each(ALL_GARMENT_TYPES)(
    '%s preset has all required GarmentConfig fields',
    (type) => {
      const preset = GARMENT_PRESETS[type];
      for (const field of REQUIRED_FIELDS) {
        expect(preset).toHaveProperty(field);
      }
    },
  );

  describe('shirt preset', () => {
    it('has widthPadding 1.15', () => {
      expect(GARMENT_PRESETS.shirt.widthPadding).toBe(1.15);
    });

    it('has widthRef shoulder', () => {
      expect(GARMENT_PRESETS.shirt.widthRef).toBe('shoulder');
    });

    it('has heightRef torso', () => {
      expect(GARMENT_PRESETS.shirt.heightRef).toBe('torso');
    });
  });

  describe('abaya preset', () => {
    it('has widthPadding 1.2', () => {
      expect(GARMENT_PRESETS.abaya.widthPadding).toBe(1.2);
    });

    it('has heightRef shoulder_to_ankle', () => {
      expect(GARMENT_PRESETS.abaya.heightRef).toBe('shoulder_to_ankle');
    });
  });

  describe('pants preset', () => {
    it('has widthRef hip', () => {
      expect(GARMENT_PRESETS.pants.widthRef).toBe('hip');
    });

    it('has heightRef hip_to_ankle', () => {
      expect(GARMENT_PRESETS.pants.heightRef).toBe('hip_to_ankle');
    });
  });

  describe('headwear preset', () => {
    it('has requiredLandmarks [0] (nose)', () => {
      expect(GARMENT_PRESETS.headwear.requiredLandmarks).toEqual([0]);
    });
  });
});

describe('LANDMARK', () => {
  it('has LEFT_SHOULDER = 11', () => {
    expect(LANDMARK.LEFT_SHOULDER).toBe(11);
  });

  it('has RIGHT_SHOULDER = 12', () => {
    expect(LANDMARK.RIGHT_SHOULDER).toBe(12);
  });

  it('has LEFT_HIP = 23', () => {
    expect(LANDMARK.LEFT_HIP).toBe(23);
  });

  it('has RIGHT_HIP = 24', () => {
    expect(LANDMARK.RIGHT_HIP).toBe(24);
  });
});

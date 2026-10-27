import { describe, expect, it } from 'vitest';
import { planStorageRemoval } from './storageCleanup';

describe('planStorageRemoval', () => {
  it('groups files by folder', () => {
    expect(planStorageRemoval([
      { bucket_id: 'ai-tryon-uploads', name: 'u/1.jpg' },
      { bucket_id: 'wardrobe-items', name: 'u/a.png' },
      { bucket_id: 'ai-tryon-uploads', name: 'u/2.jpg' },
    ])).toEqual([
      { bucket: 'ai-tryon-uploads', paths: ['u/1.jpg', 'u/2.jpg'] },
      { bucket: 'wardrobe-items', paths: ['u/a.png'] },
    ]);
  });

  it('splits large folders into batches of 100', () => {
    const rows = Array.from({ length: 205 }, (_, i) => ({ bucket_id: 'saved-outfits', name: `u/${i}.jpg` }));
    const plan = planStorageRemoval(rows);
    expect(plan.map((p) => p.paths.length)).toEqual([100, 100, 5]);
    expect(plan.every((p) => p.bucket === 'saved-outfits')).toBe(true);
  });

  it('honours a custom batch size and skips empty or duplicate entries', () => {
    expect(planStorageRemoval([
      { bucket_id: 'a', name: 'x' },
      { bucket_id: 'a', name: 'x' },
      { bucket_id: '', name: 'y' },
      { bucket_id: 'a', name: '' },
      { bucket_id: 'a', name: 'z' },
    ], 1)).toEqual([
      { bucket: 'a', paths: ['x'] },
      { bucket: 'a', paths: ['z'] },
    ]);
  });

  it('returns nothing for no files', () => {
    expect(planStorageRemoval([])).toEqual([]);
  });
});

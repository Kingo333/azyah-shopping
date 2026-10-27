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

import { removeAllUserFiles } from './storageCleanup';

// A fake store: listing returns at most `page` files, like the API's row cap.
function fakeStore(total: number, page = 1000, failBucket?: string) {
  const files = new Set(Array.from({ length: total }, (_, i) => `u/${i}.jpg`));
  const list = async () => Array.from(files).slice(0, page).map((name) => ({ bucket_id: 'ai-tryon-uploads', name }));
  const remove = async (bucket: string, paths: string[]) => {
    if (bucket === failBucket) return false;
    paths.forEach((p) => files.delete(p));
    return true;
  };
  return { files, list, remove };
}

describe('removeAllUserFiles', () => {
  it('keeps going past the 1000-row listing cap until nothing is left', async () => {
    const store = fakeStore(2005);
    const out = await removeAllUserFiles(store.list, store.remove);
    expect(out).toEqual({ listed: true, complete: true, removed: 2005, rounds: 4 });
    expect(store.files.size).toBe(0);
  });

  it('reports when the list can not be read, so the caller can fall back', async () => {
    const out = await removeAllUserFiles(async () => null, async () => true);
    expect(out).toEqual({ listed: false, complete: false, removed: 0, rounds: 1 });
  });

  it('stops instead of looping when files can not be removed', async () => {
    const store = fakeStore(3, 1000, 'ai-tryon-uploads');
    const out = await removeAllUserFiles(store.list, store.remove);
    expect(out).toEqual({ listed: true, complete: false, removed: 0, rounds: 1 });
  });

  it('stops after the round limit', async () => {
    const store = fakeStore(50, 10);
    const out = await removeAllUserFiles(store.list, store.remove, 2);
    expect(out).toEqual({ listed: true, complete: false, removed: 20, rounds: 2 });
  });

  it('treats a listing error mid-way as incomplete', async () => {
    const store = fakeStore(1500);
    let calls = 0;
    const list = async () => (++calls === 2 ? null : store.list());
    const out = await removeAllUserFiles(list, store.remove);
    expect(out).toEqual({ listed: true, complete: false, removed: 1000, rounds: 2 });
  });
});

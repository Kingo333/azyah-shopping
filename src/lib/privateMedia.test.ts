import { describe, expect, it, vi } from 'vitest';
import { PRIVATE_MEDIA_BUCKETS, parseStorageRef, signPrivateMedia, stableStorageUrl } from './privateMedia';

const DIRECT = 'https://klwolsopucgswhtdlsps.supabase.co';
const PROXY = 'https://api.azyahstyle.com';
const USER = '22222222-2222-4222-8222-222222222222';

function fakeStorage(rows: Record<string, { path: string | null; signedUrl: string }[] | 'error'>) {
  const calls: { bucket: string; paths: string[]; expiresIn: number }[] = [];
  const from = vi.fn((bucket: string) => ({
    createSignedUrls: vi.fn(async (paths: string[], expiresIn: number) => {
      calls.push({ bucket, paths, expiresIn });
      const r = rows[bucket];
      if (r === 'error') return { data: null, error: new Error('nope') };
      return { data: r ?? [], error: null };
    }),
  }));
  return { storage: { from }, calls };
}

describe('parseStorageRef', () => {
  it('reads a direct public address', () => {
    expect(parseStorageRef(`${DIRECT}/storage/v1/object/public/ai-tryon-results/${USER}/1.png`))
      .toEqual({ bucket: 'ai-tryon-results', path: `${USER}/1.png` });
  });

  it('reads a proxy address', () => {
    expect(parseStorageRef(`${PROXY}/storage/v1/object/public/ai-tryon-uploads/${USER}/person_1.jpg`))
      .toEqual({ bucket: 'ai-tryon-uploads', path: `${USER}/person_1.jpg` });
  });

  it('reads a temporary link and drops its token', () => {
    expect(parseStorageRef(`${DIRECT}/storage/v1/object/sign/ai-tryon-videos/${USER}/v.mp4?token=abc.def`))
      .toEqual({ bucket: 'ai-tryon-videos', path: `${USER}/v.mp4` });
  });

  it('decodes encoded path segments', () => {
    expect(parseStorageRef(`${DIRECT}/storage/v1/object/public/ai-tryon-results/${USER}/a%20b.png`))
      .toEqual({ bucket: 'ai-tryon-results', path: `${USER}/a b.png` });
  });

  it('ignores addresses that are not ours', () => {
    expect(parseStorageRef('https://images.asos-media.com/products/x/1-2')).toBeNull();
    expect(parseStorageRef('')).toBeNull();
    expect(parseStorageRef('product-images/a.jpg')).toBeNull();
  });
});

describe('stableStorageUrl', () => {
  it('turns a temporary link into the permanent address on the same host', () => {
    expect(stableStorageUrl(`${PROXY}/storage/v1/object/sign/ai-tryon-results/${USER}/1.png?token=t`))
      .toBe(`${PROXY}/storage/v1/object/public/ai-tryon-results/${USER}/1.png`);
  });

  it('leaves permanent and outside addresses alone', () => {
    const permanent = `${DIRECT}/storage/v1/object/public/product-images/a.jpg`;
    expect(stableStorageUrl(permanent)).toBe(permanent);
    expect(stableStorageUrl('https://images.asos-media.com/x.jpg')).toBe('https://images.asos-media.com/x.jpg');
  });
});

describe('PRIVATE_MEDIA_BUCKETS', () => {
  it('covers the people-photo and event folders but not shared content', () => {
    for (const b of ['ai-tryon-uploads', 'ai-tryon-results', 'ai-tryon-videos', 'tnb-video-inputs', 'search-images', 'wardrobe',
      'event-user-photos', 'event-tryon-results', 'event-tryon-renders', 'event-photos', 'live-cam-snapshots']) {
      expect(PRIVATE_MEDIA_BUCKETS.has(b)).toBe(true);
    }
    for (const b of ['product-images', 'wardrobe-items', 'saved-outfits', 'product-outfits']) {
      expect(PRIVATE_MEDIA_BUCKETS.has(b)).toBe(false);
    }
  });
});

describe('signPrivateMedia', () => {
  const r1 = `${DIRECT}/storage/v1/object/public/ai-tryon-results/${USER}/1.png`;
  const r2 = `${PROXY}/storage/v1/object/public/ai-tryon-results/${USER}/2.png`;
  const product = `${DIRECT}/storage/v1/object/public/product-images/a.jpg`;
  const outside = 'https://cdn.example/x.png';

  it('signs only private-folder addresses, one call per folder', async () => {
    const { storage, calls } = fakeStorage({
      'ai-tryon-results': [
        { path: `${USER}/1.png`, signedUrl: 'https://s/1?token=a' },
        { path: `${USER}/2.png`, signedUrl: 'https://s/2?token=b' },
      ],
    });
    const out = await signPrivateMedia(storage, [r1, r2, product, outside], 600);
    expect(calls).toEqual([{ bucket: 'ai-tryon-results', paths: [`${USER}/1.png`, `${USER}/2.png`], expiresIn: 600 }]);
    expect(out).toEqual({ [r1]: 'https://s/1?token=a', [r2]: 'https://s/2?token=b', [product]: product, [outside]: outside });
  });

  it('defaults to one hour', async () => {
    const { storage, calls } = fakeStorage({ 'ai-tryon-results': [] });
    await signPrivateMedia(storage, [r1]);
    expect(calls[0].expiresIn).toBe(3600);
  });

  it('keeps the original address when signing fails', async () => {
    const { storage } = fakeStorage({ 'ai-tryon-results': 'error' });
    expect(await signPrivateMedia(storage, [r1])).toEqual({ [r1]: r1 });
  });

  it('keeps the original address for files the server could not sign', async () => {
    const { storage } = fakeStorage({ 'ai-tryon-results': [{ path: `${USER}/1.png`, signedUrl: '' }] });
    expect(await signPrivateMedia(storage, [r1])).toEqual({ [r1]: r1 });
  });

  it('skips empty entries', async () => {
    const { storage, calls } = fakeStorage({});
    expect(await signPrivateMedia(storage, ['', outside])).toEqual({ [outside]: outside });
    expect(calls).toEqual([]);
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { freshOwnLink, ownPrivateRef, stableStorageUrl } from './media';

const FUNCTIONS = join(__dirname, '..');
const OTHER = '33333333-3333-4333-8333-333333333333';

function fakeClient(result: { data: { signedUrl: string } | null; error: unknown } | 'throw') {
  const createSignedUrl = vi.fn(async () => {
    if (result === 'throw') throw new Error('offline');
    return result;
  });
  const from = vi.fn(() => ({ createSignedUrl }));
  return { client: { storage: { from } }, from, createSignedUrl };
}

const BASE = 'https://klwolsopucgswhtdlsps.supabase.co/storage/v1/object';
const USER = '22222222-2222-4222-8222-222222222222';

describe('stableStorageUrl (video function)', () => {
  it('logs the permanent address instead of a temporary link', () => {
    expect(stableStorageUrl(`${BASE}/sign/ai-tryon-uploads/${USER}/person_1.jpg?token=abc.def`))
      .toBe(`${BASE}/public/ai-tryon-uploads/${USER}/person_1.jpg`);
  });

  it('works for the proxy host too', () => {
    expect(stableStorageUrl(`https://api.azyahstyle.com/storage/v1/object/sign/ai-tryon-results/${USER}/1.png?token=t`))
      .toBe(`https://api.azyahstyle.com/storage/v1/object/public/ai-tryon-results/${USER}/1.png`);
  });

  it('keeps other addresses as they are', () => {
    expect(stableStorageUrl('https://thenewblack.ai/files/x.png')).toBe('https://thenewblack.ai/files/x.png');
    expect(stableStorageUrl('')).toBe('');
  });
});

describe('ownPrivateRef', () => {
  it('finds the caller\'s own file in a private folder (old public address, temporary link or proxy)', () => {
    expect(ownPrivateRef(`${BASE}/public/ai-tryon-uploads/${USER}/person_1.jpg`, USER))
      .toEqual({ bucket: 'ai-tryon-uploads', path: `${USER}/person_1.jpg` });
    expect(ownPrivateRef(`${BASE}/sign/ai-tryon-results/${USER}/1.png?token=old`, USER))
      .toEqual({ bucket: 'ai-tryon-results', path: `${USER}/1.png` });
    expect(ownPrivateRef(`https://api.azyahstyle.com/storage/v1/object/public/tnb-video-inputs/${USER}/in.jpg`, USER))
      .toEqual({ bucket: 'tnb-video-inputs', path: `${USER}/in.jpg` });
  });

  it('decodes encoded names', () => {
    expect(ownPrivateRef(`${BASE}/public/ai-tryon-uploads/${USER}/a%20b.jpg`, USER))
      .toEqual({ bucket: 'ai-tryon-uploads', path: `${USER}/a b.jpg` });
  });

  it('ignores someone else\'s file, public folders and outside addresses', () => {
    expect(ownPrivateRef(`${BASE}/public/ai-tryon-uploads/${OTHER}/person_1.jpg`, USER)).toBeNull();
    expect(ownPrivateRef(`${BASE}/public/product-images/${USER}/a.jpg`, USER)).toBeNull();
    expect(ownPrivateRef('https://images.asos-media.com/x.jpg', USER)).toBeNull();
    expect(ownPrivateRef(`${BASE}/public/ai-tryon-uploads/${USER}/person_1.jpg`, '')).toBeNull();
  });
});

describe('freshOwnLink', () => {
  it('replaces the caller\'s own private photo with a fresh temporary link', async () => {
    const { client, from, createSignedUrl } = fakeClient({ data: { signedUrl: 'https://s/fresh?token=new' }, error: null });
    const out = await freshOwnLink(`${BASE}/public/ai-tryon-uploads/${USER}/person_1.jpg`, USER, client, 3600);
    expect(out).toBe('https://s/fresh?token=new');
    expect(from).toHaveBeenCalledWith('ai-tryon-uploads');
    expect(createSignedUrl).toHaveBeenCalledWith(`${USER}/person_1.jpg`, 3600);
  });

  it('never signs someone else\'s photo', async () => {
    const { client, createSignedUrl } = fakeClient({ data: { signedUrl: 'https://s/x' }, error: null });
    const theirs = `${BASE}/public/ai-tryon-uploads/${OTHER}/person_1.jpg`;
    expect(await freshOwnLink(theirs, USER, client, 3600)).toBe(theirs);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('keeps the address when signing fails', async () => {
    const own = `${BASE}/public/ai-tryon-uploads/${USER}/person_1.jpg`;
    expect(await freshOwnLink(own, USER, fakeClient({ data: null, error: new Error('no') }).client, 3600)).toBe(own);
    expect(await freshOwnLink(own, USER, fakeClient('throw').client, 3600)).toBe(own);
  });

  it('leaves other addresses alone', async () => {
    const { client, createSignedUrl } = fakeClient({ data: { signedUrl: 'https://s/x' }, error: null });
    expect(await freshOwnLink('https://cdn.example/x.png', USER, client, 3600)).toBe('https://cdn.example/x.png');
    expect(createSignedUrl).not.toHaveBeenCalled();
  });
});

describe('shared copies', () => {
  it('the picture functions carry an identical copy of media.ts', () => {
    const source = readFileSync(join(FUNCTIONS, 'thenewblack-video', 'media.ts'), 'utf8');
    for (const fn of ['thenewblack-picture', 'thenewblack-picture-free']) {
      expect(readFileSync(join(FUNCTIONS, fn, 'media.ts'), 'utf8')).toBe(source);
    }
  });
});

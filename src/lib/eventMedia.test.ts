import { describe, expect, it, vi } from 'vitest';
import { signEventMedia } from './eventMedia';

function fakeStorage(result: { data: { path: string | null; signedUrl: string }[] | null; error: unknown }) {
  const createSignedUrls = vi.fn().mockResolvedValue(result);
  const from = vi.fn().mockReturnValue({ createSignedUrls });
  return { storage: { from }, from, createSignedUrls };
}

describe('signEventMedia', () => {
  it('passes full http(s) URLs through untouched', async () => {
    const { storage, createSignedUrls } = fakeStorage({ data: [], error: null });
    const out = await signEventMedia(storage, 'event-tryon-results', ['https://cdn.example/a.png']);
    expect(out).toEqual({ 'https://cdn.example/a.png': 'https://cdn.example/a.png' });
    expect(createSignedUrls).not.toHaveBeenCalled();
  });

  it('maps storage paths to signed URLs from the right bucket', async () => {
    const { storage, from, createSignedUrls } = fakeStorage({
      data: [{ path: 'e/u/p.png', signedUrl: 'https://x.supabase.co/sign/e/u/p.png?token=t' }],
      error: null,
    });
    const out = await signEventMedia(storage, 'event-tryon-results', ['e/u/p.png'], 120);
    expect(from).toHaveBeenCalledWith('event-tryon-results');
    expect(createSignedUrls).toHaveBeenCalledWith(['e/u/p.png'], 120);
    expect(out).toEqual({ 'e/u/p.png': 'https://x.supabase.co/sign/e/u/p.png?token=t' });
  });

  it('defaults to one hour', async () => {
    const { storage, createSignedUrls } = fakeStorage({ data: [], error: null });
    await signEventMedia(storage, 'event-user-photos', ['e/u/p.jpg']);
    expect(createSignedUrls).toHaveBeenCalledWith(['e/u/p.jpg'], 3600);
  });

  it('leaves out entries the server could not sign', async () => {
    const { storage } = fakeStorage({ data: [{ path: null, signedUrl: '' }], error: null });
    expect(await signEventMedia(storage, 'event-tryon-results', ['missing.png'])).toEqual({});
  });

  it('returns only pass-through URLs when signing fails', async () => {
    const { storage } = fakeStorage({ data: null, error: new Error('denied') });
    const out = await signEventMedia(storage, 'event-tryon-results', ['e/u/p.png', 'https://cdn.example/a.png']);
    expect(out).toEqual({ 'https://cdn.example/a.png': 'https://cdn.example/a.png' });
  });

  it('ignores empty paths', async () => {
    const { storage, createSignedUrls } = fakeStorage({ data: [], error: null });
    expect(await signEventMedia(storage, 'event-tryon-results', ['', null as unknown as string])).toEqual({});
    expect(createSignedUrls).not.toHaveBeenCalled();
  });
});

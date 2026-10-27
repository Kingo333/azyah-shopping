import { describe, expect, it, vi } from 'vitest';
import { assetUrlForStorage, withDisplayUrls } from './aiAssetUrls';
import type { AiAsset } from './useAiAssets';

const BASE = 'https://klwolsopucgswhtdlsps.supabase.co/storage/v1/object';
const USER = '22222222-2222-4222-8222-222222222222';

function asset(id: string, asset_url: string): AiAsset {
  return { id, user_id: USER, job_id: null, asset_url, asset_type: 'tryon_result', title: null, created_at: '2026-10-27T00:00:00Z' };
}

describe('assetUrlForStorage', () => {
  it('saves the permanent address instead of a temporary link', () => {
    expect(assetUrlForStorage(`${BASE}/sign/ai-tryon-results/${USER}/1.png?token=abc`))
      .toBe(`${BASE}/public/ai-tryon-results/${USER}/1.png`);
  });

  it('keeps other addresses as they are', () => {
    expect(assetUrlForStorage('https://cdn.example/x.png')).toBe('https://cdn.example/x.png');
  });
});

describe('withDisplayUrls', () => {
  it('shows each saved result through its temporary link', async () => {
    const saved = `${BASE}/public/ai-tryon-results/${USER}/1.png`;
    const sign = vi.fn(async (urls: string[]) => Object.fromEntries(urls.map((u) => [u, `${u}?token=t`])));
    const out = await withDisplayUrls([asset('a', saved)], sign);
    expect(sign).toHaveBeenCalledWith([saved]);
    expect(out[0].asset_url).toBe(`${saved}?token=t`);
    expect(out[0].id).toBe('a');
  });

  it('keeps rows whose address could not be signed', async () => {
    const outside = 'https://cdn.example/x.png';
    const out = await withDisplayUrls([asset('b', outside)], async () => ({}));
    expect(out[0].asset_url).toBe(outside);
  });

  it('keeps the rows when signing throws', async () => {
    const saved = `${BASE}/public/ai-tryon-results/${USER}/1.png`;
    const out = await withDisplayUrls([asset('c', saved)], async () => { throw new Error('offline'); });
    expect(out[0].asset_url).toBe(saved);
  });
});

import { describe, expect, it } from 'vitest';
import { stableStorageUrl } from './media';

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

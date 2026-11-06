// Benchmark switch (review R3): `?livecam_legacy=1` in the URL, or localStorage
// "azyah.livecam.legacy" = "1", turns off the Gemini-details instruction and the
// garment photo clean-up, so a before/after test can run in one session.

export function isLiveCamLegacy(
  search: string | undefined = typeof window !== 'undefined' ? window.location.search : undefined,
  storage: Pick<Storage, 'getItem'> | undefined = typeof window !== 'undefined' ? window.localStorage : undefined,
): boolean {
  try {
    if (search && new URLSearchParams(search).get('livecam_legacy') === '1') return true;
    return storage?.getItem('azyah.livecam.legacy') === '1';
  } catch {
    return false;
  }
}

// Buffered playback switch (F1b): `?livecam_playback=1|0` in the URL, or localStorage
// "azyah.livecam.playback" = "1" | "0". null = no override (the worker's ready hint
// playback_buffer decides, default off). See liveCamPlayback.resolvePlaybackMode().
export function liveCamPlaybackOverride(
  search: string | undefined = typeof window !== 'undefined' ? window.location.search : undefined,
  storage: Pick<Storage, 'getItem'> | undefined = typeof window !== 'undefined' ? window.localStorage : undefined,
): 'on' | 'off' | null {
  const read = (v: string | null | undefined): 'on' | 'off' | null => (v === '1' ? 'on' : v === '0' ? 'off' : null);
  try {
    if (search) {
      const fromUrl = read(new URLSearchParams(search).get('livecam_playback'));
      if (fromUrl) return fromUrl;
    }
    return read(storage?.getItem('azyah.livecam.playback'));
  } catch {
    return null;
  }
}

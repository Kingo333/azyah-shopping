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

// Garment text switches (owner, 7 Nov 2026), off by default. Each reads the URL first, then
// localStorage, then the build-time env var, so the owner can test on one device without a
// redeploy. A value given in the URL is remembered on the device (localStorage), so it
// survives in-app navigation; set it back with =0 / =full:
//   clean details:   ?livecam_clean=1|0,  localStorage "azyah.livecam.clean" = "1"|"0",
//                    VITE_LIVE_CAM_CLEAN_DETAILS = "1"|"true"
//   FluxRT prompt:   ?livecam_fluxrt_prompt=compact|full, localStorage "azyah.livecam.fluxrt_prompt",
//                    VITE_LIVE_CAM_FLUXRT_PROMPT = "compact"|"full"
type Env = Record<string, string | boolean | undefined> | undefined;
const viteEnv = (): Env => {
  try { return (import.meta as unknown as { env?: Env }).env; } catch { return undefined; }
};

type SwitchStorage = Pick<Storage, 'getItem'> & Partial<Pick<Storage, 'setItem'>>;

function readSwitch(
  urlKey: string, storageKey: string, envValue: unknown,
  search: string | undefined, storage: SwitchStorage | undefined,
): string | null {
  try {
    const fromUrl = search ? new URLSearchParams(search).get(urlKey) : null;
    if (fromUrl) {
      const v = fromUrl.trim().toLowerCase();
      try { storage?.setItem?.(storageKey, v); } catch { /* private mode */ }
      return v;
    }
    const fromStorage = storage?.getItem(storageKey);
    if (fromStorage) return fromStorage.trim().toLowerCase();
  } catch { /* private mode */ }
  return typeof envValue === 'string' && envValue.trim() ? envValue.trim().toLowerCase() : null;
}

export function liveCamCleanDetails(
  search: string | undefined = typeof window !== 'undefined' ? window.location.search : undefined,
  storage: SwitchStorage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined,
  env: Env = viteEnv(),
): boolean {
  const v = readSwitch('livecam_clean', 'azyah.livecam.clean', env?.VITE_LIVE_CAM_CLEAN_DETAILS, search, storage);
  return v === '1' || v === 'true' || v === 'on';
}

export function liveCamFluxrtPrompt(
  search: string | undefined = typeof window !== 'undefined' ? window.location.search : undefined,
  storage: SwitchStorage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined,
  env: Env = viteEnv(),
): 'full' | 'compact' {
  const v = readSwitch('livecam_fluxrt_prompt', 'azyah.livecam.fluxrt_prompt', env?.VITE_LIVE_CAM_FLUXRT_PROMPT, search, storage);
  return v === 'compact' ? 'compact' : 'full';
}

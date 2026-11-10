import { parseSendQueueFrames } from './liveCamSendQueue';

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

// Garment text switches (owner, 7 Nov 2026): ON by default since the owner turned them on
// the same day; each can still be switched off. Each reads the URL first, then
// localStorage, then the build-time env var, so the owner can test on one device without a
// redeploy. A value given in the URL is remembered on the device (localStorage), so it
// survives in-app navigation; set it back with =0 / =full:
//   clean details:   ?livecam_clean=0|1,  localStorage "azyah.livecam.clean" = "0"|"1",
//                    VITE_LIVE_CAM_CLEAN_DETAILS = "0"|"false" to turn off (default on)
//   FluxRT prompt:   ?livecam_fluxrt_prompt=full|compact, localStorage "azyah.livecam.fluxrt_prompt",
//                    VITE_LIVE_CAM_FLUXRT_PROMPT = "full" to go back (default compact)
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
  return !(v === '0' || v === 'false' || v === 'off');
}

export function liveCamFluxrtPrompt(
  search: string | undefined = typeof window !== 'undefined' ? window.location.search : undefined,
  storage: SwitchStorage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined,
  env: Env = viteEnv(),
): 'full' | 'compact' {
  const v = readSwitch('livecam_fluxrt_prompt', 'azyah.livecam.fluxrt_prompt', env?.VITE_LIVE_CAM_FLUXRT_PROMPT, search, storage);
  return v === 'full' ? 'full' : 'compact';
}

// Diagnostics readout on the Live stage (owner phone tests): ?livecam_debug=1 (remembered on
// the device; =0 hides it). Shows the upload rate, the phone's encode time, upload stalls,
// the download rate and the round trip, so one test tells phone, network and GPU apart.
// Upload queue for JoyAI (liveCamSendQueue.ts): ?livecam_sendq=<frames> (0-30, remembered on
// the device). 0 = the old rule (skip only once 2 MB is waiting); "default" (or anything that
// is not a number) = the default, 2 frames. FluxRT always keeps the old rule.
export function liveCamSendQueueOverride(
  search: string | undefined = typeof window !== 'undefined' ? window.location.search : undefined,
  storage: SwitchStorage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined,
): number | null {
  return parseSendQueueFrames(readSwitch('livecam_sendq', 'azyah.livecam.sendq', undefined, search, storage));
}

// Playback for JoyAI (liveCamPlayout.ts): ?livecam_playout=capture|buffer (remembered on the
// device). capture (default) = each frame at its capture time + a measured delay; buffer = the
// earlier fixed 24 fps buffer (8 frames, up to 16). FluxRT always uses the buffer.
export function liveCamPlayoutMode(
  search: string | undefined = typeof window !== 'undefined' ? window.location.search : undefined,
  storage: SwitchStorage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined,
): 'capture' | 'buffer' {
  return readSwitch('livecam_playout', 'azyah.livecam.playout', undefined, search, storage) === 'buffer' ? 'buffer' : 'capture';
}

export function liveCamDebug(
  search: string | undefined = typeof window !== 'undefined' ? window.location.search : undefined,
  storage: SwitchStorage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined,
): boolean {
  return readSwitch('livecam_debug', 'azyah.livecam.debug', undefined, search, storage) === '1';
}

// Camera size for Live Cam: ?livecam_cam=360|480|540|720 (the short side, remembered on the
// device). The model only needs 288x512, so 540 (960x540) is the default: a smaller camera
// picture is cheaper for weak devices (smart screens, old phones) to decode, crop and encode.
// 720 = the earlier 1280x720.
export const LIVE_CAM_CAMERA_HEIGHTS = [360, 480, 540, 720] as const;
export const LIVE_CAM_CAMERA_DEFAULT = 540;

export function parseLiveCamCameraHeight(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value.trim());
  return (LIVE_CAM_CAMERA_HEIGHTS as readonly number[]).includes(n) ? n : null;
}

/** Camera width and height to ask for (16:9, landscape numbers). */
export function liveCamCameraSize(
  search: string | undefined = typeof window !== 'undefined' ? window.location.search : undefined,
  storage: SwitchStorage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined,
): { width: number; height: number } {
  const h = parseLiveCamCameraHeight(readSwitch('livecam_cam', 'azyah.livecam.cam', undefined, search, storage)) ?? LIVE_CAM_CAMERA_DEFAULT;
  return { width: Math.round((h * 16) / 9), height: h };
}

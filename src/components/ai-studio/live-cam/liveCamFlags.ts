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

// How camera and result frames travel (WebRTC work, 12 Nov 2026): ?livecam_transport=webrtc|ws
// (remembered on the device), else VITE_LIVE_CAM_TRANSPORT, else ws. ws = JPEG over the WebSocket, as
// before. webrtc = when the worker offers it (ready.webrtc) and our TURN function answers, frames move
// to a WebRTC connection; any failure falls back to ws within seconds.
export type LiveCamTransport = 'ws' | 'webrtc';

export function liveCamTransport(
  search: string | undefined = typeof window !== 'undefined' ? window.location.search : undefined,
  storage: SwitchStorage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined,
  env: Env = viteEnv(),
): LiveCamTransport {
  return readSwitch('livecam_transport', 'azyah.livecam.transport', env?.VITE_LIVE_CAM_TRANSPORT, search, storage) === 'webrtc' ? 'webrtc' : 'ws';
}

// Which GPU endpoint (WebRTC trials, 12 Nov 2026): ?livecam_endpoint=test|live (remembered on the
// device). test = the same session through the separate fluxrt-orchestrator-test Worker
// (workers/fluxrt-orchestrator/test-worker), which serves only the accounts it lists and points at the
// TEST RunPod endpoint; the live Worker and endpoint are untouched. Default: live.
export function liveCamEndpoint(
  search: string | undefined = typeof window !== 'undefined' ? window.location.search : undefined,
  storage: SwitchStorage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined,
): 'live' | 'test' {
  return readSwitch('livecam_endpoint', 'azyah.livecam.endpoint', undefined, search, storage) === 'test' ? 'test' : 'live';
}

/** The socket URL for the chosen endpoint: test swaps the Worker host fluxrt-orchestrator.* for fluxrt-orchestrator-test.*. */
export function withEndpointRoute(wsUrl: string, endpoint: 'live' | 'test'): string {
  if (endpoint !== 'test') return wsUrl;
  return wsUrl.replace(/^(wss?:\/\/)fluxrt-orchestrator\./, '$1fluxrt-orchestrator-test.');
}

export function liveCamDebug(
  search: string | undefined = typeof window !== 'undefined' ? window.location.search : undefined,
  storage: SwitchStorage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined,
): boolean {
  return readSwitch('livecam_debug', 'azyah.livecam.debug', undefined, search, storage) === '1';
}

// Camera size for Live Cam. Default (Normal): unchanged, the camera is asked for 1280x720 as
// before. ?livecam_cam=540|720 (the short side, remembered on the device) overrides it; nothing
// smaller is allowed, so the 288x512 model input is never upscaled, even from a landscape camera
// (540 high gives a 304x540 crop).
export const LIVE_CAM_CAMERA_HEIGHTS = [540, 720] as const;

export function parseLiveCamCameraHeight(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value.trim());
  return (LIVE_CAM_CAMERA_HEIGHTS as readonly number[]).includes(n) ? n : null;
}

// Lite mode (the on-screen "Lite" button, or ?livecam_lite=1; remembered on the device): only
// for a slow device or connection. Camera 960x540 and at most 8 frames a second are sent, so
// there is less to decode, encode and upload; the model still gets the same 288x512 frame.
export const LIVE_CAM_LITE_HEIGHT = 540;
export const LIVE_CAM_LITE_FPS = 8;
const LITE_KEY = 'azyah.livecam.lite';

// Owner, 12 Nov 2026: Normal is the default again; Lite stays the second option (the button or
// ?livecam_lite=1). A device where someone tapped the button keeps its own choice either way.
export const LIVE_CAM_LITE_DEFAULT = false;

export function liveCamLite(
  search: string | undefined = typeof window !== 'undefined' ? window.location.search : undefined,
  storage: SwitchStorage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined,
): boolean {
  const v = readSwitch('livecam_lite', LITE_KEY, undefined, search, storage);
  return v === null ? LIVE_CAM_LITE_DEFAULT : v === '1';
}

export function setLiveCamLite(
  on: boolean,
  storage: SwitchStorage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined,
): void {
  try { storage?.setItem?.(LITE_KEY, on ? '1' : '0'); } catch { /* private mode */ }
}

/**
 * Camera width and height to ask for (16:9, landscape numbers), or null for the default
 * (Normal: today's request, unchanged). ?livecam_cam= beats Lite.
 */
export function liveCamCameraSize(
  search: string | undefined = typeof window !== 'undefined' ? window.location.search : undefined,
  storage: SwitchStorage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined,
  lite: boolean = liveCamLite(search, storage),
): { width: number; height: number } | null {
  const h = parseLiveCamCameraHeight(readSwitch('livecam_cam', 'azyah.livecam.cam', undefined, search, storage))
    ?? (lite ? LIVE_CAM_LITE_HEIGHT : null);
  return h === null ? null : { width: Math.round((h * 16) / 9), height: h };
}

// Kiosk speed work (2026-11-12). Both remembered on the device when given in the URL.
// JPEG encoder: ?livecam_encoder=worker|main. Default worker (crop + resize with createImageBitmap,
// JPEG in a Web Worker) where the browser supports it; main = today's main-thread canvas path.
export function liveCamEncoderMode(
  search: string | undefined = typeof window !== 'undefined' ? window.location.search : undefined,
  storage: SwitchStorage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined,
): 'worker' | 'main' {
  return readSwitch('livecam_encoder', 'azyah.livecam.encoder', undefined, search, storage) === 'main' ? 'main' : 'worker';
}

// New camera frames only: ?livecam_newframes=1|0. Default on: a send tick is skipped when the
// camera has not delivered a new frame since the last one sent, instead of re-encoding and
// re-uploading the same picture (the kiosk repeated each frame ~12x). The worker keeps drawing
// from its latest frame either way. Needs requestVideoFrameCallback; without it, or if the camera
// clock stalls, every tick sends as before.
export function liveCamNewFramesOnly(
  search: string | undefined = typeof window !== 'undefined' ? window.location.search : undefined,
  storage: SwitchStorage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined,
): boolean {
  return readSwitch('livecam_newframes', 'azyah.livecam.newframes', undefined, search, storage) !== '0';
}

// The camera is asked for at most this many pixels on its long side (720p class), so a 4K kiosk
// camera never hands the page 4K frames to crop and scale. The model input is 288x512 either way.
export const LIVE_CAM_CAMERA_MAX_LONG_SIDE = 1280;

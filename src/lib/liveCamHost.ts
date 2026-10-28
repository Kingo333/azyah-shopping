// Live Cam can keep starting (and stay on) while people browse elsewhere in
// the app (owner decision 2026-10-28). These decide when the app-level host
// keeps it mounted and what the Try on tab shows.

import type { LiveCamStatus } from '@/components/ai-studio/live-cam/liveCamTypes';

export function isLiveActive(status: LiveCamStatus): boolean {
  return status === 'starting' || status === 'warming' || status === 'running';
}

/** Mounted while on the Live screen, or off it while it starts or runs. */
export function keepMounted(onScreen: boolean, status: LiveCamStatus): boolean {
  return onScreen || isLiveActive(status);
}

/** The dot on the Try on tab: amber while it turns on, green when it's ready. */
export function liveBadge(status: LiveCamStatus): 'loading' | 'ready' | null {
  if (status === 'running') return 'ready';
  if (status === 'starting' || status === 'warming') return 'loading';
  return null;
}

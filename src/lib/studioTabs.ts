// Try on modes. The still photo try-on is the main way in; Live Cam needs a
// GPU to start (about 30 s, up to a few minutes), so it's turned on from its
// own tab and stays shoppers-only (owner decision 2026-10-28).

export type StudioTab = 'live-cam' | 'picture' | 'video';

export function studioTabs(isShopper: boolean): StudioTab[] {
  return isShopper ? ['picture', 'video', 'live-cam'] : ['picture', 'video'];
}

export function defaultStudioTab(isShopper: boolean): StudioTab {
  return studioTabs(isShopper)[0];
}

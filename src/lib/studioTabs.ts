// Try on modes. Live Cam is the selling point, so in design v3 it comes first
// and opens by default for shoppers; Picture and Video follow (owner, 2026-10-28).
// Live Cam stays shoppers-only, as before.

export type StudioTab = 'live-cam' | 'picture' | 'video';

export function studioTabs(isShopper: boolean, liveFirst: boolean): StudioTab[] {
  if (!isShopper) return ['picture', 'video'];
  return liveFirst ? ['live-cam', 'picture', 'video'] : ['picture', 'video', 'live-cam'];
}

export function defaultStudioTab(isShopper: boolean, liveFirst: boolean): StudioTab {
  return studioTabs(isShopper, liveFirst)[0];
}

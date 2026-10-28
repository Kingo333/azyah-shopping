// Try on modes. The still photo try-on is the main way in; Live Cam needs a
// GPU to start (about 50 s), so it's turned on from its own tab and stays
// shoppers-only. Video try-on can be paused (features.video_tryon).

export type StudioTab = 'live-cam' | 'picture' | 'video';

export function studioTabs(isShopper: boolean, videoEnabled: boolean): StudioTab[] {
  const tabs: StudioTab[] = videoEnabled ? ['picture', 'video'] : ['picture'];
  return isShopper ? [...tabs, 'live-cam'] : tabs;
}

export function defaultStudioTab(isShopper: boolean, videoEnabled: boolean): StudioTab {
  return studioTabs(isShopper, videoEnabled)[0];
}

import { describe, expect, it } from 'vitest';
import { defaultStudioTab, studioTabs } from './studioTabs';

describe('studioTabs', () => {
  it('puts Live Cam first for shoppers when Live leads', () => {
    expect(studioTabs(true, true)).toEqual(['live-cam', 'picture', 'video']);
  });
  it("keeps today's order otherwise", () => {
    expect(studioTabs(true, false)).toEqual(['picture', 'video', 'live-cam']);
  });
  it('never shows Live Cam to non-shoppers', () => {
    expect(studioTabs(false, true)).toEqual(['picture', 'video']);
    expect(studioTabs(false, false)).toEqual(['picture', 'video']);
  });
});

describe('defaultStudioTab', () => {
  it('opens on Live Cam for shoppers when Live leads', () => {
    expect(defaultStudioTab(true, true)).toBe('live-cam');
  });
  it('opens on Picture otherwise', () => {
    expect(defaultStudioTab(true, false)).toBe('picture');
    expect(defaultStudioTab(false, true)).toBe('picture');
  });
});

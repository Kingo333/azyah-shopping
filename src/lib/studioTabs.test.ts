import { describe, expect, it } from 'vitest';
import { defaultStudioTab, studioTabs } from './studioTabs';

describe('studioTabs', () => {
  it('starts with the still photo try-on, Live Cam last, for shoppers', () => {
    expect(studioTabs(true, true)).toEqual(['picture', 'video', 'live-cam']);
  });
  it('drops Video while video try-on is paused', () => {
    expect(studioTabs(true, false)).toEqual(['picture', 'live-cam']);
    expect(studioTabs(false, false)).toEqual(['picture']);
  });
  it('never shows Live Cam to non-shoppers', () => {
    expect(studioTabs(false, true)).toEqual(['picture', 'video']);
  });
});

describe('defaultStudioTab', () => {
  it('opens on Picture for everyone', () => {
    expect(defaultStudioTab(true, false)).toBe('picture');
    expect(defaultStudioTab(false, true)).toBe('picture');
  });
});

import { describe, expect, it } from 'vitest';
import { defaultStudioTab, studioTabs } from './studioTabs';

describe('studioTabs', () => {
  it('starts with the still photo try-on, Live Cam last, for shoppers', () => {
    expect(studioTabs(true)).toEqual(['picture', 'video', 'live-cam']);
  });
  it('never shows Live Cam to non-shoppers', () => {
    expect(studioTabs(false)).toEqual(['picture', 'video']);
  });
});

describe('defaultStudioTab', () => {
  it('opens on Picture for everyone', () => {
    expect(defaultStudioTab(true)).toBe('picture');
    expect(defaultStudioTab(false)).toBe('picture');
  });
});

import { describe, expect, it } from 'vitest';
import { resolveExploreTab, visibleExploreTabs } from './exploreTabs';

describe('visibleExploreTabs', () => {
  it('keeps today\'s Globe tabs without Fit when Your Fit is off', () => {
    expect(visibleExploreTabs(false)).toEqual(['brands', 'following', 'shoppers', 'deals']);
  });
  it('shows all five when Your Fit is on', () => {
    expect(visibleExploreTabs(true)).toEqual(['brands', 'following', 'shoppers', 'your-fit', 'deals']);
  });
});

describe('resolveExploreTab', () => {
  it('opens the tab from the link', () => {
    expect(resolveExploreTab('shoppers', false)).toBe('shoppers');
    expect(resolveExploreTab('deals', false)).toBe('deals');
  });
  it('opens Brands for an old Your Fit link when it is hidden', () => {
    expect(resolveExploreTab('your-fit', false)).toBe('brands');
  });
  it('keeps Your Fit when it is on', () => {
    expect(resolveExploreTab('your-fit', true)).toBe('your-fit');
  });
  it('opens Brands for no or unknown tab', () => {
    expect(resolveExploreTab(null, false)).toBe('brands');
    expect(resolveExploreTab('nope', false)).toBe('brands');
  });
});

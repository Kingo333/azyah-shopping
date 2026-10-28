import { describe, expect, it } from 'vitest';
import { resolveExploreTab, visibleExploreTabs } from './exploreTabs';

describe('visibleExploreTabs', () => {
  it('hides Fit and Deals by default', () => {
    expect(visibleExploreTabs(false, false)).toEqual(['brands', 'following', 'shoppers']);
  });
  it('shows Deals when it is on', () => {
    expect(visibleExploreTabs(false, true)).toEqual(['brands', 'following', 'shoppers', 'deals']);
  });
  it('shows all five when both are on', () => {
    expect(visibleExploreTabs(true, true)).toEqual(['brands', 'following', 'shoppers', 'your-fit', 'deals']);
  });
});

describe('resolveExploreTab', () => {
  it('opens the tab from the link', () => {
    expect(resolveExploreTab('shoppers', false, false)).toBe('shoppers');
    expect(resolveExploreTab('deals', false, true)).toBe('deals');
  });
  it('opens Brands for an old Deals link when Deals is hidden', () => {
    expect(resolveExploreTab('deals', false, false)).toBe('brands');
  });
  it('opens Brands for an old Your Fit link when it is hidden', () => {
    expect(resolveExploreTab('your-fit', false, false)).toBe('brands');
  });
  it('keeps Your Fit when it is on', () => {
    expect(resolveExploreTab('your-fit', true, false)).toBe('your-fit');
  });
  it('opens Brands for no or unknown tab', () => {
    expect(resolveExploreTab(null, false, false)).toBe('brands');
    expect(resolveExploreTab('nope', false, false)).toBe('brands');
  });
});

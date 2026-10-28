// Globe (Explore) tabs. The Globe works exactly as before; the Your Fit and
// Deals tabs are hidden while their features are off.

export type ExploreTab = 'brands' | 'following' | 'shoppers' | 'your-fit' | 'deals';

const ALL_TABS: ExploreTab[] = ['brands', 'following', 'shoppers', 'your-fit', 'deals'];

export function visibleExploreTabs(yourFitEnabled: boolean, dealsEnabled: boolean): ExploreTab[] {
  return ALL_TABS.filter((t) => (t !== 'your-fit' || yourFitEnabled) && (t !== 'deals' || dealsEnabled));
}

/** The tab to open for a ?tab= value; unknown or hidden tabs open Brands. */
export function resolveExploreTab(param: string | null, yourFitEnabled: boolean, dealsEnabled: boolean): ExploreTab {
  const visible = visibleExploreTabs(yourFitEnabled, dealsEnabled);
  return param && (visible as string[]).includes(param) ? (param as ExploreTab) : 'brands';
}

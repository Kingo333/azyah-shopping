// Globe (Explore) tabs. The Globe works exactly as before; only the Your Fit
// tab is hidden when the your_fit feature is off.

export type ExploreTab = 'brands' | 'following' | 'shoppers' | 'your-fit' | 'deals';

const ALL_TABS: ExploreTab[] = ['brands', 'following', 'shoppers', 'your-fit', 'deals'];

export function visibleExploreTabs(yourFitEnabled: boolean): ExploreTab[] {
  return yourFitEnabled ? ALL_TABS : ALL_TABS.filter((t) => t !== 'your-fit');
}

/** The tab to open for a ?tab= value; unknown or hidden tabs open Brands. */
export function resolveExploreTab(param: string | null, yourFitEnabled: boolean): ExploreTab {
  const visible = visibleExploreTabs(yourFitEnabled);
  return param && (visible as string[]).includes(param) ? (param as ExploreTab) : 'brands';
}

// Navigation v2 (5-tab shopper bar: Feed, Explore, Try on, Community, Profile). Off for everyone by default; a device
// opts in with ?nav_v2=1 (remembered) and opts out with ?nav_v2=0.

export const NAV_V2_STORAGE_KEY = 'azyah:nav_v2';

type FlagStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function resolveNavV2(search: string, storage: FlagStorage | null, defaultOn: boolean): boolean {
  const param = new URLSearchParams(search).get('nav_v2');
  if (param === '1' || param === '0') {
    try {
      if (param === '1') storage?.setItem(NAV_V2_STORAGE_KEY, '1');
      else storage?.removeItem(NAV_V2_STORAGE_KEY);
    } catch {
      // Storage blocked (private mode): the choice still applies to this page view.
    }
    return param === '1';
  }
  try {
    const stored = storage?.getItem(NAV_V2_STORAGE_KEY);
    if (stored === '1') return true;
  } catch {
    // ignore
  }
  return defaultOn;
}

export type ShopperTabId = 'feed' | 'explore' | 'try-on' | 'community' | 'profile';

export const SHOPPER_TABS: { id: ShopperTabId; label: string; path: string }[] = [
  { id: 'feed', label: 'Feed', path: '/swipe' },
  { id: 'explore', label: 'Explore', path: '/explore' },
  { id: 'try-on', label: 'Try on', path: '/try-on' },
  { id: 'community', label: 'Community', path: '/community' },
  { id: 'profile', label: 'Profile', path: '/profile' },
];

const startsWith = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(prefix + '/');

const PROFILE_PREFIXES = ['/settings', '/favorites', '/rewards', '/dashboard', '/events', '/cart', '/dress-me'];

export function activeShopperTab(pathname: string): ShopperTabId | null {
  if (['/swipe', '/discover'].some((p) => startsWith(pathname, p))) return 'feed';
  if (['/explore', '/brand', '/featured-brands', '/trending-styles'].some((p) => startsWith(pathname, p))) return 'explore';
  if (startsWith(pathname, '/try-on')) return 'try-on';
  if (startsWith(pathname, '/community')) return 'community';
  if (pathname === '/profile' || PROFILE_PREFIXES.some((p) => startsWith(pathname, p))) return 'profile';
  return null;
}

const COMMUNITY_REDIRECTS = ['/feed', '/forum', '/fashion-feed', '/dress-me/community'];

/** Where an old URL goes when nav v2 is on, or null to leave it alone. */
export function navV2RedirectFor(pathname: string, search: string): string | null {
  if (pathname === '/discover') return '/swipe' + search;
  if (COMMUNITY_REDIRECTS.includes(pathname)) return '/community';
  return null;
}

const NO_BAR_PREFIXES = [
  '/onboarding', '/onboarding-calibration', '/auth', '/reset-password', '/reset-password-request', '/brand-portal', '/retailer-portal',
  '/ar', '/dress-me', '/share', '/terms', '/privacy', '/cookies', '/landing', '/kiosk', '/oauth',
  '/extension-auth', '/admin', '/debug',
];

/** Whether the shopper bar belongs on this screen (hidden on full-screen tools and partner screens). */
export function showShopperBar(pathname: string): boolean {
  if (pathname === '/') return false;
  return !NO_BAR_PREFIXES.some((p) => startsWith(pathname, p));
}

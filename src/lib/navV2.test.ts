import { describe, expect, it } from 'vitest';
import { SHOPPER_TABS, activeShopperTab, navV2RedirectFor, resolveNavV2, showShopperBar } from './navV2';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => { data[k] = v; },
    removeItem: (k: string) => { delete data[k]; },
  };
}

describe('resolveNavV2', () => {
  it('is off by default', () => {
    expect(resolveNavV2('', memoryStorage(), false)).toBe(false);
  });
  it('turns on with ?nav_v2=1 and remembers it on this device', () => {
    const s = memoryStorage();
    expect(resolveNavV2('?nav_v2=1', s, false)).toBe(true);
    expect(s.data['azyah:nav_v2']).toBe('1');
    expect(resolveNavV2('', s, false)).toBe(true);
  });
  it('turns off with ?nav_v2=0 and forgets it', () => {
    const s = memoryStorage({ 'azyah:nav_v2': '1' });
    expect(resolveNavV2('?nav_v2=0', s, false)).toBe(false);
    expect(s.data['azyah:nav_v2']).toBeUndefined();
  });
  it('follows the default when nothing is stored', () => {
    expect(resolveNavV2('', memoryStorage(), true)).toBe(true);
  });
  it('falls back to the default when storage is blocked', () => {
    const broken = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    };
    expect(resolveNavV2('?nav_v2=1', broken, false)).toBe(true);
    expect(resolveNavV2('', broken, false)).toBe(false);
    expect(resolveNavV2('', null, false)).toBe(false);
  });
});

describe('SHOPPER_TABS', () => {
  it('has the four tabs in order', () => {
    expect(SHOPPER_TABS.map((t) => t.label)).toEqual(['Discover', 'Try on', 'Community', 'Profile']);
    expect(SHOPPER_TABS.map((t) => t.path)).toEqual(['/swipe', '/try-on', '/community', '/profile']);
  });
});

describe('activeShopperTab', () => {
  it('marks Discover for the feed and the Globe', () => {
    expect(activeShopperTab('/swipe')).toBe('discover');
    expect(activeShopperTab('/explore')).toBe('discover');
    expect(activeShopperTab('/discover')).toBe('discover');
  });
  it('marks the other tabs', () => {
    expect(activeShopperTab('/try-on')).toBe('try-on');
    expect(activeShopperTab('/community')).toBe('community');
    expect(activeShopperTab('/community/outfit/1')).toBe('community');
    expect(activeShopperTab('/profile')).toBe('profile');
    expect(activeShopperTab('/settings')).toBe('profile');
    expect(activeShopperTab('/favorites')).toBe('profile');
  });
  it('does not treat another person\'s profile as your Profile tab', () => {
    expect(activeShopperTab('/profile/abc')).toBeNull();
  });
});

describe('navV2RedirectFor', () => {
  it('sends old feeds to Community', () => {
    expect(navV2RedirectFor('/feed', '')).toBe('/community');
    expect(navV2RedirectFor('/forum', '')).toBe('/community');
    expect(navV2RedirectFor('/fashion-feed', '')).toBe('/community');
    expect(navV2RedirectFor('/dress-me/community', '')).toBe('/community');
  });
  it('sends /discover to the feed and keeps the query', () => {
    expect(navV2RedirectFor('/discover', '?q=dress')).toBe('/swipe?q=dress');
  });
  it('leaves everything else alone', () => {
    for (const p of ['/swipe', '/explore', '/share/outfit/x', '/auth/callback', '/ar/e/b', '/brand/acme', '/ugc', '/cart', '/profile/abc']) {
      expect(navV2RedirectFor(p, '')).toBeNull();
    }
  });
});

describe('showShopperBar', () => {
  it('shows on shopper screens', () => {
    for (const p of ['/swipe', '/explore', '/try-on', '/community', '/profile', '/favorites', '/events']) {
      expect(showShopperBar(p)).toBe(true);
    }
  });
  it('hides on full-screen tools, partner screens and public pages', () => {
    for (const p of ['/', '/landing', '/onboarding/signup', '/auth/callback', '/reset-password', '/brand-portal', '/retailer-portal/brands/1', '/ar/e/b', '/dress-me/canvas', '/share/item/x', '/terms', '/kiosk/1']) {
      expect(showShopperBar(p)).toBe(false);
    }
  });
});

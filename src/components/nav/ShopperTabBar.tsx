import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Globe, Shirt, ShoppingBag, User, Users, type LucideIcon } from 'lucide-react';
import { useDesignV3 } from '@/hooks/useDesignV3';
import { useAuth } from '@/contexts/AuthContext';
import { isGuestMode } from '@/hooks/useGuestMode';
import { SHOPPER_TABS, activeShopperTab, showShopperBar, type ShopperTabId } from '@/lib/navV2';

const ICONS: Record<ShopperTabId, LucideIcon> = {
  feed: ShoppingBag,
  explore: Globe,
  'try-on': Shirt,
  community: Users,
  profile: User,
};

/**
 * Navigation v2: five stable tabs, always visible (no auto-hide), labels
 * always shown, solid background for contrast. Shown when the nav_v2 flag or
 * design v3 is on for this device. In design v3 the bar is neutral (ink
 * active, ink-3 inactive), Try on sits in a round button, and on the dark
 * Explore screen the bar turns black.
 */
export const ShopperTabBar: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const v3 = useDesignV3();

  // Partners use their own portal navigation, as today.
  const role = user?.user_metadata?.role;
  if (role === 'brand' || role === 'retailer') return null;
  if (!user && !isGuestMode()) return null;
  if (!showShopperBar(pathname)) return null;

  const active = activeShopperTab(pathname);
  const dark = v3 && active === 'explore';

  const barClass = !v3
    ? 'border-border bg-background'
    : dark
      ? 'border-white/10 bg-black'
      : 'border-line bg-card';
  const itemClass = (isActive: boolean) => {
    if (!v3) return isActive ? 'text-[hsl(var(--azyah-maroon))]' : 'text-muted-foreground hover:text-foreground';
    if (dark) return isActive ? 'text-white' : 'text-white/50 hover:text-white';
    return isActive ? 'text-ink' : 'text-ink-3 hover:text-ink';
  };

  return (
    <nav
      aria-label="Main"
      className={`fixed bottom-0 left-0 right-0 z-50 border-t ${barClass}`}
      style={{ paddingBottom: 'var(--safe-bottom, 0px)' }}
    >
      <ul className="mx-auto flex h-16 max-w-2xl items-stretch justify-around px-2">
        {SHOPPER_TABS.map((tab) => {
          const Icon = ICONS[tab.id];
          const isActive = active === tab.id;
          const round = v3 && tab.id === 'try-on';
          return (
            <li key={tab.id} className="flex flex-1">
              <button
                type="button"
                onClick={() => navigate(tab.path)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 transition-colors ${itemClass(isActive)}`}
              >
                {round ? (
                  <span
                    className={`-mt-1 flex h-[34px] w-[34px] items-center justify-center rounded-full ${
                      dark ? 'bg-white text-black' : 'bg-ink text-white'
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                ) : (
                  <Icon className={v3 ? 'h-[22px] w-[22px]' : 'h-5 w-5'} aria-hidden />
                )}
                <span className={v3 ? 'text-[10px] font-medium' : 'text-[11px] font-medium'}>{tab.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

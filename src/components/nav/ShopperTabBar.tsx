import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Globe, Shirt, ShoppingBag, User, Users, type LucideIcon } from 'lucide-react';
import { useDesignV3 } from '@/hooks/useDesignV3';
import { useLiveCamHostStatus } from '@/components/live/LiveCamHost';
import { liveBadge } from '@/lib/liveCamHost';
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
  // Live try-on keeps starting / running while people browse; the Try on tab shows it.
  const live = useLiveCamHostStatus();
  const badge = liveBadge(live.status);
  const ring = badge === 'loading' ? Math.max(0.04, live.waitProgress ?? 0) : null;

  // Partners use their own portal navigation, as today.
  const role = user?.user_metadata?.role;
  if (role === 'brand' || role === 'retailer') return null;
  if (!user && !isGuestMode()) return null;
  if (!showShopperBar(pathname)) return null;

  const active = activeShopperTab(pathname);
  // Only the Globe itself is a dark screen; brand pages under Explore are light.
  const dark = v3 && (pathname === '/explore' || pathname.startsWith('/explore/'));

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
                    className={`relative -mt-1 flex h-[34px] w-[34px] items-center justify-center rounded-full ${
                      dark ? 'bg-white text-black' : 'bg-ink text-white'
                    }`}
                  >
                    {ring !== null && (
                      // Progress ring while the mirror gets ready: a faint full track with the
                      // amber progress on top, starting at 12 o'clock. It replaces the amber dot.
                      <span
                        role="progressbar"
                        aria-label="Live try-on is getting ready"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(ring * 100)}
                        className="absolute -inset-[4px] rounded-full"
                        style={{
                          background: `conic-gradient(#fbbf24 ${Math.round(ring * 360)}deg, ${dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.10)'} 0deg)`,
                          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px))',
                          mask: 'radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px))',
                        }}
                      />
                    )}
                    <Icon className="h-[18px] w-[18px]" aria-hidden />
                    {badge && ring === null && (
                      <span
                        aria-label={badge === 'ready' ? 'Live try-on is ready' : 'Live try-on is turning on'}
                        className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ${dark ? 'ring-black' : 'ring-card'} ${
                          badge === 'ready' ? 'bg-emerald-400' : 'animate-pulse bg-amber-400'
                        }`}
                      />
                    )}
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

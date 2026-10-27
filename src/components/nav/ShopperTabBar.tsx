import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Camera, Compass, User, Users, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isGuestMode } from '@/hooks/useGuestMode';
import { SHOPPER_TABS, activeShopperTab, showShopperBar, type ShopperTabId } from '@/lib/navV2';

const ICONS: Record<ShopperTabId, LucideIcon> = {
  discover: Compass,
  'try-on': Camera,
  community: Users,
  profile: User,
};

/**
 * Navigation v2: four stable tabs, always visible (no auto-hide), labels
 * always shown, solid background for contrast. Shown only when the nav_v2
 * flag is on for this device.
 */
export const ShopperTabBar: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();

  // Partners use their own portal navigation, as today.
  const role = user?.user_metadata?.role;
  if (role === 'brand' || role === 'retailer') return null;
  if (!user && !isGuestMode()) return null;
  if (!showShopperBar(pathname)) return null;

  const active = activeShopperTab(pathname);

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background"
      style={{ paddingBottom: 'var(--safe-bottom, 0px)' }}
    >
      <ul className="mx-auto flex h-16 max-w-2xl items-stretch justify-around px-2">
        {SHOPPER_TABS.map((tab) => {
          const Icon = ICONS[tab.id];
          const isActive = active === tab.id;
          return (
            <li key={tab.id} className="flex flex-1">
              <button
                type="button"
                onClick={() => navigate(tab.path)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 transition-colors ${
                  isActive ? 'text-[hsl(var(--azyah-maroon))]' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span className="text-[11px] font-medium">{tab.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

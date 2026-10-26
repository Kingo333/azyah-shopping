import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useNavV2 } from '@/hooks/useNavV2';
import { navV2RedirectFor } from '@/lib/navV2';
import { ShopperTabBar } from './ShopperTabBar';

/** Old shopper URLs (e.g. /feed) redirect only when navigation v2 is on. */
export const NavV2Gate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navV2 = useNavV2();
  const { pathname, search } = useLocation();
  const target = navV2 ? navV2RedirectFor(pathname, search) : null;
  return target ? <Navigate to={target} replace /> : <>{children}</>;
};

/** Today's bar for everyone; the 4-tab bar for devices that opted in. */
export const AppNavigation: React.FC = () => (useNavV2() ? <ShopperTabBar /> : <BottomNavigation />);

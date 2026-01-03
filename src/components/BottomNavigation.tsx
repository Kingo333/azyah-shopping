import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Compass, ShoppingBag, Shirt, Users, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { isGuestMode } from '@/hooks/useGuestMode';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  isCenter?: boolean;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home, path: '/dashboard' },
  { id: 'explore', label: 'Explore', icon: Compass, path: '/explore' },
  { id: 'discover', label: 'Discover', icon: ShoppingBag, path: '/swipe', isCenter: true },
  { id: 'dressme', label: 'Dress Me', icon: Shirt, path: '/dress-me' },
  { id: 'ugc', label: 'UGC', icon: Users, path: '/ugc' },
];

// Routes where auto-hide behavior applies (minimized after 2 seconds)
const AUTO_HIDE_ROUTES = ['/swipe', '/likes', '/explore', '/p/', '/settings', '/community', '/trending', '/influencers', '/brands', '/wishlist', '/forum', '/affiliate', '/events'];

// Routes where bottom nav should NOT appear
const EXCLUDED_ROUTES = [
  '/',
  '/landing',
  '/onboarding',
  '/reset-password',
  '/terms',
  '/privacy',
  '/brand-portal',
  '/retailer-portal',
  '/dashboard/upgrade',
];

export const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isMinimized, setIsMinimized] = useState(false);

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    if (path === '/swipe') {
      return AUTO_HIDE_ROUTES.some(route => location.pathname.startsWith(route));
    }
    return location.pathname.startsWith(path);
  };

  const isAutoHidePage = AUTO_HIDE_ROUTES.some(route => location.pathname.startsWith(route));
  const isDressMePage = location.pathname.startsWith('/dress-me');
  const isExcludedPage = EXCLUDED_ROUTES.some(route => 
    route === location.pathname || location.pathname.startsWith(route + '/')
  );

  // Auto-hide logic for auto-hide pages
  useEffect(() => {
    if (isAutoHidePage) {
      setIsMinimized(false);
      
      const timer = setTimeout(() => {
        setIsMinimized(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    } else {
      // Always show on non-auto-hide pages (like dashboard)
      setIsMinimized(false);
    }
  }, [location.pathname, isAutoHidePage]);

  const handleExpandNav = useCallback(() => {
    setIsMinimized(false);
    // Re-trigger auto-hide after expansion
    setTimeout(() => {
      if (isAutoHidePage) {
        setIsMinimized(true);
      }
    }, 3000);
  }, [isAutoHidePage]);

  // Don't render if not logged in (and not guest), on Dress Me pages, or excluded pages
  const isGuest = isGuestMode();
  if ((!user && !isGuest) || isDressMePage || isExcludedPage) {
    return null;
  }

  return (
    <>
      {/* Minimized arrow handle when hidden - right side */}
      <AnimatePresence>
        {isAutoHidePage && isMinimized && (
          <motion.button
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={handleExpandNav}
            className="fixed right-4 z-50 bg-background/95 backdrop-blur-sm rounded-full p-3 shadow-lg border border-border"
            style={{ bottom: 'calc(var(--safe-bottom, 0px) + 24px)' }}
          >
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Main Navigation - always visible on non-auto-hide pages, or when not minimized */}
      <AnimatePresence>
        {(!isAutoHidePage || !isMinimized) && (
          <motion.div
            initial={isAutoHidePage ? { y: 100 } : false}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background"
            style={{ paddingBottom: 'var(--safe-bottom, 0px)' }}
          >
            {/* Background bar */}
            <div className="relative border-t border-border">
              <div className="flex items-end justify-around h-16 px-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);

                  if (item.isCenter) {
                    // Center "Discover" button - pop-out style
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.path)}
                        className="relative flex flex-col items-center justify-end h-full pb-2"
                      >
                        {/* Pop-out circular button - positioned above */}
                        <div 
                          className={`
                            absolute left-1/2 -translate-x-1/2 -top-6 sm:-top-5
                            w-[52px] h-[52px] sm:w-14 sm:h-14
                            rounded-full flex items-center justify-center
                            shadow-lg transition-all duration-200
                            ${active 
                              ? 'bg-[hsl(var(--azyah-maroon))] shadow-[0_4px_20px_hsl(var(--azyah-maroon)/0.4)]' 
                              : 'bg-[hsl(var(--azyah-maroon))] shadow-[0_4px_16px_hsl(var(--azyah-maroon)/0.3)]'
                            }
                          `}
                          style={{
                            minWidth: '52px',
                            minHeight: '52px',
                            aspectRatio: '1 / 1',
                          }}
                        >
                          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <span className={`text-[10px] font-medium ${active ? 'text-[hsl(var(--azyah-maroon))]' : 'text-muted-foreground'}`}>
                          {item.label}
                        </span>
                      </button>
                    );
                  }

                  // Regular nav items
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      className={`flex flex-col items-center justify-center gap-1 py-2 px-2 transition-colors ${
                        active 
                          ? 'text-[hsl(var(--azyah-maroon))]' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${active ? 'text-[hsl(var(--azyah-maroon))]' : ''}`} />
                      <span className={`text-[9px] font-medium ${active ? 'text-[hsl(var(--azyah-maroon))]' : ''}`}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

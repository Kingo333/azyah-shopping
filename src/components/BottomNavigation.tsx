import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, ShoppingBag, Sparkles, ChevronUp } from 'lucide-react';
import { HangerIcon } from '@/components/icons/HangerIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { isGuestMode, setGuestMode } from '@/hooks/useGuestMode';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  isCenter?: boolean;
  requiresAuth?: boolean; // Routes that require auth (show prompt for guests)
}

// Tech-forward navigation: Insights, Community, Feed (center), Wardrobe, Collabs
const navItems: NavItem[] = [
  { id: 'insights', label: 'Insights', icon: Home, path: '/dashboard' },
  { id: 'community', label: 'Explore', icon: Users, path: '/explore' },
  { id: 'feed', label: 'Feed', icon: ShoppingBag, path: '/swipe', isCenter: true },
  { id: 'wardrobe', label: 'Wardrobe', icon: HangerIcon, path: '/dress-me', requiresAuth: true },
  { id: 'ugc', label: 'Collabs', icon: Sparkles, path: '/ugc', requiresAuth: true },
];

// Routes where auto-hide behavior applies (minimized after 2 seconds)
const AUTO_HIDE_ROUTES = ['/swipe', '/likes', '/explore', '/p/', '/settings', '/community', '/trending', '/influencers', '/brands', '/wishlist', '/forum', '/affiliate', '/events', '/', '/landing', '/onboarding/intro'];

// Routes where bottom nav should NOT appear (removed '/' and '/landing' to allow guest preview)
const EXCLUDED_ROUTES = [
  '/onboarding/signup',
  '/onboarding/calibration',
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
  const { toast } = useToast();
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
  const isLandingPage = location.pathname === '/' || location.pathname === '/landing' || location.pathname === '/onboarding/intro';

  // Handle navigation with auto guest mode activation
  const handleNavClick = useCallback((item: NavItem) => {
    // If route requires auth and user is not logged in, show prompt
    if (item.requiresAuth && !user) {
      toast({
        title: "Create an account",
        description: `Sign up to access ${item.label}`,
        action: (
          <Button 
            size="sm" 
            onClick={() => navigate('/onboarding/signup')}
            className="bg-primary text-primary-foreground"
          >
            Sign Up
          </Button>
        ),
      });
      return;
    }

    // If user is not logged in and on landing/intro page, enable guest mode before navigating
    if (!user && isLandingPage && !isGuestMode()) {
      setGuestMode();
    }

    navigate(item.path);
  }, [user, isLandingPage, navigate, toast]);

  // Auto-hide logic for auto-hide pages
  useEffect(() => {
    if (isAutoHidePage) {
      setIsMinimized(false);
      window.dispatchEvent(new CustomEvent('bottomNavStateChange', { detail: { minimized: false } }));
      
      const timer = setTimeout(() => {
        setIsMinimized(true);
        window.dispatchEvent(new CustomEvent('bottomNavStateChange', { detail: { minimized: true } }));
      }, 2000);
      
      return () => clearTimeout(timer);
    } else {
      // Always show on non-auto-hide pages (like dashboard)
      setIsMinimized(false);
      window.dispatchEvent(new CustomEvent('bottomNavStateChange', { detail: { minimized: false } }));
    }
  }, [location.pathname, isAutoHidePage]);

  const handleExpandNav = useCallback(() => {
    setIsMinimized(false);
    window.dispatchEvent(new CustomEvent('bottomNavStateChange', { detail: { minimized: false } }));
    // Re-trigger auto-hide after expansion
    setTimeout(() => {
      if (isAutoHidePage) {
        setIsMinimized(true);
        window.dispatchEvent(new CustomEvent('bottomNavStateChange', { detail: { minimized: true } }));
      }
    }, 3000);
  }, [isAutoHidePage]);

  // Show bottom nav for logged in users, guest mode, or landing page (to preview nav)
  const isGuest = isGuestMode();
  
  if ((!user && !isGuest && !isLandingPage) || isDressMePage || isExcludedPage) {
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
                        onClick={() => handleNavClick(item)}
                        className="relative flex flex-col items-center justify-end gap-1 py-2 px-3"
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
                        {/* Spacer to match icon height */}
                        <div className="h-5" />
                        <span className={`text-[9px] font-medium ${active ? 'text-[hsl(var(--azyah-maroon))]' : 'text-muted-foreground'}`}>
                          {item.label}
                        </span>
                      </button>
                    );
                  }

                  // Regular nav items
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item)}
                      className={`flex flex-col items-center justify-end gap-1 py-2 px-3 transition-colors ${
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

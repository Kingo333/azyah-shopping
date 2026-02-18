import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, Globe, Sparkles, User, ChevronUp } from 'lucide-react';
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
  requiresAuth?: boolean; // Routes that require auth (show prompt for guests)
}

// Navigation restructured: 4 uniform tabs - Feed, Explore, Collabs, Profile
const navItems: NavItem[] = [
  { id: 'feed', label: 'Feed', icon: ShoppingBag, path: '/swipe' },
  { id: 'explore', label: 'Explore', icon: Globe, path: '/explore' },
  { id: 'ugc', label: 'UGC', icon: Sparkles, path: '/ugc', requiresAuth: true },
  { id: 'profile', label: 'Profile', icon: User, path: '/profile', requiresAuth: true },
];

// Routes where auto-hide behavior applies (minimized after 2 seconds)
const AUTO_HIDE_ROUTES = ['/swipe', '/likes', '/explore', '/p/', '/settings', '/community', '/trending', '/influencers', '/brands', '/wishlist', '/forum', '/affiliate', '/events'];

// Routes where bottom nav should NOT appear
const EXCLUDED_ROUTES = [
  '/onboarding/signup',
  '/onboarding/calibration',
  '/reset-password',
  '/terms',
  '/privacy',
  '/brand-portal',
  '/retailer-portal',
  '/dashboard/upgrade',
  '/dress-me',
];

// Check if list view mode is active (for hiding nav on /swipe in list view)
const getListViewMode = (): boolean => {
  try {
    return localStorage.getItem('feed-view-mode') === 'list';
  } catch {
    return false;
  }
};

export const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isMinimized, setIsMinimized] = useState(false);

  const isActive = (path: string) => {
    if (path === '/profile') {
      return location.pathname === '/profile' || location.pathname === '/dashboard';
    }
    if (path === '/swipe') {
      return location.pathname === '/swipe';
    }
    return location.pathname.startsWith(path);
  };

  const isProfilePage = location.pathname === '/profile' || location.pathname === '/dashboard';
  const isAutoHidePage = !isProfilePage && AUTO_HIDE_ROUTES.some(route => location.pathname.startsWith(route));
  const isExcludedPage = EXCLUDED_ROUTES.some(route => 
    route === location.pathname || location.pathname.startsWith(route + '/')
  );
  const isLandingPage = location.pathname === '/' || location.pathname === '/landing' || location.pathname === '/onboarding/intro';
  
  // Hide nav completely on /swipe when in list view mode (has its own floating nav)
  const isSwipeListView = location.pathname === '/swipe' && getListViewMode();

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

  // Auto-hide logic for auto-hide pages (profile always visible)
  useEffect(() => {
    // Profile always shows nav - never minimize
    if (isProfilePage) {
      setIsMinimized(false);
      window.dispatchEvent(new CustomEvent('bottomNavStateChange', { detail: { minimized: false } }));
      return;
    }
    
    if (isAutoHidePage) {
      setIsMinimized(false);
      window.dispatchEvent(new CustomEvent('bottomNavStateChange', { detail: { minimized: false } }));
      
      const timer = setTimeout(() => {
        setIsMinimized(true);
        window.dispatchEvent(new CustomEvent('bottomNavStateChange', { detail: { minimized: true } }));
      }, 2000);
      
      return () => clearTimeout(timer);
    } else {
      // Always show on non-auto-hide pages
      setIsMinimized(false);
      window.dispatchEvent(new CustomEvent('bottomNavStateChange', { detail: { minimized: false } }));
    }
  }, [location.pathname, isAutoHidePage, isProfilePage]);

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
  
  if ((!user && !isGuest && !isLandingPage) || isExcludedPage || isSwipeListView) {
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

      {/* Main Navigation */}
      <AnimatePresence>
        {(!isAutoHidePage || !isMinimized) && (
          <motion.div
            initial={isAutoHidePage ? { y: 100 } : false}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={isProfilePage 
              ? "fixed z-50 left-4 right-4 bg-white/50 backdrop-blur-xl rounded-full py-2 px-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-white/20 flex items-center justify-between"
              : "fixed bottom-0 left-0 right-0 z-50 bg-white/50 backdrop-blur-xl border-t border-white/20"
            }
            style={isProfilePage 
              ? { bottom: 'calc(var(--safe-bottom, 0px) + 16px)' }
              : { paddingBottom: 'var(--safe-bottom, 0px)' }
            }
          >
            {isProfilePage ? (
              /* Floating glass pill nav for profile */
              <>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item)}
                      className="p-1.5"
                    >
                      <Icon className={`h-5 w-5 ${active ? 'text-[hsl(var(--azyah-maroon))]' : 'text-foreground/60'}`} />
                    </button>
                  );
                })}
              </>
            ) : (
              /* Standard frosted bar nav */
              <div className="relative border-t border-white/20">
                <div className="flex items-center justify-around h-16 px-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item)}
                        className={`flex flex-col items-center justify-center gap-1 py-2 px-4 transition-colors flex-1 ${
                          active 
                            ? 'text-[hsl(var(--azyah-maroon))]' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${active ? 'text-[hsl(var(--azyah-maroon))]' : ''}`} />
                        <span className={`text-[10px] font-medium ${active ? 'text-[hsl(var(--azyah-maroon))]' : ''}`}>
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

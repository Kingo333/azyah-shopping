import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

// Custom Hanger Icon Component for Dress Me
const HangerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 3a3 3 0 0 0-3 3v1" />
    <path d="M3 21h18" />
    <path d="M12 7l9 7v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2l9-7z" />
  </svg>
);

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home, path: '/dashboard' },
  { id: 'find', label: 'Find', icon: Search, path: '/swipe' },
  { id: 'dress-me', label: 'Dress Me', icon: HangerIcon, path: '/dress-me' },
];

// Find-related routes where auto-hide behavior applies
const FIND_ROUTES = ['/swipe', '/likes', '/explore', '/p/'];

export const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    if (path === '/swipe') {
      return FIND_ROUTES.some(route => location.pathname.startsWith(route));
    }
    return location.pathname.startsWith(path);
  };

  const isFindPage = FIND_ROUTES.some(route => location.pathname.startsWith(route));
  const isDressMePage = location.pathname.startsWith('/dress-me');

  // Auto-hide logic for Find pages
  useEffect(() => {
    if (isFindPage) {
      setIsVisible(true);
      setIsMinimized(false);
      
      const timer = setTimeout(() => {
        setIsMinimized(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    } else {
      setIsMinimized(false);
      setIsVisible(true);
    }
  }, [location.pathname, isFindPage]);

  const handleExpandNav = useCallback(() => {
    setIsMinimized(false);
    // Re-trigger auto-hide after expansion
    setTimeout(() => {
      if (isFindPage) {
        setIsMinimized(true);
      }
    }, 3000);
  }, [isFindPage]);

  // Don't render on Dress Me pages
  if (isDressMePage) {
    return null;
  }

  return (
    <>
      {/* Minimized handle for Find pages */}
      <AnimatePresence>
        {isFindPage && isMinimized && (
          <motion.button
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={handleExpandNav}
            className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur-sm rounded-full px-6 py-2 shadow-lg border border-[hsl(var(--azyah-border))]"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
          >
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Main Navigation */}
      <AnimatePresence>
        {(!isFindPage || !isMinimized) && (
          <motion.div
            initial={isFindPage ? { y: 100 } : false}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Background bar */}
            <div className="relative bg-white border-t border-[hsl(var(--azyah-border))]">
              <div className="flex items-end justify-around h-16 px-4">
                {navItems.map((item, index) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  const isCenter = index === 1; // Find button is center

                  if (isCenter) {
                    // Center "Find" button - ADNOC style pop-out
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.path)}
                        className="relative -mt-6 flex flex-col items-center"
                      >
                        {/* Pop-out circular button */}
                        <div 
                          className={`
                            w-14 h-14 rounded-full flex items-center justify-center
                            shadow-lg transition-all duration-200
                            ${active 
                              ? 'bg-[hsl(var(--azyah-maroon))] shadow-[0_4px_20px_hsl(var(--azyah-maroon)/0.4)]' 
                              : 'bg-[hsl(var(--azyah-maroon))] shadow-[0_4px_16px_hsl(var(--azyah-maroon)/0.3)]'
                            }
                          `}
                        >
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <span className={`text-[10px] font-medium mt-1 ${active ? 'text-[hsl(var(--azyah-maroon))]' : 'text-gray-500'}`}>
                          {item.label}
                        </span>
                      </button>
                    );
                  }

                  // Regular nav items (Home, Dress Me)
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      className={`flex flex-col items-center justify-center gap-1 py-2 px-4 transition-colors ${
                        active 
                          ? 'text-[hsl(var(--azyah-maroon))]' 
                          : 'text-gray-500 hover:text-gray-700'
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

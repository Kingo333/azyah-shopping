import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, User } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

// Custom Hanger Icon Component
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
  { id: 'shop', label: 'Shop', icon: ShoppingBag, path: '/swipe' },
  { id: 'dress-me', label: 'Dress Me', icon: HangerIcon, path: '/dress-me' },
  { id: 'profile', label: 'Profile', icon: User, path: '/settings' },
];

export const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[hsl(var(--azyah-border))] z-50 safe-area-pb">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
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
  );
};

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Search, 
  Camera, 
  Sparkles,
  ShoppingBag,
  ArrowLeft,
  Home,
  User,
  Menu
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const ShopperNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const tabs = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: Home,
      path: '/dashboard'
    },
    {
      id: 'swipe',
      label: 'Swipe',
      icon: Heart,
      path: '/swipe'
    },
    {
      id: 'explore',
      label: 'Explore',
      icon: Search,
      path: '/explore'
    },
    {
      id: 'ar-tryOn',
      label: 'AR Try-On',
      icon: Sparkles,
      path: '/ar-tryOn',
      badge: 'Beta'
    },
    {
      id: 'fashion-feed',
      label: 'Feed',
      icon: Camera,
      path: '/fashion-feed'
    },
    {
      id: 'wishlist',
      label: 'Wishlist',
      icon: Heart,
      path: '/wishlist'
    },
    {
      id: 'cart',
      label: 'Cart',
      icon: ShoppingBag,
      path: '/cart'
    }
  ];

  const isActive = (path: string) => location.pathname === path;

  // Mobile Bottom Navigation
  if (isMobile) {
    return (
      <nav className="nav-mobile">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {tabs.slice(0, 5).map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);
            
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 ${
                  active 
                    ? 'text-primary bg-primary/10' 
                    : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                }`}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">{tab.label}</span>
                {tab.badge && (
                  <Badge variant="secondary" className="text-xs mt-1 px-1 py-0 h-4">
                    {tab.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // Desktop Navigation
  return (
    <Card className="card-luxury mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="hover:bg-primary/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = isActive(tab.path);
              
              return (
                <Button
                  key={tab.id}
                  variant={active ? "default" : "outline"}
                  size="sm"
                  onClick={() => navigate(tab.path)}
                  className={`flex items-center gap-2 whitespace-nowrap transition-all duration-300 ${
                    active 
                      ? 'bg-gradient-to-r from-primary to-primary-glow shadow-glow' 
                      : 'hover:bg-primary/10 hover:scale-105'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.badge && (
                    <Badge 
                      variant={active ? "secondary" : "outline"} 
                      className="text-xs ml-1"
                    >
                      {tab.badge}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/profile-settings')}
              className="hover:bg-primary/10"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Profile</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShopperNavigation;
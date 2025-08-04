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
  Home
} from 'lucide-react';

const ShopperNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: Home,
      path: '/dashboard'
    },
    {
      id: 'swipe',
      label: 'Start Swiping',
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
      label: 'Fashion Feed',
      icon: Sparkles,
      path: '/fashion-feed'
    }
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <Card className="sticky top-4 z-40 bg-background/95 backdrop-blur-sm border-0 shadow-lg">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = isActive(tab.path);
              
              return (
                <Button
                  key={tab.id}
                  variant={active ? "default" : "ghost"}
                  size="sm"
                  onClick={() => navigate(tab.path)}
                  className={`relative flex items-center gap-2 transition-all duration-200 ${
                    active 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs font-medium">
                    {tab.label}
                  </span>
                  {tab.badge && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {tab.badge}
                    </Badge>
                  )}
                  {active && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-foreground rounded-full" />
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShopperNavigation;
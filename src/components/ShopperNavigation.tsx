
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
  Menu,
  ScanLine
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const ShopperNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const tabs = [
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
      id: 'image-search',
      label: 'Scan',
      icon: ScanLine,
      path: '/image-search'
    },
    {
      id: 'fashion-feed',
      label: 'Feed',
      icon: Camera,
      path: '/fashion-feed'
    }
  ];

  const isActive = (path: string) => location.pathname === path;

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
              Home
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShopperNavigation;

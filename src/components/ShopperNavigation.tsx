import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Search, Camera, ArrowLeft, type LucideIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
type Tab = {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  badge?: number | string | React.ReactNode; // <-- optional badge
};
const ShopperNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const tabs: Tab[] = [{
    id: 'swipe',
    label: 'Swipe',
    icon: Heart,
    path: '/swipe'
    // badge: 12, // (optional) add when you have a count
  }, {
    id: 'explore',
    label: 'Explore',
    icon: Search,
    path: '/explore'
  }, {
    id: 'fashion-feed',
    label: 'Feed',
    icon: Camera,
    path: '/fashion-feed'
  }];
  const isActive = (path: string) => location.pathname === path;
  return <Card className="card-luxury mb-6">
      
    </Card>;
};
export default ShopperNavigation;
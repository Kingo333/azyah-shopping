import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassPanel } from '@/components/ui/glass-panel';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import GlobalSearch from '@/components/GlobalSearch';
import DashboardHeader from '@/components/DashboardHeader';
import AffiliateHub from '@/components/AffiliateHub';
import AiStudioModal from '@/components/AiStudioModal';
import PremiumBanner from '@/components/PremiumBanner';
import { Heart, ShoppingBag, Search, Sparkles, Package, BarChart3, Users, Settings, Store, TrendingUp, Plus, Eye, DollarSign, Globe, Bell, LogOut, User, Archive, Trophy, MapPin, Blocks } from 'lucide-react';
import Leaderboard from '@/components/Leaderboard';
import TrendingStylesCarousel from '@/components/TrendingStylesCarousel';
import { UGCCollabButton } from '@/components/ugc/UGCCollabButton';
import type { UserRole } from '@/lib/rbac';

interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface DashboardStats {
  totalProducts?: number;
  totalViews?: number;
  totalSales?: number;
  totalRevenue?: number;
  totalWishlistItems?: number;
  totalCartItems?: number;
  totalClosets?: number;
  totalLikes?: number;
  totalFollowers?: number;
  totalFollowing?: number;
  totalPosts?: number;
  totalBrands?: number;
}

export function RoleDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false); // Start with false for immediate render
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [leaderboardType, setLeaderboardType] = useState<'global' | 'country'>('global');
  const [showAiStudioModal, setShowAiStudioModal] = useState(false);

  useEffect(() => {
    if (user) {
      // Fetch data in background without blocking UI
      fetchUserProfile();
      fetchDashboardStats();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // User doesn't exist, create profile
        const newProfile = {
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          role: (user.user_metadata?.role as UserRole) || 'shopper',
          avatar_url: user.user_metadata?.avatar_url || null,
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('users')
          .insert(newProfile)
          .select()
          .single();

        if (!createError) {
          setUserProfile(createdProfile);
        }
      } else if (!error && data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchDashboardStats = async () => {
    if (!user) return;
    
    try {
      let stats: DashboardStats = {
        totalProducts: 0,
        totalViews: 0,
        totalSales: 0,
        totalRevenue: 0,
        totalBrands: 0,
        totalClosets: 0,
        totalLikes: 0,
        totalFollowers: 0,
        totalFollowing: 0,
        totalPosts: 0
      };

      const currentRole = userProfile?.role || (user.user_metadata?.role as UserRole) || 'shopper';

      if (currentRole === 'brand') {
        const { data: brandProducts } = await supabase
          .from('products')
          .select('*')
          .eq('brand_id', user.id);

        stats.totalProducts = brandProducts?.length || 0;
      } else if (currentRole === 'retailer') {
        // Skip retailer stats for now
        stats.totalBrands = 0;
      } else if (currentRole === 'shopper') {
        const { data: closets } = await supabase
          .from('closets')
          .select('*')
          .eq('user_id', user.id);

        // Skip likes for now
        const likes = null;

        stats.totalClosets = closets?.length || 0;
        stats.totalLikes = likes?.length || 0;
      }

      setDashboardStats(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const formatPrice = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  const handleToyReplicaClick = async () => {
    navigate('/toy-replica');
  };

  // Render UI shell immediately for Visual Edits compatibility
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Welcome to Azyah</h2>
          <p className="text-muted-foreground">Please sign in to access your dashboard</p>
          <Button onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  // Get effective role for immediate rendering
  const effectiveRole = userProfile?.role || (user.user_metadata?.role as UserRole) || 'shopper';
  const effectiveProfile = userProfile || {
    id: user.id,
    email: user.email!,
    name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
    first_name: user.user_metadata?.first_name || 'User',
    last_name: user.user_metadata?.last_name || '',
    role: effectiveRole,
    avatar_url: user.user_metadata?.avatar_url || null,
  };

  const renderShopperDashboard = () => (
    <div className="space-y-4">
      <PremiumBanner />
      
      <GlassPanel variant="premium" className="p-8">
        <div className="space-y-6">
          <h2 className="text-2xl font-cormorant font-semibold flex items-center gap-3 text-foreground/90">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 sm:gap-5">
            <Button 
              onClick={() => navigate('/swipe')} 
              className="btn-luxury h-16 sm:h-20 flex-col gap-1 sm:gap-2"
            >
              <Heart className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Swipe</span>
            </Button>
            <Button 
              onClick={() => navigate('/fashion-feed')} 
              variant="outline" 
              className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 hover:bg-primary/10 hover:scale-105 transition-all duration-300"
            >
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Feed</span>
            </Button>
            <Button 
              onClick={() => navigate('/explore')} 
              variant="outline" 
              className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 hover:bg-primary/10 hover:scale-105 transition-all duration-300"
            >
              <Search className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Explore</span>
            </Button>
            <Button 
              onClick={() => setShowAiStudioModal(true)}
              variant="outline" 
              className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 hover:bg-primary/10 hover:scale-105 transition-all duration-300 relative bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800"
            >
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              <span className="text-xs sm:text-sm text-purple-600">AI Studio</span>
              <Badge variant="secondary" className="absolute -top-1 -right-1 text-xs px-1 py-0 h-4">
                New
              </Badge>
            </Button>
            <UGCCollabButton />
            <Button 
              onClick={() => navigate('/wishlist')} 
              variant="outline" 
              className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 hover:bg-primary/10 hover:scale-105 transition-all duration-300"
            >
              <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Wishlist</span>
            </Button>
            <Button 
              onClick={handleToyReplicaClick}
              variant="outline" 
              className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 hover:bg-primary/10 hover:scale-105 transition-all duration-300 relative bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-green-200 dark:border-green-800"
            >
              <Blocks className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              <span className="text-xs sm:text-sm text-green-600">Toy Replica</span>
              <Badge variant="secondary" className="absolute -top-1 -right-1 text-xs px-1 py-0 h-4">
                AI
              </Badge>
            </Button>
          </div>
        </div>
      </GlassPanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassPanel variant="premium" className="p-8">
          <div className="space-y-5">
            <h3 className="text-xl font-cormorant font-semibold flex items-center gap-3">
              <div className="p-2 rounded-full bg-gradient-to-br from-primary/10 to-accent-cartier/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              Trending Styles
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Discover what's trending now and shop the latest styles everyone's talking about.
            </p>
            <TrendingStylesCarousel limit={8} />
          </div>
        </GlassPanel>

        <div className="hidden lg:block">
          <GlassPanel variant="premium" className="p-8">
            <AffiliateHub showTitle={false} />
          </GlassPanel>
        </div>
      </div>

      <div className="block lg:hidden">
        <GlassPanel variant="premium" className="p-8">
          <AffiliateHub />
        </GlassPanel>
      </div>

      <GlassPanel variant="premium" className="p-8">
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-cormorant font-semibold flex items-center gap-3">
              <div className="p-2 rounded-full bg-gradient-to-br from-primary/10 to-accent-cartier/10">
                <Archive className="h-5 w-5 text-primary" />
              </div>
              My Closets
            </h3>
            <Button variant="premium" size="sm" onClick={() => navigate('/closets')}>
              <Archive className="h-4 w-4 mr-2" />
              View All
            </Button>
          </div>
          <div className="text-center py-12 space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary/10 to-accent-cartier/10 flex items-center justify-center mb-4">
              <Archive className="h-8 w-8 text-primary/60" />
            </div>
            <p className="text-muted-foreground text-lg">
              Create your first closet to organize your style discoveries
            </p>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel variant="premium" className="p-8">
        <div className="space-y-6">
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <h3 className="text-xl font-cormorant font-semibold flex items-center gap-3">
              <div className="p-2 rounded-full bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
                <Trophy className="h-5 w-5 text-yellow-500" />
              </div>
              Fashion Leaderboards
            </h3>
            <div className="flex gap-2">
              <Button 
                variant={leaderboardType === 'global' ? 'premium' : 'outline'} 
                size="sm" 
                onClick={() => setLeaderboardType('global')} 
                className="flex-1 sm:flex-none"
              >
                <Globe className="h-3 w-3 mr-2" />
                Global
              </Button>
              <Button 
                variant={leaderboardType === 'country' ? 'premium' : 'outline'} 
                size="sm" 
                onClick={() => setLeaderboardType('country')} 
                className="flex-1 sm:flex-none"
              >
                <MapPin className="h-3 w-3 mr-2" />
                Country
              </Button>
            </div>
          </div>
          <Leaderboard type={leaderboardType} country={user?.user_metadata?.country} />
        </div>
      </GlassPanel>
    </div>
  );

  const renderBrandDashboard = () => (
    <div className="space-y-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-primary">
          Welcome back, {effectiveProfile.first_name || 'Brand'}! 🏷️
        </h1>
        <p className="text-xl text-muted-foreground">Manage your brand and track performance</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="font-semibold text-foreground">Products</h3>
            <p className="text-3xl font-bold text-primary">{dashboardStats?.totalProducts || 0}</p>
          </div>
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="font-semibold text-foreground">Views</h3>
            <p className="text-3xl font-bold text-primary">{dashboardStats?.totalViews || 0}</p>
          </div>
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="font-semibold text-foreground">Sales</h3>
            <p className="text-3xl font-bold text-primary">{dashboardStats?.totalSales || 0}</p>
          </div>
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="font-semibold text-foreground">Revenue</h3>
            <p className="text-3xl font-bold text-primary">{formatPrice(dashboardStats?.totalRevenue || 0)}</p>
          </div>
        </div>
      </div>

      <GlassPanel variant="premium" className="p-8">
        <div className="space-y-6">
          <h3 className="text-xl font-cormorant font-semibold">Brand Management</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button onClick={() => navigate('/brand-portal')} variant="premium" className="h-24 flex-col gap-3">
              <Package className="h-7 w-7" />
              <span className="font-medium">Products</span>
            </Button>
            <Button onClick={() => navigate('/brand-portal')} variant="outline" className="h-24 flex-col gap-3 hover:scale-105 transition-transform">
              <BarChart3 className="h-7 w-7" />
              <span className="font-medium">Analytics</span>
            </Button>
            <Button onClick={() => navigate('/brand-portal')} variant="outline" className="h-24 flex-col gap-3 hover:scale-105 transition-transform">
              <Settings className="h-7 w-7" />
              <span className="font-medium">Settings</span>
            </Button>
          </div>
        </div>
      </GlassPanel>
    </div>
  );

  const renderRetailerDashboard = () => (
    <div className="space-y-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-primary">
          Welcome back, {effectiveProfile.first_name || 'Retailer'}! 🏪
        </h1>
        <p className="text-xl text-muted-foreground">Manage your retail operations</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="font-semibold text-foreground">Brands</h3>
            <p className="text-3xl font-bold text-primary">{dashboardStats?.totalBrands || 0}</p>
          </div>
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="font-semibold text-foreground">Products</h3>
            <p className="text-3xl font-bold text-primary">{dashboardStats?.totalProducts || 0}</p>
          </div>
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="font-semibold text-foreground">Sales</h3>
            <p className="text-3xl font-bold text-primary">{dashboardStats?.totalSales || 0}</p>
          </div>
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="font-semibold text-foreground">Revenue</h3>
            <p className="text-3xl font-bold text-primary">{formatPrice(dashboardStats?.totalRevenue || 0)}</p>
          </div>
        </div>
      </div>

      <GlassPanel variant="premium" className="p-8">
        <div className="space-y-6">
          <h3 className="text-xl font-cormorant font-semibold">Retailer Management</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button onClick={() => navigate('/retailer-portal')} variant="premium" className="h-24 flex-col gap-3">
              <Store className="h-7 w-7" />
              <span className="font-medium">Retail Portal</span>
            </Button>
            <Button onClick={() => navigate('/retailer-portal')} variant="outline" className="h-24 flex-col gap-3 hover:scale-105 transition-transform">
              <BarChart3 className="h-7 w-7" />
              <span className="font-medium">Analytics</span>
            </Button>
            <Button onClick={() => navigate('/retailer-portal')} variant="outline" className="h-24 flex-col gap-3 hover:scale-105 transition-transform">
              <Settings className="h-7 w-7" />
              <span className="font-medium">Settings</span>
            </Button>
          </div>
        </div>
      </GlassPanel>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="container mx-auto p-4 space-y-8">
        <DashboardHeader />
        {effectiveRole === 'shopper' && renderShopperDashboard()}
        {effectiveRole === 'brand' && renderBrandDashboard()}
        {effectiveRole === 'retailer' && renderRetailerDashboard()}
        {effectiveRole === 'admin' && (
          <div className="text-center space-y-8">
            <h1 className="text-4xl font-bold text-primary">Admin Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <Button onClick={() => navigate('/brand-portal')} size="lg" className="w-full h-20 text-lg">
                Access Brand Portal
              </Button>
              <Button onClick={() => navigate('/retailer-portal')} size="lg" variant="outline" className="w-full h-20 text-lg">
                Access Retailer Portal
              </Button>
            </div>
          </div>
        )}
        {!['shopper', 'brand', 'retailer', 'admin'].includes(effectiveRole) && (
          <div className="text-center">
            <p className="text-lg text-muted-foreground">Unknown user role: {effectiveRole}</p>
          </div>
        )}

        <GlobalSearch 
          isOpen={showSearchModal} 
          onClose={() => setShowSearchModal(false)} 
        />
        
        <AiStudioModal 
          open={showAiStudioModal} 
          onOpenChange={setShowAiStudioModal} 
        />
      </div>
    </ErrorBoundary>
  );
}

export default RoleDashboard;
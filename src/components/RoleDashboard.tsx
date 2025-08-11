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
import { Heart, ShoppingBag, Search, Sparkles, Camera, BarChart3, Users, Package, Settings, Store, TrendingUp, Plus, Eye, DollarSign, Globe, Bell, LogOut, User, Archive, Trophy, MapPin } from 'lucide-react';
import Leaderboard from '@/components/Leaderboard';

interface UserProfile {
  id: string;
  name: string;
  role: 'shopper' | 'brand' | 'retailer' | 'admin';
  avatar_url?: string;
  email: string;
}

interface DashboardStats {
  totalProducts?: number;
  totalViews?: number;
  totalSales?: number;
  totalRevenue?: number;
  totalWishlistItems?: number;
  totalCartItems?: number;
}

const RoleDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  console.log('RoleDashboard: user state:', user);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeLeaderboard, setActiveLeaderboard] = useState<'global' | 'country'>('global');
  const [aiStudioModalOpen, setAiStudioModalOpen] = useState(false);

  useEffect(() => {
    const initializeDashboard = async () => {
      console.log('Initializing dashboard, user:', user);
      
      if (!user) {
        console.log('No user found, setting loading to false');
        setLoading(false);
        return;
      }

      try {
        await fetchUserProfile();
        await fetchDashboardStats();
      } catch (error) {
        console.error('Error initializing dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    console.log('Fetching user profile for:', user.id);
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        throw error;
      }

      if (data) {
        console.log('Found user profile:', data);
        setUserProfile(data);
      } else {
        // User profile doesn't exist, create one
        console.log('Creating new user profile for:', user.email);
        const defaultProfile = {
          id: user.id,
          name: user.email?.split('@')[0] || 'User',
          role: 'shopper' as const,
          email: user.email!
        };

        const { error: insertError } = await supabase
          .from('users')
          .insert([defaultProfile]);

        if (insertError) {
          console.error('Error creating user profile:', insertError);
        }
        
        setUserProfile(defaultProfile);
      }
    } catch (error) {
      console.error('Error with user profile:', error);
      // Fallback profile
      const fallbackProfile = {
        id: user.id,
        name: user.email?.split('@')[0] || 'User',
        role: 'shopper' as const,
        email: user.email!
      };
      setUserProfile(fallbackProfile);
    }
  };

  const fetchDashboardStats = async () => {
    if (!user) return;
    
    console.log('Fetching dashboard stats for:', user.id);
    
    try {
      // Fetch basic stats for all roles
      const [wishlistData, cartData] = await Promise.all([
        supabase.from('wishlist_items').select('*').eq('wishlist_id', user.id),
        supabase.from('cart_items').select('*').eq('user_id', user.id)
      ]);

      const dashboardStats: DashboardStats = {
        totalWishlistItems: wishlistData?.data?.length || 0,
        totalCartItems: cartData?.data?.length || 0
      };

      // Role-specific stats
      if (userProfile?.role === 'brand' || userProfile?.role === 'retailer') {
        try {
          const { data: products } = await supabase
            .from('products')
            .select('*')
            .eq(userProfile.role === 'brand' ? 'brand_id' : 'retailer_id', user.id);
          dashboardStats.totalProducts = products?.length || 0;
        } catch (roleError) {
          console.warn('Failed to fetch role-specific stats:', roleError);
          dashboardStats.totalProducts = 0;
        }
      }
      
      setStats(dashboardStats);
      console.log('Dashboard stats updated:', dashboardStats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Set default stats on error
      setStats({
        totalWishlistItems: 0,
        totalCartItems: 0,
        totalProducts: 0
      });
    }
  };

  const formatPrice = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  // Show loading spinner
  if (loading) {
    console.log('Showing loading spinner');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show sign-in prompt if no user
  if (!user) {
    console.log('No user, showing sign-in prompt');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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

  if (!userProfile) {
    console.log('No user profile, showing error');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p>Error loading profile</p>
        </div>
      </div>
    );
  }

  console.log('Rendering dashboard for user:', userProfile);

  const renderShopperDashboard = () => (
    <div className="space-y-4">
      {/* Quick Actions with Premium Glass Panel */}
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
              onClick={() => setAiStudioModalOpen(true)}
              variant="outline" 
              className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 hover:bg-primary/10 hover:scale-105 transition-all duration-300 relative bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800"
            >
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              <span className="text-xs sm:text-sm text-purple-600">AI Studio</span>
              <Badge variant="secondary" className="absolute -top-1 -right-1 text-xs px-1 py-0 h-4">
                New
              </Badge>
            </Button>
            <Button 
              onClick={() => navigate('/likes')} 
              variant="outline" 
              className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 hover:bg-primary/10 hover:scale-105 transition-all duration-300"
            >
              <Heart className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Likes</span>
            </Button>
            <Button 
              onClick={() => navigate('/wishlist')} 
              variant="outline" 
              className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 hover:bg-primary/10 hover:scale-105 transition-all duration-300"
            >
              <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Wishlist</span>
            </Button>
            <Button 
              onClick={() => navigate('/image-search')} 
              variant="outline" 
              className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 hover:bg-primary/10 hover:scale-105 transition-all duration-300"
            >
              <Camera className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Scan</span>
            </Button>
          </div>
        </div>
      </GlassPanel>

      {/* Global Search and Affiliate Hub Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Global Search with Premium Glass Panel */}
        <GlassPanel variant="premium" className="p-8">
          <div className="space-y-5">
            <h3 className="text-xl font-cormorant font-semibold flex items-center gap-3">
              <div className="p-2 rounded-full bg-gradient-to-br from-primary/10 to-accent-cartier/10">
                <Search className="h-5 w-5 text-primary" />
              </div>
              Discover Products, Brands & Styles
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Search across products, brands, and styles to discover your next fashion find.
            </p>
            <Button onClick={() => setSearchOpen(true)} variant="premium" size="lg" className="w-full">
              <Search className="h-4 w-4 mr-2" />
              Open Global Search
            </Button>
          </div>
        </GlassPanel>

        {/* Affiliate Hub - Desktop with Premium Glass Panel */}
        <div className="hidden lg:block">
          <GlassPanel variant="premium" className="p-8">
            <AffiliateHub showTitle={false} />
          </GlassPanel>
        </div>
      </div>

      {/* Affiliate Hub - Mobile with Premium Glass Panel */}
      <div className="block lg:hidden">
        <GlassPanel variant="premium" className="p-8">
          <AffiliateHub />
        </GlassPanel>
      </div>

      {/* Closets Preview with Premium Glass Panel */}
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

      {/* Fashion Leaderboards with Premium Glass Panel */}
      <GlassPanel variant="premium" className="p-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-cormorant font-semibold flex items-center gap-3">
              <div className="p-2 rounded-full bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
                <Trophy className="h-5 w-5 text-yellow-500" />
              </div>
              Fashion Leaderboards
            </h3>
            <div className="flex gap-1 sm:gap-2">
              <Button variant={activeLeaderboard === 'global' ? 'premium' : 'outline'} size="sm" onClick={() => setActiveLeaderboard('global')} className="px-1.5 py-1 text-xs sm:px-2 sm:py-1">
                <Globe className="h-3 w-3 mr-0.5 sm:mr-1" />
                <span className="hidden xs:inline">Global</span>
                <span className="xs:hidden">G</span>
              </Button>
              <Button variant={activeLeaderboard === 'country' ? 'premium' : 'outline'} size="sm" onClick={() => setActiveLeaderboard('country')} className="px-1.5 py-1 text-xs sm:px-2 sm:py-1">
                <MapPin className="h-3 w-3 mr-0.5 sm:mr-1" />
                <span className="hidden xs:inline">Country</span>
                <span className="xs:hidden">C</span>
              </Button>
            </div>
          </div>
          <Leaderboard type={activeLeaderboard} country={user?.user_metadata?.country} />
        </div>
      </GlassPanel>
    </div>
  );

  const renderBrandDashboard = () => (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassPanel variant="premium" className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10">
              <Package className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Products</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalProducts || 0}</p>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel variant="premium" className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/10">
              <Eye className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Views</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalViews || 0}</p>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel variant="premium" className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10">
              <ShoppingBag className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Sales</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalSales || 0}</p>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel variant="premium" className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-600/10">
              <DollarSign className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Revenue</p>
              <p className="text-2xl font-bold text-foreground">{formatPrice(stats.totalRevenue || 0)}</p>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Quick Actions */}
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
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassPanel variant="premium" className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10">
              <Store className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Brands</p>
              <p className="text-2xl font-bold text-foreground">5</p>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel variant="premium" className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/10">
              <Package className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Products</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalProducts || 0}</p>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel variant="premium" className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10">
              <TrendingUp className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Sales</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalSales || 0}</p>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel variant="premium" className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-600/10">
              <DollarSign className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Revenue</p>
              <p className="text-2xl font-bold text-foreground">{formatPrice(stats.totalRevenue || 0)}</p>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Quick Actions */}
      <GlassPanel variant="premium" className="p-8">
        <div className="space-y-6">
          <h3 className="text-xl font-cormorant font-semibold">Retailer Management</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button onClick={() => navigate('/retailer-portal')} variant="premium" className="h-24 flex-col gap-3">
              <Package className="h-7 w-7" />
              <span className="font-medium">Inventory</span>
            </Button>
            <Button onClick={() => navigate('/retailer-portal')} variant="outline" className="h-24 flex-col gap-3 hover:scale-105 transition-transform">
              <Store className="h-7 w-7" />
              <span className="font-medium">Brands</span>
            </Button>
            <Button onClick={() => navigate('/retailer-portal')} variant="outline" className="h-24 flex-col gap-3 hover:scale-105 transition-transform">
              <BarChart3 className="h-7 w-7" />
              <span className="font-medium">Analytics</span>
            </Button>
          </div>
        </div>
      </GlassPanel>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="min-h-screen dashboard-bg pb-20 sm:pb-0">
        <div className="container mx-auto max-w-7xl px-4 py-6">
          {/* Header with Dashboard Header component */}
          <div className="mb-6">
            <DashboardHeader />
          </div>

          {/* Role-based Dashboard Content */}
          {userProfile?.role === 'shopper' && renderShopperDashboard()}
          {userProfile?.role === 'brand' && renderBrandDashboard()}
          {userProfile?.role === 'retailer' && renderRetailerDashboard()}
        </div>
        
        {/* Global Search Modal */}
        <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        
        {/* AI Studio Modal */}
        <AiStudioModal 
          open={aiStudioModalOpen} 
          onClose={() => setAiStudioModalOpen(false)} 
        />
      </div>
    </ErrorBoundary>
  );
};

export default RoleDashboard;

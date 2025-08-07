import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import GlobalSearch from '@/components/GlobalSearch';
import DashboardHeader from '@/components/DashboardHeader';
import AffiliateHub from '@/components/AffiliateHub';
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

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchDashboardStats();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    try {
      const {
        data,
        error
      } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
      if (error) {
        console.error('Error fetching user profile:', error);
        throw error;
      }
      if (data) {
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
        const {
          error: insertError
        } = await supabase.from('users').insert([defaultProfile]);
        if (insertError) {
          console.error('Error creating user profile:', insertError);
          // Use the default profile even if insert fails
        }
        setUserProfile(defaultProfile);
      }
    } catch (error) {
      console.error('Error with user profile:', error);
      // Fallback profile
      setUserProfile({
        id: user.id,
        name: user.email?.split('@')[0] || 'User',
        role: 'shopper',
        email: user.email!
      });
    }
  };

  const fetchDashboardStats = async () => {
    if (!user) return;
    
    const timeoutId = setTimeout(() => {
      console.warn('Dashboard stats fetch timeout, setting loading to false');
      setLoading(false);
    }, 10000); // 10 second timeout

    try {
      // Fetch basic stats for all roles with timeout
      const statsPromises = [
        supabase.from('wishlist_items').select('*').eq('wishlist_id', user.id),
        supabase.from('cart_items').select('*').eq('user_id', user.id)
      ];

      const [wishlistData, cartData] = await Promise.race([
        Promise.all(statsPromises),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 8000)
        )
      ]) as any[];

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
      clearTimeout(timeoutId);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Set default stats on error
      setStats({
        totalWishlistItems: 0,
        totalCartItems: 0,
        totalProducts: 0
      });
      clearTimeout(timeoutId);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading dashboard...</p>
        </div>
      </div>;
  }

  if (!userProfile) {
    return <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center">
        <div className="text-center">
          <p>Error loading profile</p>
        </div>
      </div>;
  }

  const renderShopperDashboard = () => (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-background to-muted/20 border-muted/30 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
            <Button 
              onClick={() => navigate('/swipe')} 
              className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 bg-gradient-to-b from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all duration-300"
            >
              <Heart className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Swipe</span>
            </Button>
            <Button 
              onClick={() => navigate('/fashion-feed')} 
              variant="outline" 
              className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 bg-muted/5 hover:bg-muted/20 hover:scale-105 transition-all duration-300 border-muted/40"
            >
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Feed</span>
            </Button>
            <Button 
              onClick={() => navigate('/explore')} 
              variant="outline" 
              className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 bg-muted/5 hover:bg-muted/20 hover:scale-105 transition-all duration-300 border-muted/40"
            >
              <Search className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Explore</span>
            </Button>
            <Button 
              onClick={() => navigate('/ar-tryOn')} 
              variant="outline" 
              className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 bg-muted/5 hover:bg-muted/20 hover:scale-105 transition-all duration-300 relative border-muted/40"
            >
              <Camera className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">AR Try-On</span>
              <Badge variant="secondary" className="absolute -top-1 -right-1 text-xs px-1 py-0 h-4 bg-gradient-to-r from-accent-cartier to-accent-cartier-700 text-white">
                Beta
              </Badge>
            </Button>
            <Button 
              onClick={() => navigate('/likes')} 
              variant="outline" 
              className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 bg-muted/5 hover:bg-muted/20 hover:scale-105 transition-all duration-300 border-muted/40"
            >
              <Heart className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Likes</span>
            </Button>
            <Button 
              onClick={() => navigate('/wishlist')} 
              variant="outline" 
              className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 bg-muted/5 hover:bg-muted/20 hover:scale-105 transition-all duration-300 border-muted/40"
            >
              <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Wishlist</span>
            </Button>
            <Button 
              onClick={() => navigate('/image-search')} 
              variant="outline" 
              className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 bg-muted/5 hover:bg-muted/20 hover:scale-105 transition-all duration-300 border-muted/40"
            >
              <Camera className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Scan</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Global Search and Affiliate Hub Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global Search */}
        <Card className="bg-gradient-to-br from-card to-muted/10 border-muted/30 shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-full">
                <Search className="h-5 w-5 text-blue-600" />
              </div>
              Discover Products, Brands & Styles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Search across products, brands, and styles to discover your next fashion find.
              </p>
              <Button onClick={() => setSearchOpen(true)} variant="outline" className="w-full bg-muted/5 hover:bg-muted/20 border-muted/40">
                <Search className="h-4 w-4 mr-2" />
                Open Global Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Affiliate Hub - Desktop */}
        <div className="hidden lg:block">
          <AffiliateHub showTitle={false} />
        </div>
      </div>

      {/* Affiliate Hub - Mobile (under Global Search) */}
      <div className="block lg:hidden">
        <AffiliateHub />
      </div>

      {/* Closets Preview */}
      <Card className="bg-gradient-to-br from-card to-muted/10 border-muted/30 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-500/10 rounded-full">
                <Archive className="h-5 w-5 text-purple-600" />
              </div>
              My Closets
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/closets')} className="border-muted/40 hover:bg-muted/20">
              <Archive className="h-4 w-4 mr-2" />
              View All
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 bg-muted/5 rounded-lg border border-muted/20">
            <div className="p-4 bg-muted/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Archive className="h-8 w-8 text-muted-foreground/70" />
            </div>
            <p className="text-muted-foreground">
              Create your first closet to organize your style discoveries
            </p>
            <Button className="mt-4" onClick={() => navigate('/closets')}>
              Create Closet
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Fashion Leaderboards */}
      <Card className="bg-gradient-to-br from-card to-muted/10 border-muted/30 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-yellow-500/10 rounded-full">
                <Trophy className="h-5 w-5 text-yellow-600" />
              </div>
              Fashion Leaderboards
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant={activeLeaderboard === 'global' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setActiveLeaderboard('global')}
                className={activeLeaderboard === 'global' ? '' : 'border-muted/40 hover:bg-muted/20'}
              >
                <Globe className="h-4 w-4 mr-2" />
                Global
              </Button>
              <Button 
                variant={activeLeaderboard === 'country' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setActiveLeaderboard('country')}
                className={activeLeaderboard === 'country' ? '' : 'border-muted/40 hover:bg-muted/20'}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Country
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/5 rounded-lg p-4 border border-muted/20">
            <Leaderboard type={activeLeaderboard} country={user?.user_metadata?.country} />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderBrandDashboard = () => <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200/40 dark:border-blue-800/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-full">
                <Package className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Products</p>
                <p className="text-xl font-bold">{stats.totalProducts || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-green-200/40 dark:border-green-800/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-500/10 rounded-full">
                <Eye className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Views</p>
                <p className="text-xl font-bold">{stats.totalViews || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 border-purple-200/40 dark:border-purple-800/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-500/10 rounded-full">
                <ShoppingBag className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sales</p>
                <p className="text-xl font-bold">{stats.totalSales || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 border-emerald-200/40 dark:border-emerald-800/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 rounded-full">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-xl font-bold">{formatPrice(stats.totalRevenue || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-background to-muted/20 border-muted/30 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            Brand Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button onClick={() => navigate('/brand-portal')} className="h-20 flex-col gap-2 bg-gradient-to-b from-primary to-primary/90">
              <Package className="h-6 w-6" />
              <span>Products</span>
            </Button>
            <Button onClick={() => navigate('/brand-portal')} variant="outline" className="h-20 flex-col gap-2 bg-muted/5 hover:bg-muted/20 border-muted/40">
              <BarChart3 className="h-6 w-6" />
              <span>Analytics</span>
            </Button>
            <Button onClick={() => navigate('/brand-portal')} variant="outline" className="h-20 flex-col gap-2 bg-muted/5 hover:bg-muted/20 border-muted/40">
              <Settings className="h-6 w-6" />
              <span>Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>;

  const renderRetailerDashboard = () => <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200/40 dark:border-blue-800/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-full">
                <Store className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Brands</p>
                <p className="text-xl font-bold">5</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-green-200/40 dark:border-green-800/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-500/10 rounded-full">
                <Package className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Products</p>
                <p className="text-xl font-bold">{stats.totalProducts || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 border-purple-200/40 dark:border-purple-800/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-500/10 rounded-full">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sales</p>
                <p className="text-xl font-bold">{stats.totalSales || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 border-emerald-200/40 dark:border-emerald-800/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 rounded-full">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-xl font-bold">{formatPrice(stats.totalRevenue || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-background to-muted/20 border-muted/30 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Store className="h-5 w-5 text-primary" />
            </div>
            Retailer Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button onClick={() => navigate('/retailer-portal')} className="h-20 flex-col gap-2 bg-gradient-to-b from-primary to-primary/90">
              <Package className="h-6 w-6" />
              <span>Inventory</span>
            </Button>
            <Button onClick={() => navigate('/retailer-portal')} variant="outline" className="h-20 flex-col gap-2 bg-muted/5 hover:bg-muted/20 border-muted/40">
              <Store className="h-6 w-6" />
              <span>Brands</span>
            </Button>
            <Button onClick={() => navigate('/retailer-portal')} variant="outline" className="h-20 flex-col gap-2 bg-muted/5 hover:bg-muted/20 border-muted/40">
              <BarChart3 className="h-6 w-6" />
              <span>Analytics</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 pb-20 sm:pb-0">
        <div className="container-responsive mx-auto max-w-6xl p-4">
          {/* Header with Dashboard Header component */}
          <div className="mb-6 bg-card/50 backdrop-blur-sm rounded-lg p-4 border border-muted/20 shadow-sm">
            <DashboardHeader />
          </div>

          {/* Role-based Dashboard Content */}
          {userProfile?.role === 'shopper' && renderShopperDashboard()}
          {userProfile?.role === 'brand' && renderBrandDashboard()}
          {userProfile?.role === 'retailer' && renderRetailerDashboard()}
        </div>
        
        {/* Global Search Modal */}
        <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </ErrorBoundary>
  );
};

export default RoleDashboard;

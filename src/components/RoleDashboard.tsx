import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GlassPanel } from '@/components/ui/glass-panel';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import GlobalSearch from '@/components/GlobalSearch';
import DashboardHeader from '@/components/DashboardHeader';
import AffiliateHub from '@/components/AffiliateHub';
import AiStudioModal from '@/components/AiStudioModal';
import PremiumBanner from '@/components/PremiumBanner';
import { 
  Heart, 
  ShoppingBag, 
  Search, 
  Sparkles, 
  Package, 
  BarChart3, 
  Users, 
  Settings, 
  Store, 
  TrendingUp, 
  Plus, 
  Eye, 
  DollarSign, 
  Globe, 
  Bell, 
  LogOut, 
  User, 
  Archive, 
  Trophy, 
  MapPin, 
  Blocks, 
  WandSparkles,
  ChevronDown,
  ChevronUp,
  Gift
} from 'lucide-react';
import Leaderboard from '@/components/Leaderboard';
import TrendingStylesCarousel from '@/components/TrendingStylesCarousel';
import { UGCCollabButton } from '@/components/ugc/UGCCollabButton';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';
import { FeedbackModal } from '@/components/FeedbackModal';
import { PaymentIntegrationTest } from '@/components/PaymentIntegrationTest';

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
  const { isEnabled } = useFeatureFlags();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeLeaderboard, setActiveLeaderboard] = useState<'global' | 'country'>('global');
  const [aiStudioModalOpen, setAiStudioModalOpen] = useState(false);
  const [isClosetsMinimized, setIsClosetsMinimized] = useState(true);
  const [isAffiliateMinimized, setIsAffiliateMinimized] = useState(true);

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

      console.log('RoleDashboard: User query result:', { data, error, userId: user.id });

      if (error) {
        console.error('Error fetching user profile:', error);
        throw error;
      }

      if (data) {
        console.log('Found user profile:', data, 'Role:', data.role);
        setUserProfile(data);
      } else {
        // User profile doesn't exist, check if role is in user_metadata
        const roleFromMetadata = user.user_metadata?.role || 'shopper';
        console.log('Creating new user profile with role from metadata:', roleFromMetadata);
        
        const defaultProfile = {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: roleFromMetadata as 'shopper' | 'brand' | 'retailer' | 'admin',
          email: user.email!
        };

        const { error: insertError } = await supabase
          .from('users')
          .insert([defaultProfile]);

        if (insertError) {
          console.error('Error creating user profile:', insertError);
          // Even if insert fails, use the profile from metadata
        }
        
        setUserProfile(defaultProfile);
      }
    } catch (error) {
      console.error('Error with user profile:', error);
      // Fallback to user_metadata role if available
      const roleFromMetadata = user.user_metadata?.role || 'shopper';
      const fallbackProfile = {
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        role: roleFromMetadata as 'shopper' | 'brand' | 'retailer' | 'admin',
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

  const handleToyReplicaClick = async () => {
    // Navigate to the toy replica page
    navigate('/toy-replica');
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
      {/* Premium Banner */}
      <PremiumBanner />
      
      {/* Quick Actions */}
      <GlassPanel variant="premium" className="p-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold mb-1">Quick Actions</h2>
            <p className="text-xs text-muted-foreground">Jump into Azyah tools.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={() => navigate('/swipe')}
              className="h-20 flex-col gap-2 bg-white border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
              variant="outline"
            >
              <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
                <Heart className="h-4 w-4 text-red-600" />
              </div>
              <span className="text-sm font-semibold">Swipe</span>
            </Button>
            
            <Button 
              onClick={() => setAiStudioModalOpen(true)}
              className="h-20 flex-col gap-2 bg-white border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 relative"
              variant="outline"
            >
              <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-purple-600" />
              </div>
              <span className="text-sm font-semibold">AI Studio</span>
              <Badge className="absolute -top-1 -right-1 bg-red-100 text-red-600 text-xs px-2 py-0.5 h-5">
                New
              </Badge>
            </Button>
            
            <Button 
              onClick={() => navigate('/wishlist')}
              className="h-20 flex-col gap-2 bg-white border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
              variant="outline"
            >
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                <ShoppingBag className="h-4 w-4 text-gray-600" />
              </div>
              <span className="text-sm font-semibold">Wishlist</span>
            </Button>
            
            <Button 
              onClick={() => navigate('/explore')}
              className="h-20 flex-col gap-2 bg-white border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
              variant="outline"
            >
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                <Search className="h-4 w-4 text-gray-600" />
              </div>
              <span className="text-sm font-semibold">Explore</span>
            </Button>
            
            {isEnabled('ai_beauty_consultant') ? (
              <Button 
                disabled
                className="h-20 flex-col gap-2 bg-white border border-border shadow-sm opacity-60 cursor-not-allowed relative"
                variant="outline"
                data-qa="qa-beauty"
              >
                <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center">
                  <WandSparkles className="h-4 w-4 text-orange-600" />
                </div>
                <span className="text-sm font-semibold">Beauty Guide</span>
                <Badge className="absolute -top-1 -right-1 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 h-5">
                  Soon
                </Badge>
              </Button>
            ) : (
              <Button 
                onClick={() => navigate('/fashion-feed')}
                className="h-20 flex-col gap-2 bg-white border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
                variant="outline"
              >
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                  <Users className="h-4 w-4 text-gray-600" />
                </div>
                <span className="text-sm font-semibold">Feed</span>
              </Button>
            )}
            
            <div className="col-span-2">
              <UGCCollabButton />
            </div>
            
            <Button 
              onClick={handleToyReplicaClick}
              className="col-span-2 h-20 flex-row gap-3 bg-white border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 relative justify-start px-4"
              variant="outline"
            >
              <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                <Blocks className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm font-semibold">Toy Replica</span>
              <Badge className="ml-auto bg-green-100 text-green-600 text-xs px-2 py-0.5 h-5">
                AI
              </Badge>
            </Button>
          </div>
        </div>
      </GlassPanel>
      {/* Trending Styles Carousel */}
      <GlassPanel variant="premium" className="p-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold mb-1">Trending Styles</h2>
            <p className="text-xs text-muted-foreground">Discover what's trending now.</p>
          </div>
          <TrendingStylesCarousel limit={6} />
        </div>
      </GlassPanel>

      {/* Affiliate Hub */}
      <GlassPanel variant="premium" className="p-6">
        <Collapsible open={!isAffiliateMinimized} onOpenChange={(open) => setIsAffiliateMinimized(!open)}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <div className="flex items-center gap-3">
                <Gift className="h-4 w-4 text-primary" />
                <span className="text-lg font-bold">Affiliate Hub</span>
              </div>
              {isAffiliateMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <AffiliateHub showTitle={false} />
          </CollapsibleContent>
        </Collapsible>
      </GlassPanel>

      {/* My Closets */}
      <GlassPanel variant="premium" className="p-6">
        <Collapsible open={!isClosetsMinimized} onOpenChange={(open) => setIsClosetsMinimized(!open)}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="justify-start p-0 h-auto">
                  <div className="flex items-center gap-3">
                    <Archive className="h-4 w-4 text-primary" />
                    <span className="text-lg font-bold">My Closets</span>
                    {isClosetsMinimized ? <ChevronDown className="h-4 w-4 ml-2" /> : <ChevronUp className="h-4 w-4 ml-2" />}
                  </div>
                </Button>
              </CollapsibleTrigger>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/closets')}
                className="rounded-full border-primary text-primary hover:bg-primary hover:text-white"
              >
                View All
              </Button>
            </div>
            <CollapsibleContent>
              <div className="text-center py-8 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <Archive className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Start a closet to organize your discoveries
                </p>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </GlassPanel>

      {/* Fashion Leaderboards */}
      <GlassPanel variant="premium" className="p-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold mb-1">Fashion Leaderboards</h2>
            <p className="text-xs text-muted-foreground">See how you rank among fellow fashion enthusiasts.</p>
          </div>
          
          {/* Scope tabs */}
          <div className="flex space-x-0 bg-muted rounded-full p-1">
            <Button
              onClick={() => setActiveLeaderboard('global')}
              variant={activeLeaderboard === 'global' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 rounded-full text-sm font-medium"
            >
              Global
            </Button>
            <Button
              onClick={() => setActiveLeaderboard('country')}
              variant={activeLeaderboard === 'country' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 rounded-full text-sm font-medium"
            >
              Country
            </Button>
          </div>
          
          {/* Time period tabs */}
          <div className="flex justify-center space-x-0">
            <div className="flex bg-muted rounded-full p-1">
              <Button variant="default" size="sm" className="px-3 py-1.5 rounded-full text-xs font-medium">
                This Week
              </Button>
              <Button variant="ghost" size="sm" className="px-3 py-1.5 rounded-full text-xs font-medium">
                This Month
              </Button>
              <Button variant="ghost" size="sm" className="px-3 py-1.5 rounded-full text-xs font-medium">
                All Time
              </Button>
            </div>
          </div>
          
          {/* Your rank spotlight */}
          <div className="bg-gradient-to-r from-primary/5 to-transparent p-3 rounded-xl border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Trophy className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Your Current Rank</p>
                <p className="text-xs text-muted-foreground">#1 globally</p>
              </div>
            </div>
          </div>
          
          <Leaderboard type={activeLeaderboard} country={user?.user_metadata?.country} />
        </div>
      </GlassPanel>

      {/* Feedback Section */}
      <div className="flex justify-end">
        <FeedbackModal userType="shopper" />
      </div>
    </div>
  );

  const renderBrandDashboard = () => (
    <div className="space-y-4">

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

          {/* Role-based Dashboard Content - Only render ONE dashboard */}
          {userProfile?.role === 'shopper' && renderShopperDashboard()}
          {userProfile?.role === 'brand' && renderBrandDashboard()}
          {userProfile?.role === 'retailer' && renderRetailerDashboard()}
          {userProfile?.role === 'admin' && (
            <div className="space-y-4">
              <GlassPanel variant="premium" className="p-8">
                <div className="text-center space-y-4">
                  <h2 className="text-2xl font-cormorant font-semibold">Admin Dashboard</h2>
                  <p className="text-muted-foreground">
                    As an admin, you have access to all portals. Choose which portal to access:
                  </p>
                  <div className="flex flex-wrap gap-4 justify-center">
                    <Button onClick={() => navigate('/brand-portal')} variant="premium">
                      <Package className="h-4 w-4 mr-2" />
                      Brand Portal
                    </Button>
                    <Button onClick={() => navigate('/retailer-portal')} variant="outline">
                      <Store className="h-4 w-4 mr-2" />
                      Retailer Portal
                    </Button>
                  </div>
                </div>
              </GlassPanel>
              
              {/* Payment Integration Test */}
              <PaymentIntegrationTest />
            </div>
          )}
          
          {/* Show error if no valid role */}
          {userProfile && !['shopper', 'brand', 'retailer', 'admin'].includes(userProfile.role) && (
            <div className="space-y-4">
              <GlassPanel variant="premium" className="p-8">
                <div className="text-center space-y-4">
                  <h2 className="text-xl font-semibold text-destructive">Invalid Role</h2>
                  <p className="text-muted-foreground">
                    Your account role "{userProfile.role}" is not recognized. Please contact support.
                  </p>
                </div>
              </GlassPanel>
            </div>
          )}
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

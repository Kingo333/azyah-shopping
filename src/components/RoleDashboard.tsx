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
    <div className="space-y-6">
      {/* Hero Welcome Section */}
      <GlassPanel variant="subtle" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
        <div className="relative p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-foreground mb-2">
                Welcome back, {userProfile.name || 'Fashionista'}
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Discover new styles picked for you
              </p>
            </div>
            <div className="text-right ml-6">
              <div className="text-3xl font-bold text-primary mb-1">
                {stats.totalWishlistItems || 0}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                Items Saved
              </div>
            </div>
          </div>
          
          <div className="flex justify-start">
            <PremiumBanner />
          </div>
        </div>
      </GlassPanel>

      {/* Quick Actions */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          
          {/* Shopping Tools */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Shopping Tools</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 border-border bg-card hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:shadow-md"
                onClick={() => navigate('/swipe')}
              >
                <Heart className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Swipe</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 border-border bg-card hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:shadow-md"
                onClick={() => navigate('/wishlist')}
              >
                <ShoppingBag className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Wishlist</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 border-border bg-card hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:shadow-md"
                onClick={() => navigate('/explore')}
              >
                <Search className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Explore</span>
              </Button>
            </div>
          </div>

          {/* AI Tools */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">AI Tools</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 border-border bg-card hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:shadow-md relative"
                onClick={() => setAiStudioModalOpen(true)}
              >
                <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                  New
                </div>
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">AI Studio</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 border-border bg-card hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:shadow-md"
                onClick={() => navigate('/toy-replica')}
              >
                <Blocks className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Toy Replica</span>
              </Button>
              
              {isEnabled('ai_beauty_consultant') ? (
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 border-border bg-card opacity-60 cursor-not-allowed relative"
                  disabled
                >
                  <div className="absolute -top-1 -right-1 bg-muted-foreground/20 text-muted-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                    Soon
                  </div>
                  <WandSparkles className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Beauty Guide</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2 border-border bg-card hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:shadow-md"
                  onClick={() => navigate('/fashion-feed')}
                >
                  <Users className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Feed</span>
                </Button>
              )}
            </div>
          </div>

          {/* Collaboration */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Collaboration</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <UGCCollabButton />
            </div>
          </div>
        </div>
      </div>

      {/* Trending Styles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Trending Styles</h2>
            <p className="text-sm text-muted-foreground mt-1">Discover what's popular right now</p>
          </div>
          <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10" onClick={() => navigate('/trending-styles')}>
            View All
          </Button>
        </div>
        <div className="bg-gradient-to-r from-card to-card/50 rounded-lg p-1">
          <TrendingStylesCarousel limit={8} />
        </div>
      </div>

      {/* My Closets */}
      <Collapsible>
        <GlassPanel variant="default">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-6 h-auto hover:bg-transparent"
            >
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-background" />
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 border-2 border-background" />
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary/20 to-accent/20 border-2 border-background flex items-center justify-center">
                    <span className="text-xs font-medium text-muted-foreground">+3</span>
                  </div>
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-foreground">
                    My Closets
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your curated fashion collections
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-primary border-primary/30 hover:bg-primary/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/closets');
                  }}
                >
                  View All
                </Button>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-6 pb-6">
            <div className="grid grid-cols-2 gap-3 mt-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="bg-card border border-border rounded-lg p-3 hover:shadow-sm transition-shadow">
                  <div className="aspect-square bg-gradient-to-br from-muted/50 to-muted rounded-md mb-2" />
                  <p className="text-sm font-medium text-foreground line-clamp-1">Collection {item}</p>
                  <p className="text-xs text-muted-foreground">{Math.floor(Math.random() * 20) + 5} items</p>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </GlassPanel>
      </Collapsible>

      {/* Affiliate Hub */}
      <Collapsible>
        <GlassPanel variant="default">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-6 h-auto hover:bg-transparent"
            >
              <div className="text-left">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Affiliate Hub
                </h3>
                <p className="text-sm text-muted-foreground">
                  Earn when your picks inspire purchases
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-6 pb-6">
            <AffiliateHub />
          </CollapsibleContent>
        </GlassPanel>
      </Collapsible>

      {/* Fashion Leaderboards */}
      <GlassPanel variant="subtle" className="space-y-4">
        <div className="flex items-center justify-between p-6 pb-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Fashion Leaderboards</h2>
            <p className="text-sm text-muted-foreground mt-1">See how you rank among fashion enthusiasts</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={activeLeaderboard === 'global' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setActiveLeaderboard('global')} 
              className="text-xs"
            >
              <Globe className="h-3 w-3 mr-1" />
              Global
            </Button>
            <Button 
              variant={activeLeaderboard === 'country' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setActiveLeaderboard('country')} 
              className="text-xs"
            >
              <MapPin className="h-3 w-3 mr-1" />
              Country
            </Button>
          </div>
        </div>
        <div className="px-6 pb-6">
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

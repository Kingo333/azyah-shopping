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
  ChevronRight,
  Gift,
  Star,
  Camera
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
  wishlistItems?: number;
  cartItems?: number;
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
  const [showAiStudio, setShowAiStudio] = useState(false);
  const [showUGCCollab, setShowUGCCollab] = useState(false);

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
        wishlistItems: wishlistData?.data?.length || 0,
        cartItems: cartData?.data?.length || 0
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
        wishlistItems: 0,
        cartItems: 0,
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
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-background to-muted/30 rounded-2xl p-8 border border-border/50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Welcome back, {userProfile?.name || 'Fashionista'}! 👋
            </h1>
            <p className="text-muted-foreground text-lg">
              Ready to discover your next favorite piece?
            </p>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.wishlistItems || 0}</div>
              <div className="text-sm text-muted-foreground">Wishlist Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.cartItems || 0}</div>
              <div className="text-sm text-muted-foreground">Cart Items</div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Shopping Actions */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Quick Actions</h2>
          <p className="text-muted-foreground text-sm">Jump into your favorite shopping activities</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            onClick={() => navigate('/swipe')}
            className="h-24 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 border-0 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Heart className="w-8 h-8" />
            <div className="text-center">
              <div className="font-semibold">Swipe Mode</div>
              <div className="text-xs opacity-90">Discover your style</div>
            </div>
          </Button>
          
          <Button
            onClick={() => navigate('/wishlist')}
            className="h-24 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground hover:from-secondary/90 hover:to-secondary/70 border-0 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Star className="w-8 h-8" />
            <div className="text-center">
              <div className="font-semibold">My Wishlist</div>
              <div className="text-xs opacity-90">Saved favorites</div>
            </div>
          </Button>
        </div>

        {/* AI & Discovery Tools */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Button
            onClick={() => setShowAiStudio(true)}
            className="h-20 flex flex-col items-center justify-center gap-2 bg-card hover:bg-accent text-card-foreground border border-border rounded-xl transition-all duration-200 relative group"
            variant="outline"
          >
            <Sparkles className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
            <span className="font-medium text-sm">AI Studio</span>
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">New</span>
          </Button>
          
          <Button
            onClick={() => navigate('/image-search')}
            className="h-20 flex flex-col items-center justify-center gap-2 bg-card hover:bg-accent text-card-foreground border border-border rounded-xl transition-all duration-200 group"
            variant="outline"
          >
            <Camera className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
            <span className="font-medium text-sm">Visual Search</span>
          </Button>
          
          <Button
            onClick={() => setShowUGCCollab(true)}
            className="h-20 flex flex-col items-center justify-center gap-2 bg-card hover:bg-accent text-card-foreground border border-border rounded-xl transition-all duration-200 group"
            variant="outline"
          >
            <Users className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
            <span className="font-medium text-sm">UGC Collab</span>
          </Button>
          
          <Button
            onClick={() => navigate('/beauty-consultant')}
            className="h-20 flex flex-col items-center justify-center gap-2 bg-card hover:bg-accent text-card-foreground border border-border rounded-xl transition-all duration-200 relative group"
            variant="outline"
          >
            <Sparkles className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
            <span className="font-medium text-sm">Beauty Guide</span>
            <span className="absolute -top-1 -right-1 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">Soon</span>
          </Button>
        </div>
      </div>

      {/* Trending Styles Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Trending Now</h2>
            <p className="text-muted-foreground text-sm">What's hot in fashion right now</p>
          </div>
          <Button 
            onClick={() => navigate('/trending-styles')} 
            variant="ghost" 
            size="sm"
            className="text-primary hover:text-primary/80 hover:bg-primary/10"
          >
            View All <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <ErrorBoundary>
          <TrendingStylesCarousel />
        </ErrorBoundary>
      </div>

      {/* My Closets Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">My Closets</h2>
            <p className="text-muted-foreground text-sm">Organize and manage your style collections</p>
          </div>
          <Button 
            onClick={() => navigate('/closets')} 
            variant="ghost" 
            size="sm"
            className="text-primary hover:text-primary/80 hover:bg-primary/10"
          >
            Manage <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="bg-gradient-to-r from-card to-muted/30 border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-card-foreground">Organize Your Style</h3>
              <p className="text-muted-foreground">Create collections and manage your favorite looks</p>
            </div>
            <Button 
              onClick={() => navigate('/closets')} 
              className="bg-primary hover:bg-primary/90 shadow-lg"
            >
              Open Closets
            </Button>
          </div>
        </div>
      </div>

      {/* Premium Upsell - Strategically placed */}
      <PremiumBanner />

      {/* Community & Rewards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Affiliate Hub */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Affiliate Rewards</h2>
              <p className="text-muted-foreground text-sm">Earn while you shop</p>
            </div>
            <Button 
              onClick={() => navigate('/affiliate')} 
              variant="ghost" 
              size="sm"
              className="text-primary hover:text-primary/80 hover:bg-primary/10"
            >
              View Hub <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <ErrorBoundary>
            <AffiliateHub />
          </ErrorBoundary>
        </div>

        {/* Leaderboards */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Community Leaders</h2>
            <p className="text-muted-foreground text-sm">See who's trending</p>
          </div>
          <ErrorBoundary>
            <Leaderboard />
          </ErrorBoundary>
        </div>
      </div>

      {/* Feedback Section */}
      <div className="flex justify-end pt-4">
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
          open={aiStudioModalOpen || showAiStudio} 
          onClose={() => {
            setAiStudioModalOpen(false);
            setShowAiStudio(false);
          }} 
        />
        
        {/* UGC Collab Modal */}
        {showUGCCollab && (
          <UGCCollabButton />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default RoleDashboard;

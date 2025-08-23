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
    <div className="min-h-screen bg-[hsl(var(--surface-alt))]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-[hsl(var(--surface))]/95 backdrop-blur-sm border-b border-[hsl(var(--border-luxury))] h-14">
        <div className="max-w-7xl mx-auto px-5 flex items-center justify-between h-full">
          <h1 className="text-lg font-bold text-[hsl(var(--brand-primary))]">Azyah</h1>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSearchOpen(true)}>
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate('/profile')}>
              <User className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-5 py-6 space-y-8">
        {/* Hero Spotlight */}
        <div className="relative h-40 rounded-2xl overflow-hidden bg-gradient-to-r from-[hsl(var(--surface))] to-[hsl(var(--surface-alt))] border border-[hsl(var(--border-luxury))] shadow-[var(--shadow-soft)]">
          <div className="absolute inset-0 p-5 flex items-center justify-between">
            <div className="space-y-3">
              <div>
                <h2 className="text-xl font-semibold text-[hsl(var(--ink))]">Welcome back</h2>
                <p className="text-sm text-[hsl(var(--ink-muted))]">Discover new styles picked for you</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-[hsl(var(--brand-primary))] text-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/5"
                onClick={() => navigate('/premium')}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Upgrade to Premium
              </Button>
            </div>
            <div className="hidden sm:block w-32 h-32 rounded-2xl bg-gradient-to-br from-[hsl(var(--brand-primary))]/10 to-[hsl(var(--brand-primary))]/5 border border-[hsl(var(--brand-primary))]/20"></div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[hsl(var(--ink))] mb-1">Quick Actions</h2>
            <p className="text-sm text-[hsl(var(--ink-muted))]">Jump into Azyah tools</p>
          </div>
          
          {/* Shopping Tools */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-[hsl(var(--ink-muted))] uppercase tracking-wide">Shopping Tools</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Button 
                onClick={() => navigate('/swipe')} 
                variant="outline"
                className="h-20 flex-col gap-2 bg-[hsl(var(--surface))] border-[hsl(var(--border-luxury))] shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-card)] hover:scale-[0.98] transition-all duration-150"
              >
                <Heart className="h-6 w-6 text-[hsl(var(--brand-primary))]" />
                <span className="text-sm font-medium">Swipe</span>
              </Button>
              <Button 
                onClick={() => navigate('/wishlist')} 
                variant="outline"
                className="h-20 flex-col gap-2 bg-[hsl(var(--surface))] border-[hsl(var(--border-luxury))] shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-card)] hover:scale-[0.98] transition-all duration-150"
              >
                <ShoppingBag className="h-6 w-6 text-[hsl(var(--ink))]" />
                <span className="text-sm font-medium">Wishlist</span>
              </Button>
              <Button 
                onClick={() => navigate('/explore')} 
                variant="outline"
                className="h-20 flex-col gap-2 bg-[hsl(var(--surface))] border-[hsl(var(--border-luxury))] shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-card)] hover:scale-[0.98] transition-all duration-150"
              >
                <Search className="h-6 w-6 text-[hsl(var(--ink))]" />
                <span className="text-sm font-medium">Explore</span>
              </Button>
            </div>
          </div>

          {/* AI Tools */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-[hsl(var(--ink-muted))] uppercase tracking-wide">AI Tools</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Button 
                onClick={() => setAiStudioModalOpen(true)}
                variant="outline" 
                className="relative h-20 flex-col gap-2 bg-[hsl(var(--surface))] border-[hsl(var(--border-luxury))] shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-card)] hover:scale-[0.98] transition-all duration-150"
              >
                <Sparkles className="h-6 w-6 text-[hsl(var(--info))]" />
                <span className="text-sm font-medium">AI Studio</span>
                <Badge className="absolute -top-1 -right-1 text-xs px-1.5 py-0.5 h-5 bg-[hsl(var(--brand-primary))]/10 text-[hsl(var(--brand-primary))] border-[hsl(var(--brand-primary))]/20">
                  New
                </Badge>
              </Button>
              <Button 
                onClick={handleToyReplicaClick}
                variant="outline" 
                className="h-20 flex-col gap-2 bg-[hsl(var(--surface))] border-[hsl(var(--border-luxury))] shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-card)] hover:scale-[0.98] transition-all duration-150"
              >
                <Blocks className="h-6 w-6 text-[hsl(var(--success))]" />
                <span className="text-sm font-medium">Toy Replica</span>
              </Button>
              {isEnabled('ai_beauty_consultant') ? (
                <Button 
                  variant="outline"
                  className="relative h-20 flex-col gap-2 bg-[hsl(var(--surface))] border-[hsl(var(--border-luxury))] shadow-[var(--shadow-soft)] cursor-not-allowed opacity-60"
                  data-qa="qa-beauty"
                  disabled
                >
                  <WandSparkles className="h-6 w-6 text-[hsl(var(--warning))]" />
                  <span className="text-sm font-medium">Beauty Guide</span>
                  <Badge className="absolute -top-1 -right-1 text-xs px-1.5 py-0.5 h-5 bg-gray-100 text-gray-600 border-gray-200">
                    Soon
                  </Badge>
                </Button>
              ) : null}
            </div>
          </div>

          {/* Collab */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-[hsl(var(--ink-muted))] uppercase tracking-wide">Collab</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <UGCCollabButton />
            </div>
          </div>
        </div>

        {/* Trending Styles */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[hsl(var(--ink))] mb-1">Trending Styles</h2>
            <p className="text-sm text-[hsl(var(--ink-muted))]">Discover what's trending now</p>
          </div>
          <div className="bg-[hsl(var(--surface))] rounded-2xl border border-[hsl(var(--border-luxury))] shadow-[var(--shadow-soft)] p-4">
            <TrendingStylesCarousel limit={8} />
          </div>
        </div>

        {/* Affiliate Hub */}
        <div className="bg-[hsl(var(--surface))] rounded-2xl border border-[hsl(var(--border-luxury))] shadow-[var(--shadow-soft)] p-4">
          <Collapsible open={!isAffiliateMinimized} onOpenChange={(open) => setIsAffiliateMinimized(!open)}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                <div className="flex items-center gap-3">
                  <Gift className="h-5 w-5 text-[hsl(var(--brand-primary))]" />
                  <h3 className="text-lg font-semibold text-[hsl(var(--ink))]">Affiliate Hub</h3>
                </div>
                {isAffiliateMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            {isAffiliateMinimized && (
              <p className="text-sm text-[hsl(var(--ink-muted))] mt-2">Earn when your picks inspire purchases</p>
            )}
            <CollapsibleContent className="mt-4">
              <AffiliateHub showTitle={false} />
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* My Closets */}
        <div className="bg-[hsl(var(--surface))] rounded-2xl border border-[hsl(var(--border-luxury))] shadow-[var(--shadow-soft)] p-4">
          <Collapsible open={!isClosetsMinimized} onOpenChange={(open) => setIsClosetsMinimized(!open)}>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="justify-start p-0 h-auto hover:bg-transparent">
                  <div className="flex items-center gap-3">
                    <Archive className="h-5 w-5 text-[hsl(var(--brand-primary))]" />
                    <h3 className="text-lg font-semibold text-[hsl(var(--ink))]">My Closets</h3>
                    {isClosetsMinimized ? <ChevronDown className="h-4 w-4 ml-2" /> : <ChevronUp className="h-4 w-4 ml-2" />}
                  </div>
                </Button>
              </CollapsibleTrigger>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/closets')}
                className="border-[hsl(var(--brand-primary))] text-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/5"
              >
                View All
              </Button>
            </div>
            <CollapsibleContent className="mt-4">
              <div className="text-center py-8 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-[hsl(var(--brand-primary))]/10 flex items-center justify-center">
                  <Archive className="h-6 w-6 text-[hsl(var(--brand-primary))]/60" />
                </div>
                <p className="text-sm text-[hsl(var(--ink-muted))]">
                  Create your first closet to organize your style discoveries
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Fashion Leaderboards */}
        <div className="bg-[hsl(var(--surface))] rounded-2xl border border-[hsl(var(--border-luxury))] shadow-[var(--shadow-soft)] p-4 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[hsl(var(--ink))] mb-1">Fashion Leaderboards</h2>
            <p className="text-sm text-[hsl(var(--ink-muted))]">See how you rank among fashion enthusiasts</p>
          </div>

          {/* Scope and Time Period Combined Tabs */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex gap-1 p-1 bg-[hsl(var(--surface-alt))] rounded-full border border-[hsl(var(--border-luxury))]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveLeaderboard('global')}
                className={`flex-1 rounded-full h-8 text-xs ${
                  activeLeaderboard === 'global' 
                    ? 'bg-[hsl(var(--brand-primary))]/10 text-[hsl(var(--brand-primary))] border border-[hsl(var(--brand-primary))]/20' 
                    : 'text-[hsl(var(--ink-muted))] hover:bg-[hsl(var(--surface-alt))]'
                }`}
              >
                Global
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveLeaderboard('country')}
                className={`flex-1 rounded-full h-8 text-xs ${
                  activeLeaderboard === 'country' 
                    ? 'bg-[hsl(var(--brand-primary))]/10 text-[hsl(var(--brand-primary))] border border-[hsl(var(--brand-primary))]/20' 
                    : 'text-[hsl(var(--ink-muted))] hover:bg-[hsl(var(--surface-alt))]'
                }`}
              >
                Country
              </Button>
            </div>
            <div className="flex gap-1 p-1 bg-[hsl(var(--surface-alt))] rounded-full border border-[hsl(var(--border-luxury))]">
              <Button variant="ghost" size="sm" className="flex-1 rounded-full h-8 text-xs bg-[hsl(var(--brand-primary))]/10 text-[hsl(var(--brand-primary))] border border-[hsl(var(--brand-primary))]/20">
                Week
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 rounded-full h-8 text-xs text-[hsl(var(--ink-muted))] hover:bg-[hsl(var(--surface-alt))]">
                Month
              </Button>
            </div>
          </div>

          {/* Your Rank Card */}
          <div className="relative p-4 rounded-2xl bg-gradient-to-r from-[hsl(var(--brand-primary))]/5 to-[hsl(var(--brand-primary))]/10 border border-[hsl(var(--brand-primary))]/20">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-[hsl(var(--brand-primary))]/20 flex items-center justify-center">
                <Trophy className="h-4 w-4 text-[hsl(var(--brand-primary))]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[hsl(var(--ink))]">Your Current Rank</p>
                <p className="text-xs text-[hsl(var(--ink-muted))]">Top 5% this week</p>
              </div>
              <div className="text-2xl font-bold text-[hsl(var(--brand-primary))]">#1</div>
            </div>
            <div className="mt-3 w-full bg-[hsl(var(--surface-alt))] rounded-full h-1.5">
              <div className="bg-[hsl(var(--brand-primary))] h-1.5 rounded-full w-4/5"></div>
            </div>
          </div>

          {/* Leaderboard List */}
          <Leaderboard />
        </div>
      </div>

      <AiStudioModal 
        open={aiStudioModalOpen} 
        onClose={() => setAiStudioModalOpen(false)} 
      />
      
      <FeedbackModal userType="shopper" />
      <PaymentIntegrationTest />
      
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl mx-auto p-4">
            <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
            <Button 
              variant="ghost" 
              onClick={() => setSearchOpen(false)}
              className="absolute top-2 right-2"
            >
              ×
            </Button>
          </div>
        </div>
      )}
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
          {/* Header with Dashboard Header component - only for non-shopper roles */}
          {userProfile?.role !== 'shopper' && (
            <div className="mb-6">
              <DashboardHeader />
            </div>
          )}

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
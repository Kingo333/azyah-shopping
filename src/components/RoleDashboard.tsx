import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SEOHead } from '@/components/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GlassPanel } from '@/components/ui/glass-panel';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import GlobalSearch from '@/components/GlobalSearch';
import DashboardHeader from '@/components/DashboardHeader';
import AffiliateHub from '@/components/AffiliateHub';
import AiStudioModal from '@/components/AiStudioModal';
import PremiumBanner from '@/components/PremiumBanner';
import { Heart, ShoppingBag, Search, Sparkles, Package, BarChart3, Users, Settings, Store, TrendingUp, Plus, Eye, DollarSign, Globe, Bell, LogOut, User, Archive, Trophy, MapPin, Blocks, WandSparkles, ChevronDown, ChevronUp, Gift, ChevronLeft, ChevronRight, Home, Filter, CalendarIcon } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import MinimizedLeaderboard from '@/components/MinimizedLeaderboard';
import TrendingStylesCarousel from '@/components/TrendingStylesCarousel';
import { UGCCollabButton } from '@/components/ugc/UGCCollabButton';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';
import { FeedbackModal } from '@/components/FeedbackModal';
import { TutorialTooltip } from '@/components/ui/tutorial-tooltip';
import { PaymentIntegrationTest } from '@/components/PaymentIntegrationTest';
import { ProfileCompletionBanner } from '@/components/ProfileCompletionBanner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CATEGORY_TREE, getCategoryDisplayName } from '@/lib/categories';
import type { TopCategory } from '@/lib/categories';
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
  const {
    user,
    signOut
  } = useAuth();
  console.log('RoleDashboard: user state:', user);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    toast
  } = useToast();
  const {
    isEnabled
  } = useFeatureFlags();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeLeaderboard, setActiveLeaderboard] = useState<'global' | 'country'>('global');
  const [aiStudioModalOpen, setAiStudioModalOpen] = useState(false);
  const [isClosetsMinimized, setIsClosetsMinimized] = useState(true);
  const [isAffiliateMinimized, setIsAffiliateMinimized] = useState(true);
  const [selectedTrendingCategory, setSelectedTrendingCategory] = useState<TopCategory | null>(null);
  const [isTrendingFilterOpen, setIsTrendingFilterOpen] = useState(false);

  // Load saved category selection on component mount
  useEffect(() => {
    const savedCategory = localStorage.getItem('selectedTrendingCategory');
    if (savedCategory && savedCategory !== 'null') {
      setSelectedTrendingCategory(savedCategory as TopCategory);
    }
  }, []);

  // Save category selection to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('selectedTrendingCategory', selectedTrendingCategory || 'null');
  }, [selectedTrendingCategory]);

  useEffect(() => {
    // Set correct page title
    document.title = 'Azyah - Fashion Discovery Platform';
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

  // Remove automatic redirects - let users access dashboard or choose their portal
  const fetchUserProfile = async () => {
    if (!user) return;
    console.log('Fetching user profile for:', user.id);
    try {
      const {
        data,
        error
      } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
      console.log('RoleDashboard: User query result:', {
        data,
        error,
        userId: user.id
      });
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
        const {
          error: insertError
        } = await supabase.from('users').insert([defaultProfile]);
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
      const [wishlistData, cartData] = await Promise.all([supabase.from('wishlist_items').select('*').eq('wishlist_id', user.id), supabase.from('cart_items').select('*').eq('user_id', user.id)]);
      const dashboardStats: DashboardStats = {
        totalWishlistItems: wishlistData?.data?.length || 0,
        totalCartItems: cartData?.data?.length || 0
      };

      // Role-specific stats
      if (userProfile?.role === 'brand' || userProfile?.role === 'retailer') {
        try {
          const {
            data: products
          } = await supabase.from('products').select('*').eq(userProfile.role === 'brand' ? 'brand_id' : 'retailer_id', user.id);
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
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading dashboard...</p>
        </div>
      </div>;
  }

  // Show sign-in prompt if no user
  if (!user) {
    console.log('No user, showing sign-in prompt');
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Welcome to Azyah</h2>
          <p className="text-muted-foreground">Please sign in to access your dashboard</p>
          <Button onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        </div>
      </div>;
  }
  if (!userProfile) {
    console.log('No user profile, showing error');
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p>Error loading profile</p>
        </div>
      </div>;
  }
  console.log('Rendering dashboard for user:', userProfile);
  const renderShopperDashboard = () => <div className="space-y-6">
      {/* Profile Completion Banner */}
      <ProfileCompletionBanner />
      
      {/* Premium Banner */}
      <PremiumBanner />

      {/* Quick Actions - Horizontal Pills */}
      <section className="px-4 pt-3">
        <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] scrollbar-hide">
          {/* Home Chip */}
          <TutorialTooltip content="Return to your personalized dashboard with all your fashion insights and recommendations." feature="home">
            <button
              onClick={() => navigate('/dashboard')}
              className={`flex items-center justify-center p-2 h-9 w-9 rounded-lg transition-colors font-medium text-sm flex-shrink-0 ${
                location.pathname === '/dashboard' 
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                  : 'bg-background border border-border hover:bg-accent'
              }`}
            >
              <Home className="h-4 w-4" />
            </button>
          </TutorialTooltip>

          {/* Shop Chip */}
          <TutorialTooltip content="Swipe through fashion items to discover your style. Swipe right to like items and build your personal taste profile." feature="swipe">
            <button
              onClick={() => navigate('/swipe')}
              className="flex items-center gap-2 px-3 py-2 h-9 rounded-lg bg-background border border-border hover:bg-accent transition-colors font-medium text-sm whitespace-nowrap flex-shrink-0 min-w-fit"
            >
              <Heart className="h-4 w-4" />
              Shop
            </button>
          </TutorialTooltip>

          {/* AI Studio Chip with New Badge */}
          <TutorialTooltip content="Create AI-generated fashion content and try-on experiences. Upload photos and use AI to enhance your style." feature="ai-studio">
            <button
              onClick={() => setAiStudioModalOpen(true)}
              className="relative flex items-center gap-2 px-3 py-2 h-9 rounded-lg bg-background border border-border hover:bg-accent transition-colors font-medium text-sm whitespace-nowrap flex-shrink-0 min-w-fit"
            >
              <Sparkles className="h-4 w-4" />
              AI Studio
              <span className="absolute -top-0.5 -right-0.5 bg-muted text-muted-foreground text-[11px] px-1.5 py-0.5 rounded-full leading-none">
                New
              </span>
            </button>
          </TutorialTooltip>

          {/* Beauty Chip */}
          {isEnabled('ai_beauty_consultant') && (
            <TutorialTooltip content="Get personalized beauty advice from our AI consultant. Upload photos and receive tailored recommendations." feature="beauty-consultant">
              <button
                onClick={() => navigate('/beauty-consultant')}
                className="relative flex items-center gap-2 px-3 py-2 h-9 rounded-lg bg-background border border-border hover:bg-accent transition-colors font-medium text-sm whitespace-nowrap flex-shrink-0 min-w-fit"
              >
                <WandSparkles className="h-4 w-4" />
                Beauty
                <span className="absolute -top-0.5 -right-0.5 bg-muted text-muted-foreground text-[11px] px-1.5 py-0.5 rounded-full leading-none">
                  New
                </span>
              </button>
            </TutorialTooltip>
          )}

          {/* Fashion Feed Chip - when beauty is not enabled */}
          {!isEnabled('ai_beauty_consultant') && (
            <TutorialTooltip content="Connect with the fashion community. Share your style and discover what others are wearing." feature="fashion-feed">
              <button
                onClick={() => navigate('/fashion-feed')}
                className="flex items-center gap-2 px-3 py-2 h-9 rounded-lg bg-background border border-border hover:bg-accent transition-colors font-medium text-sm whitespace-nowrap flex-shrink-0 min-w-fit"
              >
                <Users className="h-4 w-4" />
                Feed
              </button>
            </TutorialTooltip>
          )}

          {/* Wishlist Chip */}
          <TutorialTooltip content="Save items you love to your wishlist. Keep track of favorites and shop them later when you're ready." feature="wishlist">
            <button
              onClick={() => navigate('/wishlist')}
              className="flex items-center gap-2 px-3 py-2 h-9 rounded-lg bg-background border border-border hover:bg-accent transition-colors font-medium text-sm whitespace-nowrap flex-shrink-0 min-w-fit"
            >
              <ShoppingBag className="h-4 w-4" />
              Wishlist
            </button>
          </TutorialTooltip>

          {/* Explore Chip */}
          <TutorialTooltip content="Search and discover products from top brands. Use filters to find exactly what you're looking for." feature="explore">
            <button
              onClick={() => navigate('/explore')}
              className="flex items-center gap-2 px-3 py-2 h-9 rounded-lg bg-background border border-border hover:bg-accent transition-colors font-medium text-sm whitespace-nowrap flex-shrink-0 min-w-fit"
            >
              <Search className="h-4 w-4" />
              Explore
            </button>
          </TutorialTooltip>

          {/* UGC Collab Chip */}
          <TutorialTooltip content="Collaborate with brands on user-generated content. Apply for brand partnerships and create sponsored content." feature="ugc-collab">
            <UGCCollabButton className="flex items-center gap-2 px-3 py-2 h-9 rounded-lg bg-background border border-border hover:bg-accent transition-colors font-medium text-sm whitespace-nowrap flex-shrink-0 min-w-fit" />
          </TutorialTooltip>

          {/* Events Chip */}
          <TutorialTooltip content="Discover upcoming fashion events and try on the latest collections virtually from retailers." feature="events">
            <button
              onClick={() => navigate('/events')}
              className="flex items-center gap-2 px-3 py-2 h-9 rounded-lg bg-background border border-border hover:bg-accent transition-colors font-medium text-sm whitespace-nowrap flex-shrink-0 min-w-fit"
            >
              <CalendarIcon className="h-4 w-4" />
              Events
            </button>
          </TutorialTooltip>

          {/* Toy Replica Chip */}
          <TutorialTooltip content="Create AI-generated toy replicas of fashion items. Upload photos and get miniature versions for play or display." feature="toy-replica">
            <button
              onClick={handleToyReplicaClick}
              className="relative flex items-center gap-2 px-3 py-2 h-9 rounded-lg bg-background border border-border hover:bg-accent transition-colors font-medium text-sm whitespace-nowrap flex-shrink-0 min-w-fit"
            >
              <Blocks className="h-4 w-4" />
              Toy AI
              <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[11px] px-1.5 py-0.5 rounded-full leading-none">
                AI
              </span>
            </button>
          </TutorialTooltip>

        </div>
      </section>

      {/* Trending Styles Section */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h2 className="text-base font-semibold flex-shrink-0">Trending</h2>
            
            {/* Category Filter */}
            <Popover open={isTrendingFilterOpen} onOpenChange={setIsTrendingFilterOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1.5 h-7 px-2.5 rounded-full text-xs flex-shrink-0"
                >
                  <Filter className="h-3 w-3" />
                  {selectedTrendingCategory ? getCategoryDisplayName(selectedTrendingCategory).substring(0, 8) + '...' : 'All'}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-3 bg-card/95 backdrop-blur-sm border shadow-lg z-50" align="start">
                <div className="space-y-2">
                  <div className="font-medium text-xs">Filter by Category</div>
                  <div className="grid gap-1">
                    <Button
                      variant={selectedTrendingCategory === null ? "default" : "ghost"}
                      size="sm"
                      className="justify-start h-7 text-xs"
                      onClick={() => {
                        setSelectedTrendingCategory(null);
                        setIsTrendingFilterOpen(false);
                      }}
                    >
                      All Categories
                    </Button>
                    {Object.keys(CATEGORY_TREE).map((category) => (
                      <Button
                        key={category}
                        variant={selectedTrendingCategory === category ? "default" : "ghost"}
                        size="sm"
                        className="justify-start h-7 text-xs"
                        onClick={() => {
                          setSelectedTrendingCategory(category as TopCategory);
                          setIsTrendingFilterOpen(false);
                        }}
                      >
                        {getCategoryDisplayName(category as TopCategory)}
                      </Button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
        </div>
        <TrendingStylesCarousel limit={8} categoryFilter={selectedTrendingCategory} />
      </section>


      {/* Affiliate Hub Section */}
      <section className="px-4">
        <div className="rounded-2xl border bg-card shadow-sm">
          <Collapsible open={!isAffiliateMinimized} onOpenChange={open => setIsAffiliateMinimized(!open)}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Gift className="h-5 w-5" />
                  <h3 className="font-semibold text-left">Affiliate Hub</h3>
                </div>
                {isAffiliateMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <AffiliateHub showTitle={false} />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </section>

      {/* My Closets Section */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            <h2 className="text-lg font-semibold">My Closets</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/closets')}>
            View All
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {/* Closet Preview Tiles */}
          <div className="aspect-square rounded-2xl bg-muted border border-border p-4 flex flex-col items-center justify-center text-center">
            <Archive className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Create your first closet</p>
          </div>
          <div className="aspect-square rounded-2xl bg-muted/50 border border-dashed border-border p-4 flex flex-col items-center justify-center text-center">
            <Plus className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Add items</p>
          </div>
        </div>
      </section>

      {/* Fashion Leaderboards Section */}
      <section className="px-4">
        {/* Global/Country Toggle */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Fashion Leaderboards</h2>
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setActiveLeaderboard('global')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeLeaderboard === 'global' 
                  ? 'bg-background shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Global
            </button>
            <button
              onClick={() => setActiveLeaderboard('country')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeLeaderboard === 'country' 
                  ? 'bg-background shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Country
            </button>
          </div>
        </div>
        
        <MinimizedLeaderboard type={activeLeaderboard} country={user?.user_metadata?.country} />
      </section>

    </div>;
  const renderBrandDashboard = () => {
    return <div className="space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Welcome to Your Brand Dashboard</h1>
        <p className="text-muted-foreground">Manage your brand and products</p>
      </div>
      
      <GlassPanel variant="premium" className="p-6 max-w-md mx-auto">
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Brand Portal</h3>
            <p className="text-sm text-muted-foreground">
              Access your dedicated brand management portal to add products, view analytics, and manage collaborations.
            </p>
          </div>
          <Button 
            onClick={() => navigate('/brand-portal')} 
            className="w-full"
            size="lg"
          >
            <Store className="h-4 w-4 mr-2" />
            Go to Brand Portal
          </Button>
        </div>
      </GlassPanel>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <ShoppingBag className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Products</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Eye className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{stats.totalViews}</div>
            <p className="text-xs text-muted-foreground">Views</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Heart className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{stats.totalSales}</div>
            <p className="text-xs text-muted-foreground">Likes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">${(stats.totalRevenue / 100).toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </CardContent>
        </Card>
      </div>
    </div>;
  };
  
  const renderRetailerDashboard = () => {
    return <div className="space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Welcome to Your Retailer Dashboard</h1>
        <p className="text-muted-foreground">Manage your store and inventory</p>
      </div>
      
      <GlassPanel variant="premium" className="p-6 max-w-md mx-auto">
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Retailer Portal</h3>
            <p className="text-sm text-muted-foreground">
              Access your dedicated retailer management portal to manage inventory, view analytics, and handle collaborations.
            </p>
          </div>
          <Button 
            onClick={() => navigate('/retailer-portal')} 
            className="w-full"
            size="lg"
          >
            <Store className="h-4 w-4 mr-2" />
            Go to Retailer Portal
          </Button>
        </div>
      </GlassPanel>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <ShoppingBag className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Products</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Eye className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{stats.totalViews}</div>
            <p className="text-xs text-muted-foreground">Views</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Heart className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{stats.totalSales}</div>
            <p className="text-xs text-muted-foreground">Likes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">${(stats.totalRevenue / 100).toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </CardContent>
        </Card>
      </div>
    </div>;
  };
  return <ErrorBoundary>
      <SEOHead title="Azyah - Fashion Discovery Platform" description="Discover, shop and create your perfect style with AI-powered fashion recommendations" key="dashboard-seo" // Force re-render to override payment cancel title
    />
      <div className="min-h-screen bg-background pb-32">
        {/* Header with hairline divider */}
        <header className="px-4 pt-4 pb-2 border-b border-border/20 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
          <DashboardHeader />
        </header>

          {/* Role-based Dashboard Content - Only render ONE dashboard */}
          {userProfile?.role === 'shopper' && renderShopperDashboard()}
          {userProfile?.role === 'brand' && renderBrandDashboard()}
          {userProfile?.role === 'retailer' && renderRetailerDashboard()}
          
          {/* Show error if no valid role */}
          {userProfile && !['shopper', 'brand', 'retailer'].includes(userProfile.role) && <div className="space-y-4">
              <GlassPanel variant="premium" className="p-8">
                <div className="text-center space-y-4">
                  <h2 className="text-xl font-semibold text-destructive">Invalid Role</h2>
                  <p className="text-muted-foreground">
                    Your account role "{userProfile.role}" is not recognized. Please contact support.
                  </p>
                </div>
              </GlassPanel>
            </div>}
        
        {/* Floating Support Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <FeedbackModal userType="shopper" />
        </div>

        {/* Global Search Modal */}
        <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        
        {/* AI Studio Modal */}
        <AiStudioModal open={aiStudioModalOpen} onClose={() => setAiStudioModalOpen(false)} />
      </div>
    </ErrorBoundary>;
};
export default RoleDashboard;
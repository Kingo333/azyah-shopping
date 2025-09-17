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
import { Heart, ShoppingBag, Search, Sparkles, Package, BarChart3, Users, Settings, Store, TrendingUp, Plus, Eye, DollarSign, Globe, Bell, LogOut, User, Archive, Trophy, MapPin, Blocks, WandSparkles, ChevronDown, ChevronUp, Gift, ChevronLeft, ChevronRight, Home, Filter } from 'lucide-react';
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
  const [selectedTrendingCategory, setSelectedTrendingCategory] = useState<TopCategory | null>(() => {
    const saved = localStorage.getItem('selectedTrendingCategory');
    return saved ? saved as TopCategory : null;
  });
  const [isTrendingFilterOpen, setIsTrendingFilterOpen] = useState(false);
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

      {/* Quick Actions - AURA-style Cards */}
      <section className="px-6 pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Home Card */}
          <TutorialTooltip content="Return to your personalized dashboard with all your fashion insights and recommendations." feature="home">
            <Card 
              className={`cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                location.pathname === '/dashboard' 
                  ? 'bg-primary text-primary-foreground border-primary shadow-md' 
                  : 'glass-panel hover:glass-premium'
              }`}
              onClick={() => navigate('/dashboard')}
            >
              <CardContent className="flex flex-col items-center justify-center p-4 h-20">
                <Home className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">Home</span>
              </CardContent>
            </Card>
          </TutorialTooltip>

          {/* Shop Card */}
          <TutorialTooltip content="Swipe through fashion items to discover your style. Swipe right to like items and build your personal taste profile." feature="swipe">
            <Card 
              className="cursor-pointer glass-panel hover:glass-premium transition-all duration-200 hover:scale-105 hover:shadow-lg"
              onClick={() => navigate('/swipe')}
            >
              <CardContent className="flex flex-col items-center justify-center p-4 h-20">
                <Heart className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">Shop</span>
              </CardContent>
            </Card>
          </TutorialTooltip>

          {/* AI Studio Card */}
          <TutorialTooltip content="Create AI-generated fashion content and try-on experiences. Upload photos and use AI to enhance your style." feature="ai-studio">
            <Card 
              className="cursor-pointer glass-panel hover:glass-premium transition-all duration-200 hover:scale-105 hover:shadow-lg relative"
              onClick={() => setAiStudioModalOpen(true)}
            >
              <CardContent className="flex flex-col items-center justify-center p-4 h-20">
                <Sparkles className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">AI Studio</span>
                <Badge className="absolute -top-1 -right-1 text-[10px] px-1 py-0 h-4 bg-primary text-primary-foreground">
                  New
                </Badge>
              </CardContent>
            </Card>
          </TutorialTooltip>

          {/* Beauty Card */}
          {isEnabled('ai_beauty_consultant') && (
            <TutorialTooltip content="Get personalized beauty advice from our AI consultant. Upload photos and receive tailored recommendations." feature="beauty-consultant">
              <Card 
                className="cursor-pointer glass-panel hover:glass-premium transition-all duration-200 hover:scale-105 hover:shadow-lg relative"
                onClick={() => navigate('/beauty-consultant')}
              >
                <CardContent className="flex flex-col items-center justify-center p-4 h-20">
                  <WandSparkles className="h-5 w-5 mb-1" />
                  <span className="text-xs font-medium">Beauty</span>
                  <Badge className="absolute -top-1 -right-1 text-[10px] px-1 py-0 h-4 bg-primary text-primary-foreground">
                    New
                  </Badge>
                </CardContent>
              </Card>
            </TutorialTooltip>
          )}

          {/* Fashion Feed Card - when beauty is not enabled */}
          {!isEnabled('ai_beauty_consultant') && (
            <TutorialTooltip content="Connect with the fashion community. Share your style and discover what others are wearing." feature="fashion-feed">
              <Card 
                className="cursor-pointer glass-panel hover:glass-premium transition-all duration-200 hover:scale-105 hover:shadow-lg"
                onClick={() => navigate('/fashion-feed')}
              >
                <CardContent className="flex flex-col items-center justify-center p-4 h-20">
                  <Users className="h-5 w-5 mb-1" />
                  <span className="text-xs font-medium">Feed</span>
                </CardContent>
              </Card>
            </TutorialTooltip>
          )}

          {/* Wishlist Card */}
          <TutorialTooltip content="Save items you love to your wishlist. Keep track of favorites and shop them later when you're ready." feature="wishlist">
            <Card 
              className="cursor-pointer glass-panel hover:glass-premium transition-all duration-200 hover:scale-105 hover:shadow-lg"
              onClick={() => navigate('/wishlist')}
            >
              <CardContent className="flex flex-col items-center justify-center p-4 h-20">
                <ShoppingBag className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">Wishlist</span>
              </CardContent>
            </Card>
          </TutorialTooltip>

          {/* Explore Card */}
          <TutorialTooltip content="Search and discover products from top brands. Use filters to find exactly what you're looking for." feature="explore">
            <Card 
              className="cursor-pointer glass-panel hover:glass-premium transition-all duration-200 hover:scale-105 hover:shadow-lg"
              onClick={() => navigate('/explore')}
            >
              <CardContent className="flex flex-col items-center justify-center p-4 h-20">
                <Search className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">Explore</span>
              </CardContent>
            </Card>
          </TutorialTooltip>

          {/* UGC Collab Card */}
          <TutorialTooltip content="Collaborate with brands on user-generated content. Apply for brand partnerships and create sponsored content." feature="ugc-collab">
            <UGCCollabButton className="glass-panel hover:glass-premium transition-all duration-200 hover:scale-105 hover:shadow-lg rounded-lg p-4 h-20 flex flex-col items-center justify-center gap-1 border" />
          </TutorialTooltip>

          {/* Toy Replica Card */}
          <TutorialTooltip content="Create AI-generated toy replicas of fashion items. Upload photos and get miniature versions for play or display." feature="toy-replica">
            <Card 
              className="cursor-pointer glass-panel hover:glass-premium transition-all duration-200 hover:scale-105 hover:shadow-lg relative"
              onClick={handleToyReplicaClick}
            >
              <CardContent className="flex flex-col items-center justify-center p-4 h-20">
                <Blocks className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">Toy AI</span>
                <Badge className="absolute -top-1 -right-1 text-[10px] px-1 py-0 h-4 bg-primary text-primary-foreground">
                  AI
                </Badge>
              </CardContent>
            </Card>
          </TutorialTooltip>
        </div>
      </section>

      {/* Trending Styles Section */}
      <section className="px-6 pt-8">
        <Card className="glass-premium">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-3">
                Trending Styles
              </CardTitle>
              
              {/* Category Filter */}
              <Popover open={isTrendingFilterOpen} onOpenChange={setIsTrendingFilterOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 h-8 px-4 rounded-full text-sm flex-shrink-0"
                  >
                    <Filter className="h-4 w-4" />
                    {selectedTrendingCategory ? getCategoryDisplayName(selectedTrendingCategory) : 'All Categories'}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-4 glass-premium border shadow-lg z-50" align="start">
                  <div className="space-y-3">
                    <div className="font-semibold text-sm">Filter by Category</div>
                    <div className="grid gap-2">
                      <Button
                        variant={selectedTrendingCategory === null ? "default" : "ghost"}
                        size="sm"
                        className="justify-start h-8 text-sm"
                        onClick={() => {
                          setSelectedTrendingCategory(null);
                          localStorage.removeItem('selectedTrendingCategory');
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
                          className="justify-start h-8 text-sm"
                          onClick={() => {
                            setSelectedTrendingCategory(category as TopCategory);
                            localStorage.setItem('selectedTrendingCategory', category);
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
          </CardHeader>
          <CardContent>
            <TrendingStylesCarousel limit={8} categoryFilter={selectedTrendingCategory} />
          </CardContent>
        </Card>
      </section>


      {/* Affiliate Hub Section */}
      <section className="px-6">
        <Card className="glass-premium">
          <Collapsible open={!isAffiliateMinimized} onOpenChange={(open) => setIsAffiliateMinimized(!open)}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Gift className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Affiliate Hub</CardTitle>
                    <Badge variant="secondary" className="text-xs px-2">Earn Rewards</Badge>
                  </div>
                  {isAffiliateMinimized ? <ChevronDown className="h-5 w-5 transition-transform" /> : <ChevronUp className="h-5 w-5 transition-transform" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <AffiliateHub showTitle={false} />
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </section>

      {/* My Closets Section */}
      <section className="px-6">
        <Card className="glass-premium">
          <Collapsible open={!isClosetsMinimized} onOpenChange={(open) => setIsClosetsMinimized(!open)}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Archive className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">My Closets</CardTitle>
                    <Badge variant="secondary" className="text-xs px-2">Organize</Badge>
                  </div>
                  {isClosetsMinimized ? <ChevronDown className="h-5 w-5 transition-transform" /> : <ChevronUp className="h-5 w-5 transition-transform" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Closet Preview Tiles */}
                  <div className="aspect-square rounded-xl bg-muted/50 border border-border/50 p-4 flex flex-col items-center justify-center text-center hover:bg-muted/70 transition-colors cursor-pointer">
                    <Archive className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Create your first closet</p>
                  </div>
                  <div className="aspect-square rounded-xl bg-muted/30 border border-dashed border-border/50 p-4 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer">
                    <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Add items</p>
                  </div>
                </div>
                <div className="text-center">
                  <Button variant="outline" size="sm" onClick={() => navigate('/closets')}>
                    View All Closets
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </section>

      {/* Fashion Leaderboards */}
      <section className="px-6">
        <Card className="glass-premium">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-3">
                <Trophy className="h-5 w-5 text-primary" />
                Fashion Leaderboards
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={activeLeaderboard === 'global' ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 px-3 text-sm"
                  onClick={() => setActiveLeaderboard('global')}
                >
                  <Globe className="h-4 w-4 mr-1" />
                  Global
                </Button>
                <Button
                  variant={activeLeaderboard === 'country' ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 px-3 text-sm"
                  onClick={() => setActiveLeaderboard('country')}
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  Country
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <MinimizedLeaderboard type={activeLeaderboard} country={user?.user_metadata?.country} />
          </CardContent>
        </Card>
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
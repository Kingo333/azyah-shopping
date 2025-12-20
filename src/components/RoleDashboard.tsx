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

import { Heart, ShoppingBag, Search, Shirt, Package, BarChart3, Users, Settings, Store, TrendingUp, Plus, Eye, DollarSign, Globe, Bell, LogOut, User, Archive, Trophy, MapPin, Blocks, WandSparkles, ChevronDown, ChevronUp, Gift, ChevronLeft, ChevronRight, Home, SlidersHorizontal, CalendarIcon, Crown, Check } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import MinimizedLeaderboard from '@/components/MinimizedLeaderboard';
import TrendingStylesCarousel from '@/components/TrendingStylesCarousel';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';
import { FeedbackModal } from '@/components/FeedbackModal';
import { TutorialTooltip } from '@/components/ui/tutorial-tooltip';
import { ProfileCompletionBanner } from '@/components/ProfileCompletionBanner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CATEGORY_TREE, getCategoryDisplayName } from '@/lib/categories';
import type { TopCategory } from '@/lib/categories';
import { useSubscription } from '@/hooks/useSubscription';
import { useWardrobeItems } from '@/hooks/useWardrobeItems';
import { useSuggestedEssentials } from '@/hooks/useSuggestedEssentials';
import { isGuestMode } from '@/hooks/useGuestMode';
import { useGuestGate } from '@/hooks/useGuestGate';
import { GuestActionPrompt } from '@/components/GuestActionPrompt';


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
  const { isPremium } = useSubscription();
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
  const [featuredEvent, setFeaturedEvent] = useState<any>(null);
  
  
  // Wardrobe essentials - user's items or community suggestions
  const { data: wardrobeItems = [], isLoading: wardrobeLoading } = useWardrobeItems();
  const { data: suggestedItems = [] } = useSuggestedEssentials(wardrobeItems.length === 0);
  
  // Use user's items if they have any, otherwise show suggestions
  const essentialsToShow = wardrobeItems.length > 0 
    ? wardrobeItems.slice(0, 8) 
    : suggestedItems;
  const showingSuggestions = wardrobeItems.length === 0 && suggestedItems.length > 0;
  

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
        await fetchFeaturedEvent();
      } catch (error) {
        console.error('Error initializing dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    initializeDashboard();
  }, [user]);
  
  const fetchFeaturedEvent = async () => {
    try {
      const { data, error }: { data: any; error: any } = await supabase
        .from('retail_events')
        .select('*, retailer:retailers(name, logo_url)')
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (!error && data) {
        setFeaturedEvent(data);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    }
  };

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

  // Check if in guest mode
  const isGuest = isGuestMode();

  // For guests, show the shopper dashboard with limited functionality
  // For non-guests without user, redirect to signup
  if (!user && !isGuest) {
    console.log('No user and not guest, showing sign-in prompt');
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Welcome to Azyah</h2>
          <p className="text-muted-foreground">Please sign in to access your dashboard</p>
          <Button onClick={() => navigate('/onboarding/signup')}>
            Sign In
          </Button>
        </div>
      </div>;
  }
  
  // For guests, we'll render the shopper dashboard
  // For authenticated users without profile, show error
  if (!userProfile && !isGuest) {
    console.log('No user profile, showing error');
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p>Error loading profile</p>
        </div>
      </div>;
  }
  console.log('Rendering dashboard for user:', userProfile);
  const renderShopperDashboard = () => <div className="space-y-0 pb-20">
      {/* Combined Status Banner */}
      <section className="px-4 pt-4">
        <ProfileCompletionBanner />
      </section>

      {/* Feature Strip - 5 Square Tiles (ADNOC-inspired) */}
      <section className="px-4 pt-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {/* AI Studio */}
          <button 
            onClick={() => setAiStudioModalOpen(true)} 
            className="flex flex-col items-center justify-center gap-1.5 p-3 bg-card rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] min-w-[64px] border border-border/50"
          >
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <Shirt className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">AI Studio</span>
          </button>

          {/* UGC Collab */}
          <button 
            onClick={() => navigate('/ugc')} 
            className="flex flex-col items-center justify-center gap-1.5 p-3 bg-card rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] min-w-[64px] border border-border/50"
          >
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">UGC Collab</span>
          </button>

          {/* Wishlist */}
          <button 
            onClick={() => navigate('/wishlist')} 
            className="flex flex-col items-center justify-center gap-1.5 p-3 bg-card rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] min-w-[64px] border border-border/50"
          >
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <Heart className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">Wishlist</span>
          </button>

          {/* Beauty */}
          <button 
            onClick={() => navigate('/beauty-consultant')} 
            className="flex flex-col items-center justify-center gap-1.5 p-3 bg-card rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] min-w-[64px] border border-border/50"
          >
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <WandSparkles className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">Beauty</span>
          </button>

          {/* Profile */}
          <button 
            onClick={() => navigate('/settings')} 
            className="flex flex-col items-center justify-center gap-1.5 p-3 bg-card rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] min-w-[64px] border border-border/50"
          >
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">Profile</span>
          </button>
        </div>
      </section>

      {/* Wardrobe Essentials Section */}
      {essentialsToShow.length > 0 && (
        <section className="px-4 pt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-serif font-medium text-foreground">Wardrobe Essentials</h2>
              {showingSuggestions && (
                <p className="text-xs text-muted-foreground">Explore items from the community</p>
              )}
            </div>
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => navigate('/dress-me/wardrobe')}
              className="text-[hsl(var(--azyah-maroon))] hover:text-[hsl(var(--azyah-maroon))]/80 text-xs p-0 h-auto"
            >
              View All
            </Button>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide [-webkit-overflow-scrolling:touch]">
            {essentialsToShow.map(item => (
              <div 
                key={item.id} 
                className="flex-shrink-0 w-24 md:w-40 cursor-pointer"
                onClick={() => navigate('/dress-me/wardrobe')}
              >
                <div className="relative aspect-square rounded-lg overflow-hidden">
                  <img 
                    src={item.image_bg_removed_url || item.image_url || '/placeholder.svg'} 
                    alt={item.category}
                    className="w-full h-full object-cover"
                  />
                  {showingSuggestions && (
                    <Badge 
                      variant="secondary" 
                      className="absolute top-1 left-1 text-[8px] md:text-[10px] px-1 py-0 bg-background/80 backdrop-blur-sm"
                    >
                      Suggested
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trending Looks Section */}
      <section className="px-4 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-serif font-medium text-foreground">Trending Looks</h2>
          
          {/* Category Filter */}
          <Popover open={isTrendingFilterOpen} onOpenChange={setIsTrendingFilterOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1.5 h-7 px-2.5 rounded-full text-xs"
              >
                <SlidersHorizontal className="h-3 w-3" />
                {selectedTrendingCategory ? getCategoryDisplayName(selectedTrendingCategory).substring(0, 8) + '...' : 'All'}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3" align="end">
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
        <TrendingStylesCarousel limit={8} categoryFilter={selectedTrendingCategory} />
      </section>

      {/* Events Section */}
      <section className="px-4 pt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-serif font-medium text-foreground">Events</h2>
          <Button 
            variant="link" 
            size="sm" 
            onClick={() => navigate('/events')}
            className="text-[hsl(var(--azyah-maroon))] hover:text-[hsl(var(--azyah-maroon))]/80 text-xs p-0 h-auto"
          >
            View All
          </Button>
        </div>

        {!featuredEvent ? (
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="p-8 text-center">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border-border shadow-sm overflow-hidden">
            <CardContent className="p-0 flex gap-3">
              {/* Event Image */}
              <div className="w-32 h-32 flex-shrink-0 bg-muted">
                <img 
                  src={featuredEvent.image_url || '/placeholder.svg'} 
                  alt={featuredEvent.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Event Info */}
              <div className="flex-1 py-3 pr-3">
                <h3 className="font-semibold text-sm mb-2 line-clamp-2">
                  {featuredEvent.name}
                </h3>
                
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span>
                      {new Date(featuredEvent.event_date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{featuredEvent.location || 'Online'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Rewards & Offers Section */}
      <section className="px-4 pt-6">
        <Card 
          className="bg-card border-border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/rewards')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[hsl(var(--azyah-maroon))]/10 flex items-center justify-center">
              <Gift className="h-6 w-6 text-[hsl(var(--azyah-maroon))]" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-foreground">Rewards & Offers</h3>
              <p className="text-xs text-muted-foreground">Earn points & redeem at salons</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </section>

      {/* Fashion Leaderboard Section */}
      <section className="px-4 pt-6">
        <div className="mb-2">
          <h2 className="text-lg font-serif font-medium text-foreground flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Fashion Leaderboard
          </h2>
          <p className="text-xs font-light text-muted-foreground">
            Compete with style enthusiasts worldwide
          </p>
        </div>
        
        {/* Global/Country Toggle */}
        <div className="flex justify-end mb-4">
          <div className="flex bg-muted rounded-lg p-1 text-xs">
            <button
              onClick={() => setActiveLeaderboard('global')}
              className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
                activeLeaderboard === 'global' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground'
              }`}
            >
              global
            </button>
            <button
              onClick={() => setActiveLeaderboard('country')}
              className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
                activeLeaderboard === 'country' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground'
              }`}
            >
              country
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
      <SEOHead title="Azyah - Fashion Discovery Platform" description="Discover, shop and create your perfect style with AI-powered fashion recommendations" key="dashboard-seo" />
      <div className="min-h-screen bg-[hsl(var(--azyah-ivory))]">
        {/* New Dashboard Header */}
        <DashboardHeader />

          {/* Role-based Dashboard Content - Only render ONE dashboard */}
          {/* For guests (no userProfile), show shopper dashboard */}
          {(userProfile?.role === 'shopper' || isGuest) && renderShopperDashboard()}
          {userProfile?.role === 'brand' && renderBrandDashboard()}
          {userProfile?.role === 'retailer' && renderRetailerDashboard()}
          
          {/* Show error if no valid role (only for authenticated users) */}
          {userProfile && !['shopper', 'brand', 'retailer'].includes(userProfile.role) && <div className="space-y-4 px-4">
              <GlassPanel variant="premium" className="p-8">
                <div className="text-center space-y-4">
                  <h2 className="text-xl font-semibold text-destructive">Invalid Role</h2>
                  <p className="text-muted-foreground">
                    Your account role "{userProfile.role}" is not recognized. Please contact support.
                  </p>
                </div>
              </GlassPanel>
            </div>}
        

        {/* Global Search Modal */}
        <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        
        {/* AI Studio Modal */}
        <AiStudioModal open={aiStudioModalOpen} onClose={() => setAiStudioModalOpen(false)} />
      </div>
    </ErrorBoundary>;
};
export default RoleDashboard;
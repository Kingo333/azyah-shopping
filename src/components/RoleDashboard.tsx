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

import { Heart, ShoppingBag, Search, Shirt, Package, BarChart3, Users, Settings, Store, TrendingUp, Plus, Eye, DollarSign, Globe, Bell, LogOut, User, Archive, MapPin, Blocks, WandSparkles, ChevronDown, ChevronUp, Gift, ChevronLeft, ChevronRight, Home, SlidersHorizontal, CalendarIcon, Crown, Check, MoreHorizontal, Sparkles } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Trophy } from 'lucide-react';
import TrendingStylesCarousel from '@/components/TrendingStylesCarousel';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';
import { FeedbackModal } from '@/components/FeedbackModal';
import { TutorialTooltip } from '@/components/ui/tutorial-tooltip';
import { DashboardTopCarousel } from '@/components/dashboard/DashboardTopCarousel';
import { ModelStatusCard } from '@/components/dashboard/ModelStatusCard';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CATEGORY_TREE, getCategoryDisplayName } from '@/lib/categories';
import type { TopCategory } from '@/lib/categories';
import { useSubscription } from '@/hooks/useSubscription';
import { isGuestMode } from '@/hooks/useGuestMode';
import { useGuestGate } from '@/hooks/useGuestGate';
import { GuestActionPrompt } from '@/components/GuestActionPrompt';
import { ClosetOutfitsSection } from '@/components/dashboard/ClosetOutfitsSection';
import { DiscoverTutorialOverlay } from '@/components/dashboard/DiscoverTutorialOverlay';
import { CategoryTabs } from '@/components/dashboard/CategoryTabs';
import { useUserTasteProfile } from '@/hooks/useUserTasteProfile';
import { StyleLinkCardCompact } from '@/components/dashboard/StyleLinkCardCompact';
import { DealsCard } from '@/components/deals/DealsCard';
import { DealsDrawer } from '@/components/deals/DealsDrawer';

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
  // Get taste profile data for compact model card (must be before early returns)
  const { tasteProfile } = useUserTasteProfile();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState('');
  const [searchInitialTab, setSearchInitialTab] = useState<'products' | 'users' | 'brands'>('products');
  
  // Restore search state from sessionStorage when returning to dashboard
  useEffect(() => {
    const savedState = sessionStorage.getItem('globalSearchState');
    if (savedState) {
      try {
        const { query, tab, returnToDashboard } = JSON.parse(savedState);
        if (returnToDashboard) {
          setSearchInitialQuery(query || '');
          setSearchInitialTab(tab || 'products');
          setSearchOpen(true);
          sessionStorage.removeItem('globalSearchState');
        }
      } catch (e) {
        sessionStorage.removeItem('globalSearchState');
      }
    }
  }, []);
  const [aiStudioModalOpen, setAiStudioModalOpen] = useState(false);
  const [isClosetsMinimized, setIsClosetsMinimized] = useState(true);
  const [isAffiliateMinimized, setIsAffiliateMinimized] = useState(true);
  const [selectedTrendingCategory, setSelectedTrendingCategory] = useState<TopCategory | null>(null);
  const [isTrendingFilterOpen, setIsTrendingFilterOpen] = useState(false);
  const [featuredEvent, setFeaturedEvent] = useState<any>(null);
  const [showDiscoverTutorial, setShowDiscoverTutorial] = useState(false);
  const [dealsDrawerOpen, setDealsDrawerOpen] = useState(false);

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

  // Discover tutorial overlay for guests and first-time users
  const DISCOVER_TUTORIAL_KEY = 'dashboard-discover-tutorial-seen';
  
  const handleDismissDiscoverTutorial = () => {
    localStorage.setItem(DISCOVER_TUTORIAL_KEY, 'true');
    setShowDiscoverTutorial(false);
  };

  // Check if should show discover tutorial (after loading is complete)
  useEffect(() => {
    if (loading) return;
    
    const hasSeenTutorial = localStorage.getItem(DISCOVER_TUTORIAL_KEY) === 'true';
    const isGuestUser = isGuestMode();
    
    // Show tutorial for guests or first-time authenticated users who haven't seen it
    if (!hasSeenTutorial && (isGuestUser || user)) {
      // Small delay to let the dashboard render first
      const timer = setTimeout(() => {
        setShowDiscoverTutorial(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [loading, user]);

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
  const handleOpenSearchFromCard = (query: string, tab?: 'products' | 'users' | 'brands') => {
    setSearchInitialQuery(query);
    if (tab) setSearchInitialTab(tab);
    setSearchOpen(true);
  };

  // Compute model progress from taste profile (hook called at top of component)
  const modelProgress = Math.round((tasteProfile?.preference_confidence || 0) * 100);
  const totalSignals = tasteProfile?.total_swipes || 0;

  // Compact progress ring component for style model
  const CompactProgressRing = ({ progress, size = 48 }: { progress: number; size?: number }) => {
    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;
    
    return (
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} fill="none" className="stroke-primary/20" />
          <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} fill="none" className="stroke-primary transition-all duration-500" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary">
          {progress}%
        </span>
      </div>
    );
  };

  const renderShopperDashboard = () => <div className="space-y-0 pb-[calc(80px+env(safe-area-inset-bottom))]">
      {/* Deals Card - Premium Feature */}
      <div className="px-4 pt-4 pb-2">
        <DealsCard onOpenDeals={() => setDealsDrawerOpen(true)} />
      </div>

      {/* Row 1: StyleLink (full width) */}
      <div className="px-4 pb-2">
        <div className="rounded-xl border bg-gradient-to-br from-[hsl(var(--azyah-maroon))]/5 to-background p-2 flex items-center gap-2">
          <StyleLinkCardCompact />
        </div>
      </div>

      {/* Row 2: Style Profile (full width) */}
      <div className="px-4 pb-2">
        <Card className="p-3 bg-gradient-to-br from-primary/5 to-background border hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <CompactProgressRing progress={modelProgress} size={48} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">Style Profile</p>
              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                Discover people with similar measurements
              </p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-[10px] px-2"
                onClick={() => navigate('/swipe')}
              >
                Refine
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-[10px] px-2"
                onClick={() => navigate('/explore?tab=your-fit')}
              >
                Your fit
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Trending Looks Section */}
      <section className="px-4 pt-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-serif font-medium text-foreground">Trending Looks</h2>
          
          {/* Category Filter */}
          <Popover open={isTrendingFilterOpen} onOpenChange={setIsTrendingFilterOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1 h-6 px-2 rounded-full text-[10px]"
              >
                <SlidersHorizontal className="h-2.5 w-2.5" />
                {selectedTrendingCategory ? getCategoryDisplayName(selectedTrendingCategory).substring(0, 8) + '...' : 'All'}
                <ChevronDown className="h-2.5 w-2.5" />
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

      {/* Wardrobe Data Section */}
      <ClosetOutfitsSection />

      {/* Events Section */}
      <section className="px-4 pt-3">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-serif font-medium text-foreground">Events</h2>
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
          <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4 mr-2" />
            <span>No upcoming events</span>
          </div>
        ) : (
          <Card className="bg-card border-border shadow-sm overflow-hidden">
            <CardContent className="p-0 flex gap-3">
              {/* Event Image */}
              <div className="w-32 h-32 flex-shrink-0 bg-muted">
                <img 
                  src={featuredEvent.banner_image_url || featuredEvent.image_url || '/placeholder.svg'} 
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

      {/* Benefits & Offers Section - reframed from Rewards */}
      <section className="px-4 pt-3">
        <Card 
          className="bg-card border-border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/rewards')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[hsl(var(--azyah-maroon))]/10 flex items-center justify-center">
              <Gift className="h-6 w-6 text-[hsl(var(--azyah-maroon))]" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-foreground">Benefits & Offers</h3>
              <p className="text-xs text-muted-foreground">Unlock perks from your activity</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
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
      <SEOHead title="Azyah - Fashion Discovery Platform" description="Discover, shop and create your perfect style with AI-powered fashion recommendations" key="dashboard-seo" />
      <div className="min-h-screen bg-[hsl(var(--azyah-ivory))]">
        {/* New Dashboard Header */}
        <DashboardHeader onOpenSearch={() => setSearchOpen(true)} />

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
        <GlobalSearch 
          isOpen={searchOpen} 
          onClose={() => {
            setSearchOpen(false);
            setSearchInitialQuery('');
            setSearchInitialTab('products');
            sessionStorage.removeItem('globalSearchState');
          }}
          initialQuery={searchInitialQuery}
          initialTab={searchInitialTab}
        />
        
        {/* AI Studio Modal */}
        <AiStudioModal open={aiStudioModalOpen} onClose={() => setAiStudioModalOpen(false)} />
        
        {/* Discover Tutorial Overlay */}
        <DiscoverTutorialOverlay 
          isVisible={showDiscoverTutorial} 
          onDismiss={handleDismissDiscoverTutorial} 
        />
        
        {/* Deals Drawer */}
        <DealsDrawer
          open={dealsDrawerOpen}
          onOpenChange={setDealsDrawerOpen}
        />
      </div>
    </ErrorBoundary>;
};
export default RoleDashboard;
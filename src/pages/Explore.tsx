import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Home, Search, Globe as GlobeIcon, MapPin, Users, Store, Ruler, Heart, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isGuestMode, setGuestMode } from '@/hooks/useGuestMode';
import { GlobeWrapper } from '@/components/globe/GlobeWrapper';
import { CountryDrawer } from '@/components/globe/CountryDrawer';
import { FollowingDrawer } from '@/components/explore/FollowingDrawer';
import { YourFitDrawer } from '@/components/explore/YourFitDrawer';
import { DealsDrawer } from '@/components/deals/DealsDrawer';
import { COUNTRY_COORDINATES } from '@/lib/countryCoordinates';
import { useFollows } from '@/hooks/useFollows';
import GlobalSearch from '@/components/GlobalSearch';
import { getCountryCodeFromName } from '@/lib/countryCurrency';
import { useDesignV3 } from '@/hooks/useDesignV3';
import { useNavV2 } from '@/hooks/useNavV2';
import { features } from '@/lib/features';
import { resolveExploreTab, visibleExploreTabs, type ExploreTab } from '@/lib/exploreTabs';
import { toCountryCodeCounts } from '@/lib/globePeople';

// Your Fit and Deals are hidden (owner decisions); everything else on the Globe is unchanged.
const YOUR_FIT_ENABLED = features.your_fit;
const DEALS_ENABLED = features.deals;
const VISIBLE_TAB_COUNT = visibleExploreTabs(YOUR_FIT_ENABLED, DEALS_ENABLED).length;

const Explore: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [followingDrawerOpen, setFollowingDrawerOpen] = useState(false);
  const [yourFitDrawerOpen, setYourFitDrawerOpen] = useState(false);
  const [dealsDrawerOpen, setDealsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ExploreTab>('brands');
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const v3 = useDesignV3();
  // The shopper tab bar replaces the Home button and "Skip to Feed".
  const tabBar = useNavV2();

  // Sync tab from URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      // Known tabs open as before; an old Your Fit or Deals link (or any unknown tab) opens Brands.
      setActiveTab(resolveExploreTab(tab, YOUR_FIT_ENABLED, DEALS_ENABLED));
    }
  }, [searchParams]);

  // Handle tab change - open appropriate drawers for Following, Your Fit, and Deals
  const handleTabChange = (value: string) => {
    const newTab = value as ExploreTab;
    setActiveTab(newTab);
    setSearchParams({ tab: value });

    // For Following, Your Fit, and Deals, open the global drawer immediately
    if (newTab === 'following') {
      setFollowingDrawerOpen(true);
    } else if (newTab === 'your-fit') {
      setYourFitDrawerOpen(true);
    } else if (newTab === 'deals') {
      setDealsDrawerOpen(true);
    } else if (newTab === 'shoppers') {
      // Auto-open drawer for shoppers tab with user's country or GLOBAL
      const userCountryCode = user?.user_metadata?.country
        ? getCountryCodeFromName(user.user_metadata.country)
        : null;
      setSelectedCountry(userCountryCode || 'GLOBAL');
      setDrawerOpen(true);
    }
  };

  // Fetch countries with brands (no is_active filter - column doesn't exist)
  const { data: countriesWithBrands = [], isLoading: countriesLoading } = useQuery<{ code: string; count: number }[]>({
    queryKey: ['countries-with-brands'],
    queryFn: async () => {
      const result = await supabase
        .from('brands')
        .select('country_code')
        .not('country_code', 'is', null);
      
      if (result.error) {
        console.error('Error fetching countries:', result.error);
        return [];
      }

      // Count brands per country
      const counts = new Map<string, number>();
      (result.data || []).forEach((b: { country_code: string | null }) => {
        if (b.country_code) {
          const code = b.country_code.toUpperCase();
          counts.set(code, (counts.get(code) || 0) + 1);
        }
      });
      
      return Array.from(counts.entries()).map(([code, count]) => ({ code, count }));
    },
  });

  // Fetch following data for following tab filter
  const { following } = useFollows();

  // Fetch countries with shoppers (users from users table - includes all users)
  const { data: countriesWithShoppers = [] } = useQuery<{ code: string; count: number }[]>({
    queryKey: ['countries-with-shoppers'],
    queryFn: async () => {
      // Counts across all shoppers who are visible on the Globe. Reading the
      // users table directly only ever returns your own row (privacy rules),
      // so the database does the counting.
      const counted = await (supabase as any).rpc('get_globe_people_counts');
      if (!counted.error && Array.isArray(counted.data)) {
        return toCountryCodeCounts(counted.data, getCountryCodeFromName);
      }

      // Fallback (before the database lookup exists): the old way.
      const result = await supabase
        .from('users')
        .select('country');
      
      if (result.error) {
        console.error('Error fetching shoppers:', result.error);
        return [];
      }

      const counts = new Map<string, number>();
      let noCountryCount = 0;
      
      (result.data || []).forEach((u: { country: string | null }) => {
        if (u.country) {
          // Convert country NAME to CODE (e.g., "United Arab Emirates" -> "AE")
          const code = getCountryCodeFromName(u.country);
          if (code) {
            counts.set(code.toUpperCase(), (counts.get(code.toUpperCase()) || 0) + 1);
          } else {
            // Unknown country name -> treat as global
            noCountryCount++;
          }
        } else {
          noCountryCount++;
        }
      });
      
      // If there are users without countries, add them to a "GLOBAL" pin
      if (noCountryCount > 0) {
        counts.set('GLOBAL', noCountryCount);
      }
      
      return Array.from(counts.entries()).map(([code, count]) => ({ code, count }));
    },
  });

  // Fetch countries where user follows brands/shoppers
  const { data: countriesFollowing = [] } = useQuery<{ code: string; count: number }[]>({
    queryKey: ['countries-following', following],
    queryFn: async () => {
      if (!following || following.length === 0) return [];
      
      // Get brands the user follows
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const brandResult = await (supabase as any)
        .from('brands')
        .select('country_code')
        .in('id', following)
        .not('country_code', 'is', null);
      
      const counts = new Map<string, number>();
      (brandResult.data || []).forEach((b: { country_code: string | null }) => {
        if (b.country_code) {
          const code = b.country_code.toUpperCase();
          counts.set(code, (counts.get(code) || 0) + 1);
        }
      });
      
      return Array.from(counts.entries()).map(([code, count]) => ({ code, count }));
    },
    enabled: !!following && following.length > 0,
  });

  // Fetch featured country based on engagement (simplified - just pick first with most brands for now)
  const { data: featuredCountry } = useQuery({
    queryKey: ['featured-country'],
    queryFn: async () => {
      // For now, return the country with the most brands
      // In production, this would use engagement scoring
      if (countriesWithBrands.length === 0) return null;
      const sorted = [...countriesWithBrands].sort((a, b) => b.count - a.count);
      return sorted[0]?.code || null;
    },
    enabled: countriesWithBrands.length > 0,
  });

  // Compute filtered countries based on active tab
  const filteredCountriesForGlobe = useMemo(() => {
    switch (activeTab) {
      case 'brands':
        return countriesWithBrands;
      case 'following':
        // For following, show decorative globe - no active filtering
        return [];
      case 'shoppers':
        return countriesWithShoppers;
      case 'your-fit':
      case 'deals':
        // For your-fit and deals, show decorative globe - no active filtering
        return [];
      default:
        return countriesWithBrands;
    }
  }, [activeTab, countriesWithBrands, countriesWithShoppers]);

  // Handle country selection - only for Brands and Shoppers tabs
  const handleCountrySelect = (code: string) => {
    if (activeTab === 'following' || activeTab === 'your-fit' || activeTab === 'deals') {
      return; // Don't open country drawer for these tabs
    }
    setSelectedCountry(code);
    setDrawerOpen(true);
  };

  // Handle skip to feed
  const handleSkipToFeed = () => {
    // Enable guest mode if not logged in
    if (!user && !isGuestMode()) {
      setGuestMode();
    }
    navigate('/swipe');
  };

  // Get the appropriate initial tab for GlobalSearch based on active explore tab
  const getGlobalSearchInitialTab = (): 'products' | 'users' | 'brands' => {
    switch (activeTab) {
      case 'brands': return 'brands';
      case 'shoppers':
      case 'your-fit': return 'users';
      case 'following': return 'products';
      default: return 'products';
    }
  };

  // Get search placeholder text
  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case 'brands': return 'Search brands, products...';
      case 'following': return 'Search who you follow...';
      case 'shoppers': return 'Search shoppers...';
      case 'your-fit': return 'Search by style...';
      default: return 'Search...';
    }
  };

  // Total counts based on active tab
  const totalCount = filteredCountriesForGlobe.reduce((sum, c) => sum + c.count, 0);
  const totalCountries = filteredCountriesForGlobe.length;
  const countsLine = totalCount > 0 && totalCountries > 0
    ? activeTab === 'brands'
      ? `${totalCount} brand${totalCount !== 1 ? 's' : ''} across ${totalCountries} ${totalCountries === 1 ? 'country' : 'countries'}`
      : activeTab === 'shoppers' || activeTab === 'your-fit'
        ? `${totalCount} shopper${totalCount !== 1 ? 's' : ''} across ${totalCountries} ${totalCountries === 1 ? 'country' : 'countries'}`
        : `${totalCount} following across ${totalCountries} ${totalCountries === 1 ? 'country' : 'countries'}`
    : 'Loading...';

  return (
    <div className="h-[100dvh] bg-gray-900 v3:bg-black flex flex-col overflow-hidden">
      {/* Header Overlay */}
      <header 
        className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/60 to-transparent v3:bg-none"
        style={{ paddingTop: 'calc(var(--safe-top, 0px) + 8px)' }}
      >
        <div className="container max-w-screen-2xl mx-auto px-4 py-3">
          {v3 ? (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-[26px] font-semibold leading-tight text-white">Explore</h1>
                <p className="text-[13px] text-white/60 tabular-nums">{countsLine}</p>
              </div>
              <button
                type="button"
                aria-label="Search"
                onClick={() => setGlobalSearchOpen(true)}
                className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2C2C2E] text-white active:opacity-70"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          ) : (
          <>
          <div className="flex items-center justify-between gap-3">
            {/* Left - Back button */}
            {tabBar ? <div className="h-9 w-9" aria-hidden /> : <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <Home className="h-4 w-4" />
            </Button>}

            {/* Center - Title & Stats */}
            <div className="flex-1 text-center">
              <h1 className="text-lg font-serif font-medium text-white">Explore</h1>
              <p className="text-xs text-white/60">
                {countsLine}
              </p>
            </div>

            {/* Right - Skip to Feed */}
            {tabBar ? <div className="h-9 w-9" aria-hidden /> : <Button
              variant="ghost"
              size="sm"
              onClick={handleSkipToFeed}
              className="h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs"
            >
              Skip to Feed
            </Button>}
          </div>

          {/* Search Bar - Opens GlobalSearch modal (same as dashboard) */}
          <div 
            className="relative mt-3 cursor-pointer" 
            onClick={() => setGlobalSearchOpen(true)}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
            <Input
              type="text"
              placeholder={getSearchPlaceholder()}
              readOnly
              className="pl-10 h-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-full focus-visible:ring-primary/50 cursor-pointer"
              style={{ fontSize: '16px' }}
            />
          </div>
          </>
          )}

          {/* Filter Tabs */}
          <div className="mt-3">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList
                className="w-full bg-white/10 border border-white/10 p-1 rounded-full grid gap-1 v3:bg-[#1C1C1E] v3:border-0 v3:p-0.5 v3:rounded-[10px] v3:gap-0.5"
                style={{ gridTemplateColumns: `repeat(${VISIBLE_TAB_COUNT}, minmax(0, 1fr))` }}
              >
                <TabsTrigger 
                  value="brands" 
                  className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-[#7c1d3e] rounded-full text-xs px-1.5 v3:rounded-[8px] v3:text-white/70 v3:data-[state=active]:bg-[#3A3A3C] v3:data-[state=active]:text-white v3:font-medium"
                >
                  <Store className="h-3 w-3 mr-0.5 v3:hidden" />
                  Brands
                </TabsTrigger>
                <TabsTrigger 
                  value="following" 
                  className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-[#3b82f6] rounded-full text-xs px-1.5 v3:rounded-[8px] v3:text-white/70 v3:data-[state=active]:bg-[#3A3A3C] v3:data-[state=active]:text-white v3:font-medium"
                >
                  <Heart className="h-3 w-3 mr-0.5 v3:hidden" />
                  {v3 ? 'Following' : 'Follow'}
                </TabsTrigger>
                <TabsTrigger 
                  value="shoppers" 
                  className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-[#22c55e] rounded-full text-xs px-1.5 v3:rounded-[8px] v3:text-white/70 v3:data-[state=active]:bg-[#3A3A3C] v3:data-[state=active]:text-white v3:font-medium"
                >
                  <Users className="h-3 w-3 mr-0.5 v3:hidden" />
                  People
                </TabsTrigger>
                {YOUR_FIT_ENABLED && (
                  <TabsTrigger
                    value="your-fit"
                    className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-[#a855f7] rounded-full text-xs px-1.5 v3:rounded-[8px] v3:text-white/70 v3:data-[state=active]:bg-[#3A3A3C] v3:data-[state=active]:text-white v3:font-medium"
                  >
                    <Ruler className="h-3 w-3 mr-0.5 v3:hidden" />
                    Fit
                  </TabsTrigger>
                )}
                {DEALS_ENABLED && (
                  <TabsTrigger
                    value="deals"
                    className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-slate-600 rounded-full text-xs px-1.5 v3:rounded-[8px] v3:text-white/70 v3:data-[state=active]:bg-[#3A3A3C] v3:data-[state=active]:text-white v3:font-medium"
                  >
                    <Tag className="h-3 w-3 mr-0.5 v3:hidden" />
                    Deals
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </header>

      {/* Globe - Full Screen - Always visible */}
      <div className="flex-1 relative">
        <GlobeWrapper
          countriesWithBrands={filteredCountriesForGlobe}
          selectedCountry={selectedCountry}
          onCountrySelect={handleCountrySelect}
          autoRotate={!drawerOpen}
          featuredCountry={featuredCountry}
          onSkipToFeed={handleSkipToFeed}
          className="w-full h-full"
          activeTab={activeTab === 'deals' ? 'brands' : activeTab}
        />

        {/* Hint Text */}
        <div className="absolute bottom-24 left-0 right-0 text-center pointer-events-none">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 v3:bg-transparent">
            <GlobeIcon className="h-4 w-4 text-white/70 v3:hidden" />
            <span className="text-sm text-white/70 v3:text-[13px] v3:text-white/60">
              {activeTab === 'brands'
                ? 'Tap to see brands in each country'
                : activeTab === 'shoppers'
                  ? 'Tap to see shoppers in each country'
                  : activeTab === 'following'
                    ? 'Tap to see who you follow in each country'
                    : activeTab === 'deals'
                      ? 'Find better prices on any product'
                      : 'Tap to find people with similar fit'
              }
            </span>
          </div>
        </div>
      </div>

      {/* Country Drawer - for Brands and Shoppers tabs */}
      <CountryDrawer
        countryCode={selectedCountry}
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) {
            setTimeout(() => {
              if (!drawerOpen) setSelectedCountry(null);
            }, 300);
          }
        }}
        activeTab={activeTab === 'deals' ? 'brands' : activeTab}
      />

      {/* Following Drawer - Global, no country required */}
      <FollowingDrawer
        open={followingDrawerOpen}
        onOpenChange={setFollowingDrawerOpen}
      />

      {/* Your Fit Drawer - Global, with measurement gating */}
      <YourFitDrawer
        open={yourFitDrawerOpen}
        onOpenChange={setYourFitDrawerOpen}
      />

      {/* Deals Drawer (hidden while features.deals is off) */}
      {DEALS_ENABLED && (
        <DealsDrawer
          open={dealsDrawerOpen}
          onOpenChange={setDealsDrawerOpen}
        />
      )}

      {/* GlobalSearch Modal */}
      <GlobalSearch
        isOpen={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
        initialTab={getGlobalSearchInitialTab()}
      />
    </div>
  );
};

export default Explore;

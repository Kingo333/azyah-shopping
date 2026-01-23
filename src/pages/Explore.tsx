import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Home, Search, Globe as GlobeIcon, MapPin, Users, Store, Ruler, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isGuestMode, setGuestMode } from '@/hooks/useGuestMode';
import { GlobeWrapper } from '@/components/globe/GlobeWrapper';
import { CountryDrawer } from '@/components/globe/CountryDrawer';
import { COUNTRY_COORDINATES } from '@/lib/countryCoordinates';
import { useFollows } from '@/hooks/useFollows';
import GlobalSearch from '@/components/GlobalSearch';

type ExploreTab = 'brands' | 'following' | 'shoppers' | 'your-fit';

const Explore: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ExploreTab>('brands');
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

  // Sync tab from URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['brands', 'following', 'shoppers', 'your-fit'].includes(tab)) {
      setActiveTab(tab as ExploreTab);
    }
  }, [searchParams]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value as ExploreTab);
    setSearchParams({ tab: value });
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
  const { data: countriesWithShoppers = [], data: allShoppersCount = 0 } = useQuery<{ code: string; count: number }[]>({
    queryKey: ['countries-with-shoppers'],
    queryFn: async () => {
      // Get all users with their country from the users table
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
          const code = u.country.toUpperCase();
          counts.set(code, (counts.get(code) || 0) + 1);
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
        return countriesFollowing;
      case 'shoppers':
        return countriesWithShoppers;
      case 'your-fit':
        // For now, show shoppers with similar fit - same as shoppers for now
        return countriesWithShoppers;
      default:
        return countriesWithBrands;
    }
  }, [activeTab, countriesWithBrands, countriesFollowing, countriesWithShoppers]);

  // Handle country selection
  const handleCountrySelect = (code: string) => {
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

  return (
    <div className="h-[100dvh] bg-gray-900 flex flex-col overflow-hidden">
      {/* Header Overlay */}
      <header 
        className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/60 to-transparent"
        style={{ paddingTop: 'calc(var(--safe-top, 0px) + 8px)' }}
      >
        <div className="container max-w-screen-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Left - Back button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <Home className="h-4 w-4" />
            </Button>

            {/* Center - Title & Stats */}
            <div className="flex-1 text-center">
              <h1 className="text-lg font-serif font-medium text-white">Explore</h1>
              <p className="text-xs text-white/60">
                {totalCount > 0 && totalCountries > 0
                  ? activeTab === 'brands'
                    ? `${totalCount} brand${totalCount !== 1 ? 's' : ''} across ${totalCountries} ${totalCountries === 1 ? 'country' : 'countries'}`
                    : activeTab === 'shoppers' || activeTab === 'your-fit'
                      ? `${totalCount} shopper${totalCount !== 1 ? 's' : ''} across ${totalCountries} ${totalCountries === 1 ? 'country' : 'countries'}`
                      : `${totalCount} following across ${totalCountries} ${totalCountries === 1 ? 'country' : 'countries'}`
                  : 'Loading...'
                }
              </p>
            </div>

            {/* Right - Skip to Feed */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkipToFeed}
              className="h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs"
            >
              Skip to Feed
            </Button>
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

          {/* Filter Tabs */}
          <div className="mt-3">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="w-full bg-white/10 border border-white/10 p-1 rounded-full grid grid-cols-4 gap-1">
                <TabsTrigger 
                  value="brands" 
                  className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-[#7c1d3e] rounded-full text-xs px-2"
                >
                  <Store className="h-3.5 w-3.5 mr-1" />
                  Brands
                </TabsTrigger>
                <TabsTrigger 
                  value="following" 
                  className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-[#3b82f6] rounded-full text-xs px-2"
                >
                  <Heart className="h-3.5 w-3.5 mr-1" />
                  Following
                </TabsTrigger>
                <TabsTrigger 
                  value="shoppers" 
                  className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-[#22c55e] rounded-full text-xs px-2"
                >
                  <Users className="h-3.5 w-3.5 mr-1" />
                  Shoppers
                </TabsTrigger>
                <TabsTrigger 
                  value="your-fit" 
                  className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-[#a855f7] rounded-full text-xs px-2"
                >
                  <Ruler className="h-3.5 w-3.5 mr-1" />
                  Your Fit
                </TabsTrigger>
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
          activeTab={activeTab}
        />

        {/* Hint Text */}
        <div className="absolute bottom-24 left-0 right-0 text-center pointer-events-none">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
            <GlobeIcon className="h-4 w-4 text-white/70" />
            <span className="text-sm text-white/70">
              {activeTab === 'brands'
                ? 'Tap to see brands in each country'
                : activeTab === 'shoppers'
                  ? 'Tap to see shoppers in each country'
                  : activeTab === 'following'
                    ? 'Tap to see who you follow in each country'
                    : 'Tap to find people with similar fit'
              }
            </span>
          </div>
        </div>
      </div>

      {/* Country Drawer - pass activeTab for contextual content */}
      <CountryDrawer
        countryCode={selectedCountry}
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) {
            // Don't clear selectedCountry immediately to allow re-opening
            setTimeout(() => {
              if (!drawerOpen) setSelectedCountry(null);
            }, 300);
          }
        }}
        activeTab={activeTab}
      />

      {/* GlobalSearch Modal - Same behavior as dashboard search */}
      <GlobalSearch
        isOpen={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
        initialTab={getGlobalSearchInitialTab()}
      />
    </div>
  );
};

export default Explore;

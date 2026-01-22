import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Home, Search, Globe as GlobeIcon, MapPin, Users, Store, Ruler, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isGuestMode, setGuestMode } from '@/hooks/useGuestMode';
import { GlobeWrapper } from '@/components/globe/GlobeWrapper';
import { CountryDrawer } from '@/components/globe/CountryDrawer';
import { getCountryNameFromCode } from '@/lib/countryCurrency';
import { COUNTRY_COORDINATES } from '@/lib/countryCoordinates';

type ExploreTab = 'all' | 'following' | 'brands' | 'shoppers' | 'your-fit';

const Explore: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ExploreTab>('all');

  // Sync tab from URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['all', 'following', 'brands', 'shoppers', 'your-fit'].includes(tab)) {
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

  // Filter countries by search
  const filteredCountries = searchQuery
    ? COUNTRY_COORDINATES.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Handle search result selection
  const handleSearchSelect = (code: string) => {
    setSearchQuery('');
    handleCountrySelect(code);
  };

  // Total brands count - only show actual data
  const totalBrands = countriesWithBrands.reduce((sum, c) => sum + c.count, 0);
  const totalCountries = countriesWithBrands.length;

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
                {totalBrands > 0 && totalCountries > 0
                  ? `${totalBrands} brand${totalBrands !== 1 ? 's' : ''} across ${totalCountries} ${totalCountries === 1 ? 'country' : 'countries'}`
                  : 'Loading brands...'
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

          {/* Search Bar */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
            <Input
              type="text"
              placeholder="Search countries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-full focus-visible:ring-primary/50"
              style={{ fontSize: '16px' }}
            />
            
            {/* Search Results Dropdown */}
            {searchQuery && filteredCountries.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-md rounded-lg border border-border shadow-xl max-h-60 overflow-y-auto z-30">
                {filteredCountries.slice(0, 10).map((country) => {
                  const brandData = countriesWithBrands.find(c => c.code.toUpperCase() === country.code.toUpperCase());
                  return (
                    <button
                      key={country.code}
                      onClick={() => handleSearchSelect(country.code)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
                    >
                      <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{country.name}</p>
                        <p className="text-xs text-muted-foreground">{country.region}</p>
                      </div>
                      {brandData && (
                        <Badge variant="secondary" className="text-xs">
                          {brandData.count} brands
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="mt-3">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="w-full bg-white/10 border border-white/10 p-1 rounded-full grid grid-cols-5 gap-1">
                <TabsTrigger 
                  value="all" 
                  className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/20 rounded-full text-xs px-2"
                >
                  <GlobeIcon className="h-3.5 w-3.5 mr-1" />
                  All
                </TabsTrigger>
                <TabsTrigger 
                  value="following" 
                  className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/20 rounded-full text-xs px-2"
                >
                  <Heart className="h-3.5 w-3.5 mr-1" />
                  Following
                </TabsTrigger>
                <TabsTrigger 
                  value="brands" 
                  className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/20 rounded-full text-xs px-2"
                >
                  <Store className="h-3.5 w-3.5 mr-1" />
                  Brands
                </TabsTrigger>
                <TabsTrigger 
                  value="shoppers" 
                  className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/20 rounded-full text-xs px-2"
                >
                  <Users className="h-3.5 w-3.5 mr-1" />
                  Shoppers
                </TabsTrigger>
                <TabsTrigger 
                  value="your-fit" 
                  className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/20 rounded-full text-xs px-2"
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
          countriesWithBrands={countriesWithBrands}
          selectedCountry={selectedCountry}
          onCountrySelect={handleCountrySelect}
          autoRotate={!drawerOpen}
          featuredCountry={featuredCountry}
          onSkipToFeed={handleSkipToFeed}
          className="w-full h-full"
        />

        {/* Hint Text */}
        <div className="absolute bottom-24 left-0 right-0 text-center pointer-events-none">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
            <GlobeIcon className="h-4 w-4 text-white/70" />
            <span className="text-sm text-white/70">
              {activeTab === 'all' 
                ? 'Tap a country to explore' 
                : activeTab === 'brands'
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

      {/* Country Drawer */}
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
      />
    </div>
  );
};

export default Explore;

import React, { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Home, Globe as GlobeIcon, MapPin, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { GlobeFallback } from './GlobeFallback';
import { CountryDrawer } from './CountryDrawer';
import { useCountryBrands } from '@/hooks/useCountryBrands';
import { useWebGLSupport } from '@/hooks/useWebGLSupport';
import { COUNTRY_COORDINATES, FEATURED_COUNTRIES } from '@/lib/countryCoordinates';
import { setGuestMode, isGuestMode } from '@/hooks/useGuestMode';
import { useAuth } from '@/contexts/AuthContext';

// Lazy load the heavy 3D component
const GlobeScene = lazy(() => import('./GlobeScene'));

export function ExploreGlobe() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: countriesWithBrands = [], isLoading } = useCountryBrands();
  const webGLSupported = useWebGLSupport();

  const handleCountrySelect = (code: string) => {
    // Ensure guest mode is set if not logged in
    if (!user && !isGuestMode()) {
      setGuestMode();
    }
    setSelectedCountry(code);
    setDrawerOpen(true);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      const match = COUNTRY_COORDINATES.find(c => 
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.code.toLowerCase() === query.toLowerCase()
      );
      if (match) {
        handleCountrySelect(match.code);
      }
    }
  };

  // Get featured country (first one with brands, or fallback)
  const featuredCountry = countriesWithBrands.length > 0 
    ? countriesWithBrands.reduce((prev, curr) => 
        curr.count > prev.count ? curr : prev
      )
    : null;

  const totalBrands = countriesWithBrands.reduce((sum, c) => sum + c.count, 0);
  const totalCountries = countriesWithBrands.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a14] via-[#12121f] to-[#1a1a2e] relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 safe-top">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>

          <h1 className="font-serif text-xl text-white/90 tracking-wider font-light flex items-center gap-2">
            <GlobeIcon className="w-5 h-5 text-primary" />
            Explore
          </h1>

          <div className="w-16" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Globe Container */}
      <div className="absolute inset-0 pt-16">
        {isLoading || webGLSupported === null ? (
          <div className="flex items-center justify-center h-full">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <GlobeIcon className="w-16 h-16 text-primary/50" />
            </motion.div>
          </div>
        ) : webGLSupported ? (
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <GlobeIcon className="w-16 h-16 text-primary/50" />
              </motion.div>
            </div>
          }>
            <GlobeScene
              countriesWithBrands={countriesWithBrands}
              selectedCountry={selectedCountry}
              onCountrySelect={handleCountrySelect}
              autoRotate={!drawerOpen}
            />
          </Suspense>
        ) : (
          <GlobeFallback
            countriesWithBrands={countriesWithBrands}
            selectedCountry={selectedCountry}
            onCountrySelect={handleCountrySelect}
            onSkipToFeed={() => navigate('/swipe')}
          />
        )}
      </div>

      {/* Search & Stats Overlay */}
      <div className="absolute top-24 inset-x-0 z-10 px-4">
        <div className="max-w-md mx-auto space-y-4">
          {/* Search Input */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <Input
                type="text"
                placeholder="Search by country..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-12 pr-4 h-11 bg-white/10 backdrop-blur-md border-white/20 text-white placeholder:text-white/40 rounded-full focus:border-primary/50"
              />
            </div>
          </motion.div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-center gap-3"
          >
            <Badge variant="secondary" className="bg-white/10 text-white/80 border-white/10 backdrop-blur-sm">
              <MapPin className="w-3 h-3 mr-1" />
              {totalBrands} Brands
            </Badge>
            <Badge variant="secondary" className="bg-white/10 text-white/80 border-white/10 backdrop-blur-sm">
              {totalCountries} Countries
            </Badge>
            {featuredCountry && (
              <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground border-0 backdrop-blur-sm">
                <Sparkles className="w-3 h-3 mr-1" />
                Featured: {COUNTRY_COORDINATES.find(c => c.code === featuredCountry.code)?.name || featuredCountry.code}
              </Badge>
            )}
          </motion.div>
        </div>
      </div>

      {/* Hint Text */}
      <div className="absolute bottom-24 inset-x-0 z-10 flex justify-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-white/40 text-sm font-light"
        >
          Tap a country to explore
        </motion.p>
      </div>

      {/* Country Drawer */}
      <CountryDrawer
        countryCode={selectedCountry}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}

export default ExploreGlobe;

import React, { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, ChevronDown, Globe as GlobeIcon, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlobeFallback } from './GlobeFallback';
import { CountryDrawer } from './CountryDrawer';
import { useCountryBrands } from '@/hooks/useCountryBrands';
import { useWebGLSupport } from '@/hooks/useWebGLSupport';
import { COUNTRY_COORDINATES } from '@/lib/countryCoordinates';
import { setGuestMode } from '@/hooks/useGuestMode';

// Lazy load the heavy 3D component
const GlobeScene = lazy(() => import('./GlobeScene'));

interface GlobeHeroProps {
  onScrollDown?: () => void;
  showAuthButtons?: boolean;
  isLanding?: boolean;
}

export function GlobeHero({ 
  onScrollDown, 
  showAuthButtons = true,
  isLanding = false 
}: GlobeHeroProps) {
  const navigate = useNavigate();
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: countriesWithBrands = [] } = useCountryBrands();
  const webGLSupported = useWebGLSupport();

  const handleCountrySelect = (code: string) => {
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

  const handleExploreAsGuest = () => {
    setGuestMode();
    navigate('/explore');
  };

  const totalBrands = countriesWithBrands.reduce((sum, c) => sum + c.count, 0);
  const totalCountries = countriesWithBrands.length;

  return (
    <div className="relative h-screen w-full bg-gradient-to-b from-[#0a0a14] via-[#12121f] to-[#1a1a2e] overflow-hidden">
      {/* Globe or Fallback */}
      <div className="absolute inset-0">
        {webGLSupported === null ? (
          // Loading state
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
            onSkipToFeed={() => {
              setGuestMode();
              navigate('/swipe');
            }}
          />
        )}
      </div>

      {/* Top Overlay - Logo & Navigation */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          {/* Logo */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2"
          >
            <img 
              src="/marketing/azyah-logo.png" 
              alt="Azyah" 
              className="h-8 w-8 object-contain"
            />
            <span className="font-serif text-xl text-white/90 tracking-wider font-light">
              Azyah
            </span>
          </motion.div>

          {/* Auth Buttons */}
          {showAuthButtons && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-2"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/onboarding/signup?mode=login')}
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                Log In
              </Button>
              <Button
                size="sm"
                onClick={() => navigate('/onboarding/signup')}
                className="bg-primary hover:bg-primary/90"
              >
                Join Free
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Center Overlay - Title & Search */}
      <div className="absolute inset-x-0 top-1/4 z-10 flex flex-col items-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-serif text-white font-light tracking-wide mb-3">
            Discover Fashion Worldwide
          </h1>
          <p className="text-white/60 text-lg font-light max-w-md mx-auto">
            Tap a country to explore brands and start swiping
          </p>
        </motion.div>

        {/* Stats Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-full px-6 py-2.5 mb-6 border border-white/10"
        >
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-white/90 text-sm font-medium">
              {totalBrands} Brands
            </span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <span className="text-white/70 text-sm">
            {totalCountries} Countries
          </span>
        </motion.div>

        {/* Search Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              type="text"
              placeholder="Search by country..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-12 pr-4 h-12 bg-white/10 backdrop-blur-md border-white/20 text-white placeholder:text-white/40 rounded-full focus:border-primary/50 focus:ring-primary/20"
            />
          </div>
        </motion.div>
      </div>

      {/* Bottom Overlay - CTA & Hint */}
      <div className="absolute bottom-0 inset-x-0 z-20 p-4 pb-safe">
        <div className="max-w-sm mx-auto flex flex-col items-center gap-4">
          {/* Explore as Guest */}
          {isLanding && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                variant="outline"
                onClick={handleExploreAsGuest}
                className="rounded-full border-white/30 text-white hover:bg-white/10 hover:text-white"
              >
                <GlobeIcon className="w-4 h-4 mr-2" />
                Explore as Guest
              </Button>
            </motion.div>
          )}

          {/* Scroll Hint */}
          {onScrollDown && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, y: [0, 8, 0] }}
              transition={{ 
                opacity: { delay: 1 },
                y: { delay: 1, duration: 2, repeat: Infinity } 
              }}
              onClick={onScrollDown}
              className="flex flex-col items-center gap-1 text-white/50 hover:text-white/70 transition-colors"
            >
              <span className="text-xs font-light">Learn More</span>
              <ChevronDown className="w-5 h-5" />
            </motion.button>
          )}
        </div>
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

export default GlobeHero;

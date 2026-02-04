import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Heart, List, LayoutGrid, ArrowUp, MapPin, X, ShoppingBag, Globe, Sparkles, User } from "lucide-react";
import { getCountryNameFromCode } from '@/lib/countryCurrency';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import SwipeDeck from '@/components/SwipeDeck';
import { useUnifiedProducts } from '@/hooks/useUnifiedProducts';
import UnifiedCategoryFilter from '@/components/UnifiedCategoryFilter';
import type { UnifiedFilterState } from '@/components/UnifiedCategoryFilter';
import type { SubCategory } from '@/lib/categories';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isGuestMode } from '@/hooks/useGuestMode';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserTasteProfile } from '@/hooks/useUserTasteProfile';
import { type TopCategory } from '@/lib/categories';
import { MiniSwipePreview } from '@/components/MiniSwipePreview';
import { ProductMasonryGrid } from '@/components/ProductMasonryGrid';
import CategoryGrid from '@/components/CategoryGrid';
import AiStudioModal from '@/components/AiStudioModal';

const Swipe = () => {
  const navigate = useNavigate();
  const {
    user,
    loading
  } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Session key for stable sorting - only changes on page reload
  const [sessionKey] = useState(() => Date.now());

  // Initialize unified filter state from URL params
  const [filters, setFilters] = useState<UnifiedFilterState>(() => {
    const genderParam = searchParams.get('gender');
    const categoryParam = searchParams.get('category');
    const subcategoryParam = searchParams.get('subcategory');
    const countryParam = searchParams.get('country');
    return {
      genders: genderParam && ['men', 'women', 'unisex', 'kids'].includes(genderParam) ? [genderParam as any] : [],
      categories: categoryParam && !['men', 'women', 'unisex', 'kids'].includes(categoryParam) ? [categoryParam as any] : [],
      subcategories: subcategoryParam ? [subcategoryParam as any] : [],
      priceRange: {
        min: parseInt(searchParams.get('minPrice') || '0'),
        max: parseInt(searchParams.get('maxPrice') || '1000')
      },
      currency: searchParams.get('currency') || 'USD',
      searchQuery: searchParams.get('search') || '',
      countryCode: countryParam || undefined
    };
  });
  const [viewMode, setViewMode] = useState<'swipe' | 'list'>(() => {
    const saved = localStorage.getItem('feed-view-mode');
    return (saved === 'swipe' || saved === 'list') ? saved : 'list';
  });
  const [showTooltip, setShowTooltip] = useState(false);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
  const [showDiscoverTutorial, setShowDiscoverTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<'initial' | 'demo' | 'done'>('initial');
  const [showAiStudio, setShowAiStudio] = useState(false);

  // Get taste profile for model training percentage
  const { tasteProfile } = useUserTasteProfile();
  const modelProgress = Math.round((tasteProfile?.preference_confidence || 0) * 100);

  // Check user's swipe count to determine when to show list view option
  const {
    data: swipeCount
  } = useQuery({
    queryKey: ['user-swipe-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const {
        count,
        error
      } = await supabase.from('swipes').select('*', {
        count: 'exact',
        head: true
      }).eq('user_id', user.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id
  });
  const showListToggle = true; // Always show toggle

  // Persist view mode to localStorage
  useEffect(() => {
    localStorage.setItem('feed-view-mode', viewMode);
  }, [viewMode]);

  // First-time tutorial for Discover page
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('discover-tutorial-seen');
    if (!hasSeenTutorial && !loading) {
      // Don't force swipe mode, just show tutorial
      setShowDiscoverTutorial(true);
      setTutorialStep('initial');
    }
  }, [loading]);

  // Handle tutorial demo - switch view after delay
  useEffect(() => {
    if (tutorialStep === 'demo') {
      const timer = setTimeout(() => {
        setViewMode(prev => prev === 'swipe' ? 'list' : 'swipe');
        setTutorialStep('done');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [tutorialStep]);

  const handleDismissTutorial = () => {
    localStorage.setItem('discover-tutorial-seen', 'true');
    setShowDiscoverTutorial(false);
    setTutorialStep('done');
  };

  const handleStartTutorialDemo = () => {
    setTutorialStep('demo');
  };

  // Show tooltip when the toggle first becomes available
  useEffect(() => {
    if (showListToggle && !showTooltip && (swipeCount || 0) >= 5 && !showDiscoverTutorial) {
      setShowTooltip(true);
      const timer = setTimeout(() => {
        setShowTooltip(false);
      }, 2500); // Show for 2.5 seconds

      return () => clearTimeout(timer);
    }
  }, [showListToggle, swipeCount, showDiscoverTutorial]);

  // Use unified products hook - handle multiple categories for list view
  const {
    products,
    isLoading: productsLoading
  } = useUnifiedProducts({
    category: viewMode === 'list' && filters.categories.length > 0 ? 'multi' : filters.categories[0] || 'all',
    subcategory: filters.subcategories[0],
    gender: filters.genders[0],
    priceRange: filters.priceRange,
    searchQuery: filters.searchQuery,
    currency: filters.currency,
    categories: viewMode === 'list' ? filters.categories : undefined,
    countryCode: (filters as any).countryCode,
    sessionKey // For stable sorting
  });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.genders[0]) params.set('gender', filters.genders[0]);
    if (filters.categories[0]) params.set('category', filters.categories[0]);
    if (filters.subcategories[0]) params.set('subcategory', filters.subcategories[0]);
    if (filters.priceRange.min > 0) params.set('minPrice', filters.priceRange.min.toString());
    if (filters.priceRange.max < 1000) params.set('maxPrice', filters.priceRange.max.toString());
    if (filters.searchQuery) params.set('search', filters.searchQuery);
    if (filters.currency !== 'USD') params.set('currency', filters.currency);
    if ((filters as any).countryCode) params.set('country', (filters as any).countryCode);
    setSearchParams(params, {
      replace: true
    });
  }, [filters, setSearchParams]);

  // Swipe action handlers for mini preview (must be before early returns)
  const handleSwipeLike = useCallback(async (product: any) => {
    if (!user?.id) return;
    await supabase.from('swipes').insert({
      user_id: user.id,
      product_id: product.id,
      action: 'right' as const
    });
  }, [user?.id]);

  const handleSwipeSkip = useCallback(async (product: any) => {
    if (!user?.id) return;
    await supabase.from('swipes').insert({
      user_id: user.id,
      product_id: product.id,
      action: 'left' as const
    });
  }, [user?.id]);

  // Callbacks for MiniSwipePreview buttons
  const handleMiniSwipeInfo = useCallback((product: any) => {
    navigate(`/p/${product.id}`);
  }, [navigate]);

  const handleMiniSwipeTryOn = useCallback((product: any) => {
    setShowAiStudio(true);
  }, []);

  const handleMasonryTryOn = useCallback((product: any) => {
    setShowAiStudio(true);
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-accent animate-pulse"></div>
            <div className="absolute inset-0 w-12 h-12 rounded-full bg-gradient-accent animate-ping opacity-20"></div>
          </div>
          <p className="text-muted-foreground">Loading your personalized feed...</p>
        </div>
      </div>;
  }
  // Allow guests to browse - don't redirect
  const isGuest = isGuestMode();
  if (!user && !isGuest) {
    navigate("/onboarding/signup");
    return null;
  }

  return <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header 
        className={`sticky top-0 z-50 w-full bg-background/95 backdrop-blur-xl border-b border-border/40 shrink-0 transition-all duration-300 ${isProductDetailOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ paddingTop: 'calc(var(--safe-top, 0px) + 10px)' }}
      >
        <div className="container max-w-screen-2xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            {/* Left Section - Back & Title */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/profile")} 
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-accent/60 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="hidden sm:block">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-serif font-medium tracking-tight">Feed</h1>
                  {(filters as any).countryCode && (
                    <Badge 
                      variant="secondary" 
                      className="text-[10px] px-2 py-0.5 flex items-center gap-1"
                    >
                      <MapPin className="h-3 w-3" />
                      {getCountryNameFromCode((filters as any).countryCode) || (filters as any).countryCode}
                      <button 
                        onClick={() => setFilters(prev => ({ ...prev, countryCode: undefined } as any))}
                        className="ml-1 hover:bg-background/50 rounded-full p-0.5"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  )}
                  <Badge 
                    variant="outline" 
                    className="text-[10px] px-2.5 py-0.5 border-primary/30 bg-primary/5"
                  >
                    {modelProgress >= 100 ? 'Style Model: Calibrated' : `Style Model: ${modelProgress}%`}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground/80 font-medium truncate max-w-none mt-0.5">
                  Learns your fabric, fit & style with every swipe
                </p>
              </div>
            </div>
            
            {/* Center Section - Title on mobile */}
            <div className="flex-1 flex justify-center sm:hidden">
              <h1 className="text-base font-serif font-medium tracking-tight">Feed</h1>
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* View Mode Toggle */}
              {showListToggle && (
                <TooltipProvider>
                  <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
                    <TooltipTrigger asChild>
                      <div 
                        className="flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-0.5 sm:py-1 rounded-full bg-muted/40 transition-all ring-2 ring-primary/50 shadow-[0_0_12px_hsl(var(--primary)/0.3)] animate-pulse cursor-pointer"
                        onClick={() => setViewMode(prev => prev === 'swipe' ? 'list' : 'swipe')}
                      >
                        <div 
                          className={`p-1.5 sm:p-2 rounded-full transition-all pointer-events-none ${viewMode === 'swipe' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}
                        >
                          <LayoutGrid className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </div>
                        <div 
                          className={`p-1.5 sm:p-2 rounded-full transition-all pointer-events-none ${viewMode === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}
                        >
                          <List className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-popover border shadow-lg max-w-[180px]">
                      <p className="text-xs">Switch views anytime</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/favorites")} 
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-accent/60 transition-colors"
              >
                <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              
              <UnifiedCategoryFilter 
                filters={filters} 
                onFiltersChange={setFilters} 
                compact={true} 
                showPriceRange={true} 
                showCurrency={true}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col ${viewMode === 'swipe' ? 'overflow-hidden' : 'overflow-auto'}`}>

        {/* Content Container */}
        {viewMode === 'swipe' ? <div className="flex-1 w-full h-full overflow-hidden">
            <div className="relative w-full h-full max-w-lg mx-auto px-1">
              <SwipeDeck 
                filter={filters.categories[0] || 'all'} 
                subcategory={filters.subcategories[0] || ''} 
                gender={filters.genders[0] || ''} 
                priceRange={filters.priceRange} 
                searchQuery={filters.searchQuery} 
                currency={filters.currency}
                onProductDetailChange={setIsProductDetailOpen}
              />
            </div>
          </div> : <div className="flex-1 overflow-auto">
            {/* Mini Swipe Preview at top */}
            <MiniSwipePreview 
              products={products.slice(0, 6)}
              onOpenFullSwipe={() => setViewMode('swipe')}
              onLike={handleSwipeLike}
              onSkip={handleSwipeSkip}
              onInfoClick={handleMiniSwipeInfo}
              onTryOnClick={handleMiniSwipeTryOn}
            />
            
            {/* Category Pills */}
            <div className="px-4 pt-4">
              <CategoryGrid 
                selectedCategories={filters.categories}
                onCategoryToggle={(category) => {
                  setFilters(prev => ({
                    ...prev,
                    categories: prev.categories.includes(category as any)
                      ? prev.categories.filter(c => c !== category)
                      : [category as any]
                  }));
                }}
              />
            </div>
            
            {/* Suggested for you heading */}
            <div className="px-4 pt-2 pb-2">
              <h2 className="text-lg font-serif font-medium text-foreground">Suggested for you</h2>
            </div>
            
            {/* Masonry Grid with Community Blocks */}
            <div className="px-4 pb-24">
              <ProductMasonryGrid 
                products={products}
                isLoading={productsLoading}
                communityOutfitsInterval={12}
                onTryOnClick={handleMasonryTryOn}
              />
            </div>

            {/* Floating Icon-Only Bottom Nav for List View */}
            <div 
              className="fixed z-40 left-1/2 -translate-x-1/2
                         bg-background/95 backdrop-blur-xl 
                         rounded-full px-10 py-3.5
                         shadow-[0_8px_32px_rgba(0,0,0,0.15)]
                         border border-border/40
                         flex items-center justify-center gap-10"
              style={{ bottom: 'calc(var(--safe-bottom, 0px) + 20px)' }}
            >
              <button 
                onClick={() => navigate('/swipe')} 
                className="p-2 text-[hsl(var(--azyah-maroon))]"
              >
                <ShoppingBag className="h-7 w-7" />
              </button>
              <button 
                onClick={() => navigate('/explore')} 
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Globe className="h-7 w-7" />
              </button>
              <button 
                onClick={() => navigate('/ugc')} 
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Sparkles className="h-7 w-7" />
              </button>
              <button 
                onClick={() => navigate('/profile')} 
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <User className="h-7 w-7" />
              </button>
            </div>
          </div>}
          
        {/* AI Studio Modal - for try-on from list view */}
        <AiStudioModal 
          open={showAiStudio} 
          onClose={() => setShowAiStudio(false)} 
        />
      </main>

      {/* First-time Tutorial Overlay */}
      <AnimatePresence>
        {showDiscoverTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 flex items-start justify-center pt-20"
            onClick={handleDismissTutorial}
          >
            {/* Tutorial Card - positioned to point at toggle */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ delay: 0.2 }}
              className="relative mx-4 mt-8 bg-card rounded-xl p-4 shadow-xl border border-border max-w-xs"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Arrow pointing up to toggle */}
              <div className="absolute -top-3 right-8 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-card" />
              <ArrowUp className="absolute -top-8 right-9 h-5 w-5 text-primary animate-bounce" />
              
              <h3 className="font-semibold text-foreground mb-2 text-sm">
                Switch Between Views
              </h3>
              <p className="text-muted-foreground text-xs mb-3">
                Tap the toggle to switch between swipe mode and list view. Try it now!
              </p>
              
              <div className="flex gap-2">
                {tutorialStep === 'initial' && (
                  <Button 
                    size="sm" 
                    onClick={handleStartTutorialDemo}
                    className="flex-1 text-xs"
                  >
                    Show me
                  </Button>
                )}
                {tutorialStep === 'demo' && (
                  <div className="flex-1 text-center py-1">
                    <span className="text-xs text-primary animate-pulse">Switching...</span>
                  </div>
                )}
                {tutorialStep === 'done' && (
                  <Button 
                    size="sm" 
                    onClick={handleDismissTutorial}
                    className="flex-1 text-xs"
                  >
                    Got it!
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleDismissTutorial}
                  className="text-xs text-muted-foreground"
                >
                  Skip
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>;
};
export default Swipe;
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Heart, Search, List, LayoutGrid } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import SwipeDeck from '@/components/SwipeDeck';
import ProductListView from '@/components/ProductListView';
import { useUnifiedProducts } from '@/hooks/useUnifiedProducts';
import UnifiedCategoryFilter from '@/components/UnifiedCategoryFilter';
import type { UnifiedFilterState } from '@/components/UnifiedCategoryFilter';
import type { SubCategory } from '@/lib/categories';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
const Swipe = () => {
  const navigate = useNavigate();
  const {
    user,
    loading
  } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize unified filter state from URL params
  const [filters, setFilters] = useState<UnifiedFilterState>(() => {
    const genderParam = searchParams.get('gender');
    const categoryParam = searchParams.get('category');
    const subcategoryParam = searchParams.get('subcategory');
    return {
      genders: genderParam && ['men', 'women', 'unisex', 'kids'].includes(genderParam) ? [genderParam as any] : [],
      categories: categoryParam && !['men', 'women', 'unisex', 'kids'].includes(categoryParam) ? [categoryParam as any] : [],
      subcategories: subcategoryParam ? [subcategoryParam as any] : [],
      priceRange: {
        min: parseInt(searchParams.get('minPrice') || '0'),
        max: parseInt(searchParams.get('maxPrice') || '1000')
      },
      currency: searchParams.get('currency') || 'USD',
      searchQuery: searchParams.get('search') || ''
    };
  });
  const [viewMode, setViewMode] = useState<'swipe' | 'list'>('list');
  const [showTooltip, setShowTooltip] = useState(false);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);

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

  // Show tooltip when the toggle first becomes available
  useEffect(() => {
    if (showListToggle && !showTooltip && (swipeCount || 0) >= 5) {
      setShowTooltip(true);
      const timer = setTimeout(() => {
        setShowTooltip(false);
      }, 2500); // Show for 2.5 seconds

      return () => clearTimeout(timer);
    }
  }, [showListToggle, swipeCount]);

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
    categories: viewMode === 'list' ? filters.categories : undefined
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
    setSearchParams(params, {
      replace: true
    });
  }, [filters, setSearchParams]);
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
  if (!user) {
    navigate("/onboarding/signup");
    return null;
  }
  const getCurrentCategoryDisplay = () => {
    if (filters.genders.length === 0 && filters.categories.length === 0) return 'All Categories';
    const displays = [];
    if (filters.genders.length > 0) {
      displays.push(filters.genders[0].charAt(0).toUpperCase() + filters.genders[0].slice(1));
    }
    if (filters.categories.length > 0) {
      displays.push(filters.categories[0].split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '));
    }
    return displays.join(' · ') || 'All Categories';
  };
  return <div className="min-h-screen dashboard-bg flex flex-col">
      {/* Header */}
      <header className={`sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border/40 shrink-0 transition-all duration-300 safe-area-pt ${isProductDetailOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="container max-w-screen-2xl mx-auto px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Left Section - Back & Title */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/dashboard")} 
                className="h-9 w-9 rounded-full hover:bg-accent/60 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold tracking-tight">Discover</h1>
                <p className="text-xs text-muted-foreground/80 font-medium">
                  {getCurrentCategoryDisplay()}
                </p>
              </div>
            </div>
            
            {/* Center Section - Search */}
            <div className="relative flex-1 max-w-xs mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input 
                type="text" 
                placeholder="Search styles..." 
                value={filters.searchQuery} 
                onChange={e => setFilters(prev => ({
                  ...prev,
                  searchQuery: e.target.value
                }))} 
                className="pl-9 h-9 text-sm bg-muted/40 border-0 rounded-full placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:bg-muted/60 transition-all" 
              />
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-1.5">
              {/* View Mode Toggle */}
              {showListToggle && (
                <TooltipProvider>
                  <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
                    <TooltipTrigger asChild>
                      <div className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 rounded-full bg-muted/40">
                        <button 
                          onClick={() => setViewMode('swipe')}
                          className={`p-1.5 rounded-full transition-all ${viewMode === 'swipe' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          <LayoutGrid className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => setViewMode('list')}
                          className={`p-1.5 rounded-full transition-all ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          <List className="h-3.5 w-3.5" />
                        </button>
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
                onClick={() => navigate("/likes")} 
                className="h-9 w-9 rounded-full hover:bg-accent/60 transition-colors"
              >
                <Heart className="h-4 w-4" />
              </Button>
              
              <UnifiedCategoryFilter filters={filters} onFiltersChange={setFilters} compact={true} showPriceRange={true} showCurrency={true} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col container max-w-screen-lg mx-auto px-1 py-0">

        {/* Content Container */}
        {viewMode === 'swipe' ? <div className="flex-1 flex items-center justify-center min-h-[400px] px-1">
            <div className="relative w-full max-w-[380px] sm:max-w-md lg:max-w-lg h-[calc(100vh-10px)] lg:h-[calc(100vh-5px)] max-h-[850px] lg:max-h-[950px]">
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
          </div> : <div className="flex-1">
            <ProductListView 
              products={products} 
              isLoading={productsLoading}
              selectedCategories={filters.categories}
              onCategoryToggle={(category) => {
                setFilters(prev => ({
                  ...prev,
                  categories: prev.categories.includes(category as any)
                    ? prev.categories.filter(c => c !== category)
                    : [...prev.categories, category as any]
                }));
              }}
              selectedSubcategories={filters.subcategories}
              onSubcategoryToggle={(subcategory) => {
                setFilters(prev => ({
                  ...prev,
                  subcategories: prev.subcategories.includes(subcategory)
                    ? prev.subcategories.filter(s => s !== subcategory)
                    : [...prev.subcategories, subcategory]
                }));
              }}
              showCategoryCarousel={true}
            />
          </div>}
      </main>
    </div>;
};
export default Swipe;
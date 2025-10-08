import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Heart, Search, Sparkles, List, LayoutGrid } from "lucide-react";
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
      <header className={`sticky top-0 z-50 w-full border-b border-white/20 glass-premium shrink-0 transition-opacity duration-300 ${isProductDetailOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="container max-w-screen-2xl mx-auto px-1 sm:px-2 py-0 sm:py-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="hover:bg-accent/50 p-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline sm:ml-2">Back</span>
              </Button>
              <div className="hidden md:flex items-center space-x-3">
                
                <div>
                  <h1 className="text-xl font-bold font-playfair">Discover</h1>
                  <p className="text-xs text-muted-foreground">
                    {getCurrentCategoryDisplay()}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-end max-w-full">
              {/* View Mode Toggle - Only show after sufficient swipes */}
              {showListToggle && <TooltipProvider>
                  <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 mr-2">
                        <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                        <Switch checked={viewMode === 'list'} onCheckedChange={checked => setViewMode(checked ? 'list' : 'swipe')} className="data-[state=checked]:bg-primary" />
                        <List className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-background border-primary/20 shadow-lg max-w-[200px]">
                      <p className="text-sm">
                        Switch views anytime! AI learns your taste.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>}

              {/* Search Bar */}
              <div className="relative flex-1 max-w-[160px] sm:max-w-[200px]">
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input type="text" placeholder="Search..." value={filters.searchQuery} onChange={e => setFilters(prev => ({
                ...prev,
                searchQuery: e.target.value
              }))} className="pl-7 sm:pl-10 h-8 sm:h-9 text-sm bg-background/50 backdrop-blur-sm border-border/50 focus-visible:ring-ring/50 focus-visible:border-ring" />
              </div>

              <Button variant="ghost" size="sm" onClick={() => navigate("/likes")} className="hover:bg-accent/50 p-2 flex-shrink-0">
                <Heart className="h-4 w-4" />
                <span className="hidden lg:inline lg:ml-2">Likes</span>
              </Button>
              
              {/* Unified Category Filter */}
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
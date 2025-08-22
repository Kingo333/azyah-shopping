import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import CategoryFilter from "@/components/CategoryFilter";
import type { Gender } from '@/lib/categories';
import { ArrowLeft, Heart, Search, Menu, Sparkles, ChevronDown, List, LayoutGrid, RefreshCw } from "lucide-react";

import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import SwipeDeck from '@/components/SwipeDeck';
import ProductListView from '@/components/ProductListView';
import { usePersonalizedProducts } from '@/hooks/usePersonalizedProducts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
const Swipe = () => {
  const navigate = useNavigate();
  const {
    user,
    loading
  } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize state from URL params
  const [selectedGenders, setSelectedGenders] = useState<Gender[]>(() => {
    const genderParam = searchParams.get('gender');
    if (genderParam && ['men', 'women', 'unisex', 'kids'].includes(genderParam)) {
      return [genderParam as Gender];
    }
    return [];
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const categoryParam = searchParams.get('category');
    // Set any category that's not a gender as a category filter
    if (categoryParam && !['men', 'women', 'unisex', 'kids'].includes(categoryParam)) {
      return [categoryParam];
    }
    return [];
  });
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>(searchParams.get('subcategory') ? [searchParams.get('subcategory')!] : []);
  const [priceRange, setPriceRange] = useState<{
    min: number;
    max: number;
  }>({
    min: parseInt(searchParams.get('minPrice') || '0'),
    max: parseInt(searchParams.get('maxPrice') || '1000')
  });
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') || '');
  const [selectedCurrency, setSelectedCurrency] = useState<string>(searchParams.get('currency') || 'USD');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'swipe' | 'list'>('swipe');
  const [showTooltip, setShowTooltip] = useState(false);

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
  const showListToggle = (swipeCount || 0) >= 5; // Show list view after 5 swipes

  // Show tooltip when the toggle first becomes available
  useEffect(() => {
    if (showListToggle && !showTooltip) {
      setShowTooltip(true);
      const timer = setTimeout(() => {
        setShowTooltip(false);
      }, 2500); // Show for 2.5 seconds

      return () => clearTimeout(timer);
    }
  }, [showListToggle]);

  // Use the personalized products hook for list view
  const {
    products,
    isLoading: productsLoading
  } = usePersonalizedProducts({
    filter: selectedCategories[0] || 'all',
    subcategory: selectedSubcategories[0] || '',
    gender: selectedGenders[0] || '',
    priceRange,
    searchQuery,
    currency: selectedCurrency
  });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedGenders[0]) params.set('gender', selectedGenders[0]);
    if (selectedCategories[0]) params.set('category', selectedCategories[0]);
    if (selectedSubcategories[0]) params.set('subcategory', selectedSubcategories[0]);
    if (priceRange.min > 0) params.set('minPrice', priceRange.min.toString());
    if (priceRange.max < 1000) params.set('maxPrice', priceRange.max.toString());
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCurrency !== 'USD') params.set('currency', selectedCurrency);
    setSearchParams(params, {
      replace: true
    });
  }, [selectedGenders, selectedCategories, selectedSubcategories, priceRange, searchQuery, selectedCurrency, setSearchParams]);
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
    navigate("/auth");
    return null;
  }
  const getCurrentCategoryDisplay = () => {
    if (selectedGenders.length === 0 && selectedCategories.length === 0) return 'All Categories';
    const displays = [];
    if (selectedGenders.length > 0) {
      displays.push(selectedGenders[0].charAt(0).toUpperCase() + selectedGenders[0].slice(1));
    }
    if (selectedCategories.length > 0) {
      displays.push(selectedCategories[0].split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '));
    }
    return displays.join(' · ') || 'All Categories';
  };
  return <div className="min-h-screen dashboard-bg flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/20 glass-premium shrink-0">
        <div className="container max-w-screen-2xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="hover:bg-accent/50 p-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline sm:ml-2">Back</span>
              </Button>
              <div className="hidden md:flex items-center space-x-3">
                <div className="h-8 w-8 rounded-xl bg-gradient-accent flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
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
                <Input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-7 sm:pl-10 h-8 sm:h-9 text-sm bg-background/50 backdrop-blur-sm border-border/50 focus-visible:ring-ring/50 focus-visible:border-ring" />
              </div>

              <Button variant="ghost" size="sm" onClick={() => navigate("/likes")} className="hover:bg-accent/50 p-2 flex-shrink-0">
                <Heart className="h-4 w-4" />
                <span className="hidden lg:inline lg:ml-2">Likes</span>
              </Button>
              
              {/* Filters Menu */}
              <Popover open={showFilters} onOpenChange={setShowFilters}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-gradient-feature border-0 hover:shadow-soft p-2 flex-shrink-0">
                    <Menu className="h-4 w-4" />
                    <span className="hidden lg:inline lg:ml-2">Filters</span>
                    <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[90vw] max-w-sm glass-premium border-white/20 shadow-elegant z-50" align="end">
                  <div className="space-y-4 sm:space-y-6">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-base sm:text-lg">Filters</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Customize your experience
                      </p>
                    </div>
                    
                    {/* Category Filter */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Category</Label>
                      <CategoryFilter selectedGenders={selectedGenders} selectedCategories={selectedCategories as any} selectedSubcategories={selectedSubcategories as any} onGenderChange={setSelectedGenders} onCategoryChange={categories => setSelectedCategories(categories as string[])} onSubcategoryChange={subcategories => setSelectedSubcategories(subcategories as string[])} />
                    </div>

                    {/* Currency Filter */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Currency</Label>
                      <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                          <SelectItem value="AED">AED (د.إ)</SelectItem>
                          <SelectItem value="SAR">SAR (﷼)</SelectItem>
                          <SelectItem value="KWD">KWD (د.ك)</SelectItem>
                          <SelectItem value="BHD">BHD (د.ب)</SelectItem>
                          <SelectItem value="QAR">QAR (ر.ق)</SelectItem>
                          <SelectItem value="OMR">OMR (ر.ع.)</SelectItem>
                          <SelectItem value="JOD">JOD (د.أ)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Price Range Filter */}
                    <div className="space-y-3 sm:space-y-4">
                      <Label className="text-sm font-medium">Price Range</Label>
                      
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="minPrice" className="text-xs font-medium">Min</Label>
                          <Input id="minPrice" type="number" min="0" placeholder="0" value={priceRange.min || ''} onChange={e => setPriceRange(prev => ({
                          ...prev,
                          min: e.target.value === '' ? 0 : Number(e.target.value)
                        }))} className="h-8 sm:h-9 text-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="maxPrice" className="text-xs font-medium">Max</Label>
                          <Input id="maxPrice" type="number" min="0" placeholder="1000" value={priceRange.max || ''} onChange={e => setPriceRange(prev => ({
                          ...prev,
                          max: e.target.value === '' ? 1000 : Number(e.target.value)
                        }))} className="h-8 sm:h-9 text-sm" />
                        </div>
                      </div>
                    </div>

                    <Button onClick={() => setShowFilters(false)} size="sm" className="w-full h-9">
                      Apply Filters
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col container max-w-screen-lg mx-auto px-4 py-2 sm:py-8">
        <div className="text-center space-y-1 mb-1 sm:mb-8">
          <h2 className="text-sm sm:text-2xl md:text-3xl font-bold font-playfair bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Your Fashion Feed
          </h2>
          <p className="text-xs sm:text-base text-muted-foreground">
            {searchQuery ? `Searching for "${searchQuery}"` : "Swipe through curated collections tailored just for you"}
          </p>
        </div>

        {/* Content Container */}
        {viewMode === 'swipe' ? <div className="flex-1 flex items-center justify-center min-h-[600px] px-4">
            <div className="relative w-full max-w-[380px] sm:max-w-md lg:max-w-lg h-[calc(100vh-220px)] lg:h-[calc(100vh-180px)] max-h-[700px] lg:max-h-[800px]">
              <SwipeDeck filter={selectedCategories[0] || 'all'} subcategory={selectedSubcategories[0] || ''} gender={selectedGenders[0] || ''} priceRange={priceRange} searchQuery={searchQuery} currency={selectedCurrency} />
            </div>
          </div> : <div className="flex-1">
            <ProductListView products={products} isLoading={productsLoading} />
          </div>}
      </main>
    </div>;
};
export default Swipe;
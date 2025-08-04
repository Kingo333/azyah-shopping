import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import CategoryFilter from "@/components/CategoryFilter";
import { ArrowLeft, Heart, Search, Menu, Sparkles, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import SwipeDeck from '@/components/SwipeDeck';

const Swipe = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  const [filter, setFilter] = useState<string>('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('');
  const [priceRange, setPriceRange] = useState<{
    min: number;
    max: number;
  }>({
    min: 0,
    max: 1000
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-accent animate-pulse"></div>
            <div className="absolute inset-0 w-12 h-12 rounded-full bg-gradient-accent animate-ping opacity-20"></div>
          </div>
          <p className="text-muted-foreground">Loading your personalized feed...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  const getCurrentCategoryDisplay = () => {
    if (!filter || filter === 'all') return 'All Categories';
    const formatted = filter.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    return subcategoryFilter ? `${formatted} - ${subcategoryFilter}` : formatted;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 shrink-0">
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
                  <h1 className="text-xl font-bold">Discover</h1>
                  <p className="text-xs text-muted-foreground">
                    {getCurrentCategoryDisplay()}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-end max-w-full">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-[160px] sm:max-w-[200px]">
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 sm:pl-10 h-8 sm:h-9 text-sm bg-background/50 backdrop-blur-sm border-border/50 focus-visible:ring-ring/50 focus-visible:border-ring"
                />
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
                <PopoverContent className="w-[90vw] max-w-sm bg-background/95 backdrop-blur-xl border-border/50 shadow-elegant z-50" align="end">
                  <div className="space-y-4 sm:space-y-6">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-base sm:text-lg">Filters</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Customize your experience
                      </p>
                    </div>
                    
                    {/* Category Filter - Simplified */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Category</Label>
                      <div className="text-sm text-muted-foreground">
                        Currently showing: {getCurrentCategoryDisplay()}
                      </div>
                    </div>

                    {/* Price Range Filter */}
                    <div className="space-y-3 sm:space-y-4">
                      <Label className="text-sm font-medium">Price Range</Label>
                      
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="minPrice" className="text-xs font-medium">Min</Label>
                          <Input 
                            id="minPrice" 
                            type="number" 
                            min="0"
                            placeholder="0" 
                            value={priceRange.min || ''} 
                            onChange={e => setPriceRange(prev => ({
                              ...prev,
                              min: e.target.value === '' ? 0 : Number(e.target.value)
                            }))} 
                            className="h-8 sm:h-9 text-sm" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="maxPrice" className="text-xs font-medium">Max</Label>
                          <Input 
                            id="maxPrice" 
                            type="number" 
                            min="0"
                            placeholder="1000" 
                            value={priceRange.max || ''} 
                            onChange={e => setPriceRange(prev => ({
                              ...prev,
                              max: e.target.value === '' ? 1000 : Number(e.target.value)
                            }))} 
                            className="h-8 sm:h-9 text-sm" 
                          />
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
      <main className="flex-1 flex flex-col container max-w-screen-lg mx-auto px-4 py-8">
        <div className="text-center space-y-3 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Your Fashion Feed
          </h2>
          <p className="text-muted-foreground">
            {searchQuery ? `Searching for "${searchQuery}"` : "Swipe through curated collections tailored just for you"}
          </p>
        </div>

        {/* Swipe Deck Container */}
        <div className="flex-1 flex items-center justify-center min-h-[600px]">
          <div className="relative w-full max-w-md h-[600px]">
            <SwipeDeck 
              filter={filter} 
              subcategory={subcategoryFilter}
              priceRange={priceRange} 
              searchQuery={searchQuery} 
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Swipe;
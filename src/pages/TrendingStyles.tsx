import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import ShopperNavigation from '@/components/ShopperNavigation';
import TrendingStyles from '@/components/TrendingStyles';
import { SEOHead } from '@/components/SEOHead';
import { CATEGORY_TREE, getCategoryDisplayName } from '@/lib/categories';
import type { TopCategory } from '@/lib/categories';

const TrendingStylesPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<TopCategory | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  return (
    <>
      <SEOHead 
        title="Trending Styles | Fashion Discovery"
        description="Discover the hottest fashion trends and styles that are trending right now. Find popular categories, subcategories, and the most liked fashion items."
      />
      
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-6xl p-4">
          <ShopperNavigation />
          
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/explore')}
              className="hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Explore
            </Button>
          </div>

          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-blue-500" />
              <div>
                <h1 className="text-3xl font-bold">Trending Styles</h1>
                <p className="text-muted-foreground">
                  Discover what's hot in fashion right now based on community activity
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {selectedCategory && (
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(null)}
                >
                  {getCategoryDisplayName(selectedCategory)}
                  <ArrowLeft className="h-3 w-3 ml-1" />
                </Badge>
              )}
              
              <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Category
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 max-h-96 overflow-y-auto" align="end">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Filter by Category</h4>
                      {selectedCategory && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedCategory(null)}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      {Object.keys(CATEGORY_TREE).map(category => {
                        const topCategory = category as TopCategory;
                        return (
                          <Button
                            key={category}
                            variant={selectedCategory === topCategory ? "default" : "ghost"}
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => {
                              setSelectedCategory(topCategory);
                              setIsFilterOpen(false);
                            }}
                          >
                            {getCategoryDisplayName(topCategory)}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Trending Styles Content */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Most Popular Categories This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TrendingStyles 
                limit={20} 
                showMore={false} 
                categoryFilter={selectedCategory || undefined} 
              />
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3">How are trending styles calculated?</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Based on user likes and interactions in the past week</li>
                <li>• Categories with the most engagement appear higher</li>
                <li>• Growth percentage shows increase in popularity</li>
                <li>• Click any style to start swiping through that category</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default TrendingStylesPage;
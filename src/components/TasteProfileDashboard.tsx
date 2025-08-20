import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUserTasteProfile } from '@/hooks/useUserTasteProfile';
import { Brain, TrendingUp, Heart, X, ShoppingBag } from 'lucide-react';

export const TasteProfileDashboard: React.FC = () => {
  const { tasteProfile, insights, isLoading, hasProfile } = useUserTasteProfile();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Your Taste Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Start swiping on products to build your personalized taste profile! 
            The more you interact, the better we understand your style.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Your Taste Profile
            {insights?.isWellTrained && (
              <Badge variant="secondary" className="ml-2">
                <TrendingUp className="h-3 w-3 mr-1" />
                Well Trained
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Learning Progress */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Learning Progress</span>
              <span className="text-sm text-muted-foreground">
                {Math.round((insights?.confidence || 0) * 100)}%
              </span>
            </div>
            <Progress value={(insights?.confidence || 0) * 100} />
            <p className="text-xs text-muted-foreground mt-1">
              Based on {insights?.swipeStats.total} interactions
            </p>
          </div>

          {/* Swipe Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Heart className="h-4 w-4 text-primary mr-1" />
                <span className="text-2xl font-bold">{insights?.swipeStats.positive}</span>
              </div>
              <p className="text-xs text-muted-foreground">Likes</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <X className="h-4 w-4 text-destructive mr-1" />
                <span className="text-2xl font-bold">{insights?.swipeStats.negative}</span>
              </div>
              <p className="text-xs text-muted-foreground">Passes</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <ShoppingBag className="h-4 w-4 text-accent mr-1" />
                <span className="text-2xl font-bold">
                  {Math.round((insights?.swipeStats.likeRatio || 0) * 100)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Like Rate</p>
            </div>
          </div>

          {/* Top Categories */}
          {insights?.topCategories && insights.topCategories.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Favorite Categories</h4>
              <div className="flex flex-wrap gap-2">
                {insights.topCategories.slice(0, 5).map((category, index) => (
                  <Badge 
                    key={category.name} 
                    variant={index === 0 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {category.name}
                    <span className="ml-1 opacity-70">
                      ({category.score > 0 ? '+' : ''}{Math.round(category.score)})
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Top Brands */}
          {insights?.topBrands && insights.topBrands.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Preferred Brands</h4>
              <div className="flex flex-wrap gap-2">
                {insights.topBrands.slice(0, 5).map((brand, index) => (
                  <Badge 
                    key={brand.name} 
                    variant={index === 0 ? "default" : "outline"}
                    className="text-xs"
                  >
                    {brand.name}
                    <span className="ml-1 opacity-70">
                      ({brand.score > 0 ? '+' : ''}{Math.round(brand.score)})
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Price Preferences */}
          {insights?.pricePreferences && insights.pricePreferences.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Price Preferences</h4>
              <div className="space-y-2">
                {insights.pricePreferences.map((price) => {
                  const percentage = Math.max(0, Math.min(100, (price.score + 10) * 5)); // Normalize score to 0-100
                  return (
                    <div key={price.name} className="flex items-center gap-3">
                      <span className="text-sm font-medium capitalize w-16">{price.name}</span>
                      <Progress value={percentage} className="flex-1" />
                      <span className="text-xs text-muted-foreground w-8">
                        {Math.round(price.score)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!insights?.isWellTrained && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                💡 Keep swiping to improve your recommendations! 
                We need more data to build a comprehensive taste profile.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
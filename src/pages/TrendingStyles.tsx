import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ShopperNavigation from '@/components/ShopperNavigation';
import TrendingStyles from '@/components/TrendingStyles';
import { SEOHead } from '@/components/SEOHead';

const TrendingStylesPage: React.FC = () => {
  const navigate = useNavigate();

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

          <div className="flex items-center gap-3 mb-8">
            <TrendingUp className="h-8 w-8 text-blue-500" />
            <div>
              <h1 className="text-3xl font-bold">Trending Styles</h1>
              <p className="text-muted-foreground">
                Discover what's hot in fashion right now based on community activity
              </p>
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
              <TrendingStyles limit={20} showMore={false} />
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
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, TrendingUp, Star, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ExploreSection: React.FC = () => {
  const navigate = useNavigate();

  const handleGoToExplore = () => {
    navigate('/explore');
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Explore</h2>
        <p className="text-muted-foreground">
          Discover new brands, trending styles, and curated collections.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Visual Search
            </CardTitle>
            <CardDescription>
              Upload images to find similar products and styles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGoToExplore} className="w-full">
              Start Exploring
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Trending Styles
            </CardTitle>
            <CardDescription>
              Stay up-to-date with the latest fashion trends and viral looks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleGoToExplore} className="w-full">
              View Trends
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Featured Brands
            </CardTitle>
            <CardDescription>
              Explore curated collections from top and emerging brands
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleGoToExplore} className="w-full">
              Browse Brands
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              Community Picks
            </CardTitle>
            <CardDescription>
              See what the fashion community is loving and sharing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleGoToExplore} className="w-full">
              Join Community
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExploreSection;
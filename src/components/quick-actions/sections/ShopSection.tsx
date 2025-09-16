import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag, Heart, Star, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ShopSection: React.FC = () => {
  const navigate = useNavigate();

  const handleGoToSwipe = () => {
    navigate('/swipe');
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Shop</h2>
        <p className="text-muted-foreground">
          Discover products with our AI-powered swipe interface. Swipe right to like, left to pass.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              AI-Powered Discovery
            </CardTitle>
            <CardDescription>
              Let our AI curate products based on your taste and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGoToSwipe} className="w-full">
              Start Swiping
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              Personalized Matches
            </CardTitle>
            <CardDescription>
              Products tailored to your style profile and past interactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleGoToSwipe} className="w-full">
              Explore Matches
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-blue-500" />
              Smart Shopping
            </CardTitle>
            <CardDescription>
              Intelligent product recommendations based on trends and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleGoToSwipe} className="w-full">
              Shop Smart
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Trending Items
            </CardTitle>
            <CardDescription>
              Discover what's popular and trending in fashion right now
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleGoToSwipe} className="w-full">
              See Trends
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShopSection;
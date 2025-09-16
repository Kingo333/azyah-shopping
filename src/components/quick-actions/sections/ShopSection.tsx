import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Heart, Star, TrendingUp, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ShopSection: React.FC = () => {
  const navigate = useNavigate();

  const handleGoToSwipe = () => {
    navigate('/swipe');
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Shop Fashion</h2>
        <p className="text-muted-foreground">
          Discover your perfect style with our personalized shopping experience.
        </p>
      </div>

      {/* Main Shop Action */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Start Shopping
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Swipe through curated fashion items tailored to your taste profile. Find your next favorite piece!
          </p>
          <Button 
            onClick={handleGoToSwipe}
            size="lg" 
            className="w-full"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Start Swiping
          </Button>
        </CardContent>
      </Card>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            <Heart className="h-8 w-8 mx-auto mb-3 text-red-500" />
            <h3 className="font-semibold mb-2">Liked Items</h3>
            <p className="text-sm text-muted-foreground">View your favorite products</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            <Star className="h-8 w-8 mx-auto mb-3 text-yellow-500" />
            <h3 className="font-semibold mb-2">Wishlist</h3>
            <p className="text-sm text-muted-foreground">Save items for later</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-3 text-green-500" />
            <h3 className="font-semibold mb-2">Trending</h3>
            <p className="text-sm text-muted-foreground">Popular items right now</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShopSection;
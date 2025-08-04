import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Star, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ShopperNavigation from '@/components/ShopperNavigation';
import FeaturedBrands from '@/components/FeaturedBrands';
import { SEOHead } from '@/components/SEOHead';

const FeaturedBrandsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead 
        title="Featured Brands | Fashion Brands"
        description="Explore the most popular and trending fashion brands. Discover collections from top brands with the most engagement and activity."
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
            <Sparkles className="h-8 w-8 text-purple-500" />
            <div>
              <h1 className="text-3xl font-bold">Featured Brands</h1>
              <p className="text-muted-foreground">
                Discover the most popular and active fashion brands in our community
              </p>
            </div>
          </div>

          {/* Featured Brands Content */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-purple-500" />
                Top Fashion Brands
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FeaturedBrands limit={24} showMore={false} />
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3">How are brands featured?</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• <strong>Product Count:</strong> Number of active products (5 points each)</li>
                <li>• <strong>Community Likes:</strong> Total likes on brand products (2 points each)</li>
                <li>• <strong>Recent Activity:</strong> New products in the last 30 days (10 points each)</li>
                <li>• <strong>Brand Engagement:</strong> Overall community interaction with the brand</li>
                <li>• Click any brand to explore their full product collection</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default FeaturedBrandsPage;
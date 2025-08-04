import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ShopperNavigation from '@/components/ShopperNavigation';
import TopInfluencers from '@/components/TopInfluencers';
import { SEOHead } from '@/components/SEOHead';

const TopInfluencersPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead 
        title="Top Influencers | Fashion Community"
        description="Meet the most influential fashion enthusiasts in our community. Discover top users with the highest engagement, followers, and style inspiration."
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
            <Crown className="h-8 w-8 text-green-500" />
            <div>
              <h1 className="text-3xl font-bold">Top Influencers</h1>
              <p className="text-muted-foreground">
                The most stylish and influential members of our fashion community
              </p>
            </div>
          </div>

          {/* Top Influencers Content */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-500" />
                Community Leaders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TopInfluencers limit={24} showMore={false} />
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3">How is influence calculated?</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• <strong>Posts:</strong> Creating engaging fashion content (10 points each)</li>
                <li>• <strong>Likes Given:</strong> Supporting community members (1 point each)</li>
                <li>• <strong>Likes Received:</strong> Having popular content (5 points each)</li>
                <li>• <strong>Followers:</strong> Building a community following (3 points each)</li>
                <li>• <strong>Closets:</strong> Curating fashion collections (8 points each)</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default TopInfluencersPage;
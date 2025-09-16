import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Heart, Share, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FeedSection: React.FC = () => {
  const navigate = useNavigate();

  const handleGoToFeed = () => {
    navigate('/feed');
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Fashion Feed</h2>
        <p className="text-muted-foreground">
          Discover trending looks, outfit inspiration, and style tips from the fashion community.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Style Inspiration
            </CardTitle>
            <CardDescription>
              Browse outfit ideas and fashion looks from influencers and users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGoToFeed} className="w-full">
              Browse Feed
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              Like & Save
            </CardTitle>
            <CardDescription>
              Save your favorite looks and styles to your personal collection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleGoToFeed} className="w-full">
              View Favorites
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-500" />
              Community Chat
            </CardTitle>
            <CardDescription>
              Engage with the fashion community through comments and discussions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleGoToFeed} className="w-full">
              Join Discussion
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share className="h-5 w-5 text-green-500" />
              Share Your Style
            </CardTitle>
            <CardDescription>
              Post your own outfits and style content to inspire others
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleGoToFeed} className="w-full">
              Create Post
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FeedSection;
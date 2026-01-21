import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, Store, Users, UserCheck, Camera, Ruler, ChevronLeft } from 'lucide-react';
import YourFitContent from '@/pages/YourFitContent';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import BrandsTab from '@/components/explore/BrandsTab';
import ShoppersTab from '@/components/explore/ShoppersTab';
import FollowingTab from '@/components/explore/FollowingTab';
import { CreateStyleLinkPostModal } from '@/components/stylelink';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getDisplayName } from '@/utils/userDisplayName';

const Explore: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'following';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showPostModal, setShowPostModal] = useState(false);

  // Fetch current user's profile
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('users')
        .select('avatar_url, name, username')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Sync tab with URL params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['following', 'shoppers', 'brands', 'your-fit'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  const displayName = getDisplayName(userProfile, user?.email?.split('@')[0] || 'User');
  const displayInitial = displayName?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container mx-auto max-w-6xl px-4 py-4">
        {/* Header */}
        <header className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="h-9 w-9 rounded-lg"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-serif font-semibold text-foreground">Explore</h1>
        </header>

        {/* User Posting Section */}
        {user && (
          <Card className="mb-6 border border-border/60 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-11 w-11 ring-2 ring-primary/10">
                  <AvatarImage src={userProfile?.avatar_url || undefined} alt={displayName} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {displayInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    Share your outfit and tag items
                  </p>
                </div>
                <Button 
                  onClick={() => setShowPostModal(true)} 
                  size="sm"
                  className="flex-shrink-0 h-9 px-4 rounded-lg"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Post
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 h-12">
            <TabsTrigger value="following" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <UserCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Following</span>
            </TabsTrigger>
            <TabsTrigger value="shoppers" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Shoppers</span>
            </TabsTrigger>
            <TabsTrigger value="brands" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Brands</span>
            </TabsTrigger>
            <TabsTrigger value="your-fit" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Ruler className="h-4 w-4" />
              <span className="hidden sm:inline">Your Fit</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="following">
            <FollowingTab />
          </TabsContent>

          <TabsContent value="shoppers">
            <ShoppersTab />
          </TabsContent>

          <TabsContent value="brands">
            <BrandsTab />
          </TabsContent>

          <TabsContent value="your-fit">
            <YourFitContent />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Post Modal */}
      <CreateStyleLinkPostModal
        open={showPostModal}
        onOpenChange={setShowPostModal}
      />
    </div>
  );
};

export default Explore;
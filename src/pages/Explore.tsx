import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Button } from '@/components/ui/button';
import { Home, Store, Users, UserCheck, Camera, Ruler } from 'lucide-react';
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
    <div className="min-h-screen dashboard-bg pb-24">
      <div className="container mx-auto max-w-6xl p-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Home
          </Button>
          <h1 className="text-2xl font-bold font-playfair">Explore</h1>
        </div>

        {/* User Posting Section */}
        {user && (
          <GlassPanel variant="default" className="p-4 mb-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 border-2 border-primary/20">
                <AvatarImage src={userProfile?.avatar_url || undefined} alt={displayName} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {displayInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{displayName}</p>
                <p className="text-sm text-muted-foreground">
                  Share your outfit and tag items from Azyah
                </p>
              </div>
              <Button onClick={() => setShowPostModal(true)} className="flex-shrink-0">
                <Camera className="h-4 w-4 mr-2" />
                Post
              </Button>
            </div>
          </GlassPanel>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="following" className="flex items-center gap-1.5">
              <UserCheck className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Following</span>
            </TabsTrigger>
            <TabsTrigger value="shoppers" className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Shoppers</span>
            </TabsTrigger>
            <TabsTrigger value="brands" className="flex items-center gap-1.5">
              <Store className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Brands</span>
            </TabsTrigger>
            <TabsTrigger value="your-fit" className="flex items-center gap-1.5">
              <Ruler className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Your Fit</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="brands">
            <GlassPanel variant="premium" className="p-4 sm:p-6">
              <BrandsTab />
            </GlassPanel>
          </TabsContent>

          <TabsContent value="shoppers">
            <GlassPanel variant="premium" className="p-4 sm:p-6">
              <ShoppersTab />
            </GlassPanel>
          </TabsContent>

          <TabsContent value="following">
            <GlassPanel variant="premium" className="p-4 sm:p-6">
              <FollowingTab />
            </GlassPanel>
          </TabsContent>

          <TabsContent value="your-fit">
            <GlassPanel variant="premium" className="p-4 sm:p-6">
              <YourFitContent />
            </GlassPanel>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Post Modal - Same as StyleLink */}
      <CreateStyleLinkPostModal
        open={showPostModal}
        onOpenChange={setShowPostModal}
      />
    </div>
  );
};

export default Explore;

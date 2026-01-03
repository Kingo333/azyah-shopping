import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Button } from '@/components/ui/button';
import { Home, Store, Users, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BrandsTab from '@/components/explore/BrandsTab';
import ShoppersTab from '@/components/explore/ShoppersTab';
import FollowingTab from '@/components/explore/FollowingTab';

const Explore: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'brands';
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

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

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="brands" className="flex items-center gap-1.5">
              <Store className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Brands</span>
            </TabsTrigger>
            <TabsTrigger value="shoppers" className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Shoppers</span>
            </TabsTrigger>
            <TabsTrigger value="following" className="flex items-center gap-1.5">
              <UserCheck className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Following</span>
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
        </Tabs>
      </div>
    </div>
  );
};

export default Explore;

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMySalon, useSalonServices, useSalonOffers, useSalonRedemptions } from '@/hooks/useSalonOwner';
import { SalonServicesManager } from './SalonServicesManager';
import { SalonOffersManager } from './SalonOffersManager';
import { SalonRedemptionsManager } from './SalonRedemptionsManager';
import { BrandSettingsForm } from '@/components/BrandSettingsForm';
import { SetupChecklist } from '@/components/brand/SetupChecklist';
import { TutorialTooltip } from '@/components/ui/tutorial-tooltip';
import { Scissors, Gift, Ticket, Settings, BarChart3, Loader2, HelpCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

interface SalonDashboardProps {
  brandId: string;
  brand: any;
  onBrandUpdate: (brand: any) => void;
}

export const SalonDashboard: React.FC<SalonDashboardProps> = ({ brandId, brand, onBrandUpdate }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'services');
  
  const { data: salon, isLoading: salonLoading } = useMySalon(brandId);
  const { data: services = [] } = useSalonServices(salon?.id);
  const { data: offers = [] } = useSalonOffers(salon?.id);
  const { data: redemptions = [] } = useSalonRedemptions(salon?.id);
  
  const pendingRedemptions = redemptions.filter(r => r.status === 'pending');
  
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };
  
  // Setup checklist items
  const checklistItems = [
    {
      id: 'logo',
      label: 'Add your logo',
      completed: !!brand?.logo_url,
      action: () => handleTabChange('settings'),
      actionLabel: 'Add'
    },
    {
      id: 'bio',
      label: 'Write a description',
      completed: !!brand?.bio && brand.bio.length > 10,
      action: () => handleTabChange('settings'),
      actionLabel: 'Add'
    },
    {
      id: 'services',
      label: 'Add your services',
      completed: services.length > 0,
      action: () => handleTabChange('services'),
      actionLabel: 'Add'
    },
    {
      id: 'offers',
      label: 'Create a reward offer',
      completed: offers.length > 0,
      action: () => handleTabChange('offers'),
      actionLabel: 'Create'
    }
  ];
  
  if (salonLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!salon) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Scissors className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-2">Setting up your salon...</h3>
          <p className="text-sm text-muted-foreground">
            Your salon profile is being created. Please refresh the page in a moment.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Setup Checklist */}
      <SetupChecklist
        brandType="salon"
        items={checklistItems}
        className="mb-4"
      />
      
      {/* Welcome Tooltip */}
      <TutorialTooltip
        feature="salon-dashboard-welcome"
        content={
          <div className="space-y-2">
            <p className="font-medium">Welcome to your Salon Dashboard! 💇‍♀️</p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• <strong>Services</strong>: Add your menu with prices</li>
              <li>• <strong>Offers</strong>: Create point-based discounts</li>
              <li>• <strong>Redemptions</strong>: Approve customer requests</li>
              <li>• Premium Azyah members can redeem points here</li>
            </ul>
          </div>
        }
      >
        <div className="inline-flex items-center gap-1 text-sm text-muted-foreground cursor-help mb-2">
          <HelpCircle className="h-4 w-4" />
          <span>How does this work?</span>
        </div>
      </TutorialTooltip>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Active Services</CardTitle>
            <Scissors className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">
              {services.filter(s => s.is_active).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Active Offers</CardTitle>
            <Gift className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">
              {offers.filter(o => o.is_active).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Pending Approvals</CardTitle>
            <Ticket className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold text-destructive">
              {pendingRedemptions.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Total Redemptions</CardTitle>
            <BarChart3 className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">
              {redemptions.filter(r => r.status === 'redeemed').length}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="bg-muted/50 flex flex-wrap gap-1">
          <TabsTrigger value="services" className="data-[state=active]:bg-background text-xs md:text-sm">
            <Scissors className="h-4 w-4 mr-1 hidden md:inline" />
            Services
          </TabsTrigger>
          <TabsTrigger value="offers" className="data-[state=active]:bg-background text-xs md:text-sm">
            <Gift className="h-4 w-4 mr-1 hidden md:inline" />
            Offers
          </TabsTrigger>
          <TabsTrigger value="redemptions" className="data-[state=active]:bg-background text-xs md:text-sm relative">
            <Ticket className="h-4 w-4 mr-1 hidden md:inline" />
            Redemptions
            {pendingRedemptions.length > 0 && (
              <span className="ml-1 text-xs bg-destructive text-destructive-foreground rounded-full px-1.5">
                {pendingRedemptions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-background text-xs md:text-sm">
            <Settings className="h-4 w-4 mr-1 hidden md:inline" />
            Settings
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="services">
          <SalonServicesManager salonId={salon.id} />
        </TabsContent>
        
        <TabsContent value="offers">
          <SalonOffersManager salonId={salon.id} />
        </TabsContent>
        
        <TabsContent value="redemptions">
          <SalonRedemptionsManager salonId={salon.id} />
        </TabsContent>
        
        <TabsContent value="settings">
          <BrandSettingsForm brand={brand} onBrandUpdate={onBrandUpdate} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

/**
 * Rewards Page - Points wallet and salon rewards
 * Salons are now country-gated based on shopper's country
 */

import React, { useState } from 'react';
import { BackButton } from '@/components/ui/back-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PointsBalance } from '@/components/rewards/PointsBalance';
import { DailyCheckin } from '@/components/rewards/DailyCheckin';
import { SalonCard } from '@/components/rewards/SalonCard';
import { RewardOfferCard } from '@/components/rewards/RewardOfferCard';
import { useSalons, useSalonOffers, useRedemptions } from '@/hooks/useSalons';
import { useUserPoints, formatActionType } from '@/hooks/useUserPoints';
import { usePremium } from '@/hooks/usePremium';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Coins, Store, History, Crown, ArrowUp, ArrowDown, Trophy, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import MinimizedLeaderboard from '@/components/MinimizedLeaderboard';
import { getCountryNameFromCode } from '@/lib/countryCurrency';

export default function Rewards() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null);
  const [activeLeaderboard, setActiveLeaderboard] = useState<'global' | 'country'>('global');
  
  // Fetch shopper's country for salon filtering
  const { data: shopperProfile } = useQuery({
    queryKey: ['shopper-country', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('users')
        .select('country')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000
  });
  
  const shopperCountry = shopperProfile?.country || null;
  
  const { data: pointsData, isLoading: pointsLoading } = useUserPoints();
  // Pass shopper country to filter salons
  const { data: salons = [], isLoading: salonsLoading } = useSalons(shopperCountry || undefined);
  const { data: offers = [], isLoading: offersLoading } = useSalonOffers(selectedSalonId || undefined);
  const { data: redemptions = [], isLoading: redemptionsLoading } = useRedemptions();
  const { isPremium } = usePremium();

  const balance = pointsData?.balance ?? 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b safe-area-pt">
        <div className="container mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            <BackButton />
            <h1 className="text-2xl font-serif font-medium">Rewards</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl px-4 py-4 space-y-6">
        {/* Points Balance Card */}
        <PointsBalance showCTA={false} />

        {/* Daily Check-in */}
        <DailyCheckin />

        {/* Premium Banner (if not premium) */}
        {!isPremium && (
          <div 
            className="p-4 rounded-lg bg-gradient-to-r from-[hsl(var(--azyah-maroon))] to-[hsl(var(--azyah-maroon))]/80 text-white cursor-pointer"
            onClick={() => navigate('/dashboard/upgrade')}
          >
            <div className="flex items-center gap-3">
              <Crown className="h-8 w-8" />
              <div className="flex-1">
                <h3 className="font-medium">Unlock Salon Rewards</h3>
                <p className="text-sm text-white/80">
                  Upgrade to Premium to redeem points for discounts
                </p>
              </div>
              <Button variant="secondary" size="sm">
                Upgrade
              </Button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="salons" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="salons" className="flex items-center gap-1.5">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Salons</span>
            </TabsTrigger>
            <TabsTrigger value="offers" className="flex items-center gap-1.5">
              <Coins className="h-4 w-4" />
              <span className="hidden sm:inline">Offers</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1.5">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
          </TabsList>

          {/* Salons Tab */}
          <TabsContent value="salons" className="mt-4 space-y-4">
            {/* Country notice */}
            {shopperCountry && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <MapPin className="h-4 w-4" />
                <span>Showing salons available in {getCountryNameFromCode(shopperCountry) || shopperCountry}</span>
              </div>
            )}
            
            {!shopperCountry && (
              <div className="text-center py-4 text-muted-foreground bg-muted/30 rounded-lg">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Set your country to see available salons</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => navigate('/settings')}
                >
                  Update Profile
                </Button>
              </div>
            )}

            {salonsLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : salons.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Store className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No partner salons in your area yet</p>
                <p className="text-sm mt-1">
                  {shopperCountry 
                    ? `We're working on bringing salon partners to ${getCountryNameFromCode(shopperCountry) || shopperCountry}!`
                    : 'Set your country in settings to see available salons.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {salons.map(salon => (
                  <SalonCard 
                    key={salon.id} 
                    salon={salon}
                    onClick={() => setSelectedSalonId(salon.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Offers Tab */}
          <TabsContent value="offers" className="mt-4 space-y-4">
            {selectedSalonId && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedSalonId(null)}
                className="mb-2"
              >
                ← All Offers
              </Button>
            )}
            
            {offersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : offers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Coins className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No offers available right now</p>
                <p className="text-sm mt-1">Check back soon!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {offers.map(offer => (
                  <RewardOfferCard 
                    key={offer.id} 
                    offer={offer}
                    userBalance={balance}
                    isPremium={isPremium}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4 space-y-4">
            {pointsLoading || redemptionsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : (
              <>
                {/* Recent Activity */}
                <h3 className="font-medium text-sm text-muted-foreground">Points Activity</h3>
                {pointsData?.recent_activity && pointsData.recent_activity.length > 0 ? (
                  <div className="space-y-2">
                    {pointsData.recent_activity.map((activity: any, index: number) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 bg-card border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            activity.type === 'earn' 
                              ? 'bg-green-100 dark:bg-green-900/30' 
                              : 'bg-red-100 dark:bg-red-900/30'
                          }`}>
                            {activity.type === 'earn' ? (
                              <ArrowUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <ArrowDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {formatActionType(activity.action_type)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>
                        <span className={`font-medium ${
                          activity.type === 'earn' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {activity.type === 'earn' ? '+' : '-'}{activity.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No activity yet</p>
                    <p className="text-sm mt-1">Start earning points by adding items to your wardrobe!</p>
                  </div>
                )}

                {/* Redemptions */}
                {redemptions.length > 0 && (
                  <>
                    <h3 className="font-medium text-sm text-muted-foreground mt-6">Redemptions</h3>
                    <div className="space-y-2">
                      {redemptions.map(redemption => (
                        <div 
                          key={redemption.id}
                          className="flex items-center justify-between p-3 bg-card border rounded-lg"
                        >
                          <div>
                            <p className="text-sm font-medium">{redemption.offer?.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {redemption.salon?.name} • {format(new Date(redemption.created_at), 'MMM d')}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                            redemption.status === 'redeemed' 
                              ? 'bg-green-100 text-green-700'
                              : redemption.status === 'approved'
                              ? 'bg-blue-100 text-blue-700'
                              : redemption.status === 'requested'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {redemption.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Fashion Leaderboard Section */}
        <section className="mt-6">
          <div className="mb-2">
            <h2 className="text-base font-serif font-medium text-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Fashion Leaderboard
            </h2>
            <p className="text-[10px] font-light text-muted-foreground">
              Compete with style enthusiasts worldwide
            </p>
          </div>
          
          {/* Global/Country Toggle */}
          <div className="flex justify-end mb-2">
            <div className="flex bg-muted rounded-lg p-1 text-xs">
              <button
                onClick={() => setActiveLeaderboard('global')}
                className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
                  activeLeaderboard === 'global' 
                    ? 'bg-background shadow-sm text-foreground' 
                    : 'text-muted-foreground'
                }`}
              >
                global
              </button>
              <button
                onClick={() => setActiveLeaderboard('country')}
                className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
                  activeLeaderboard === 'country' 
                    ? 'bg-background shadow-sm text-foreground' 
                    : 'text-muted-foreground'
                }`}
              >
                country
              </button>
            </div>
          </div>
          
          <MinimizedLeaderboard type={activeLeaderboard} country={user?.user_metadata?.country} />
        </section>
      </div>
    </div>
  );
}

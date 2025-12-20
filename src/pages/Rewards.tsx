/**
 * Rewards Page - Points wallet and salon rewards
 */

import React, { useState } from 'react';
import { BackButton } from '@/components/ui/back-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Coins, Store, History, Crown, ArrowUp, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';

type CityFilter = 'all' | 'dubai' | 'abudhabi' | 'sharjah';

export default function Rewards() {
  const navigate = useNavigate();
  const [cityFilter, setCityFilter] = useState<CityFilter>('all');
  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null);
  
  const { data: pointsData, isLoading: pointsLoading } = useUserPoints();
  const { data: salons = [], isLoading: salonsLoading } = useSalons(
    cityFilter === 'all' ? undefined : cityFilter
  );
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
            <Select value={cityFilter} onValueChange={(v) => setCityFilter(v as CityFilter)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by city" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                <SelectItem value="dubai">Dubai</SelectItem>
                <SelectItem value="abudhabi">Abu Dhabi</SelectItem>
                <SelectItem value="sharjah">Sharjah</SelectItem>
              </SelectContent>
            </Select>

            {salonsLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : salons.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Store className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No salons available in this area yet</p>
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
      </div>
    </div>
  );
}

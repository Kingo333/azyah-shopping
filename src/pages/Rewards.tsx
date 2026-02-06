/**
 * Rewards Page - Points wallet and credit redemption
 * Points can be redeemed for bonus app credits (AI try-on, video)
 */

import React, { useState } from 'react';
import { BackButton } from '@/components/ui/back-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PointsBalance } from '@/components/rewards/PointsBalance';
import { DailyCheckin } from '@/components/rewards/DailyCheckin';
import { CreditRedemptionCard } from '@/components/rewards/CreditRedemptionCard';
import { useUserPoints, formatActionType } from '@/hooks/useUserPoints';
import { usePremium } from '@/hooks/usePremium';
import { useRedemptions } from '@/hooks/useSalons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Coins, History, Crown, ArrowUp, ArrowDown, Trophy, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import MinimizedLeaderboard from '@/components/MinimizedLeaderboard';

export default function Rewards() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeLeaderboard, setActiveLeaderboard] = useState<'global' | 'country'>('global');
  
  const { data: pointsData, isLoading: pointsLoading } = useUserPoints();
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
                <h3 className="font-medium">Unlock Premium Features</h3>
                <p className="text-sm text-white/80">
                  More credits, unlimited outfits & exclusive perks
                </p>
              </div>
              <Button variant="secondary" size="sm">
                Upgrade
              </Button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="credits" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="credits" className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              <span>Redeem</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1.5">
              <History className="h-4 w-4" />
              <span>History</span>
            </TabsTrigger>
          </TabsList>

          {/* Credits Redemption Tab */}
          <TabsContent value="credits" className="mt-4 space-y-4">
            <CreditRedemptionCard 
              userBalance={balance}
              onRedemptionSuccess={() => {
                // Points will auto-refresh via query invalidation
              }}
            />
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

                {/* Credit Redemptions */}
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
                            <p className="text-sm font-medium">{redemption.offer?.title || 'Credit Redemption'}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(redemption.created_at), 'MMM d')}
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
              <Trophy className="h-4 w-4 text-primary" />
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

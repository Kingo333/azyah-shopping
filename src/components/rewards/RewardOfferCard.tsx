/**
 * Reward Offer Card component for displaying redemption offers
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Percent, Gift, Loader2 } from 'lucide-react';
import { SalonRewardOffer, useRedeemOffer } from '@/hooks/useSalons';

interface RewardOfferCardProps {
  offer: SalonRewardOffer;
  userBalance: number;
  isPremium: boolean;
}

export function RewardOfferCard({ offer, userBalance, isPremium }: RewardOfferCardProps) {
  const redeemOffer = useRedeemOffer();
  const canAfford = userBalance >= offer.points_cost;
  const canRedeem = canAfford && isPremium;

  const handleRedeem = () => {
    if (!canRedeem) return;
    redeemOffer.mutate(offer.id);
  };

  const getDiscountLabel = () => {
    if (offer.discount_type === 'FREE') {
      return 'FREE';
    }
    return `${offer.discount_value}% OFF`;
  };

  const getDiscountColor = () => {
    if (offer.discount_type === 'FREE') return 'bg-green-500';
    if (offer.discount_value >= 50) return 'bg-[hsl(var(--azyah-maroon))]';
    return 'bg-amber-500';
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-14 h-14 rounded-lg flex items-center justify-center shrink-0 ${getDiscountColor()}`}>
            {offer.discount_type === 'FREE' ? (
              <Gift className="h-6 w-6 text-white" />
            ) : (
              <Percent className="h-6 w-6 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={getDiscountColor()}>
                {getDiscountLabel()}
              </Badge>
              {offer.service_category && (
                <Badge variant="outline" className="text-xs capitalize">
                  {offer.service_category}
                </Badge>
              )}
            </div>
            <h3 className="font-medium text-sm">{offer.title}</h3>
            {offer.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {offer.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Coins className="h-3 w-3 text-yellow-500" />
                <span className="font-medium">{offer.points_cost.toLocaleString()} pts</span>
              </div>
              {offer.min_spend_aed > 0 && (
                <span>Min spend: AED {offer.min_spend_aed}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t">
          <Button
            onClick={handleRedeem}
            disabled={!canRedeem || redeemOffer.isPending}
            size="sm"
            className={`w-full ${canRedeem ? 'bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90' : ''}`}
            variant={canRedeem ? 'default' : 'secondary'}
          >
            {redeemOffer.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Redeeming...
              </>
            ) : !isPremium ? (
              'Premium Required'
            ) : !canAfford ? (
              `Need ${(offer.points_cost - userBalance).toLocaleString()} more pts`
            ) : (
              'Redeem Now'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

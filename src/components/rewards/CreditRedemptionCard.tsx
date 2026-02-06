import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shirt, Sparkles, Video, Coins, Check, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface CreditPackage {
  id: string;
  type: 'ai_studio' | 'video';
  amount: number;
  pointsCost: number;
  label: string;
  icon: React.ReactNode;
}

const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'ai_2',
    type: 'ai_studio',
    amount: 2,
    pointsCost: 100,
    label: 'AI Try-On',
    icon: <Shirt className="h-5 w-5" />
  },
  {
    id: 'ai_5',
    type: 'ai_studio',
    amount: 5,
    pointsCost: 200,
    label: 'AI Try-On',
    icon: <Shirt className="h-5 w-5" />
  },
  {
    id: 'beauty_3',
    type: 'beauty',
    amount: 3,
    pointsCost: 150,
    label: 'Beauty AI',
    icon: <Sparkles className="h-5 w-5" />
  },
  {
    id: 'video_1',
    type: 'video',
    amount: 1,
    pointsCost: 250,
    label: 'Video',
    icon: <Video className="h-5 w-5" />
  }
];

interface CreditRedemptionCardProps {
  userBalance: number;
  onRedemptionSuccess?: () => void;
}

export const CreditRedemptionCard: React.FC<CreditRedemptionCardProps> = ({
  userBalance,
  onRedemptionSuccess
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [redeeming, setRedeeming] = useState<string | null>(null);

  const handleRedeem = async (pkg: CreditPackage) => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to redeem credits',
        variant: 'destructive'
      });
      return;
    }

    if (userBalance < pkg.pointsCost) {
      toast({
        title: 'Insufficient points',
        description: `You need ${pkg.pointsCost - userBalance} more points`,
        variant: 'destructive'
      });
      return;
    }

    setRedeeming(pkg.id);

    try {
      // Use type assertion since the RPC was just created and types aren't regenerated yet
      const { data, error } = await (supabase.rpc as any)('redeem_points_for_credits', {
        target_user_id: user.id,
        credit_type: pkg.type,
        credit_amount: pkg.amount,
        points_cost: pkg.pointsCost
      });

      if (error) throw error;

      toast({
        title: 'Credits redeemed!',
        description: `+${pkg.amount} ${pkg.label} credits added`
      });

      // Refresh points and credits
      queryClient.invalidateQueries({ queryKey: ['user-points'] });
      queryClient.invalidateQueries({ queryKey: ['user-credits'] });
      
      onRedemptionSuccess?.();
    } catch (error: any) {
      console.error('Redemption error:', error);
      toast({
        title: 'Redemption failed',
        description: error.message || 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
        <Coins className="h-4 w-4" />
        Redeem Points for Credits
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {CREDIT_PACKAGES.map((pkg) => {
          const canAfford = userBalance >= pkg.pointsCost;
          const isRedeeming = redeeming === pkg.id;

          return (
            <Card
              key={pkg.id}
              className={`relative overflow-hidden ${
                !canAfford ? 'opacity-60' : ''
              }`}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {pkg.icon}
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {pkg.pointsCost} pts
                  </Badge>
                </div>

                <div className="mb-3">
                  <p className="text-lg font-semibold">+{pkg.amount}</p>
                  <p className="text-xs text-muted-foreground">{pkg.label}</p>
                </div>

                <Button
                  size="sm"
                  className="w-full h-8 text-xs"
                  disabled={!canAfford || isRedeeming}
                  onClick={() => handleRedeem(pkg)}
                >
                  {isRedeeming ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : canAfford ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Redeem
                    </>
                  ) : (
                    'Need more points'
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Credits are added to your daily allowance immediately
      </p>
    </div>
  );
};

export default CreditRedemptionCard;

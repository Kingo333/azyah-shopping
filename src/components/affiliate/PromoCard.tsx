import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, Tag, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { OutfitDeal } from '@/hooks/useAffiliatePromos';

interface PromoCardProps {
  deal: OutfitDeal;
  className?: string;
}

export function PromoCard({ deal, className = '' }: PromoCardProps) {
  const copyCode = () => {
    if (deal.affiliate_code) {
      navigator.clipboard.writeText(deal.affiliate_code);
      toast.success('Code copied!');
    }
  };

  const getDaysLeftText = () => {
    if (deal.days_left === null) return null;
    if (deal.days_left === 0) return 'Ends today!';
    if (deal.days_left === 1) return '1 day left';
    return `${deal.days_left} days left`;
  };

  const daysLeftText = getDaysLeftText();

  return (
    <Card className={`p-4 bg-gradient-to-br from-[hsl(var(--azyah-maroon))]/10 via-background to-[hsl(var(--azyah-maroon))]/5 border-[hsl(var(--azyah-maroon))]/20 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-[hsl(var(--azyah-maroon))]/10 flex items-center justify-center flex-shrink-0">
          <Tag className="h-5 w-5 text-[hsl(var(--azyah-maroon))]" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">
              {deal.promo_name || 'Exclusive Offer'}
            </h3>
            {daysLeftText && (
              <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {daysLeftText}
              </Badge>
            )}
          </div>
          
          {deal.affiliate_code && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Use code:</span>
              <code className="text-sm font-bold bg-background px-2 py-1 rounded border font-mono">
                {deal.affiliate_code}
              </code>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0"
                onClick={copyCode}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <p className="text-[10px] text-muted-foreground mt-2">
            Code applied to this look
          </p>
          
          {deal.affiliate_url && (
            <Button 
              size="sm" 
              className="mt-3 bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90 gap-1.5"
              onClick={() => window.open(deal.affiliate_url!, '_blank')}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Shop Now
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

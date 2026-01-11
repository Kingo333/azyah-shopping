import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, Clock, Tag } from 'lucide-react';
import { toast } from 'sonner';
import type { OutfitDeal } from '@/hooks/useAffiliatePromos';

interface CompactPromoStripProps {
  deals: OutfitDeal[];
  className?: string;
}

export function CompactPromoStrip({ deals, className = '' }: CompactPromoStripProps) {
  if (!deals || deals.length === 0) return null;

  const copyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

  const getDaysLeftBadge = (daysLeft: number | null) => {
    if (daysLeft === null) return null;
    if (daysLeft === 0) return 'Today';
    if (daysLeft <= 3) return `${daysLeft}d`;
    return null;
  };

  // Single deal - show compact inline
  if (deals.length === 1) {
    const deal = deals[0];
    return (
      <div className={`flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-[hsl(var(--azyah-maroon))]/10 to-transparent border border-[hsl(var(--azyah-maroon))]/20 ${className}`}>
        <Tag className="h-4 w-4 text-[hsl(var(--azyah-maroon))] flex-shrink-0" />
        <span className="text-xs font-medium truncate flex-1">
          {deal.promo_name || 'Offer'}
        </span>
        {deal.affiliate_code && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <code className="text-[10px] font-mono bg-background px-1.5 py-0.5 rounded border">
              {deal.affiliate_code}
            </code>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={(e) => copyCode(deal.affiliate_code!, e)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        )}
        {getDaysLeftBadge(deal.days_left) && (
          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 flex-shrink-0">
            <Clock className="h-2.5 w-2.5 mr-0.5" />
            {getDaysLeftBadge(deal.days_left)}
          </Badge>
        )}
        {deal.affiliate_url && (
          <Button 
            size="sm" 
            className="h-6 text-[10px] px-2 bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90 flex-shrink-0"
            onClick={() => window.open(deal.affiliate_url!, '_blank')}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  // Multiple deals - 2 per row grid (no collapse needed for ≤4)
  return (
    <div className={`rounded-lg bg-gradient-to-r from-[hsl(var(--azyah-maroon))]/10 to-transparent border border-[hsl(var(--azyah-maroon))]/20 p-2 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Tag className="h-4 w-4 text-[hsl(var(--azyah-maroon))] flex-shrink-0" />
        <span className="text-xs font-medium">
          {deals.length} promo codes
        </span>
      </div>
      
      {/* 2-column grid for codes */}
      <div className="grid grid-cols-2 gap-1.5">
        {deals.map((deal) => (
          <div 
            key={deal.promo_id}
            className="flex items-center gap-1 p-1.5 rounded bg-background/50 border border-border/50"
          >
            {deal.affiliate_code && (
              <>
                <code className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded truncate flex-1 min-w-0">
                  {deal.affiliate_code}
                </code>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 w-5 p-0 flex-shrink-0"
                  onClick={(e) => copyCode(deal.affiliate_code!, e)}
                >
                  <Copy className="h-2.5 w-2.5" />
                </Button>
              </>
            )}
            {getDaysLeftBadge(deal.days_left) && (
              <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 flex-shrink-0">
                {getDaysLeftBadge(deal.days_left)}
              </Badge>
            )}
            {deal.affiliate_url && (
              <Button 
                size="sm" 
                className="h-5 w-5 p-0 bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90 flex-shrink-0"
                onClick={() => window.open(deal.affiliate_url!, '_blank')}
              >
                <ExternalLink className="h-2.5 w-2.5" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

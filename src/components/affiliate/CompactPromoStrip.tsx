import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { OutfitDeal } from '@/hooks/useAffiliatePromos';

interface CompactPromoStripProps {
  deals: OutfitDeal[];
  className?: string;
  outfitImage?: string; // Optional outfit image to show
}

export function CompactPromoStrip({ deals, className = '', outfitImage }: CompactPromoStripProps) {
  if (!deals || deals.length === 0) return null;

  const copyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

  const getDaysLeftText = (daysLeft: number | null) => {
    if (daysLeft === null) return null;
    if (daysLeft === 0) return 'Today';
    return `${daysLeft}d left`;
  };

  return (
    <div className={`grid ${deals.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-3 ${className}`}>
      {deals.map((deal) => (
        <div 
          key={deal.promo_id}
          className="rounded-xl bg-gradient-to-br from-[hsl(var(--azyah-maroon))]/10 via-[hsl(var(--azyah-maroon))]/5 to-transparent border border-[hsl(var(--azyah-maroon))]/15 p-3 flex flex-col"
        >
          {/* Top row: Image + Name + Days left */}
          <div className="flex items-start gap-2 mb-2.5">
            {/* Product thumbnail */}
            {outfitImage && (
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-background border border-border/50">
                <img 
                  src={outfitImage} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {/* Name and days left */}
            <div className="flex-1 min-w-0 flex items-start justify-between gap-1">
              <span className="text-sm font-semibold text-foreground truncate">
                {deal.promo_name || 'Promo'}
              </span>
              {getDaysLeftText(deal.days_left) && (
                <Badge 
                  variant="outline" 
                  className="text-[10px] px-1.5 py-0 h-5 flex-shrink-0 border-muted-foreground/30 text-muted-foreground gap-0.5"
                >
                  <Clock className="h-2.5 w-2.5" />
                  {getDaysLeftText(deal.days_left)}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Code field with copy button */}
          {deal.affiliate_code && (
            <div className="flex items-center gap-1.5 mb-2.5">
              <div className="flex-1 bg-background border border-border rounded-md px-2.5 py-1.5 font-mono text-xs text-foreground tracking-wide">
                {deal.affiliate_code}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 hover:bg-muted"
                onClick={(e) => copyCode(deal.affiliate_code!, e)}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          
          {/* Shop Now button */}
          {deal.affiliate_url && (
            <Button 
              className="w-full h-9 text-xs font-medium bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90 text-white gap-1.5"
              onClick={() => window.open(deal.affiliate_url!, '_blank')}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Shop Now
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

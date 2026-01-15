import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { PublicDeal } from '@/hooks/useAffiliatePromos';

interface CompactPromoCardProps {
  deal: PublicDeal;
}

const getOutfitImage = (imagePreview: string | null, renderPath?: string) => {
  if (renderPath) {
    if (renderPath.startsWith('http')) return renderPath;
    return `https://klwolsopucgswhtdlsps.supabase.co/storage/v1/object/public/outfit-renders/${renderPath}`;
  }
  return imagePreview || '/placeholder.svg';
};

export function CompactPromoCard({ deal }: CompactPromoCardProps) {
  const copyCode = () => {
    if (deal.affiliate_code) {
      navigator.clipboard.writeText(deal.affiliate_code);
      toast.success('Code copied!');
    }
  };

  const getDaysLeftText = () => {
    if (deal.days_left === null) return null;
    if (deal.days_left === 0) return 'Ends today';
    if (deal.days_left === 1) return '1d left';
    return `${deal.days_left}d left`;
  };

  const daysLeftText = getDaysLeftText();
  const hasOutfits = deal.attached_outfits && deal.attached_outfits.length > 0;

  return (
    <Card className="p-3 bg-gradient-to-br from-[hsl(var(--azyah-maroon))]/5 to-transparent border-[hsl(var(--azyah-maroon))]/10">
      <div className="flex gap-2">
        {/* Outfit thumbnail if attached */}
        {hasOutfits && (
          <Link to={`/share/outfit/${deal.attached_outfits[0].share_slug}`} className="flex-shrink-0">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
              <img 
                src={getOutfitImage(deal.attached_outfits[0].image_preview)} 
                alt="" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
            </div>
          </Link>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-xs truncate flex-1">{deal.promo_name || 'Offer'}</p>
            {daysLeftText && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 flex items-center gap-0.5 flex-shrink-0">
                <Clock className="h-2.5 w-2.5" />
                {daysLeftText}
              </Badge>
            )}
          </div>
          
          {deal.affiliate_code && (
            <div className="flex items-center gap-1 mt-1.5">
              <code className="text-[10px] font-mono bg-background px-1.5 py-0.5 rounded border truncate flex-1 min-w-0">
                {deal.affiliate_code}
              </code>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-5 w-5 p-0 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  copyCode();
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {deal.affiliate_url && (
        <Button 
          size="sm" 
          className="w-full mt-2 h-7 text-[10px] bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90"
          onClick={() => window.open(deal.affiliate_url!, '_blank')}
        >
          Shop Now
        </Button>
      )}
    </Card>
  );
}

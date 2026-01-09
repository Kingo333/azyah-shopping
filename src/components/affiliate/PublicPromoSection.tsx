import { usePublicDeals, PublicDeal } from '@/hooks/useAffiliatePromos';
import { CompactPromoCard } from './CompactPromoCard';
import { Tag } from 'lucide-react';

interface PublicPromoSectionProps {
  username: string;
}

export function PublicPromoSection({ username }: PublicPromoSectionProps) {
  const { data: deals, isLoading } = usePublicDeals(username);
  
  if (isLoading || !deals || deals.length === 0) return null;
  
  return (
    <div className="px-4 py-4">
      <div className="max-w-lg mx-auto">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Tag className="h-4 w-4 text-[hsl(var(--azyah-maroon))]" />
          Deals & Codes
        </h3>
        
        {/* 2-column grid for promos */}
        <div className="grid grid-cols-2 gap-3">
          {deals.map((deal) => (
            <CompactPromoCard key={deal.promo_id} deal={deal} />
          ))}
        </div>
      </div>
    </div>
  );
}

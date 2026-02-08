import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFollowBrands } from '@/hooks/useFollowBrands';

export const BrandsSection: React.FC = () => {
  const navigate = useNavigate();
  const { followedBrands, followsLoading } = useFollowBrands();

  const previewBrands = followedBrands.slice(0, 8);
  const hasBrands = previewBrands.length > 0;

  return (
    <section className="px-4 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-serif font-medium text-foreground">Your brands</h2>
        {hasBrands && (
          <Button
            variant="link"
            size="sm"
            className="text-xs p-0 h-auto text-muted-foreground hover:text-foreground gap-1"
            onClick={() => navigate('/explore?tab=brands')}
          >
            Browse brands
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {followsLoading ? (
        <div className="flex gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="w-12 h-12 rounded-full bg-muted animate-pulse" />
          ))}
        </div>
      ) : !hasBrands ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
          <Store className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Follow brands you love</p>
          <p className="text-xs text-muted-foreground mb-4">
            See their latest drops on your profile.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full text-xs"
            onClick={() => navigate('/explore?tab=brands')}
          >
            Browse brands
          </Button>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          {previewBrands.map(brand => (
            <div
              key={brand.brand_id}
              className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0"
              onClick={() => navigate(`/brand/${brand.slug}`)}
            >
              <Avatar className="h-12 w-12 ring-1 ring-border">
                <AvatarImage src={brand.logo_url || undefined} alt={brand.name} />
                <AvatarFallback className="text-xs font-semibold bg-muted">
                  {brand.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="text-[10px] text-muted-foreground truncate w-14 text-center">
                {brand.name}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

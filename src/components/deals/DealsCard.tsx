import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Sparkles, Tag } from 'lucide-react';

interface DealsCardProps {
  onOpenDeals?: () => void;
}

export function DealsCard({ onOpenDeals }: DealsCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onOpenDeals) {
      onOpenDeals();
    } else {
      navigate('/deals');
    }
  };

  return (
    <Card 
      className="p-3 bg-gradient-to-br from-amber-500/10 via-card to-orange-500/5 border border-amber-500/20 hover:shadow-md transition-all cursor-pointer group"
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
          <Tag className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-foreground">Find Better Deals</p>
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Paste a link or upload a photo
          </p>
        </div>
      </div>
    </Card>
  );
}

export default DealsCard;

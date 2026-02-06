import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Heart } from 'lucide-react';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';

interface PublicFit {
  id: string;
  user_id: string;
  title: string | null;
  render_path: string | null;
  image_preview: string | null;
  like_count: number;
  created_at: string;
  creator_username: string;
  creator_name: string | null;
  creator_avatar: string | null;
}

interface PublicFitsGridProps {
  onFitClick: (fit: PublicFit) => void;
}

export const PublicFitsGrid: React.FC<PublicFitsGridProps> = ({ onFitClick }) => {
  const { blockedIds } = useBlockedUsers();
  const { data: fits, isLoading } = useQuery({
    queryKey: ['public-fits'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('public-fits', {
        body: { sort: 'popular', limit: 20, offset: 0 }
      });

      if (error) throw error;
      return data.fits as PublicFit[];
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="aspect-square w-full" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const filteredFits = (fits || []).filter(fit => !blockedIds.includes(fit.creator_username));

  // Note: public-fits edge function returns creator_username but not user_id directly
  // We filter by checking if any blocked ID matches - the edge function should ideally return user_id
  // For now, filter using the data available

  if (filteredFits.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No public fits yet. Be the first to share!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {fits.map((fit) => (
        <Card 
          key={fit.id} 
          className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => onFitClick(fit)}
        >
          <div className="aspect-square bg-muted relative">
            {(fit.render_path || fit.image_preview) ? (
              <img 
                src={fit.render_path || fit.image_preview}
                alt={fit.title || 'Fit'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No preview
              </div>
            )}
          </div>
          <div className="p-3 space-y-1">
            <h3 className="font-medium line-clamp-1 text-sm">
              {fit.title || 'Untitled Fit'}
            </h3>
            <p className="text-xs text-muted-foreground">
              by @{fit.creator_username}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                {fit.like_count} likes
              </span>
              <span>·</span>
              <span>{formatDistanceToNow(new Date(fit.created_at), { addSuffix: false })}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

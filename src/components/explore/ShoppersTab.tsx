import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { SmartImage } from '@/components/SmartImage';
import HorizontalCarousel from './HorizontalCarousel';
import FollowButton from './FollowButton';
import { useFollows } from '@/hooks/useFollows';
import { useAuth } from '@/contexts/AuthContext';

interface ShopperWithOutfits {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  outfits: {
    id: string;
    render_path: string | null;
    image_preview: string | null;
    title: string | null;
  }[];
}

export const ShoppersTab: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFollowing, toggleFollow, isToggling } = useFollows();

  const { data: shoppers, isLoading } = useQuery({
    queryKey: ['explore-shoppers-with-outfits'],
    queryFn: async () => {
      // Get shoppers with public outfits
      const { data: fitsData, error } = await supabase
        .from('fits')
        .select(`
          id,
          render_path,
          image_preview,
          title,
          user_id
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      if (!fitsData?.length) return [];

      // Group by user
      const userOutfitsMap = new Map<string, typeof fitsData>();
      fitsData.forEach((fit) => {
        const existing = userOutfitsMap.get(fit.user_id) || [];
        if (existing.length < 8) {
          existing.push(fit);
          userOutfitsMap.set(fit.user_id, existing);
        }
      });

      // Get user details for each unique user (include current user)
      const userIds = Array.from(userOutfitsMap.keys());
      if (!userIds.length) return [];

      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .in('id', userIds.slice(0, 10));

      if (!usersData?.length) return [];

      // Combine data - put current user last as fallback
      const shoppersWithOutfits: ShopperWithOutfits[] = usersData
        .sort((a: any, b: any) => {
          // Put current user at the end
          if (a.id === user?.id) return 1;
          if (b.id === user?.id) return -1;
          return 0;
        })
        .map((u: any) => ({
          id: u.id,
          display_name: u.name,
          avatar_url: u.avatar_url,
          outfits: userOutfitsMap.get(u.id) || [],
        })).filter(s => s.outfits.length > 0);

      return shoppersWithOutfits;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4].map((j) => (
                <Skeleton key={j} className="h-48 w-36 flex-shrink-0 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!shoppers?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No shoppers with public outfits yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {shoppers.map((shopper) => (
        <HorizontalCarousel
          key={shopper.id}
          title={shopper.display_name || 'Fashion Lover'}
          showViewMore={false}
          headerAction={
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={shopper.avatar_url || undefined} alt={shopper.display_name || 'User'} />
                <AvatarFallback className="text-[10px] font-semibold">
                  {(shopper.display_name || 'U').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Don't show follow button for self */}
              {shopper.id !== user?.id && (
                <FollowButton
                  isFollowing={isFollowing(shopper.id)}
                  onToggle={() => toggleFollow(shopper.id)}
                  isLoading={isToggling}
                />
              )}
            </div>
          }
        >

          {/* Outfit Cards Only - no avatar card */}
          {shopper.outfits.map((outfit) => (
            <Card
              key={outfit.id}
              className="flex-shrink-0 w-32 sm:w-36 overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 snap-start"
              onClick={() => navigate(`/dress-me/outfit/${outfit.id}`)}
            >
              <div className="aspect-[3/4] relative bg-muted">
                <SmartImage
                  src={outfit.render_path || outfit.image_preview || '/placeholder.svg'}
                  alt={outfit.title || 'Outfit'}
                  className="w-full h-full object-cover"
                  sizes="(max-width: 640px) 128px, 144px"
                />
              </div>
              <CardContent className="p-2">
                <p className="text-xs line-clamp-1 font-medium">
                  {outfit.title || 'Untitled Outfit'}
                </p>
              </CardContent>
            </Card>
          ))}
        </HorizontalCarousel>
      ))}
    </div>
  );
};

export default ShoppersTab;

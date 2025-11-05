import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWardrobeItem } from '@/hooks/usePublicWardrobeItems';
import { BackButton } from '@/components/ui/back-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SEOHead } from '@/components/SEOHead';
import { Share2, Plus } from 'lucide-react';
import { toast } from 'sonner';

const seasonIcons: Record<string, string> = {
  spring: '🌸',
  summer: '☀️',
  fall: '🍂',
  winter: '❄️',
};

export default function ClothingItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: item, isLoading } = useWardrobeItem(id || '');

  const { mutate: addToWardrobe, isPending } = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!item) throw new Error('No item data');

      // Show warning about public items
      toast.info('Adding item from Community', {
        description: 'Note: The original publisher can remove this item at any time, and it will be removed from your wardrobe.',
        duration: 5000,
      });

      // Copy the item to user's wardrobe
      const { data, error } = await supabase
        .from('wardrobe_items')
        .insert([{
          user_id: user.id,
          source: 'community_copy',
          name: item.name,
          brand: item.brand,
          category: item.category || 'tops',
          color: item.color,
          season: item.season ? (Array.isArray(item.season) ? item.season[0] : item.season) : null,
          tags: item.tags || [],
          image_url: item.image_url || '',
          image_bg_removed_url: item.image_bg_removed_url,
          attribution_user_id: item.user_id,
          public_reuse_permitted: false,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wardrobe-items'] });
      toast.success('Added to your wardrobe ✨');
    },
    onError: (error) => {
      console.error('Error adding to wardrobe:', error);
      toast.error('Failed to add item');
    },
  });

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: item?.name || 'Check out this item',
          url,
        });
      } catch (error) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    }
  };

  const handleAddToWardrobe = () => {
    if (!user) {
      navigate('/onboarding/signup');
      return;
    }

    if (!item?.public_reuse_permitted) {
      toast.error('This item is not available for reuse');
      return;
    }

    addToWardrobe();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading item...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p className="text-muted-foreground">Item not found</p>
        <Button onClick={() => navigate('/community')} className="mt-4">
          Back to Community
        </Button>
      </div>
    );
  }

  const username = item.user.username || item.user.name || 'Anonymous';
  const displayName = item.name || item.brand || 'Untitled Item';
  const displayImage = item.image_bg_removed_url || item.image_url;

  return (
    <>
      <SEOHead
        title={`${displayName} - Azyah Community`}
        description={`Check out this ${item.category || 'item'} shared by ${username} on Azyah`}
      />

      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container flex items-center justify-between h-14 max-w-screen-2xl">
            <div className="flex items-center">
              <BackButton />
              <h1 className="text-lg font-semibold ml-2">Item Details</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <div className="container max-w-screen-md mx-auto px-4 py-6">
          {/* Main item image */}
          <div className="aspect-square bg-muted rounded-lg overflow-hidden mb-6 flex items-center justify-center">
            {displayImage ? (
              <img
                src={displayImage}
                alt={displayName}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-muted-foreground">No image available</div>
            )}
          </div>

          {/* Item name */}
          <h2 className="text-2xl font-bold mb-2">{displayName}</h2>

          {/* Brand */}
          {item.brand && item.brand !== item.name && (
            <p className="text-lg text-muted-foreground mb-4">{item.brand}</p>
          )}

          {/* User info */}
          <div className="flex items-center gap-3 mb-6 pb-6 border-b">
            <Avatar className="w-10 h-10">
              <AvatarImage src={item.user.avatar_url || undefined} />
              <AvatarFallback>
                {username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{username}</p>
              <p className="text-sm text-muted-foreground">Creator</p>
            </div>
          </div>

          {/* Item details */}
          <div className="space-y-4">
            {item.category && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Category</h3>
                <Badge variant="secondary" className="capitalize">
                  {item.category.replace('_', ' ')}
                </Badge>
              </div>
            )}

            {item.color && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Color</h3>
                <Badge variant="outline" className="capitalize">
                  {item.color}
                </Badge>
              </div>
            )}

            {item.season && item.season.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Season</h3>
                <div className="flex gap-2 flex-wrap">
                  {item.season.map((s) => (
                    <Badge key={s} variant="outline" className="capitalize">
                      {seasonIcons[s.toLowerCase()] || ''} {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {item.tags && item.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Tags</h3>
                <div className="flex gap-2 flex-wrap">
                  {item.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fixed bottom action */}
        {item.public_reuse_permitted && (
          <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
            <div className="container max-w-screen-md mx-auto">
              <Button
                className="w-full"
                onClick={handleAddToWardrobe}
                disabled={isPending}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add to Your Wardrobe
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

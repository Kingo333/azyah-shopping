import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WardrobeItemCard } from './WardrobeItemCard';
import { OutfitPreviewCard } from './OutfitPreviewCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { Package, Shirt } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface FriendProfileModalProps {
  friendId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FriendProfileModal: React.FC<FriendProfileModalProps> = ({
  friendId,
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('clothes');

  // Fetch friend profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['friend-profile', friendId],
    queryFn: async () => {
      if (!friendId) return null;
      const { data, error } = await supabase
        .from('users')
        .select('id, username, avatar_url')
        .eq('id', friendId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!friendId && open,
  });

  // Fetch friend's public wardrobe items
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['friend-wardrobe', friendId],
    queryFn: async () => {
      if (!friendId) return [];
      const { data, error } = await supabase
        .from('wardrobe_items')
        .select('*')
        .eq('user_id', friendId)
        .eq('public_reuse_permitted', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!friendId && open,
  });

  // Fetch outfits gifted to this friend
  const { data: giftedOutfits = [], isLoading: outfitsLoading } = useQuery({
    queryKey: ['gifted-outfits', friendId],
    queryFn: async () => {
      if (!friendId) return [];
      const { data, error } = await supabase
        .from('fits')
        .select('*')
        .eq('gifted_to', friendId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!friendId && open,
  });

  const handleCreateOutfit = () => {
    if (friendId) {
      onOpenChange(false);
      navigate(`/dress-me/canvas?mode=friend&friendId=${friendId}`);
    }
  };

  if (!friendId || !open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-4">
            {profileLoading ? (
              <>
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </>
            ) : (
              <>
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback>
                    {profile?.username?.charAt(0).toUpperCase() || 'F'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <DialogTitle>@{profile?.username || 'Friend'}</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    {items.length} public item{items.length !== 1 ? 's' : ''} • {giftedOutfits.length} outfit{giftedOutfits.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <Button onClick={handleCreateOutfit} disabled={items.length === 0}>
                  <Shirt className="w-4 h-4 mr-2" />
                  Create Outfit
                </Button>
              </>
            )}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="clothes">Public Clothes</TabsTrigger>
            <TabsTrigger value="outfits">Outfits for Them</TabsTrigger>
          </TabsList>

          <TabsContent value="clothes" className="flex-1 overflow-y-auto mt-4">
            {itemsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No public items yet</p>
                <p className="text-sm text-muted-foreground">
                  Ask your friend to make some items public!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {items.map((item) => (
                  <WardrobeItemCard 
                    key={item.id} 
                    item={item as any} 
                    isSelected={false}
                    onToggle={() => {}}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="outfits" className="flex-1 overflow-y-auto mt-4">
            {outfitsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : giftedOutfits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Shirt className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No outfits created yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Be the first to create an outfit for them!
                </p>
                <Button onClick={handleCreateOutfit} disabled={items.length === 0}>
                  Create Outfit
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {giftedOutfits.map((outfit) => (
                  <OutfitPreviewCard 
                    key={outfit.id} 
                    fit={outfit} 
                    onClick={() => {}} 
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

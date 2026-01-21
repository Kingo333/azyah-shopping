import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Heart, Plus, Trash2, Grid, List } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { SmartImage } from '@/components/SmartImage';
import { getPrimaryImageUrl } from '@/utils/imageHelpers';
import { openExternalUrl } from '@/lib/openExternalUrl';

interface Wishlist {
  id: string;
  title: string;
  description?: string;
  is_public: boolean;
  created_at: string;
}

interface WishlistItem {
  id: string;
  product_id: string;
  product: {
    id: string;
    title: string;
    price_cents: number;
    currency: string;
    media_urls: string[];
    external_url?: string;
    brands?: { name: string };
  };
}

const FavoritesWishlistTab: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedWishlist, setSelectedWishlist] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWishlistTitle, setNewWishlistTitle] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: wishlists, isLoading: wishlistsLoading } = useQuery({
    queryKey: ['wishlists', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wishlists')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Wishlist[];
    },
    enabled: !!user?.id,
  });

  const { data: wishlistItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['wishlist-items', selectedWishlist],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wishlist_items')
        .select(`
          id,
          product_id,
          products!wishlist_items_product_fkey(
            id, title, price_cents, currency, media_urls, external_url,
            brands!inner(name)
          )
        `)
        .eq('wishlist_id', selectedWishlist);

      if (error) throw error;
      return (data?.map((item) => ({
        id: item.id,
        product_id: item.product_id,
        product: { ...item.products, brands: item.products?.brands },
      })) as WishlistItem[]) || [];
    },
    enabled: !!selectedWishlist,
  });

  const createWishlistMutation = useMutation({
    mutationFn: async (title: string) => {
      const { data, error } = await supabase
        .from('wishlists')
        .insert({ title, user_id: user?.id, is_public: false })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
      setIsCreateDialogOpen(false);
      setNewWishlistTitle('');
      toast({ title: 'Wishlist created' });
    },
  });

  const deleteWishlistMutation = useMutation({
    mutationFn: async (wishlistId: string) => {
      const { error } = await supabase.from('wishlists').delete().eq('id', wishlistId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
      setSelectedWishlist('');
      toast({ title: 'Wishlist deleted' });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('wishlist_items').delete().eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-items'] });
      toast({ title: 'Item removed' });
    },
  });

  const formatPrice = (cents: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
  };

  if (wishlistsLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  // Wishlist list view
  if (!selectedWishlist) {
    return (
      <div>
        <div className="flex justify-end mb-4">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Wishlist
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Wishlist</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  value={newWishlistTitle}
                  onChange={(e) => setNewWishlistTitle(e.target.value)}
                  placeholder="Wishlist name"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => createWishlistMutation.mutate(newWishlistTitle)}
                    disabled={!newWishlistTitle.trim() || createWishlistMutation.isPending}
                  >
                    Create
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!wishlists?.length ? (
          <div className="text-center py-16">
            <Heart className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No wishlists yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first wishlist to save items for later
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              Create Your First Wishlist
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {wishlists.map((wishlist) => (
              <Card
                key={wishlist.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedWishlist(wishlist.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{wishlist.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(wishlist.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteWishlistMutation.mutate(wishlist.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Badge variant="secondary" className="mt-3">Private</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Wishlist items view
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => setSelectedWishlist('')}>
          ← Back to Wishlists
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {itemsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[3/4] bg-muted rounded-lg mb-2"></div>
              <div className="h-4 bg-muted rounded mb-1"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : !wishlistItems?.length ? (
        <div className="text-center py-16">
          <Heart className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No items in this wishlist</h3>
          <p className="text-muted-foreground mb-4">
            Start swiping to add items to this wishlist
          </p>
          <Button onClick={() => navigate('/swipe')}>Start Swiping</Button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-4'}>
          {wishlistItems.map((item) => (
            <Card key={item.id} className="group overflow-hidden hover:shadow-xl transition-all">
              <CardContent className="p-0">
                <div className={viewMode === 'grid' ? '' : 'flex gap-4'}>
                  <div className={viewMode === 'grid' ? 'aspect-[3/4] relative' : 'w-32 h-32 flex-shrink-0'}>
                    <SmartImage
                      src={getPrimaryImageUrl(item.product)}
                      alt={item.product.title}
                      className="w-full h-full object-cover"
                      sizes={viewMode === 'grid' ? '(max-width: 768px) 50vw, 25vw' : '128px'}
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => removeItemMutation.mutate(item.id)}
                      className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className={viewMode === 'grid' ? 'p-3' : 'flex-1 py-2'}>
                    {item.product.brands && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/brand/${item.product.brands!.name.toLowerCase().replace(/\s+/g, '-')}`);
                        }}
                        className="text-xs font-medium text-muted-foreground uppercase hover:text-primary hover:underline text-left"
                      >
                        {item.product.brands.name}
                      </button>
                    )}
                    <h3 className="font-medium text-sm line-clamp-2">{item.product.title}</h3>
                    <p className="font-bold text-primary mt-1">
                      {formatPrice(item.product.price_cents, item.product.currency)}
                    </p>
                    {item.product.external_url && (
                      <Button
                        onClick={() => openExternalUrl(item.product.external_url)}
                        className="w-full mt-2"
                        size="sm"
                      >
                        Shop
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesWishlistTab;

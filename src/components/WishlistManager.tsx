
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Plus, Trash2, Eye, Grid, List, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useProductAnalytics } from '@/hooks/useAnalytics';
import { getResponsiveImageProps } from '@/utils/asosImageUtils';

interface Wishlist {
  id: string;
  title: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface WishlistItem {
  id: string;
  product_id: string;
  added_at: string;
  sort_order: number;
  wishlist_id: string;
  product: {
    id: string;
    title: string;
    price_cents: number;
    currency: string;
    media_urls: string[];
    external_url?: string;
    brand?: { name: string };
  };
}

export const WishlistManager: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { trackProductView, trackProductClick } = useProductAnalytics();
  const [selectedWishlist, setSelectedWishlist] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWishlistTitle, setNewWishlistTitle] = useState('');
  const [newWishlistDescription, setNewWishlistDescription] = useState('');
  // All wishlists are now private for security
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch user's wishlists
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
    enabled: !!user?.id
  });

  // Fetch wishlist items
  const { data: wishlistItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['wishlist-items', selectedWishlist],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wishlist_items')
        .select(`
          id,
          wishlist_id,
          product_id,
          added_at,
          sort_order,
          products!wishlist_items_product_fkey(
            id,
            title,
            price_cents,
            currency,
            media_urls,
            external_url,
            brands!inner(name)
          )
        `)
        .eq('wishlist_id', selectedWishlist)
        .order('sort_order');

      if (error) throw error;
      
      // Transform the data to match our interface
      return (data?.map(item => ({
        id: item.id,
        wishlist_id: item.wishlist_id,
        product_id: item.product_id,
        added_at: item.added_at,
        sort_order: item.sort_order,
        product: {
          ...item.products,
          brand: item.products?.brands
        }
      })) as WishlistItem[]) || [];
    },
    enabled: !!selectedWishlist
  });

  // Create wishlist mutation
  const createWishlistMutation = useMutation({
    mutationFn: async (wishlistData: { title: string; description?: string; is_public: boolean }) => {
      const { data, error } = await supabase
        .from('wishlists')
        .insert({
          ...wishlistData,
          user_id: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
      setIsCreateDialogOpen(false);
      setNewWishlistTitle('');
      setNewWishlistDescription('');
      toast({
        title: "Wishlist created",
        description: "Your new wishlist has been created successfully.",
      });
    }
  });

  const deleteWishlistMutation = useMutation({
    mutationFn: async (wishlistId: string) => {
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('id', wishlistId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
      setSelectedWishlist('');
      toast({
        title: "Wishlist deleted",
        description: "Your wishlist has been deleted successfully.",
      });
    }
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-items'] });
      toast({
        title: "Item removed",
        description: "Item has been removed from your wishlist.",
      });
    }
  });

  // Privacy toggle removed - all wishlists are now private for security

  const handleShopNow = (product: WishlistItem['product']) => {
    if (product.external_url) {
      trackProductClick(product.id, 'wishlist_shop_now');
      window.open(product.external_url, '_blank', 'noopener,noreferrer');
    } else {
      toast({
        title: "Shop link not available",
        description: "This product doesn't have a shop link available.",
        variant: "destructive"
      });
    }
  };

  const formatPrice = (cents: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  const handleCreateWishlist = () => {
    if (!newWishlistTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your wishlist.",
        variant: "destructive"
      });
      return;
    }

    createWishlistMutation.mutate({
      title: newWishlistTitle.trim(),
      description: newWishlistDescription.trim() || undefined,
      is_public: false // All wishlists are private for security
    });
  };

  if (wishlistsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-accent rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-accent rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Wishlists</h1>
          <p className="text-muted-foreground">
            Organize your favorite items into collections
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Wishlist
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Wishlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newWishlistTitle}
                  onChange={(e) => setNewWishlistTitle(e.target.value)}
                  placeholder="My Wishlist"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (Optional)</label>
                <Input
                  value={newWishlistDescription}
                  onChange={(e) => setNewWishlistDescription(e.target.value)}
                  placeholder="Add a description..."
                />
              </div>
              <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                <p>All wishlists are private for your security and privacy.</p>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleCreateWishlist} disabled={createWishlistMutation.isPending}>
                  Create Wishlist
                </Button>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Wishlists Grid */}
      {!selectedWishlist ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlists?.map(wishlist => (
            <Card key={wishlist.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{wishlist.title}</CardTitle>
                    {wishlist.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {wishlist.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteWishlistMutation.mutate(wishlist.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent onClick={() => setSelectedWishlist(wishlist.id)}>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">Private</Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(wishlist.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {wishlists?.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No wishlists yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first wishlist to start organizing your favorite items
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                Create Your First Wishlist
              </Button>
            </div>
          )}
        </div>
      ) : (
        // Wishlist Items View
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setSelectedWishlist('')}>
                ← Back to Wishlists
              </Button>
              <h2 className="text-2xl font-bold">
                {wishlists?.find(w => w.id === selectedWishlist)?.title}
              </h2>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {itemsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-accent rounded-lg mb-3"></div>
                  <div className="h-4 bg-accent rounded mb-2"></div>
                  <div className="h-3 bg-accent rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6' : 'space-y-4'}>
              {wishlistItems?.map(item => (
                <Card key={item.id} className="group hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className={viewMode === 'grid' ? 'space-y-2 md:space-y-3' : 'flex gap-4'}>
                      <div className={viewMode === 'grid' ? 'aspect-square' : 'w-24 h-24 flex-shrink-0'}>
                        {(() => {
                          const imageUrl = item.product.media_urls[0] || '/placeholder.svg';
                          const imageProps = imageUrl.includes('asos-media.com') 
                            ? getResponsiveImageProps(imageUrl, viewMode === 'grid' ? "(max-width: 768px) 50vw, 25vw" : "96px")
                            : { src: imageUrl };
                          
                          return (
                            <img
                              {...imageProps}
                              alt={item.product.title}
                              className="w-full h-full object-cover rounded-t-lg"
                            />
                          );
                        })()}
                      </div>
                      
                      <div className={`${viewMode === 'list' ? 'flex-1' : 'p-2 md:p-4'} space-y-2`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium line-clamp-2 text-sm md:text-base">{item.product.title}</h3>
                            {item.product.brand && (
                              <p className="text-xs md:text-sm text-muted-foreground">{item.product.brand.name}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItemMutation.mutate(item.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm md:text-base">
                            {formatPrice(item.product.price_cents, item.product.currency)}
                          </span>
                        </div>

                        <Button
                          onClick={() => handleShopNow(item.product)}
                          className="w-full text-xs md:text-sm h-8 md:h-9"
                        >
                          <ExternalLink className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                          Shop Now
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {wishlistItems?.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No items in this wishlist</h3>
                  <p className="text-muted-foreground mb-4">
                    Start swiping to add items to this wishlist
                  </p>
                  <Button onClick={() => setSelectedWishlist('')}>
                    Back to Wishlists
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

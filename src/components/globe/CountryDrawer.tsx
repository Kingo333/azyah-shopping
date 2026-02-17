import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ChevronRight, Users, ChevronUp, ChevronDown, Play, Shirt, Sparkles, EyeOff, Eye, User } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCountryNameFromCode } from '@/lib/countryCurrency';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SmartImage } from '@/components/SmartImage';
import { getPrimaryImageUrl } from '@/utils/imageHelpers';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { PostProductCircles } from '@/components/PostProductCircles';
import { ImageIcon } from 'lucide-react';
import { useFollows } from '@/hooks/useFollows';
import { useFollowBrands } from '@/hooks/useFollowBrands';

type ExploreTab = 'brands' | 'following' | 'shoppers' | 'your-fit';

interface CountryBrand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface CountryProduct {
  id: string;
  title: string;
  media_urls: any;
  image_url?: string | null;
  price_cents: number;
  currency: string;
  brand_id: string;
}

interface CountryShopper {
  id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface ShopperFit {
  id: string;
  user_id: string;
  title: string | null;
  image_preview: string | null;
  render_path: string | null;
}

interface PublicWardrobeItem {
  id: string;
  user_id: string;
  name: string | null;
  brand: string | null;
  category: string | null;
  image_url: string | null;
  image_bg_removed_url: string | null;
}

interface CountryDrawerProps {
  countryCode: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab?: ExploreTab;
}

export function CountryDrawer({ countryCode, open, onOpenChange, activeTab = 'brands' }: CountryDrawerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const countryName = countryCode === 'GLOBAL' ? 'Global Community' : (countryCode ? getCountryNameFromCode(countryCode) : '');
  const [isExpanded, setIsExpanded] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'brands' | 'products'>('brands');
  const [shoppersSubTab, setShoppersSubTab] = useState<'people' | 'posts'>('people');

  // Swipe-to-expand state
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].screenY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = touchStartY.current - e.changedTouches[0].screenY;
    if (deltaY > 30) setIsExpanded(true);
    else if (deltaY < -30) setIsExpanded(false);
    touchStartY.current = null;
  };

  // Follow hooks
  const { isFollowing, toggleFollow } = useFollows();
  const { isFollowingBrand, toggleFollowBrand } = useFollowBrands();

  // Fetch current user's profile and visibility status
  const { data: currentUserProfile } = useQuery({
    queryKey: ['current-user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('users')
        .select('id, name, username, avatar_url, preferences, country')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id && open && activeTab === 'shoppers',
  });

  const isVisibleOnGlobe = currentUserProfile?.preferences 
    ? (currentUserProfile.preferences as Record<string, unknown>).visible_on_globe !== false
    : true;

  const toggleVisibilityMutation = useMutation({
    mutationFn: async (visible: boolean) => {
      if (!user?.id) throw new Error('Not authenticated');
      const currentPrefs = (currentUserProfile?.preferences as Record<string, unknown>) || {};
      const { error } = await supabase
        .from('users')
        .update({
          preferences: {
            ...currentPrefs,
            visible_on_globe: visible,
          },
        })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: (_, visible) => {
      queryClient.invalidateQueries({ queryKey: ['current-user-profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['country-shoppers'] });
      toast({
        description: visible ? 'You are now visible on the globe' : 'You are now hidden from the globe',
      });
    },
    onError: () => {
      toast({
        description: 'Failed to update visibility',
        variant: 'destructive',
      });
    },
  });

  // Fetch current user's public fits (kept for Posts tab)
  const { data: currentUserFits } = useQuery({
    queryKey: ['current-user-fits', user?.id],
    queryFn: async (): Promise<ShopperFit[]> => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('fits')
        .select('id, user_id, title, image_preview, render_path')
        .eq('user_id', user.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(6);
      return (data || []) as ShopperFit[];
    },
    enabled: !!user?.id && open && activeTab === 'shoppers',
  });

  // Fetch current user's public wardrobe items (kept for Posts tab)
  const { data: currentUserItems } = useQuery({
    queryKey: ['current-user-public-items', user?.id],
    queryFn: async (): Promise<PublicWardrobeItem[]> => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('wardrobe_items')
        .select('id, user_id, name, brand, category, image_url, image_bg_removed_url')
        .eq('user_id', user.id)
        .eq('public_reuse_permitted', true)
        .order('created_at', { ascending: false })
        .limit(6);
      return (data || []) as PublicWardrobeItem[];
    },
    enabled: !!user?.id && open && activeTab === 'shoppers',
  });

  // Fetch brands in this country
  const { data: brands, isLoading: brandsLoading } = useQuery({
    queryKey: ['country-brands', countryCode],
    queryFn: async (): Promise<CountryBrand[]> => {
      if (!countryCode || countryCode === 'GLOBAL') return [];
      const result = await supabase
        .from('brands')
        .select('id, name, slug, logo_url')
        .eq('country_code', countryCode)
        .limit(10);
      return (result.data ?? []) as CountryBrand[];
    },
    enabled: !!countryCode && open && activeTab === 'brands',
  });

  // Fetch products from brands in this country
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['country-products', countryCode, brands?.map(b => b.id).join(',')],
    queryFn: async (): Promise<CountryProduct[]> => {
      if (!brands || brands.length === 0) return [];
      const brandIds = brands.map(b => b.id);
      const result = await supabase
        .from('products')
        .select('id, title, media_urls, image_url, price_cents, currency, brand_id')
        .in('brand_id', brandIds)
        .eq('status', 'active')
        .limit(12);
      return (result.data ?? []) as CountryProduct[];
    },
    enabled: !!brands && brands.length > 0 && open && activeTab === 'brands',
  });

  // Fetch shoppers in this country or globally
  const { data: shoppers, isLoading: shoppersLoading } = useQuery({
    queryKey: ['country-shoppers', countryCode, activeTab],
    queryFn: async (): Promise<CountryShopper[]> => {
      if (!countryCode) return [];
      
      if (countryCode === 'GLOBAL') {
        const usersResult = await supabase
          .from('users')
          .select('id')
          .or('country.is.null,country.eq.');
        
        if (!usersResult.data || usersResult.data.length === 0) return [];
        
        const userIds = usersResult.data.map(u => u.id);
        const { data } = await supabase
          .from('users_public')
          .select('id, name, username, avatar_url')
          .in('id', userIds)
          .limit(20);
        return (data ?? []) as CountryShopper[];
      } else {
        const countryNameForQuery = getCountryNameFromCode(countryCode);
        if (!countryNameForQuery) return [];
        
        const usersResult = await supabase
          .from('users')
          .select('id')
          .eq('country', countryNameForQuery);
        
        if (!usersResult.data || usersResult.data.length === 0) return [];
        
        const userIds = usersResult.data.map(u => u.id);
        const { data } = await supabase
          .from('users_public')
          .select('id, name, username, avatar_url')
          .in('id', userIds)
          .limit(20);
        return (data ?? []) as CountryShopper[];
      }
    },
    enabled: !!countryCode && open && activeTab === 'shoppers',
  });

  // Fetch shopper public fits
  const shopperIds = shoppers?.map(s => s.id) || [];
  const { data: shopperFits } = useQuery({
    queryKey: ['shopper-fits', shopperIds.join(',')],
    queryFn: async (): Promise<ShopperFit[]> => {
      if (shopperIds.length === 0) return [];
      const { data } = await supabase
        .from('fits')
        .select('id, user_id, title, image_preview, render_path')
        .in('user_id', shopperIds)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(30);
      return (data || []) as ShopperFit[];
    },
    enabled: shopperIds.length > 0 && open && activeTab === 'shoppers',
  });

  // Fetch public wardrobe items from shoppers
  const { data: publicItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['country-public-items', shopperIds.join(',')],
    queryFn: async (): Promise<PublicWardrobeItem[]> => {
      if (shopperIds.length === 0) return [];
      const { data } = await supabase
        .from('wardrobe_items')
        .select('id, user_id, name, brand, category, image_url, image_bg_removed_url')
        .in('user_id', shopperIds)
        .eq('public_reuse_permitted', true)
        .order('created_at', { ascending: false })
        .limit(30);
      return (data || []) as PublicWardrobeItem[];
    },
    enabled: shopperIds.length > 0 && open && activeTab === 'shoppers',
  });

  // Fetch public shopper posts
  const { data: shopperPosts = [], isLoading: shopperPostsLoading } = useQuery({
    queryKey: ['country-shopper-posts', shopperIds.join(',')],
    queryFn: async () => {
      if (shopperIds.length === 0) return [];
      const { data } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          content,
          visibility,
          created_at,
          post_images(image_url, sort_order),
          post_products(
            product_id,
            external_image_url,
            external_title,
            products:product_id(title, media_urls, image_url)
          )
        `)
        .in('user_id', shopperIds)
        .eq('visibility', 'public_explore')
        .order('created_at', { ascending: false })
        .limit(30);
      return data || [];
    },
    enabled: shopperIds.length > 0 && open && activeTab === 'shoppers',
  });

  const handleBrandClick = (slug: string) => {
    onOpenChange(false);
    navigate(`/brand/${slug}`);
  };

  const handleProductClick = (productId: string) => {
    onOpenChange(false);
    navigate(`/p/${productId}`);
  };

  const handleSwipeToCountry = () => {
    onOpenChange(false);
    navigate(`/swipe?country=${countryCode}`);
  };

  const handleShopperClick = (shopperId: string) => {
    onOpenChange(false);
    navigate(`/profile/${shopperId}`);
  };

  const handleFitClick = (fitId: string) => {
    if (!user) {
      toast({
        title: "Create an account",
        description: "Log in to view full outfit details and save your favorites",
      });
    }
    onOpenChange(false);
    navigate(`/community/outfit/${fitId}`);
  };

  const handleItemClick = (itemId: string) => {
    onOpenChange(false);
    navigate(`/community/item/${itemId}`);
  };

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const getBrandName = (brandId: string) => {
    return brands?.find(b => b.id === brandId)?.name || '';
  };

  const showBrandsContent = activeTab === 'brands';
  const showShoppersContent = activeTab === 'shoppers';
  const isLoadingBrands = brandsLoading;
  const isLoadingProducts = productsLoading;
  const isLoadingShoppers = shoppersLoading;

  const totalOutfits = shopperFits?.length || 0;
  const totalItems = publicItems?.length || 0;
  const totalShopperPosts = shopperPosts?.length || 0;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent 
        className={cn(
          "bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border-t border-white/20 shadow-2xl transition-all duration-300 ease-out",
          isExpanded ? "h-[95vh]" : "max-h-[55vh]"
        )}
      >
        <DrawerHeader 
          className="pb-3 relative border-b border-border/30 touch-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Expand/Collapse Button */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute top-3 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-all"
            aria-label={isExpanded ? "Minimize drawer" : "View all"}
          >
            <span className="text-xs font-medium text-muted-foreground">
              {isExpanded ? 'Minimize' : 'View All'}
            </span>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          <div className="flex items-center gap-3 pr-24">
            <div className="p-2 rounded-xl bg-primary/10">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DrawerTitle className="text-xl font-semibold tracking-tight">{countryName}</DrawerTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {showBrandsContent 
                  ? `${brands?.length || 0} brands • ${products?.length || 0} products`
                  : `${shoppers?.length || 0} shoppers`
                }
              </p>
            </div>
          </div>

          {/* Swipe CTA */}
          <div className="flex items-center gap-3 mt-4">
            <Button
              onClick={handleSwipeToCountry}
              size="sm"
              className="gap-2 rounded-full px-4 shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              Start Swiping
            </Button>
            <p className="text-xs text-muted-foreground">
              Discover products from {countryName}
            </p>
          </div>

          {/* Tabs */}
          {showBrandsContent && (
            <Tabs value={drawerTab} onValueChange={(v) => setDrawerTab(v as 'brands' | 'products')} className="mt-4">
              <TabsList className="w-full grid grid-cols-2 bg-black/5 dark:bg-white/10 p-1 rounded-full">
                <TabsTrigger value="brands" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">Brands</TabsTrigger>
                <TabsTrigger value="products" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">Products</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {showShoppersContent && (
            <Tabs value={shoppersSubTab} onValueChange={(v) => setShoppersSubTab(v as 'people' | 'posts')} className="mt-4">
              <TabsList className="w-full grid grid-cols-2 bg-black/5 dark:bg-white/10 p-1 rounded-full">
                <TabsTrigger value="people" className="rounded-full data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  People
                </TabsTrigger>
                <TabsTrigger value="posts" className="rounded-full data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Posts
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 pb-4">
          {showBrandsContent ? (
            <div className="space-y-4 py-4">
              {drawerTab === 'brands' ? (
                isLoadingBrands ? (
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="aspect-square rounded-xl" />)}
                  </div>
                ) : brands && brands.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {brands.map((brand) => (
                      <div 
                        key={brand.id} 
                        className="flex flex-col items-center p-3 rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm hover:bg-card hover:shadow-md transition-all duration-200"
                      >
                        <button
                          onClick={() => handleBrandClick(brand.slug)}
                          className="flex flex-col items-center"
                        >
                          <Avatar className="w-14 h-14 mb-2 ring-2 ring-white/50 shadow-sm">
                            <AvatarImage src={brand.logo_url || undefined} alt={brand.name} />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{brand.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium text-center line-clamp-1">{brand.name}</span>
                        </button>
                        <Button
                          variant={isFollowingBrand(brand.id) ? "secondary" : "outline"}
                          size="sm"
                          className="rounded-full text-[10px] h-6 px-3 mt-2 w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFollowBrand(brand.id);
                          }}
                        >
                          {isFollowingBrand(brand.id) ? 'Following' : 'Follow'}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No brands in this country yet</p>
                  </div>
                )
              ) : (
                isLoadingProducts ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
                  </div>
                ) : products && products.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {products.slice(0, isExpanded ? 12 : 6).map((product) => (
                      <Card
                        key={product.id}
                        className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] bg-card/80 backdrop-blur-sm border-border/30 rounded-xl"
                        onClick={() => handleProductClick(product.id)}
                      >
                        <div className="aspect-[3/4] relative overflow-hidden bg-muted rounded-t-xl">
                          <SmartImage
                            src={getPrimaryImageUrl(product)}
                            alt={product.title}
                            className="w-full h-full object-cover"
                            sizes="(max-width: 640px) 100px, 120px"
                          />
                        </div>
                        <div className="p-2.5">
                          <p className="text-[10px] text-muted-foreground truncate uppercase tracking-wide">{getBrandName(product.brand_id)}</p>
                          <p className="text-xs font-medium truncate mt-0.5">{product.title}</p>
                          <p className="text-xs text-primary font-semibold mt-1">{formatPrice(product.price_cents, product.currency)}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No products in this country yet</p>
                  </div>
                )
              )}
            </div>
          ) : showShoppersContent ? (
            <div className="space-y-4 py-4">
              {shoppersSubTab === 'people' ? (
                /* People Tab - Names only + follow buttons */
                <div className="space-y-2">
                  {/* Current User Row */}
                  {user && currentUserProfile && (
                    <div className="space-y-2 pb-3 border-b border-border/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-semibold text-muted-foreground">You</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">
                            {isVisibleOnGlobe ? 'Visible' : 'Hidden'}
                          </span>
                          <Switch
                            checked={isVisibleOnGlobe}
                            onCheckedChange={(checked) => toggleVisibilityMutation.mutate(checked)}
                            disabled={toggleVisibilityMutation.isPending}
                            className="scale-75"
                          />
                          {isVisibleOnGlobe ? (
                            <Eye className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      <button 
                        onClick={() => { onOpenChange(false); navigate(`/profile/${user?.id}`); }} 
                        className="flex items-center gap-3 w-full text-left hover:bg-accent/30 rounded-lg p-2 transition-colors"
                      >
                        <Avatar className="w-9 h-9 ring-2 ring-primary/20">
                          <AvatarImage src={currentUserProfile.avatar_url || undefined} alt={currentUserProfile.name || 'You'} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {(currentUserProfile.name || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium flex-1 truncate">
                          {currentUserProfile.name || currentUserProfile.username || 'You'}
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </button>
                    </div>
                  )}

                  {/* Other Shoppers - names only + follow */}
                  {isLoadingShoppers ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
                    </div>
                  ) : shoppers && shoppers.filter(s => s.id !== user?.id).length > 0 ? (
                    <div className="space-y-1">
                      {shoppers.filter(s => s.id !== user?.id).map((shopper) => (
                        <div key={shopper.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 transition-colors">
                          <button
                            onClick={() => handleShopperClick(shopper.id)}
                            className="flex items-center gap-3 flex-1 min-w-0 text-left"
                          >
                            <Avatar className="w-9 h-9">
                              <AvatarImage src={shopper.avatar_url || undefined} alt={shopper.name || 'User'} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {(shopper.name || shopper.username || 'U').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium block truncate">
                                {shopper.name || shopper.username || 'Anonymous'}
                              </span>
                              {shopper.username && shopper.name && (
                                <span className="text-[10px] text-muted-foreground">@{shopper.username}</span>
                              )}
                            </div>
                          </button>
                          {user && shopper.id !== user.id && (
                            <Button
                              variant={isFollowing(shopper.id) ? "secondary" : "outline"}
                              size="sm"
                              className="rounded-full text-[10px] h-7 px-3 flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFollow(shopper.id);
                              }}
                            >
                              {isFollowing(shopper.id) ? 'Following' : 'Follow'}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : !user ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No shoppers in this country yet</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                /* Posts Tab - 5-col grid */
                (itemsLoading || shopperPostsLoading) ? (
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => <Skeleton key={i} className="aspect-square rounded-lg" />)}
                  </div>
                ) : (totalShopperPosts > 0 || totalOutfits > 0 || totalItems > 0) ? (
                  <div className="space-y-4">
                    {/* Shopper Posts */}
                    {shopperPosts.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                          <ImageIcon className="w-3 h-3" />
                          Posts ({totalShopperPosts})
                        </p>
                        <div className="grid grid-cols-5 gap-1.5">
                          {shopperPosts.slice(0, isExpanded ? 30 : 10).map((post: any) => {
                            const firstImage = post.post_images
                              ?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
                              ?.[0]?.image_url;

                            return (
                              <div
                                key={post.id}
                                className="aspect-square relative overflow-hidden bg-muted rounded-lg cursor-pointer"
                                onClick={() => {
                                  onOpenChange(false);
                                  navigate(`/profile/${post.user_id}`);
                                }}
                              >
                                {firstImage ? (
                                  <SmartImage
                                    src={firstImage}
                                    alt={post.content || 'Post'}
                                    className="w-full h-full object-cover"
                                    sizes="65px"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-4 h-4 text-muted-foreground/30" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Community Outfits */}
                    {shopperFits && shopperFits.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" />
                          Outfits ({totalOutfits})
                        </p>
                        <div className="grid grid-cols-5 gap-1.5">
                          {shopperFits.slice(0, isExpanded ? 20 : 10).map((fit) => (
                            <div 
                              key={fit.id} 
                              className="aspect-square relative overflow-hidden bg-muted rounded-lg cursor-pointer"
                              onClick={() => handleFitClick(fit.id)}
                            >
                              <SmartImage 
                                src={fit.render_path || fit.image_preview || '/placeholder.svg'} 
                                alt={fit.title || 'Outfit'} 
                                className="w-full h-full object-cover"
                                sizes="65px"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Shared Items */}
                    {publicItems && publicItems.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Shirt className="w-3 h-3" />
                          Items ({totalItems})
                        </p>
                        <div className="grid grid-cols-5 gap-1.5">
                          {publicItems.slice(0, isExpanded ? 20 : 10).map((item) => {
                            const displayImage = item.image_bg_removed_url || item.image_url;
                            return (
                              <div 
                                key={item.id} 
                                className="aspect-square relative overflow-hidden bg-muted rounded-lg cursor-pointer flex items-center justify-center"
                                onClick={() => handleItemClick(item.id)}
                              >
                                {displayImage ? (
                                  <img src={displayImage} alt={item.name || 'Item'} className="w-full h-full object-contain" />
                                ) : (
                                  <Shirt className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No public content yet</p>
                  </div>
                )
              )}
            </div>
          ) : null}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

export default CountryDrawer;

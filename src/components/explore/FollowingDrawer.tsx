import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ChevronRight, ChevronUp, ChevronDown, Store, Users, LogIn } from 'lucide-react';
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
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SmartImage } from '@/components/SmartImage';
import { getPrimaryImageUrl } from '@/utils/imageHelpers';
import { useAuth } from '@/contexts/AuthContext';
import { useFollows } from '@/hooks/useFollows';
import { useMutualFollows } from '@/hooks/useMutualFollows';
import { cn } from '@/lib/utils';
import { isGuestMode } from '@/hooks/useGuestMode';

interface FollowingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FollowedUser {
  id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface FollowedBrand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface UserFit {
  id: string;
  title: string | null;
  image_preview: string | null;
  render_path: string | null;
}

interface BrandProduct {
  id: string;
  title: string;
  media_urls: any;
  image_url?: string | null;
  price_cents: number;
  currency: string;
}

export function FollowingDrawer({ open, onOpenChange }: FollowingDrawerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { following, followingLoading } = useFollows();
  const { mutualFollowIds } = useMutualFollows();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'people' | 'brands'>('people');

  const isGuest = !user || isGuestMode();

  // Fetch followed users data
  const { data: followedUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['followed-users', following],
    queryFn: async (): Promise<FollowedUser[]> => {
      if (!following || following.length === 0) return [];
      
      const { data } = await supabase
        .from('users_public')
        .select('id, name, username, avatar_url')
        .in('id', following);
      
      return (data || []) as FollowedUser[];
    },
    enabled: !!following && following.length > 0 && open,
  });

  // Fetch followed brands data
  const { data: followedBrands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ['followed-brands', following],
    queryFn: async (): Promise<FollowedBrand[]> => {
      if (!following || following.length === 0) return [];
      
      const { data } = await supabase
        .from('brands')
        .select('id, name, slug, logo_url')
        .in('id', following);
      
      return (data || []) as FollowedBrand[];
    },
    enabled: !!following && following.length > 0 && open,
  });

  // Fetch public fits from followed users
  const userIds = followedUsers.map(u => u.id);
  const { data: userFits = [] } = useQuery({
    queryKey: ['followed-user-fits', userIds.join(',')],
    queryFn: async (): Promise<(UserFit & { user_id: string })[]> => {
      if (userIds.length === 0) return [];
      
      const { data } = await supabase
        .from('fits')
        .select('id, user_id, title, image_preview, render_path')
        .in('user_id', userIds)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(30);
      
      return (data || []) as (UserFit & { user_id: string })[];
    },
    enabled: userIds.length > 0 && open,
  });

  // Fetch posts from followed users (public + followers_only from mutuals)
  const { data: userPosts = [] } = useQuery({
    queryKey: ['followed-user-posts', userIds.join(','), mutualFollowIds.join(',')],
    queryFn: async () => {
      if (userIds.length === 0) return [];

      // Fetch public posts from all followed users
      const { data: publicPosts } = await supabase
        .from('posts')
        .select('id, user_id, content, post_images(image_url, sort_order)')
        .in('user_id', userIds)
        .eq('visibility', 'public_explore')
        .not('post_images', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      let allPosts = (publicPosts || []).filter((p: any) => p.post_images?.length > 0);

      // Fetch followers_only posts from mutual follows
      if (mutualFollowIds.length > 0) {
        const mutualInFollowed = mutualFollowIds.filter(id => userIds.includes(id));
        if (mutualInFollowed.length > 0) {
          const { data: followersOnlyPosts } = await supabase
            .from('posts')
            .select('id, user_id, content, post_images(image_url, sort_order)')
            .in('user_id', mutualInFollowed)
            .eq('visibility', 'followers_only')
            .not('post_images', 'is', null)
            .order('created_at', { ascending: false })
            .limit(10);
          if (followersOnlyPosts) {
            const existingIds = new Set(allPosts.map((p: any) => p.id));
            const newPosts = followersOnlyPosts.filter((p: any) => !existingIds.has(p.id) && p.post_images?.length > 0);
            allPosts = [...allPosts, ...newPosts];
          }
        }
      }

      return allPosts;
    },
    enabled: userIds.length > 0 && open,
  });

  // Fetch products from followed brands
  const brandIds = followedBrands.map(b => b.id);
  const { data: brandProducts = [] } = useQuery({
    queryKey: ['followed-brand-products', brandIds.join(',')],
    queryFn: async (): Promise<(BrandProduct & { brand_id: string })[]> => {
      if (brandIds.length === 0) return [];
      
      const { data } = await supabase
        .from('products')
        .select('id, title, media_urls, image_url, price_cents, currency, brand_id')
        .in('brand_id', brandIds)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(30);
      
      return (data || []) as (BrandProduct & { brand_id: string })[];
    },
    enabled: brandIds.length > 0 && open,
  });

  const handleUserClick = (userId: string) => {
    onOpenChange(false);
    navigate(`/profile/${userId}`);
  };

  const handleBrandClick = (slug: string) => {
    onOpenChange(false);
    navigate(`/brand/${slug}`);
  };

  const handleFitClick = (fitId: string) => {
    onOpenChange(false);
    navigate(`/explore/outfit/${fitId}`);
  };

  const handleProductClick = (productId: string) => {
    onOpenChange(false);
    navigate(`/p/${productId}`);
  };

  const handleSignUp = () => {
    onOpenChange(false);
    navigate('/onboarding/signup');
  };

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const isLoading = followingLoading || usersLoading || brandsLoading;

  // Guest state - show sign up prompt
  if (isGuest) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border-t border-white/20 shadow-2xl max-h-[55vh]">
          <DrawerHeader className="pb-3 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DrawerTitle className="text-xl font-semibold tracking-tight">Following</DrawerTitle>
                <p className="text-xs text-muted-foreground mt-0.5">People & brands you follow</p>
              </div>
            </div>
          </DrawerHeader>

          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <LogIn className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Sign in to see who you follow</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Create an account to follow your favorite brands and shoppers, and see their latest content here.
            </p>
            <Button onClick={handleSignUp} className="gap-2">
              <LogIn className="w-4 h-4" />
              Sign Up / Log In
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent 
        className={cn(
          "bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border-t border-white/20 shadow-2xl transition-all duration-300 ease-out",
          isExpanded ? "h-[95vh]" : "max-h-[55vh]"
        )}
      >
        <DrawerHeader className="pb-3 relative border-b border-border/30">
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
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DrawerTitle className="text-xl font-semibold tracking-tight">Following</DrawerTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {followedUsers.length} people • {followedBrands.length} brands
              </p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'people' | 'brands')} className="mt-4">
            <TabsList className="w-full grid grid-cols-2 bg-black/5 dark:bg-white/10 p-1 rounded-full">
              <TabsTrigger value="people" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all gap-1.5">
                <Users className="w-3.5 h-3.5" />
                People
              </TabsTrigger>
              <TabsTrigger value="brands" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all gap-1.5">
                <Store className="w-3.5 h-3.5" />
                Brands
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 pb-4">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-3 py-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="aspect-square rounded-xl" />)}
            </div>
          ) : activeTab === 'people' ? (
            // People Tab
            <div className="space-y-4 py-4">
              {followedUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">You're not following anyone yet</p>
                  <p className="text-xs mt-1">Explore shoppers to find people to follow</p>
                </div>
              ) : (
                followedUsers.map((person) => {
                  const personFits = userFits.filter(f => f.user_id === person.id);
                  const personPosts = userPosts.filter((p: any) => p.user_id === person.id);
                  
                  return (
                    <div key={person.id} className="space-y-2">
                      {/* Person Header */}
                      <button 
                        onClick={() => handleUserClick(person.id)} 
                        className="flex items-center gap-3 w-full text-left hover:bg-accent/30 rounded-lg p-2 transition-colors"
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={person.avatar_url || undefined} alt={person.name || person.username || 'User'} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {(person.name || person.username || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium block truncate">
                            {person.name || person.username || 'Anonymous'}
                          </span>
                          {person.username && person.name && (
                            <span className="text-xs text-muted-foreground">@{person.username}</span>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </button>
                      
                      {/* Person's Posts */}
                      {personPosts.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 ml-12">
                          {personPosts.slice(0, 3).map((post: any) => {
                            const img = post.post_images?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))?.[0]?.image_url;
                            return img ? (
                              <Card 
                                key={post.id} 
                                className="overflow-hidden cursor-pointer hover:shadow-md transition-all bg-card/80 border-border/50"
                                onClick={() => handleUserClick(person.id)}
                              >
                                <div className="aspect-square relative overflow-hidden bg-muted">
                                  <SmartImage 
                                    src={img} 
                                    alt={post.content || 'Post'} 
                                    className="w-full h-full object-cover"
                                    sizes="80px"
                                  />
                                </div>
                              </Card>
                            ) : null;
                          })}
                        </div>
                      )}

                      {/* Person's Public Fits */}
                      {personFits.length > 0 && personPosts.length === 0 && (
                        <div className="grid grid-cols-3 gap-2 ml-12">
                          {personFits.slice(0, 3).map((fit) => (
                            <Card 
                              key={fit.id} 
                              className="overflow-hidden cursor-pointer hover:shadow-md transition-all bg-card/80 border-border/50"
                              onClick={() => handleFitClick(fit.id)}
                            >
                              <div className="aspect-[3/4] relative overflow-hidden bg-muted">
                                <SmartImage 
                                  src={fit.render_path || fit.image_preview || '/placeholder.svg'} 
                                  alt={fit.title || 'Outfit'} 
                                  className="w-full h-full object-cover"
                                  sizes="80px"
                                />
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            // Brands Tab
            <div className="space-y-4 py-4">
              {followedBrands.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Store className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">You're not following any brands yet</p>
                  <p className="text-xs mt-1">Explore brands to find your favorites</p>
                </div>
              ) : (
                <>
                  {/* Brand Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    {followedBrands.map((brand) => (
                      <button 
                        key={brand.id} 
                        onClick={() => handleBrandClick(brand.slug)} 
                        className="flex flex-col items-center p-3 rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm hover:bg-card hover:shadow-md hover:scale-[1.02] transition-all duration-200"
                      >
                        <Avatar className="w-14 h-14 mb-2 ring-2 ring-white/50 shadow-sm">
                          <AvatarImage src={brand.logo_url || undefined} alt={brand.name} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{brand.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-center line-clamp-2">{brand.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Recent Products from Followed Brands */}
                  {brandProducts.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium mb-3">Latest from brands you follow</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {brandProducts.slice(0, isExpanded ? 12 : 6).map((product) => {
                          const brand = followedBrands.find(b => b.id === product.brand_id);
                          return (
                            <Card
                              key={product.id}
                              className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 bg-card/80 backdrop-blur-sm border-border/30 rounded-xl"
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
                                <p className="text-[10px] text-muted-foreground truncate uppercase tracking-wide">{brand?.name}</p>
                                <p className="text-xs font-medium truncate mt-0.5">{product.title}</p>
                                <p className="text-xs text-primary font-semibold mt-1">{formatPrice(product.price_cents, product.currency)}</p>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

export default FollowingDrawer;

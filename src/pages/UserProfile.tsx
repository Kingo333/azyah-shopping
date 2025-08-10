import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SEOHead } from '@/components/SEOHead';
import ShopperNavigation from '@/components/ShopperNavigation';
import { BackButton } from '@/components/ui/back-button';
import { 
  User, 
  MapPin, 
  Instagram, 
  Twitter, 
  Globe, 
  MessageSquare,
  Users,
  Archive,
  ArrowRight
} from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  country: string;
  bio: string;
  website: string;
  socials: {
    instagram?: string;
    twitter?: string;
    website?: string;
  };
}

interface UserPost {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  images: Array<{
    id: string;
    image_url: string;
    sort_order: number;
  }>;
  likes_count: number;
}

interface UserCloset {
  id: string;
  title: string;
  description: string;
  is_public: boolean;
  created_at: string;
  items_count: number;
  items: Array<{
    id: string;
    product: {
      id: string;
      title: string;
      media_urls: any;
      price_cents: number;
      currency: string;
    };
  }>;
}

const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('posts');

  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile', id],
    queryFn: async () => {
      if (!id) throw new Error('User ID required');
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!id
  });

  const { data: userPosts, isLoading: postsLoading } = useQuery({
    queryKey: ['user-posts', id],
    queryFn: async () => {
      if (!id) return [];
      
      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          user_id,
          post_images (
            id,
            image_url,
            sort_order
          )
        `)
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get likes count for each post
      const enrichedPosts = await Promise.all(
        posts.map(async (post) => {
          const { count: likesCount } = await supabase
            .from('post_likes')
            .select('id', { count: 'exact' })
            .eq('post_id', post.id);

          return {
            ...post,
            images: post.post_images || [],
            likes_count: likesCount || 0
          };
        })
      );

      return enrichedPosts as UserPost[];
    },
    enabled: !!id
  });

  const { data: userClosets, isLoading: closetsLoading } = useQuery({
    queryKey: ['user-closets', id],
    queryFn: async () => {
      if (!id) return [];
      
      const { data: closets, error } = await supabase
        .from('closets')
        .select(`
          id,
          title,
          description,
          is_public,
          created_at
        `)
        .eq('user_id', id)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get items for each closet
      const enrichedClosets = await Promise.all(
        closets.map(async (closet) => {
          const { data: items, error: itemsError } = await supabase
            .from('closet_items')
            .select(`
              id,
              product_id
            `)
            .eq('closet_id', closet.id)
            .limit(4); // Show first 4 items as preview

          if (itemsError) throw itemsError;

          // Get product details separately
          const productDetails = items?.length ? await Promise.all(
            items.map(async (item) => {
              const { data: product } = await supabase
                .from('products')
                .select('id, title, media_urls, price_cents, currency')
                .eq('id', item.product_id)
                .single();
              
              return {
                id: item.id,
                product: product || {
                  id: '',
                  title: 'Unknown Product',
                  media_urls: [],
                  price_cents: 0,
                  currency: 'USD'
                }
              };
            })
          ) : [];

          return {
            ...closet,
            items_count: items?.length || 0,
            items: productDetails || []
          };
        })
      );

      return enrichedClosets as UserCloset[];
    },
    enabled: !!id
  });

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-4xl p-4">
          <ShopperNavigation />
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-4xl p-4">
          <ShopperNavigation />
          <div className="text-center py-12">
            <p>User not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dashboard-bg">
      <SEOHead 
        title={`${userProfile.name || userProfile.email} - User Profile`}
        description={`View ${userProfile.name || userProfile.email}'s fashion profile, posts, and public closets`}
      />
      
      <div className="container mx-auto max-w-4xl p-4">
        <ShopperNavigation />
        
        <div className="mb-6">
          <BackButton />
        </div>

        {/* Profile Header */}
        <GlassPanel variant="premium" className="p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-8">
            <Avatar className="w-32 h-32 mx-auto md:mx-0 border-4 border-white/20">
              <AvatarImage src={userProfile.avatar_url} />
              <AvatarFallback className="text-3xl bg-gradient-to-br from-primary/10 to-accent/10">
                {userProfile.name?.[0] || userProfile.email[0]}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-cormorant font-bold mb-3">
                {userProfile.name || userProfile.email.split('@')[0]}
              </h1>
              
              {userProfile.bio && (
                <p className="text-muted-foreground mb-6 text-lg leading-relaxed">{userProfile.bio}</p>
              )}

              <div className="flex flex-wrap gap-6 justify-center md:justify-start mb-6">
                {userProfile.country && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="p-2 rounded-full bg-gradient-to-br from-primary/10 to-accent/10">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{userProfile.country}</span>
                  </div>
                )}
              </div>

              {/* Social Links */}
              <div className="flex gap-4 justify-center md:justify-start">
                {userProfile.socials?.instagram && (
                  <Button 
                    variant="premium" 
                    size="sm"
                    onClick={() => window.open(`https://instagram.com/${userProfile.socials.instagram}`, '_blank')}
                    className="hover:scale-105 transition-transform"
                  >
                    <Instagram className="h-4 w-4 mr-2" />
                    Instagram
                  </Button>
                )}
                {userProfile.socials?.twitter && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(`https://twitter.com/${userProfile.socials.twitter}`, '_blank')}
                    className="hover:scale-105 transition-transform"
                  >
                    <Twitter className="h-4 w-4 mr-2" />
                    Twitter
                  </Button>
                )}
                {userProfile.website && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(userProfile.website, '_blank')}
                    className="hover:scale-105 transition-transform"
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    Website
                  </Button>
                )}
              </div>
            </div>
          </div>
        </GlassPanel>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 glass-panel mb-8">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="closets">Public Closets</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-6 mt-6">
            {postsLoading ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p>Loading posts...</p>
              </div>
            ) : userPosts?.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No posts yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {userPosts?.map((post) => (
                  <Card key={post.id} className="overflow-hidden">
                    {post.images.length > 0 && (
                      <div className="aspect-square relative">
                        <img
                          src={post.images[0].image_url}
                          alt="Post image"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-4">
                      {post.content && (
                        <p className="text-sm mb-3">{post.content}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                        <span>{post.likes_count} likes</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="closets" className="space-y-6 mt-6">
            {closetsLoading ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p>Loading closets...</p>
              </div>
            ) : userClosets?.length === 0 ? (
              <div className="text-center py-12">
                <Archive className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No public closets</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {userClosets?.map((closet) => (
                  <Card key={closet.id} className="cursor-pointer hover:shadow-lg transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="truncate">{closet.title}</span>
                        <Badge variant="secondary">{closet.items_count} items</Badge>
                      </CardTitle>
                      {closet.description && (
                        <p className="text-sm text-muted-foreground">{closet.description}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      {closet.items.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {closet.items.slice(0, 4).map((item) => (
                            <div key={item.id} className="aspect-square relative">
                              <img
                                src={item.product?.media_urls?.[0] || '/placeholder.svg'}
                                alt={item.product?.title || 'Product'}
                                className="w-full h-full object-cover rounded-md"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Created {new Date(closet.created_at).toLocaleDateString()}</span>
                        <div className="flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" />
                          <span>View Closet</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserProfile;
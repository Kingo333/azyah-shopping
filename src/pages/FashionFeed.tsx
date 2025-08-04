import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import ShopperNavigation from '@/components/ShopperNavigation';
import TutorialTooltip from '@/components/TutorialTooltip';
import { CreatePostModal } from '@/components/CreatePostModal';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Heart, 
  MessageCircle, 
  Share, 
  Search, 
  Filter,
  Bookmark,
  TrendingUp,
  ShoppingBag,
  Plus,
  Camera,
  Users,
  Sparkles,
  ArrowUp,
  ArrowRight,
  Globe
} from 'lucide-react';

interface FeedPost {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  users: {
    name: string;
    avatar_url: string;
    email: string;
  };
  post_images: {
    image_url: string;
    sort_order: number;
  }[];
  post_products: {
    products: {
      id: string;
      title: string;
      price_cents: number;
      brand_id: string;
      media_urls: any;
    };
  }[];
  post_likes: { user_id: string }[];
  _count?: {
    post_likes: number;
    comments: number;
  };
}

const FashionFeed: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'trending' | 'new'>('all');
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFeedPosts(activeFilter);
  }, [activeFilter]);

  const loadFeedPosts = async (filter: 'all' | 'trending' | 'new' = 'all') => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('posts')
        .select(`
          *,
          users (name, avatar_url, email),
          post_images (image_url, sort_order),
          post_products (
            products (id, title, price_cents, brand_id, media_urls)
          ),
          post_likes (user_id)
        `);
      
      // Apply filter
      if (filter === 'trending') {
        // Sort by posts with most likes in last 7 days
        query = query
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });
      } else if (filter === 'new') {
        query = query.order('created_at', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }
      
      const { data, error } = await query.limit(20);

      if (error) {
        console.error('Error loading posts:', error);
        toast({
          title: "Error loading posts",
          description: "Please try refreshing the page",
          variant: "destructive"
        });
        return;
      }

      setPosts(data || []);
      
      // Set liked posts for current user
      if (user && data) {
        const userLikedPosts = new Set(
          data
            .filter(post => post.post_likes.some(like => like.user_id === user.id))
            .map(post => post.id)
        );
        setLikedPosts(userLikedPosts);
      }
    } catch (error) {
      console.error('Error loading feed:', error);
      toast({
        title: "Error loading feed",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;

    try {
      const isLiked = likedPosts.has(postId);
      
      if (isLiked) {
        // Unlike
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
      } else {
        // Like
        await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id
          });
        
        setLikedPosts(prev => new Set([...prev, postId]));
      }

      toast({
        description: isLiked ? "Removed from likes" : "Added to likes"
      });
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        description: "Failed to update like",
        variant: "destructive"
      });
    }
  };

  const handleSave = (postId: string) => {
    const newSavedPosts = new Set(savedPosts);
    if (savedPosts.has(postId)) {
      newSavedPosts.delete(postId);
    } else {
      newSavedPosts.add(postId);
    }
    setSavedPosts(newSavedPosts);
    toast({
      description: savedPosts.has(postId) ? "Removed from saved" : "Saved to collection"
    });
  };

  const handleShare = (postId: string) => {
    if (navigator.share) {
      navigator.share({
        title: 'Fashion Post from Azyah',
        url: `${window.location.origin}/feed/${postId}`
      });
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/feed/${postId}`);
      toast({ description: "Link copied to clipboard!" });
    }
  };

  const handleFilterChange = (filter: 'all' | 'trending' | 'new') => {
    setActiveFilter(filter);
  };

  const formatPrice = (cents: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const filteredPosts = posts.filter(post =>
    post.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.users?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your fashion feed...</p>
        </div>
      </div>
    );
  }

  const tutorialSteps = [
    {
      title: "Welcome to Fashion Feed!",
      description: "Discover curated fashion content from brands, influencers, and fellow shoppers. Scroll through personalized posts based on your style preferences.",
      icon: <Sparkles className="h-5 w-5 text-primary" />,
      action: "Scroll down to see fashion posts!"
    },
    {
      title: "Engage with Posts",
      description: "Like posts with the heart button, save them with the bookmark, and share your favorites. Your interactions help us learn your style!",
      icon: <Heart className="h-5 w-5 text-red-500" />,
      action: "Try liking a post you find interesting"
    },
    {
      title: "Shop the Look",
      description: "See products you love? Many posts feature 'Shop the Look' sections where you can buy items directly from brands.",
      icon: <ShoppingBag className="h-5 w-5 text-primary" />,
      action: "Look for the 'Shop' button on product cards"
    },
    {
      title: "Personalized Recommendations",
      description: "The more you engage, the better we get at showing you content that matches your style. Your swipe history helps curate your feed!",
      icon: <Sparkles className="h-5 w-5 text-purple-500" />,
      action: "Keep engaging to improve your recommendations"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl p-4">
        {/* Navigation */}
        <ShopperNavigation />
        
        {/* Tutorial */}
        <TutorialTooltip
          tutorialKey="fashion-feed"
          steps={tutorialSteps}
          autoShow={true}
        />

        {/* Header */}
        <div className="sticky top-20 z-10 bg-background/95 backdrop-blur-sm pb-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Fashion Feed</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant={activeFilter === 'trending' ? "default" : "outline"} 
                size="sm"
                onClick={() => handleFilterChange('trending')}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Trending
              </Button>
              <Button 
                variant={activeFilter === 'new' ? "default" : "outline"} 
                size="sm"
                onClick={() => handleFilterChange('new')}
              >
                New
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4" />
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={() => setIsCreatePostModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Post
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search posts, styles, or users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Create Post Prompt */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback>{user?.email?.[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <Button 
                variant="outline" 
                className="flex-1 justify-start text-muted-foreground"
                onClick={() => setIsCreatePostModalOpen(true)}
              >
                Share your style inspiration...
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setIsCreatePostModalOpen(true)}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Feed Posts */}
        <div className="space-y-6">
          {filteredPosts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to share your style! Follow other users to see their posts here.
                </p>
                <Button onClick={() => setIsCreatePostModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Post
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredPosts.map((post) => (
              <Card key={post.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={post.users?.avatar_url} />
                      <AvatarFallback>{post.users?.name?.[0] || post.users?.email?.[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{post.users?.name || 'Anonymous'}</h3>
                        <span className="text-sm text-muted-foreground">@{post.users?.email?.split('@')[0]}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{getTimeAgo(post.created_at)}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleSave(post.id)}>
                      <Bookmark className={`h-4 w-4 ${savedPosts.has(post.id) ? 'fill-current' : ''}`} />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Post Content */}
                  {post.content && (
                    <p className="text-sm leading-relaxed">{post.content}</p>
                  )}

                  {/* Images */}
                  {post.post_images && post.post_images.length > 0 && (
                    <div className={`grid gap-2 ${post.post_images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {post.post_images
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((image, index) => (
                        <div key={index} className="aspect-square bg-muted rounded-lg overflow-hidden">
                          <img 
                            src={image.image_url} 
                            alt={`Post image ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tagged Products */}
                  {post.post_products && post.post_products.length > 0 && (
                    <div className="border rounded-lg p-3 bg-muted/50">
                      <h4 className="text-sm font-medium mb-3">Shop the Look</h4>
                      <div className="grid gap-3">
                        {post.post_products.map((item) => (
                          <div key={item.products.id} className="flex items-center gap-3">
                            <div className="w-16 h-16 bg-background rounded-lg overflow-hidden">
                              <img 
                                src={item.products.media_urls?.[0] || '/placeholder.svg'} 
                                alt={item.products.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.products.title}</p>
                              <p className="text-sm font-semibold">{formatPrice(item.products.price_cents)}</p>
                            </div>
                            <Button size="sm" variant="outline">
                              <ShoppingBag className="h-3 w-3 mr-1" />
                              Shop
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleLike(post.id)}
                        className="gap-2"
                      >
                        <Heart className={`h-4 w-4 ${likedPosts.has(post.id) ? 'fill-current text-red-500' : ''}`} />
                        {post.post_likes.length}
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <MessageCircle className="h-4 w-4" />
                        0
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleShare(post.id)}
                      >
                        <Share className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Load More */}
        {filteredPosts.length > 0 && (
          <div className="text-center py-8">
            <Button variant="outline" onClick={() => loadFeedPosts(activeFilter)}>
              Load More Posts
            </Button>
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {user && (
        <CreatePostModal
          isOpen={isCreatePostModalOpen}
          onClose={() => setIsCreatePostModalOpen(false)}
          onPostCreated={() => loadFeedPosts(activeFilter)}
          userId={user.id}
        />
      )}
    </div>
  );
};

export default FashionFeed;
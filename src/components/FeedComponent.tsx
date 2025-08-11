
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Heart, MessageCircle, Share, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CreatePostModal } from '@/components/CreatePostModal';

interface Post {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  images: string[];
  products: Array<{
    id: string;
    title: string;
    media_urls: any;
  }>;
  likes_count: number;
  is_liked: boolean;
}

interface FeedComponentProps {
  limit?: number;
  showHeader?: boolean;
  className?: string;
}

const FeedComponent: React.FC<FeedComponentProps> = ({ 
  limit = 10, 
  showHeader = true, 
  className 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [limit]);

  const fetchPosts = async () => {
    try {
      // Fetch posts with user data, images, products, and like counts
      const { data: postsData, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          user_id,
          user:users(id, name, avatar_url),
          post_images(image_url),
          post_products(product:products(id, title, media_urls))
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      if (postsData && user) {
        // Fetch like counts and user's like status for each post
        const postIds = postsData.map(post => post.id);
        
        const { data: likesData } = await supabase
          .from('post_likes')
          .select('post_id, user_id')
          .in('post_id', postIds);

        // Calculate likes count and user's like status
        const likesMap = new Map<string, { count: number; isLiked: boolean }>();
        
        postIds.forEach(postId => {
          const postLikes = likesData?.filter(like => like.post_id === postId) || [];
          likesMap.set(postId, {
            count: postLikes.length,
            isLiked: postLikes.some(like => like.user_id === user.id)
          });
        });

        const formattedPosts: Post[] = postsData.map(post => ({
          id: post.id,
          content: post.content || '',
          created_at: post.created_at,
          user_id: post.user_id,
          user: {
            id: post.user.id,
            name: post.user.name || post.user.id,
            avatar_url: post.user.avatar_url
          },
          images: post.post_images?.map(img => img.image_url) || [],
          products: post.post_products?.map(pp => pp.product) || [],
          likes_count: likesMap.get(post.id)?.count || 0,
          is_liked: likesMap.get(post.id)?.isLiked || false
        }));

        setPosts(formattedPosts);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        description: 'Failed to load feed',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string, isCurrentlyLiked: boolean) => {
    if (!user) return;

    try {
      if (isCurrentlyLiked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: user.id });
      }

      // Update local state
      setPosts(prev => prev.map(post => 
        post.id === postId
          ? {
              ...post,
              is_liked: !isCurrentlyLiked,
              likes_count: post.likes_count + (isCurrentlyLiked ? -1 : 1)
            }
          : post
      ));
    } catch (error) {
      toast({
        description: 'Failed to update like',
        variant: 'destructive'
      });
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;

    try {
      // Delete post images first
      await supabase
        .from('post_images')
        .delete()
        .eq('post_id', postId);

      // Delete post products
      await supabase
        .from('post_products')
        .delete()
        .eq('post_id', postId);

      // Delete post likes
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId);

      // Delete the post
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id); // Ensure user can only delete their own posts

      if (error) throw error;

      // Update local state
      setPosts(prev => prev.filter(post => post.id !== postId));
      
      toast({
        description: 'Post deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        description: 'Failed to delete post',
        variant: 'destructive'
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className={className}>
        {showHeader && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Feed</h2>
            <p className="text-muted-foreground">See what's trending in fashion</p>
          </div>
        )}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <div className="w-10 h-10 bg-muted rounded-full"></div>
                <div className="ml-4 space-y-1">
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-3 bg-muted rounded w-16"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded mb-4"></div>
                <div className="flex space-x-4">
                  <div className="h-8 bg-muted rounded w-16"></div>
                  <div className="h-8 bg-muted rounded w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {showHeader && (
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Feed</h2>
            <p className="text-muted-foreground">See what's trending in fashion</p>
          </div>
          {user && (
            <Button onClick={() => setShowCreatePost(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Post
            </Button>
          )}
        </div>
      )}
      
      <div className="space-y-6">
        {posts.map((post) => (
          <Card key={post.id}>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Avatar>
                <AvatarImage src={post.user.avatar_url} />
                <AvatarFallback>{post.user.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="ml-4 flex-1">
                <p className="font-medium">{post.user.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatTimeAgo(post.created_at)}
                </p>
              </div>
              {user && user.id === post.user_id && (
                <AlertDialog>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem className="text-red-600 focus:text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Post
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your post and all associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDeletePost(post.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardHeader>
            
            <CardContent className="space-y-4">
              {post.content && (
                <p className="text-sm">{post.content}</p>
              )}
              
              {post.images.length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                  {post.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Post image ${index + 1}`}
                      className="w-full max-w-md h-auto object-cover rounded-lg"
                      onError={(e) => {
                        console.log('Image failed to load:', image);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ))}
                </div>
              )}
              
              {post.products.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Featured Products:</p>
                  <div className="flex flex-wrap gap-2">
                    {post.products.map((product) => (
                      <Badge key={product.id} variant="outline" className="text-xs">
                        {product.title}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-4 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLike(post.id, post.is_liked)}
                  className={post.is_liked ? 'text-red-500' : ''}
                >
                  <Heart className={`h-4 w-4 mr-1 ${post.is_liked ? 'fill-current' : ''}`} />
                  {post.likes_count}
                </Button>
                <Button variant="ghost" size="sm">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Comment
                </Button>
                <Button variant="ghost" size="sm">
                  <Share className="h-4 w-4 mr-1" />
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {posts.length === 0 && !loading && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No posts yet. Be the first to share something!</p>
              {user && (
                <Button 
                  className="mt-4" 
                  onClick={() => setShowCreatePost(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Post
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {user && (
        <CreatePostModal
          isOpen={showCreatePost}
          onClose={() => setShowCreatePost(false)}
          onPostCreated={fetchPosts}
          userId={user.id}
        />
      )}
    </div>
  );
};

export default FeedComponent;

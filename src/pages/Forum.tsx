import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  MessageCircle, 
  Share, 
  Plus, 
  TrendingUp, 
  Clock 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface ForumPost {
  id: string;
  title: string;
  content: string;
  author_name: string;
  author_avatar: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  tags: string[];
}

const Forum = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', tags: '' });

  // Mock data for now - will be replaced with real database integration
  useEffect(() => {
    const mockPosts: ForumPost[] = [
      {
        id: '1',
        title: 'Summer Fashion Trends 2024 - What\'s Hot?',
        content: 'I\'ve been noticing some amazing trends this summer! Oversized blazers are making a huge comeback, and the color palette is so refreshing. What are your thoughts on the return of Y2K aesthetics?',
        author_name: 'Sarah M.',
        author_avatar: null,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        likes_count: 24,
        comments_count: 8,
        tags: ['trends', 'summer', 'fashion']
      },
      {
        id: '2',
        title: 'Sustainable Fashion Brands Recommendations',
        content: 'Looking for sustainable fashion brands that don\'t compromise on style. I\'ve tried a few but would love more recommendations from the community!',
        author_name: 'Alex K.',
        author_avatar: null,
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        likes_count: 15,
        comments_count: 12,
        tags: ['sustainable', 'brands', 'eco-friendly']
      },
      {
        id: '3',
        title: 'How to Style Oversized Pieces Without Looking Shapeless',
        content: 'I love oversized clothing but sometimes struggle with proportions. Any tips on how to style oversized pieces while maintaining a flattering silhouette?',
        author_name: 'Maya L.',
        author_avatar: null,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        likes_count: 31,
        comments_count: 19,
        tags: ['styling', 'tips', 'oversized']
      }
    ];
    
    setPosts(mockPosts);
    setIsLoading(false);
  }, []);

  const handleCreatePost = async () => {
    if (!user || !newPost.title.trim() || !newPost.content.trim()) return;

    try {
      // This would integrate with the database when forum tables are created
      toast({
        title: "Post created!",
        description: "Your post has been shared with the community.",
      });
      
      setNewPost({ title: '', content: '', tags: '' });
      setShowCreatePost(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLike = (postId: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, likes_count: post.likes_count + 1 }
        : post
    ));
    
    toast({
      title: "Liked!",
      description: "You liked this post.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="mx-auto max-w-4xl">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-3 bg-muted rounded w-1/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="mx-auto max-w-4xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Fashion Community</h1>
              <p className="text-muted-foreground">Share, discover, and connect with fellow fashion enthusiasts</p>
            </div>
            <Button onClick={() => setShowCreatePost(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Post
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl p-4 space-y-6">
        {/* Create Post Modal */}
        {showCreatePost && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Post</CardTitle>
              <CardDescription>Share your thoughts with the community</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  placeholder="Post title..."
                  value={newPost.title}
                  onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Textarea
                  placeholder="What's on your mind?"
                  value={newPost.content}
                  onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                  rows={4}
                />
              </div>
              <div>
                <Input
                  placeholder="Tags (comma separated)..."
                  value={newPost.tags}
                  onChange={(e) => setNewPost(prev => ({ ...prev, tags: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreatePost}>Post</Button>
                <Button variant="outline" onClick={() => setShowCreatePost(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <Button variant="default" size="sm">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trending
          </Button>
          <Button variant="outline" size="sm">
            <Clock className="h-4 w-4 mr-2" />
            Recent
          </Button>
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {posts.map(post => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={post.author_avatar || undefined} />
                      <AvatarFallback>{post.author_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{post.author_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
                <CardTitle className="text-lg">{post.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{post.content}</p>
                
                {/* Tags */}
                <div className="flex gap-2 flex-wrap">
                  {post.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-4 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(post.id)}
                    className="gap-2"
                  >
                    <Heart className="h-4 w-4" />
                    {post.likes_count}
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <MessageCircle className="h-4 w-4" />
                    {post.comments_count}
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Share className="h-4 w-4" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center pt-4">
          <Button variant="outline">Load More Posts</Button>
        </div>
      </div>
    </div>
  );
};

export default Forum;
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Heart, 
  MessageCircle, 
  Share, 
  Plus, 
  TrendingUp, 
  Clock,
  Image as ImageIcon,
  Send,
  MoreVertical,
  Flag,
  Edit,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { useInView } from 'react-intersection-observer';

interface ForumComment {
  id: string;
  content: string;
  author_name: string;
  author_avatar: string | null;
  created_at: string;
  likes_count: number;
  parent_id?: string;
  replies?: ForumComment[];
}

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
  media_urls?: string[];
  comments?: ForumComment[];
}

interface InfiniteScrollForumProps {
  onShare?: (post: ForumPost) => void;
}

const InfiniteScrollForum = ({ onShare }: InfiniteScrollForumProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [newPost, setNewPost] = useState({ 
    title: '', 
    content: '', 
    tags: '',
    media: [] as File[]
  });
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });

  // Mock data generator
  const generateMockPosts = (pageNum: number): ForumPost[] => {
    const basePosts = [
      {
        title: 'Summer Fashion Trends 2024 - What\'s Hot?',
        content: 'I\'ve been noticing some amazing trends this summer! Oversized blazers are making a huge comeback, and the color palette is so refreshing. What are your thoughts on the return of Y2K aesthetics?',
        author_name: 'Sarah M.',
        tags: ['trends', 'summer', 'fashion'],
        media_urls: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600']
      },
      {
        title: 'Sustainable Fashion Brands Recommendations',
        content: 'Looking for sustainable fashion brands that don\'t compromise on style. I\'ve tried a few but would love more recommendations from the community!',
        author_name: 'Alex K.',
        tags: ['sustainable', 'brands', 'eco-friendly']
      },
      {
        title: 'How to Style Oversized Pieces Without Looking Shapeless',
        content: 'I love oversized clothing but sometimes struggle with proportions. Any tips on how to style oversized pieces while maintaining a flattering silhouette?',
        author_name: 'Maya L.',
        tags: ['styling', 'tips', 'oversized']
      }
    ];

    return basePosts.map((post, index) => ({
      id: `${pageNum}-${index}`,
      ...post,
      author_avatar: null,
      created_at: new Date(Date.now() - (pageNum * 3 + index) * 60 * 60 * 1000).toISOString(),
      likes_count: Math.floor(Math.random() * 100) + 1,
      comments_count: Math.floor(Math.random() * 20) + 1,
      comments: generateMockComments(3)
    }));
  };

  const generateMockComments = (count: number): ForumComment[] => {
    return Array.from({ length: count }, (_, index) => ({
      id: `comment-${index}`,
      content: `This is a great point! I've been thinking about this too. Comment ${index + 1}`,
      author_name: ['Emma', 'John', 'Sofia'][index % 3],
      author_avatar: null,
      created_at: new Date(Date.now() - index * 30 * 60 * 1000).toISOString(),
      likes_count: Math.floor(Math.random() * 10),
      replies: index === 0 ? [{
        id: `reply-${index}`,
        content: 'I totally agree with this!',
        author_name: 'Replied User',
        author_avatar: null,
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        likes_count: 2,
        parent_id: `comment-${index}`
      }] : []
    }));
  };

  const loadMorePosts = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newPosts = generateMockPosts(page);
    setPosts(prev => [...prev, ...newPosts]);
    setPage(prev => prev + 1);
    
    // Simulate end of data after 5 pages
    if (page >= 5) {
      setHasMore(false);
    }
    
    setIsLoading(false);
  }, [page, isLoading, hasMore]);

  // Initial load
  useEffect(() => {
    loadMorePosts();
  }, []);

  // Load more when in view
  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      loadMorePosts();
    }
  }, [inView, hasMore, isLoading, loadMorePosts]);

  const handleCreatePost = async () => {
    if (!user || !newPost.title.trim() || !newPost.content.trim()) return;

    try {
      const post: ForumPost = {
        id: `new-${Date.now()}`,
        title: newPost.title,
        content: newPost.content,
        author_name: user?.email?.split('@')[0] || 'Anonymous',
        author_avatar: null,
        created_at: new Date().toISOString(),
        likes_count: 0,
        comments_count: 0,
        tags: newPost.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        media_urls: [], // Handle file upload in real implementation
        comments: []
      };

      setPosts(prev => [post, ...prev]);
      
      toast({
        title: "Post created!",
        description: "Your post has been shared with the community.",
      });
      
      setNewPost({ title: '', content: '', tags: '', media: [] });
      setShowCreatePost(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLike = (postId: string, isComment = false, commentId?: string) => {
    if (isComment && commentId) {
      setPosts(prev => prev.map(post => 
        post.id === postId ? {
          ...post,
          comments: post.comments?.map(comment => 
            comment.id === commentId 
              ? { ...comment, likes_count: comment.likes_count + 1 }
              : comment
          )
        } : post
      ));
    } else {
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, likes_count: post.likes_count + 1 }
          : post
      ));
    }
    
    toast({
      title: "Liked!",
      description: `You liked this ${isComment ? 'comment' : 'post'}.`,
    });
  };

  const handleComment = (postId: string, parentId?: string) => {
    if (!newComment.trim()) return;

    const comment: ForumComment = {
      id: `comment-${Date.now()}`,
      content: newComment,
      author_name: user?.email?.split('@')[0] || 'Anonymous',
      author_avatar: null,
      created_at: new Date().toISOString(),
      likes_count: 0,
      parent_id: parentId
    };

    setPosts(prev => prev.map(post => 
      post.id === postId ? {
        ...post,
        comments_count: post.comments_count + 1,
        comments: [...(post.comments || []), comment]
      } : post
    ));

    setNewComment('');
    setReplyingTo(null);
    
    toast({
      title: "Comment added!",
      description: "Your comment has been posted.",
    });
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewPost(prev => ({ ...prev, media: [...prev.media, ...files] }));
  };

  const handleShare = (post: ForumPost) => {
    if (onShare) {
      onShare(post);
    } else {
      // Default share behavior - use production URL
      const shareUrl = `https://azyahstyle.com/forum/${post.id}`;
      if (navigator.share) {
        navigator.share({
          title: post.title,
          text: post.content,
          url: shareUrl
        });
      } else {
        navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied!",
          description: "Post link copied to clipboard.",
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Post Button */}
      <div className="flex justify-between items-center">
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
        <Dialog open={showCreatePost} onOpenChange={setShowCreatePost}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Post title..."
                value={newPost.title}
                onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
              />
              <Textarea
                placeholder="What's on your mind?"
                value={newPost.content}
                onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                rows={6}
              />
              <Input
                placeholder="Tags (comma separated)..."
                value={newPost.tags}
                onChange={(e) => setNewPost(prev => ({ ...prev, tags: e.target.value }))}
              />
              <div className="flex gap-2">
                <Button onClick={handleFileUpload} variant="outline" size="sm">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Add Media
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              {newPost.media.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {newPost.media.length} file(s) selected
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={handleCreatePost}>Post</Button>
                <Button variant="outline" onClick={() => setShowCreatePost(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {posts.map(post => (
          <Card key={post.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={post.author_avatar || undefined} />
                    <AvatarFallback>{post.author_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{post.author_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
              <CardTitle className="text-xl">{post.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{post.content}</p>
              
              {/* Media */}
              {post.media_urls && post.media_urls.length > 0 && (
                <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
                  {post.media_urls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt=""
                      className="rounded-lg w-full h-48 object-cover"
                    />
                  ))}
                </div>
              )}
              
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
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => setSelectedPost(post)}
                >
                  <MessageCircle className="h-4 w-4" />
                  {post.comments_count}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => handleShare(post)}
                >
                  <Share className="h-4 w-4" />
                  Share
                </Button>
              </div>

              {/* Comments Preview */}
              {post.comments && post.comments.length > 0 && (
                <div className="space-y-3 mt-4 border-t pt-4">
                  {post.comments.slice(0, 2).map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.author_avatar || undefined} />
                        <AvatarFallback>{comment.author_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-muted rounded-lg p-3">
                          <p className="font-medium text-sm">{comment.author_name}</p>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLike(post.id, true, comment.id)}
                            className="text-xs h-6"
                          >
                            <Heart className="h-3 w-3 mr-1" />
                            {comment.likes_count}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReplyingTo(comment.id)}
                            className="text-xs h-6"
                          >
                            Reply
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        
                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="ml-4 mt-2 space-y-2">
                            {comment.replies.map(reply => (
                              <div key={reply.id} className="flex gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={reply.author_avatar || undefined} />
                                  <AvatarFallback className="text-xs">{reply.author_name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="bg-muted/50 rounded-lg p-2 flex-1">
                                  <p className="font-medium text-xs">{reply.author_name}</p>
                                  <p className="text-xs">{reply.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {post.comments.length > 2 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedPost(post)}
                      className="w-full"
                    >
                      View all {post.comments_count} comments
                    </Button>
                  )}
                </div>
              )}

              {/* Add Comment */}
              <div className="flex gap-2 mt-4">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={undefined} />
                  <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleComment(post.id);
                      }
                    }}
                  />
                  <Button 
                    size="sm" 
                    onClick={() => handleComment(post.id)}
                    disabled={!newComment.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More Trigger */}
      <div ref={loadMoreRef} className="flex justify-center py-4">
        {isLoading && (
          <div className="animate-pulse">
            <Card className="w-full max-w-2xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-muted rounded-full"></div>
                  <div className="space-y-1">
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="h-3 bg-muted rounded w-16"></div>
                  </div>
                </div>
                <div className="h-6 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-5/6"></div>
                  <div className="h-4 bg-muted rounded w-4/6"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <p className="text-muted-foreground">No more posts to load</p>
        )}
      </div>
    </div>
  );
};

export default InfiniteScrollForum;
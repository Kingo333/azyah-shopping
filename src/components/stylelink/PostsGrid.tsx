import React, { useState } from 'react';
import { useStyleLinkPosts, StyleLinkPost } from '@/hooks/useStyleLinkPosts';
import { Heart, MessageCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { SmartImage } from '@/components/SmartImage';
import PostDetailModal from './PostDetailModal';

interface PostsGridProps {
  userId: string;
  isOwner: boolean;
  searchQuery?: string;
}

const PostsGrid: React.FC<PostsGridProps> = ({ userId, isOwner, searchQuery }) => {
  const { posts, isLoading, toggleLike, deletePost } = useStyleLinkPosts(userId);
  const [selectedPost, setSelectedPost] = useState<StyleLinkPost | null>(null);

  // Filter posts by search query
  const filteredPosts = posts.filter(post => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return post.content?.toLowerCase().includes(query) || false;
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  if (filteredPosts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <Heart className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">
          {searchQuery ? 'No posts found' : 'No posts yet'}
        </h3>
        <p className="text-muted-foreground text-sm">
          {isOwner 
            ? "Share your first look and tag products for your followers to shop!"
            : "Check back soon for new style inspiration."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {filteredPosts.map((post) => (
          <div
            key={post.id}
            className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
            onClick={() => setSelectedPost(post)}
          >
            {/* Post Image */}
            {post.images[0] ? (
              <SmartImage
                src={post.images[0].image_url}
                alt={post.content || 'Post'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <span className="text-muted-foreground text-xs">No image</span>
              </div>
            )}

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <div className="flex items-center gap-1 text-white">
                <Heart className={`h-5 w-5 ${post.is_liked ? 'fill-current' : ''}`} />
                <span className="text-sm font-medium">{post.like_count}</span>
              </div>
              {post.products.length > 0 && (
                <div className="flex items-center gap-1 text-white">
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">{post.products.length}</span>
                </div>
              )}
            </div>

            {/* Products badge */}
            {post.products.length > 0 && (
              <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-medium">
                {post.products.length} items
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Post Detail Modal */}
      <PostDetailModal
        post={selectedPost}
        open={!!selectedPost}
        onOpenChange={(open) => !open && setSelectedPost(null)}
        onLike={(postId, isLiked) => toggleLike.mutate({ postId, isLiked })}
        onDelete={isOwner ? (postId) => {
          deletePost.mutate(postId);
          setSelectedPost(null);
        } : undefined}
      />
    </>
  );
};

export default PostsGrid;

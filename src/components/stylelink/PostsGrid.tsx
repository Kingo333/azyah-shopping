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
      <div className="grid grid-cols-2 gap-1.5">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    );
  }

  if (filteredPosts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
          <Heart className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium mb-1">
          {searchQuery ? 'No posts found' : 'No posts yet'}
        </h3>
        <p className="text-muted-foreground text-xs">
          {isOwner 
            ? "Share your first look and tag products!"
            : "Check back soon for new styles"}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-1.5">
        {filteredPosts.map((post) => (
          <div
            key={post.id}
            className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
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
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <div className="flex items-center gap-1 text-white">
                <Heart className={`h-4 w-4 ${post.is_liked ? 'fill-current' : ''}`} />
                <span className="text-xs font-medium">{post.like_count}</span>
              </div>
              {post.products.length > 0 && (
                <div className="flex items-center gap-1 text-white">
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">{post.products.length}</span>
                </div>
              )}
            </div>

            {/* Products badge */}
            {post.products.length > 0 && (
              <div className="absolute top-1.5 right-1.5 bg-background/90 backdrop-blur-sm rounded-full px-1.5 py-0.5 text-[10px] font-medium shadow-sm">
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
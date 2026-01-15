import React from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Heart, Share2, Trash2, X, ChevronLeft } from 'lucide-react';
import { StyleLinkPost, PostProduct } from '@/hooks/useStyleLinkPosts';
import { SmartImage } from '@/components/SmartImage';
import ShopTheLookSection from './ShopTheLookSection';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PostDetailModalProps {
  post: StyleLinkPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLike?: (postId: string, isLiked: boolean) => void;
  onDelete?: (postId: string) => void;
}

const PostDetailModal: React.FC<PostDetailModalProps> = ({
  post,
  open,
  onOpenChange,
  onLike,
  onDelete,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  if (!post) return null;

  const mainImage = post.images[0]?.image_url;

  const handleShare = async () => {
    const shareUrl = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.content || 'Check out this look!',
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        description: 'Link copied to clipboard!',
      });
    }
  };

  const handleLike = () => {
    if (!user) {
      toast({
        description: 'Sign in to like posts',
        variant: 'destructive',
      });
      return;
    }
    onLike?.(post.id, post.is_liked);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="font-medium">Post</span>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto">
          {/* Main Image */}
          {mainImage && (
            <div className="aspect-square relative">
              <SmartImage
                src={mainImage}
                alt={post.content || 'Post'}
                className="w-full h-full object-cover"
              />

              {/* Product Tags on Image */}
              {post.products.filter(p => p.position_x != null && p.position_y != null).map((product, idx) => (
                <div
                  key={product.id}
                  className="absolute w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center text-xs font-bold transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform"
                  style={{
                    left: `${(product.position_x || 0) * 100}%`,
                    top: `${(product.position_y || 0) * 100}%`,
                  }}
                  title={product.label || product.external_title || 'Product'}
                >
                  {idx + 1}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={post.is_liked ? 'text-red-500' : ''}
              >
                <Heart className={`h-5 w-5 mr-1 ${post.is_liked ? 'fill-current' : ''}`} />
                {post.like_count}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share2 className="h-5 w-5 mr-1" />
                Share
              </Button>
            </div>
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(post.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Caption */}
          {post.content && (
            <div className="p-4 border-b">
              <p className="text-sm whitespace-pre-wrap">{post.content}</p>
            </div>
          )}

          {/* Shop the Look Section */}
          {post.products.length > 0 && (
            <div className="p-4">
              <ShopTheLookSection products={post.products} />
            </div>
          )}

          {/* Empty state if no products */}
          {post.products.length === 0 && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No products tagged in this post.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostDetailModal;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, ChevronRight, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SmartImage } from '@/components/SmartImage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PostProductCircles } from '@/components/PostProductCircles';
import CreateStyleLinkPostModal from '@/components/stylelink/CreateStyleLinkPostModal';

export const PostsSection: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['user-posts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
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
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const hasPosts = (posts?.length || 0) > 0;

  return (
    <section className="px-4 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-serif font-medium text-foreground">Your posts</h2>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full text-xs h-7 px-3 gap-1"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          New post
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2">
          {[1, 2].map(i => (
            <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : !hasPosts ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
          <ImageIcon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Share your outfits</p>
          <p className="text-xs text-muted-foreground mb-4">
            Post your looks and tag what you wore.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full text-xs"
            onClick={() => setShowCreateModal(true)}
          >
            Create your first post
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {posts!.map((post: any) => {
            const firstImage = post.post_images
              ?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
              ?.[0]?.image_url;

            // Build product list for circles
            const taggedProducts = (post.post_products || []).map((pp: any) => ({
              image_url:
                pp.external_image_url ||
                pp.products?.image_url ||
                (pp.products?.media_urls as any)?.[0] ||
                null,
              title: pp.external_title || pp.products?.title || 'Item',
            }));

            return (
              <div
                key={post.id}
                className="relative aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer group"
              >
                {firstImage ? (
                  <SmartImage
                    src={firstImage}
                    alt={post.content || 'Post'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}

                {/* Product circles overlay */}
                <PostProductCircles products={taggedProducts} />

                {/* Caption overlay on hover */}
                {post.content && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-white line-clamp-2">{post.content}</p>
                  </div>
                )}

                {/* Visibility badge */}
                {post.visibility === 'private' && (
                  <div className="absolute top-2 left-2 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                    Private
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CreateStyleLinkPostModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </section>
  );
};

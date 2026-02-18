import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ImageIcon, Pencil, Check, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SmartImage } from '@/components/SmartImage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PostProductCircles } from '@/components/PostProductCircles';
import CreateStyleLinkPostModal from '@/components/stylelink/CreateStyleLinkPostModal';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { openExternalUrl } from '@/lib/openExternalUrl';
import { toast } from 'sonner';

export const PostsSection: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editVisibility, setEditVisibility] = useState<string>('public_explore');

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
            external_url,
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

  const updatePostMutation = useMutation({
    mutationFn: async ({ postId, content, visibility }: { postId: string; content: string; visibility: string }) => {
      const { error } = await supabase
        .from('posts')
        .update({ content, visibility })
        .eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-posts'] });
      setIsEditing(false);
      if (selectedPost) {
        setSelectedPost({ ...selectedPost, content: editContent, visibility: editVisibility });
      }
      toast.success('Post updated');
    },
    onError: () => toast.error('Failed to update post'),
  });

  const handleProductClick = (product: any) => {
    if (product.product_id) {
      navigate(`/p/${product.product_id}`);
    } else if (product.external_url) {
      openExternalUrl(product.external_url);
    } else {
      toast.info('No link available for this item');
    }
  };

  const hasPosts = (posts?.length || 0) > 0;

  return (
    <section className="px-4 pt-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-serif font-medium text-foreground">Your posts</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Post and earn when people buy from your post.</p>
        </div>
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
        <div className="flex gap-1.5 overflow-hidden">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-[90px] h-[120px] flex-shrink-0 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : !hasPosts ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-card/50 p-3">
          <ImageIcon className="h-6 w-6 text-muted-foreground/40 flex-shrink-0" />
          <p className="text-xs text-muted-foreground flex-1">Share your looks & tag what you wore.</p>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full text-[10px] h-7 px-3 flex-shrink-0"
            onClick={() => setShowCreateModal(true)}
          >
            Create post
          </Button>
        </div>
      ) : (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
          {posts!.map((post: any) => {
            const firstImage = post.post_images
              ?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
              ?.[0]?.image_url;

            const taggedProducts = (post.post_products || []).map((pp: any) => ({
              image_url:
                pp.external_image_url ||
                pp.products?.image_url ||
                (pp.products?.media_urls as any)?.[0] ||
                null,
              title: pp.external_title || pp.products?.title || 'Item',
              product_id: pp.product_id,
              external_url: pp.external_url,
            }));

            return (
              <div
                key={post.id}
                className="relative w-[90px] h-[120px] flex-shrink-0 rounded-xl overflow-hidden bg-muted cursor-pointer group snap-start"
                onClick={() => setSelectedPost(post)}
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

                <PostProductCircles products={taggedProducts} onProductClick={handleProductClick} />

                {post.content && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-white line-clamp-2">{post.content}</p>
                  </div>
                )}

                {(post.visibility === 'private' || post.visibility === 'followers_only') && (
                  <div className="absolute top-2 left-2 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                    {post.visibility === 'followers_only' ? 'Followers Only' : 'Private'}
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

      {/* Post Detail Viewer */}
      <Dialog open={!!selectedPost} onOpenChange={(open) => { if (!open) { setSelectedPost(null); setIsEditing(false); } }}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl">
          {selectedPost && (() => {
            const postImage = selectedPost.post_images
              ?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
              ?.[0]?.image_url;
            const taggedProducts = (selectedPost.post_products || []).map((pp: any) => ({
              image_url:
                pp.external_image_url ||
                pp.products?.image_url ||
                (pp.products?.media_urls as any)?.[0] ||
                null,
              title: pp.external_title || pp.products?.title || 'Item',
              product_id: pp.product_id,
              external_url: pp.external_url,
            }));
            return (
              <div>
                {postImage && (
                  <div className="relative w-full aspect-square bg-muted">
                    <SmartImage
                      src={postImage}
                      alt={selectedPost.content || 'Post'}
                      className="w-full h-full object-cover"
                    />
                    <PostProductCircles products={taggedProducts} onProductClick={handleProductClick} />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {(selectedPost.visibility === 'followers_only' || selectedPost.visibility === 'private') && (
                        <span className="inline-block text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                          {selectedPost.visibility === 'followers_only' ? 'Followers Only' : 'Private'}
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(selectedPost.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {!isEditing ? (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setIsEditing(true); setEditContent(selectedPost.content || ''); setEditVisibility(selectedPost.visibility || 'public_explore'); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(false)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-primary"
                          disabled={updatePostMutation.isPending}
                          onClick={() => updatePostMutation.mutate({ postId: selectedPost.id, content: editContent, visibility: editVisibility })}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {isEditing ? (
                    <>
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="text-sm min-h-[60px]"
                        placeholder="Add a caption..."
                      />
                      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 mt-2">
                        <div className="flex-1 mr-3">
                          <p className="text-xs font-medium">{editVisibility === 'public_explore' ? 'Public' : 'Followers Only'}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {editVisibility === 'public_explore'
                              ? 'Visible in Explore, Feed & profile'
                              : 'Only mutual followers & your profile'}
                          </p>
                        </div>
                        <Switch
                          checked={editVisibility === 'public_explore'}
                          onCheckedChange={(checked) => setEditVisibility(checked ? 'public_explore' : 'followers_only')}
                        />
                      </div>
                    </>
                  ) : (
                    selectedPost.content && (
                      <p className="text-sm text-foreground">{selectedPost.content}</p>
                    )
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </section>
  );
};

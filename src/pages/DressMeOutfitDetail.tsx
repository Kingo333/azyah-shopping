import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Share2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead } from '@/components/SEOHead';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { nativeShare } from '@/lib/nativeShare';

export default function DressMeOutfitDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [outfit, setOutfit] = useState<any>(null);
  const [missingItemsCount, setMissingItemsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadOutfit(id);
    }
  }, [id]);

  const loadOutfit = async (outfitId: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('fits')
        .select(`
          *,
          creator:users!fits_user_id_fkey(username, name, avatar_url)
        `)
        .eq('id', outfitId)
        .single();

      if (error) throw error;

      // Check for missing items
      const { data: fitItems } = await supabase
        .from('fit_items')
        .select('wardrobe_item_id')
        .eq('fit_id', outfitId);

      const expectedCount = fitItems?.length || 0;

      if (expectedCount > 0) {
        const { data: items } = await supabase
          .from('wardrobe_items')
          .select('id')
          .in('id', fitItems!.map(fi => fi.wardrobe_item_id));
        
        const foundCount = items?.length || 0;
        setMissingItemsCount(expectedCount - foundCount);
      } else {
        setMissingItemsCount(0);
      }

      setOutfit(data);
    } catch (error) {
      console.error('Error loading outfit:', error);
      toast.error('Failed to load outfit');
      navigate('/dress-me/wardrobe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditOutfit = () => {
    if (!outfit) return;
    sessionStorage.setItem('dressme_load_fit', outfit.id);
    navigate('/dress-me/canvas');
    toast.success('Loading outfit for editing...');
  };

  const handleUseOutfit = () => {
    if (!outfit) return;
    sessionStorage.setItem('dressme_load_fit', outfit.id);
    navigate('/dress-me/canvas');
    toast.success('Loading outfit...');
  };

  const handleShare = async () => {
    if (!outfit) return;
    
    await nativeShare({
      title: outfit.title || 'Check out this outfit!',
      url: `${window.location.origin}/dress-me/outfit/${outfit.id}`,
    });
  };

  if (isLoading) {
    return (
      <>
        <SEOHead title="Loading Outfit..." description="View outfit details" />
        <div className="min-h-screen bg-background">
          <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b p-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dress-me/community')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          <div className="container max-w-4xl mx-auto p-4 space-y-4">
            <Skeleton className="w-full aspect-[3/4] rounded-lg" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </>
    );
  }

  if (!outfit) {
    return null;
  }

  return (
    <>
      <SEOHead
        title={`${outfit.title || 'Outfit'} - Dress Me | Azyah`}
        description="View and recreate this outfit combination"
      />

      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b">
        <div className="container max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dress-me/community')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-screen bg-background pb-24">
        <div className="container max-w-4xl mx-auto p-4 space-y-6">
          {/* Outfit Image */}
          <Card className="overflow-hidden">
            <div className="aspect-[3/4] bg-muted/30">
              {outfit.render_path || outfit.image_preview ? (
                <img
                  src={outfit.render_path || outfit.image_preview}
                  alt={outfit.title || 'Outfit'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No preview available
                </div>
              )}
            </div>
          </Card>

          {/* Missing Items Warning */}
          {missingItemsCount > 0 && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-600 dark:text-yellow-500">
                ⚠️ Some items in this outfit are no longer available
              </p>
            </div>
          )}

          {/* Outfit Info */}
          <div className="space-y-4">
            {outfit.title && (
              <h1 className="text-2xl md:text-3xl font-bold">{outfit.title}</h1>
            )}

            {/* Creator Info */}
            {outfit.creator && (
              <div className="flex items-center gap-3">
                {outfit.creator.avatar_url ? (
                  <img
                    src={outfit.creator.avatar_url}
                    alt={outfit.creator.username}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    {outfit.creator.name?.[0] || outfit.creator.username?.[0] || '?'}
                  </div>
                )}
                <div>
                  <p className="font-medium">
                    {outfit.creator.name || outfit.creator.username}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    @{outfit.creator.username}
                  </p>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {outfit.like_count > 0 && (
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  <span>{outfit.like_count} likes</span>
                </div>
              )}
              {outfit.occasion && (
                <span className="px-3 py-1 bg-muted rounded-full capitalize">
                  {outfit.occasion}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-4 z-40">
        <div className="container max-w-4xl mx-auto">
          {outfit.user_id === user?.id ? (
            <Button onClick={handleEditOutfit} size="lg" className="w-full">
              <Edit className="w-4 h-4 mr-2" />
              Edit This Outfit
            </Button>
          ) : (
            <Button onClick={handleUseOutfit} size="lg" className="w-full">
              Use This Outfit
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

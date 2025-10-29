import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { X, Share2, Edit } from 'lucide-react';
import { Button } from './ui/button';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { useNavigate } from 'react-router-dom';

interface OutfitDetailSheetProps {
  fitId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OutfitDetailSheet: React.FC<OutfitDetailSheetProps> = ({
  fitId,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();

  // Fetch fit and its items
  const { data: fitData } = useQuery({
    queryKey: ['outfit-detail', fitId],
    queryFn: async () => {
      if (!fitId) return null;

      // Get fit
      const { data: fit, error: fitError } = await supabase
        .from('fits')
        .select('*')
        .eq('id', fitId)
        .single();

      if (fitError) throw fitError;

      // Get fit_items with wardrobe_item details
      const { data: fitItems, error: itemsError } = await supabase
        .from('fit_items')
        .select('wardrobe_item_id')
        .eq('fit_id', fitId);

      if (itemsError) throw itemsError;

      // Get full wardrobe item details
      const itemIds = fitItems.map(fi => fi.wardrobe_item_id);
      const { data: items, error: wardrobeError } = await supabase
        .from('wardrobe_items')
        .select('*')
        .in('id', itemIds);

      if (wardrobeError) throw wardrobeError;

      return { fit, items: items as WardrobeItem[] };
    },
    enabled: !!fitId && isOpen,
  });

  if (!isOpen || !fitData) return null;

  const { fit, items } = fitData;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="outfit-sheet-backdrop"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="outfit-sheet">
        {/* Header */}
        <div className="outfit-sheet-header">
          <button onClick={onClose} className="sheet-close-btn">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold">Outfit</h2>
          <div className="w-5" />
        </div>

        {/* Content */}
        <div className="outfit-sheet-content">
          {/* Hero Image */}
          <div className="outfit-hero">
            <img
              src={fit.render_path || '/placeholder.svg'}
              alt={fit.title || 'Outfit'}
              className="outfit-hero-image"
            />
          </div>

          {/* Title (if exists) */}
          {fit.title && (
            <h3 className="text-xl font-semibold mt-4">{fit.title}</h3>
          )}

          {/* Clothes in outfit */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Clothes in outfit</h3>
            <div className="items-row">
              {items.map((item) => (
                <button
                  key={item.id}
                  className="item-thumb"
                  onClick={() => {
                    navigate(`/dress-me/wardrobe`);
                    onClose();
                  }}
                >
                  <img
                    src={item.image_bg_removed_url || item.image_url}
                    alt={item.category}
                    className="w-full h-full object-contain"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="outfit-actions">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => {
                navigate(`/dress-me/canvas?fitId=${fitId}`);
                onClose();
              }}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit in Canvas
            </Button>
            <Button variant="outline" className="flex-1">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWardrobeItems } from '@/hooks/useWardrobeItems';
import { useSuggestedEssentials } from '@/hooks/useSuggestedEssentials';
import { usePublicFits } from '@/hooks/useFits';
import { isGuestMode } from '@/hooks/useGuestMode';
import { useAuth } from '@/contexts/AuthContext';

const IMAGE_CYCLE_INTERVAL = 3000; // 3 seconds

export const ClosetOutfitsSection: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isGuest = isGuestMode() || !user;
  
  // Closet data
  const { data: wardrobeItems = [] } = useWardrobeItems();
  const { data: suggestedItems = [] } = useSuggestedEssentials(wardrobeItems.length === 0 || isGuest);
  const closetItems = (!isGuest && wardrobeItems.length > 0) ? wardrobeItems : suggestedItems;
  
  // Outfits data (public community fits)
  const { data: publicFits = [] } = usePublicFits(20);
  
  // Image cycling state
  const [currentClosetIndex, setCurrentClosetIndex] = useState(0);
  const [currentOutfitIndex, setCurrentOutfitIndex] = useState(0);
  
  // Cycle closet images
  useEffect(() => {
    if (closetItems.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentClosetIndex((prev) => (prev + 1) % closetItems.length);
    }, IMAGE_CYCLE_INTERVAL);
    
    return () => clearInterval(interval);
  }, [closetItems.length]);
  
  // Cycle outfit images
  useEffect(() => {
    if (publicFits.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentOutfitIndex((prev) => (prev + 1) % publicFits.length);
    }, IMAGE_CYCLE_INTERVAL + 500); // Slightly offset timing
    
    return () => clearInterval(interval);
  }, [publicFits.length]);
  
  const currentClosetItem = closetItems[currentClosetIndex];
  const currentOutfit = publicFits[currentOutfitIndex];
  
  // Get outfit image URL
  const getOutfitImageUrl = (fit: any): string => {
    if (fit?.render_path) {
      if (fit.render_path.startsWith('http')) {
        return fit.render_path;
      }
      return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/fits/${fit.render_path}`;
    }
    if (fit?.image_preview) {
      return fit.image_preview;
    }
    return '/placeholder.svg';
  };

  // Handle navigation - redirect guests to sign-in
  const handleNavigate = (path: string) => {
    if (isGuest) {
      navigate('/onboarding/signup');
    } else {
      navigate(path);
    }
  };

  return (
    <section className="px-4 pt-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-serif font-medium text-foreground">Closet</h2>
        <Button 
          variant="link" 
          size="sm" 
          onClick={() => handleNavigate('/dress-me/wardrobe')}
          className="text-[hsl(var(--azyah-maroon))] hover:text-[hsl(var(--azyah-maroon))]/80 text-xs p-0 h-auto"
        >
          View All
        </Button>
      </div>
      
      {/* Two-Card Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Left Card - Closet */}
        <div 
          onClick={() => handleNavigate('/dress-me/wardrobe')}
          className="relative aspect-[4/5] rounded-xl overflow-hidden bg-card border border-border/50 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
          {/* Create Button */}
          <div className="absolute top-2 left-2 z-10">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleNavigate('/dress-me/wardrobe');
              }}
              className="flex items-center gap-1 px-2 py-1 bg-background/90 backdrop-blur-sm rounded-lg border border-border/50 hover:bg-background transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-foreground" />
              <span className="text-xs font-medium text-foreground">Create</span>
            </button>
          </div>
          
          {/* Transitioning Image */}
          <AnimatePresence mode="wait">
            {currentClosetItem && (
              <motion.img
                key={currentClosetItem.id}
                src={currentClosetItem.image_bg_removed_url || currentClosetItem.image_url || '/placeholder.svg'}
                alt="Closet item"
                className="w-full h-full object-cover"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5 }}
              />
            )}
          </AnimatePresence>
          
          {/* Bottom Label */}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
            <p className="text-white text-sm font-medium">All clothes</p>
            <p className="text-white/80 text-xs">{closetItems.length} items</p>
          </div>
        </div>
        
        {/* Right Card - Outfits */}
        <div 
          onClick={() => handleNavigate('/dress-me/fits')}
          className="relative aspect-[4/5] rounded-xl overflow-hidden bg-card border border-border/50 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
          {/* Header with title */}
          <div className="absolute top-0 left-0 right-0 z-10 p-2 bg-gradient-to-b from-black/40 to-transparent">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm font-medium">Outfits</span>
              <Button 
                variant="link" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleNavigate('/dress-me/fits');
                }}
                className="text-white/90 hover:text-white text-xs p-0 h-auto"
              >
                View All
              </Button>
            </div>
          </div>
          
          {/* Transitioning Outfit Image */}
          <AnimatePresence mode="wait">
            {currentOutfit ? (
              <motion.img
                key={currentOutfit.id}
                src={getOutfitImageUrl(currentOutfit)}
                alt="Community outfit"
                className="w-full h-full object-cover"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5 }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary">
                <p className="text-muted-foreground text-sm">No outfits yet</p>
              </div>
            )}
          </AnimatePresence>
          
          {/* Bottom Label */}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
            <p className="text-white text-sm font-medium">Community</p>
            <p className="text-white/80 text-xs">{publicFits.length} looks</p>
          </div>
        </div>
      </div>
    </section>
  );
};

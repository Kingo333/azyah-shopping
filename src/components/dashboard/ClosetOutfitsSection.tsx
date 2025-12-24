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

const IMAGE_CYCLE_INTERVAL = 3000;

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
  
  // Outfit image cycling
  const [currentOutfitIndex, setCurrentOutfitIndex] = useState(0);
  
  useEffect(() => {
    if (publicFits.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentOutfitIndex((prev) => (prev + 1) % publicFits.length);
    }, IMAGE_CYCLE_INTERVAL);
    
    return () => clearInterval(interval);
  }, [publicFits.length]);
  
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

  // Show first 3 items for the grid (plus button takes one slot)
  const displayClosetItems = closetItems.slice(0, 3);

  return (
    <section className="px-4 pt-3">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-serif font-medium text-foreground">Closet</h2>
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
      <div className="grid grid-cols-2 gap-2">
        {/* Left Card - Closet Items (Grid Layout) */}
        <div 
          onClick={() => handleNavigate('/dress-me/wardrobe')}
          className="bg-card rounded-xl p-1.5 border border-border/50 shadow-sm cursor-pointer hover:shadow-md transition-shadow flex flex-col"
        >
          {/* Grid of items with Create button */}
          <div className="grid grid-cols-2 gap-0.5 flex-1">
            {/* Create Button - circular */}
            <div className="aspect-square flex items-center justify-center">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleNavigate('/dress-me/wardrobe');
                }}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
            
            {/* Item thumbnails */}
            {displayClosetItems.map((item) => (
              <div 
                key={item.id} 
                className="aspect-square rounded-md overflow-hidden bg-secondary/30"
              >
                <img 
                  src={item.image_bg_removed_url || item.image_url || '/placeholder.svg'} 
                  alt={item.category}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            
            {/* Fill empty slots if less than 3 items */}
            {displayClosetItems.length < 3 && 
              Array.from({ length: 3 - displayClosetItems.length }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square rounded-md bg-secondary/20" />
              ))
            }
          </div>
          
          {/* Bottom Label */}
          <div className="mt-1">
            <p className="text-[10px] font-medium text-foreground">
              All clothes <span className="text-muted-foreground font-normal">• {closetItems.length}</span>
            </p>
          </div>
        </div>
        
        {/* Right Card - Outfits (Full image with small plus button) */}
        <div 
          onClick={() => handleNavigate('/dress-me/fits')}
          className="bg-card rounded-xl p-2 border border-border/50 shadow-sm cursor-pointer hover:shadow-md transition-shadow flex flex-col"
        >
          {/* Image container with overlay plus button */}
          <div className="relative aspect-square rounded-md overflow-hidden bg-secondary/30 flex-1">
            {/* Small Plus Button - top left corner */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleNavigate('/dress-me/fits');
              }}
              className="absolute top-1.5 left-1.5 z-10 w-6 h-6 rounded-full bg-secondary/80 backdrop-blur-sm flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            
            {/* Full Outfit Image */}
            <AnimatePresence mode="wait">
              {currentOutfit ? (
                <motion.img
                  key={currentOutfit.id}
                  src={getOutfitImageUrl(currentOutfit)}
                  alt={currentOutfit.title || 'Outfit'}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">No outfits</span>
                </div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Bottom Label */}
          <div className="mt-1">
            <p className="text-[10px] font-medium text-foreground">
              Outfits <span className="text-muted-foreground font-normal">• {publicFits.length}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

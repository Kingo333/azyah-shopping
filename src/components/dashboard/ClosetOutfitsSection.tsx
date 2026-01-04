import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWardrobeItems } from '@/hooks/useWardrobeItems';
import { useSuggestedEssentials } from '@/hooks/useSuggestedEssentials';
import { usePublicFits } from '@/hooks/useFits';
import { isGuestMode } from '@/hooks/useGuestMode';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestGate } from '@/hooks/useGuestGate';
import { GuestActionPrompt } from '@/components/GuestActionPrompt';

const IMAGE_CYCLE_INTERVAL = 3000;

export const ClosetOutfitsSection: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { requireAuth, showPrompt, setShowPrompt, promptAction } = useGuestGate();
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

  // Get creator display name - show "You" if current user
  const getCreatorDisplayName = (fit: any): string => {
    if (user && fit?.user_id === user.id) {
      return 'You';
    }
    return fit?.creator_name || fit?.creator_username || 'Creator';
  };

  // Get creator initials
  const getCreatorInitials = (fit: any): string => {
    if (user && fit?.user_id === user.id) {
      return 'Y';
    }
    const name = fit?.creator_name || fit?.creator_username || 'C';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Handle navigation - show dialog for guests instead of direct redirect
  const handleNavigate = (path: string, actionDescription?: string) => {
    if (isGuest) {
      requireAuth(actionDescription || 'access your closet', () => {
        navigate(path);
      });
    } else {
      navigate(path);
    }
  };

  // Custom display order: keep shirts, show light blue jeans instead of dress/shoes
  const getDisplayItems = () => {
    const shirts = closetItems.filter(item => 
      item.category === 'top' && (item.color === 'black' || item.color === 'white')
    ).slice(0, 2);
    
    // Look for light blue jeans - check multiple color variations
    const blueJeans = closetItems.find(item => 
      item.category === 'bottom' && 
      (item.color === 'light blue' || item.color === 'lightblue' || item.color === 'blue')
    );
    
    if (shirts.length === 2 && blueJeans) {
      return [...shirts, blueJeans];
    }
    
    // Fallback: prioritize tops and bottoms only
    const preferredItems = closetItems.filter(item => 
      item.category === 'top' || item.category === 'bottom'
    ).slice(0, 3);
    
    if (preferredItems.length >= 3) return preferredItems;
    
    // Final fallback: exclude shoes
    return closetItems.filter(item => item.category !== 'shoes').slice(0, 3);
  };

  const displayClosetItems = getDisplayItems();

  return (
    <>
      <section className="px-4 pt-3 md:max-w-lg lg:max-w-xl">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-0.5">
          <h2 className="text-base font-serif font-medium text-foreground">Closet</h2>
          <Button 
            variant="link" 
            size="sm" 
            onClick={() => handleNavigate('/dress-me/wardrobe', 'view your wardrobe')}
            className="text-[hsl(var(--azyah-maroon))] hover:text-[hsl(var(--azyah-maroon))]/80 text-xs p-0 h-auto"
          >
            View All
          </Button>
        </div>
        
        {/* Rewards hint text */}
        <p className="text-[10px] text-muted-foreground mb-1.5 leading-tight">
          Style outfits with brand items to earn salon rewards
        </p>
        
        {/* Two-Card Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Left Card - Closet Items (Grid Layout) */}
          <div 
            onClick={() => handleNavigate('/dress-me/wardrobe', 'access your closet')}
            className="bg-card rounded-xl p-1.5 border border-border/50 shadow-sm cursor-pointer hover:shadow-md transition-shadow flex flex-col"
          >
            {/* Grid of items with Create button */}
            <div className="grid grid-cols-2 gap-0.5 flex-1">
              {/* Create Button - circular */}
              <div className="aspect-square flex items-center justify-center">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigate('/dress-me/wardrobe', 'add items to your closet');
                    }}
                    className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors border border-[hsl(var(--azyah-maroon))]/30"
                  >
                    <Plus className="h-3.5 w-3.5 text-[hsl(var(--azyah-maroon))]" />
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
          
          {/* Right Card - Outfits (Full image with creator info) */}
          <div 
            onClick={() => handleNavigate('/dress-me/wardrobe?tab=community', 'view community outfits')}
            className="bg-card rounded-xl p-2 border border-border/50 shadow-sm cursor-pointer hover:shadow-md transition-shadow flex flex-col"
          >
            {/* Image container with overlay plus button */}
            <div className="relative aspect-square rounded-md overflow-hidden bg-secondary/30 flex-1">
              {/* Create & Earn CTA - top left corner */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleNavigate('/dress-me', 'create outfits and earn rewards');
                }}
                className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-secondary/80 backdrop-blur-sm hover:bg-secondary transition-colors border border-[hsl(var(--azyah-maroon))]/25"
              >
                <Plus className="h-2.5 w-2.5 text-[hsl(var(--azyah-maroon))]" />
                <span className="text-[8px] font-medium text-[hsl(var(--azyah-maroon))]">Create & Earn</span>
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
            
            {/* Bottom Label with Creator Info */}
            <div className="mt-1.5 flex items-center">
              {currentOutfit ? (
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={currentOutfit.creator_avatar} />
                    <AvatarFallback className="text-[6px] bg-secondary">
                      {getCreatorInitials(currentOutfit)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-[10px] font-medium text-foreground truncate max-w-[80px]">
                    {getCreatorDisplayName(currentOutfit)}
                  </p>
                </div>
              ) : (
                <p className="text-[10px] font-medium text-foreground">Outfits</p>
              )}
            </div>
          </div>
        </div>
      </section>
      
      {/* Guest Action Prompt */}
      <GuestActionPrompt 
        open={showPrompt} 
        onOpenChange={setShowPrompt}
        action={promptAction}
      />
    </>
  );
};

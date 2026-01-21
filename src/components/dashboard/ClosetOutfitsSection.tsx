import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
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

  // Get creator display name
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

  // Handle navigation with guest gate
  const handleNavigate = (path: string, actionDescription?: string) => {
    if (isGuest) {
      requireAuth(actionDescription || 'access your closet', () => {
        navigate(path);
      });
    } else {
      navigate(path);
    }
  };

  // Custom display order
  const getDisplayItems = () => {
    const shirts = closetItems.filter(item => 
      item.category === 'top' && (item.color === 'black' || item.color === 'white')
    ).slice(0, 2);
    
    const blueJeans = closetItems.find(item => 
      item.category === 'bottom' && 
      (item.color === 'light blue' || item.color === 'lightblue' || item.color === 'blue')
    );
    
    if (shirts.length === 2 && blueJeans) {
      return [...shirts, blueJeans];
    }
    
    const preferredItems = closetItems.filter(item => 
      item.category === 'top' || item.category === 'bottom'
    ).slice(0, 3);
    
    if (preferredItems.length >= 3) return preferredItems;
    
    return closetItems.filter(item => item.category !== 'shoes').slice(0, 3);
  };

  const displayClosetItems = getDisplayItems();

  return (
    <>
      <section className="px-4">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-base font-serif font-medium text-foreground tracking-tight">Wardrobe</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add items to create looks & earn
            </p>
          </div>
          <button
            onClick={() => handleNavigate('/dress-me/wardrobe', 'view your wardrobe')}
            className="flex items-center gap-0.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View All
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        
        {/* Two-Card Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Left Card - Closet Items */}
          <Card 
            onClick={() => handleNavigate('/dress-me/wardrobe', 'access your closet')}
            className="p-3 border border-border/60 shadow-sm cursor-pointer hover:shadow-md transition-all duration-200"
          >
            {/* Grid of items */}
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {/* Create Button */}
              <div className="aspect-square flex items-center justify-center">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigate('/dress-me/wardrobe', 'add items to your closet');
                  }}
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors border border-primary/20"
                >
                  <Plus className="h-4 w-4 text-primary" />
                </button>
              </div>
              
              {/* Item thumbnails */}
              {displayClosetItems.map((item) => (
                <div 
                  key={item.id} 
                  className="aspect-square rounded-lg overflow-hidden bg-muted/50"
                >
                  <img 
                    src={item.image_bg_removed_url || item.image_url || '/placeholder.svg'} 
                    alt={item.category}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              
              {/* Fill empty slots */}
              {displayClosetItems.length < 3 && 
                Array.from({ length: 3 - displayClosetItems.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square rounded-lg bg-muted/30" />
                ))
              }
            </div>
            
            {/* Bottom Label */}
            <p className="text-xs font-medium text-foreground">
              All clothes <span className="text-muted-foreground font-normal">• {closetItems.length}</span>
            </p>
          </Card>
          
          {/* Right Card - Outfits */}
          <Card 
            onClick={() => handleNavigate('/dress-me/wardrobe?tab=community', 'view community outfits')}
            className="p-3 border border-border/60 shadow-sm cursor-pointer hover:shadow-md transition-all duration-200"
          >
            {/* Image container */}
            <div className="relative aspect-square rounded-lg overflow-hidden bg-muted/50 mb-2">
              {/* Create & Earn CTA */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleNavigate('/dress-me', 'create outfits and earn rewards');
                }}
                className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background transition-colors shadow-sm"
              >
                <Plus className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-medium text-primary">Create & Earn</span>
              </button>
              
              {/* Outfit Image */}
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
                    <span className="text-xs text-muted-foreground">No outfits</span>
                  </div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Creator Info */}
            <div className="flex items-center gap-2">
              {currentOutfit ? (
                <>
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={currentOutfit.creator_avatar} />
                    <AvatarFallback className="text-[8px] bg-muted">
                      {getCreatorInitials(currentOutfit)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-xs font-medium text-foreground truncate">
                    {getCreatorDisplayName(currentOutfit)}
                  </p>
                </>
              ) : (
                <p className="text-xs font-medium text-foreground">Outfits</p>
              )}
            </div>
          </Card>
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
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWardrobeItems } from '@/hooks/useWardrobeItems';
import { useSuggestedEssentials } from '@/hooks/useSuggestedEssentials';
import { usePublicFits } from '@/hooks/useFits';
import { isGuestMode } from '@/hooks/useGuestMode';
import { useAuth } from '@/contexts/AuthContext';

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

  // Show first 4 items for the grid
  const displayClosetItems = closetItems.slice(0, 4);
  const displayOutfits = publicFits.slice(0, 4);

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
        {/* Left Card - Closet Items */}
        <div 
          onClick={() => handleNavigate('/dress-me/wardrobe')}
          className="bg-card rounded-2xl p-3 border border-border/50 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
          {/* Grid of items with Create button */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {/* Create Button - circular */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleNavigate('/dress-me/wardrobe');
              }}
              className="aspect-square rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
            >
              <Plus className="h-6 w-6 text-muted-foreground" />
            </button>
            
            {/* Item thumbnails */}
            {displayClosetItems.slice(0, 3).map((item, index) => (
              <div 
                key={item.id} 
                className="aspect-square rounded-lg overflow-hidden bg-secondary/30"
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
                <div key={`empty-${i}`} className="aspect-square rounded-lg bg-secondary/20" />
              ))
            }
          </div>
          
          {/* Bottom Label */}
          <div className="pt-2">
            <p className="text-sm font-medium text-foreground">All clothes</p>
            <p className="text-xs text-muted-foreground">{closetItems.length} items</p>
          </div>
        </div>
        
        {/* Right Card - Outfits */}
        <div 
          onClick={() => handleNavigate('/dress-me/fits')}
          className="bg-card rounded-2xl p-3 border border-border/50 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
          {/* Grid of outfits with Create button */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {/* Create Button - circular */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleNavigate('/dress-me/fits');
              }}
              className="aspect-square rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
            >
              <Plus className="h-6 w-6 text-muted-foreground" />
            </button>
            
            {/* Outfit thumbnails */}
            {displayOutfits.slice(0, 3).map((fit, index) => (
              <div 
                key={fit.id} 
                className="aspect-square rounded-lg overflow-hidden bg-secondary/30"
              >
                <img 
                  src={getOutfitImageUrl(fit)} 
                  alt={fit.title || 'Outfit'}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            
            {/* Fill empty slots if less than 3 outfits */}
            {displayOutfits.length < 3 && 
              Array.from({ length: 3 - displayOutfits.length }).map((_, i) => (
                <div key={`empty-outfit-${i}`} className="aspect-square rounded-lg bg-secondary/20" />
              ))
            }
          </div>
          
          {/* Bottom Label */}
          <div className="pt-2">
            <p className="text-sm font-medium text-foreground">Outfits</p>
            <p className="text-xs text-muted-foreground">{publicFits.length} looks</p>
          </div>
        </div>
      </div>
    </section>
  );
};

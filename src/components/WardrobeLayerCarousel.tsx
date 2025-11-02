import React, { useRef, useState, useEffect } from 'react';
import { Pin, X, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { WardrobeItem } from '@/hooks/useWardrobeItems';
import { WardrobeLayer } from '@/hooks/useWardrobeLayers';
import { useLayerScroll } from '@/contexts/LayerScrollContext';
import { measurePngTrim, ImageMetrics } from '@/utils/measurePngTrim';
import { triggerHaptic } from '@/utils/haptics';

interface WardrobeLayerCarouselProps {
  layer: WardrobeLayer;
  items: WardrobeItem[];
  selectedItemId?: string | null;
  onItemClick: (itemId: string) => void;
  onPinToggle: () => void;
  onRemoveLayer: () => void;
  onCategoryChange: (newCategory: WardrobeLayer['category']) => void;
  onAddItem?: () => void;
}

export const WardrobeLayerCarousel: React.FC<WardrobeLayerCarouselProps> = ({
  layer,
  items,
  selectedItemId,
  onItemClick,
  onPinToggle,
  onRemoveLayer,
  onCategoryChange,
  onAddItem,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [localCenterId, setLocalCenterId] = useState<string | null>(null);
  const { activeScrollIndex, setActiveScrollIndex, registerCarousel, unregisterCarousel } = useLayerScroll();
  const isUserScrollingRef = useRef(false);
  const isLocalUpdateRef = useRef(false);
  const scrollDebounceRef = useRef<NodeJS.Timeout>();
  const [imageMetrics, setImageMetrics] = useState<Map<string, ImageMetrics>>(new Map());

  // Create virtual infinite loop by tripling the array
  const virtualItems = items.length > 0 ? [...items, ...items, ...items] : [];
  const LOOP_MULTIPLIER = 3;
  const realItemsLength = items.length;

  // Measure image trim for proper spacing
  useEffect(() => {
    const measureImages = async () => {
      const newMetrics = new Map<string, ImageMetrics>();
      
      for (const item of items) {
        const imgSrc = item.image_bg_removed_url || item.image_url;
        if (!imgSrc) continue;
        
        try {
          const metrics = await measurePngTrim(imgSrc);
          newMetrics.set(item.id, metrics);
        } catch (error) {
          console.error(`Failed to measure ${item.id}:`, error);
        }
      }
      
      setImageMetrics(newMetrics);
    };
    
    if (items.length > 0) {
      measureImages();
    }
  }, [items]);

  // 🔥 FIX: Sync visual center state with selected item
  useEffect(() => {
    if (selectedItemId) {
      setLocalCenterId(selectedItemId);
      console.log(`🎯 [${layer.category}] Visual center synced: ${selectedItemId}`);
    }
  }, [selectedItemId, layer.category]);

  // Grid configuration - treats carousel as discrete cells
  const GRID_CONFIG = {
    cardWidthVw: 0.42,    // Card takes 42% of viewport width (matches CSS)
    gapVw: 0.08,          // Gap is 8% of viewport width (matches CSS)
    get cellWidthVw() { return this.cardWidthVw + this.gapVw; }  // Total cell = 50vw
  };

  // Map real item index to virtual array position (always use middle section)
  const getRealToVirtualIndex = (realIndex: number): number => {
    if (realItemsLength === 0) return 0;
    return realIndex + realItemsLength; // Middle section starts at items.length
  };

  // Map virtual index back to real item index
  const getVirtualToRealIndex = (virtualIndex: number): number => {
    if (realItemsLength === 0) return 0;
    return ((virtualIndex % realItemsLength) + realItemsLength) % realItemsLength;
  };

  // Map real item ID to virtual index (middle section)
  const getVirtualIndexForItemId = (itemId: string): number => {
    const realIndex = items.findIndex(item => item.id === itemId);
    return realIndex === -1 ? -1 : getRealToVirtualIndex(realIndex);
  };

  // Calculate exact scroll position for a virtual grid index
  const getScrollLeftForIndex = (virtualIndex: number, viewportWidth: number) => {
    const cardWidth = viewportWidth * GRID_CONFIG.cardWidthVw; // 42vw
    const cellWidth = viewportWidth * GRID_CONFIG.cellWidthVw; // 50vw (42vw card + 8vw gap)
    
    // CSS Grid scroll-padding-inline centers the cards automatically
    // We just need to scroll to the card's left edge, and the padding does the rest
    const scrollPadding = (viewportWidth - cardWidth) / 2; // 29vw on each side
    
    // Scroll to position where this card will be centered
    return (cellWidth * virtualIndex) - scrollPadding;
  };
  
  const categoryLabels: Record<string, string> = {
    top: 'Tops',
    bottom: 'Bottoms',
    dress: 'Dresses',
    outerwear: 'Outerwear',
    shoes: 'Shoes',
    bag: 'Bags',
    accessory: 'Accessories',
  };

  // ✅ SINGLE EFFECT: Programmatic scroll to selected item
  useEffect(() => {
    const rail = scrollContainerRef.current;
    if (!rail || items.length === 0 || !selectedItemId) return;

    // Skip if this carousel just updated the database
    if (isLocalUpdateRef.current) {
      console.log(`⏭️ Skipping self-scroll for ${layer.category}`);
      isLocalUpdateRef.current = false;
      return;
    }

    // Find item in virtual array (use middle section)
    const virtualIndex = getVirtualIndexForItemId(selectedItemId);
    if (virtualIndex === -1) {
      console.warn(`⚠️ Item not found: ${selectedItemId}`);
      return;
    }

    console.log(`📥 [${layer.category}] External selection: scrolling to ${selectedItemId}`);

    // Debounce scroll to prevent rapid triggers
    if (scrollDebounceRef.current) {
      clearTimeout(scrollDebounceRef.current);
    }

    scrollDebounceRef.current = setTimeout(() => {
      setLocalCenterId(selectedItemId);

      const vw = window.innerWidth;
      const targetScrollLeft = getScrollLeftForIndex(virtualIndex, vw);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          rail.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
        });
      });
    }, 10);

    return () => {
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
      }
    };
  }, [selectedItemId, items.length, layer.category, realItemsLength]);

  // ✅ SNAP HANDLER: Ensure cards snap to center after manual scroll ends + haptic feedback
  useEffect(() => {
    const rail = scrollContainerRef.current;
    if (!rail || items.length === 0) return;

    let scrollEndTimer: NodeJS.Timeout;

    const handleScrollEnd = () => {
      clearTimeout(scrollEndTimer);
      scrollEndTimer = setTimeout(() => {
        if (isUserScrollingRef.current) {
          // Calculate which grid cell should be centered
          const vw = window.innerWidth;
          const cellWidth = vw * GRID_CONFIG.cellWidthVw;
          const rawIndex = rail.scrollLeft / cellWidth;
          const snappedIndex = Math.round(rawIndex);
          
          // Snap to exact center position
          const targetScrollLeft = getScrollLeftForIndex(snappedIndex, vw);
          rail.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
          
          // Haptic feedback on snap
          triggerHaptic('light');
          
          console.log(`📍 Snap: ${rawIndex.toFixed(2)} → ${snappedIndex}`);
        }
      }, 150); // Debounce 150ms after scroll stops
    };

    rail.addEventListener('scroll', handleScrollEnd, { passive: true });
    return () => {
      clearTimeout(scrollEndTimer);
      rail.removeEventListener('scroll', handleScrollEnd);
    };
  }, [items.length]);

  // ✅ INFINITE LOOP: Snap back to middle section when approaching edges
  useEffect(() => {
    const rail = scrollContainerRef.current;
    if (!rail || items.length === 0) return;

    const handleLoopSnap = () => {
      if (!isUserScrollingRef.current) return;

      const vw = window.innerWidth;
      const cellWidth = vw * GRID_CONFIG.cellWidthVw;
      const currentVirtualIndex = Math.round(rail.scrollLeft / cellWidth);

      // If we're in the first or last section, snap to equivalent position in middle
      const isInFirstSection = currentVirtualIndex < realItemsLength * 0.5;
      const isInLastSection = currentVirtualIndex > realItemsLength * 2.5;

      if (isInFirstSection || isInLastSection) {
        const realIndex = getVirtualToRealIndex(currentVirtualIndex);
        const middleVirtualIndex = getRealToVirtualIndex(realIndex);
        
        console.log(`♾️ Loop snap: ${currentVirtualIndex} → ${middleVirtualIndex}`);
        
        // Instant snap (no animation) to maintain illusion
        const targetScrollLeft = getScrollLeftForIndex(middleVirtualIndex, vw);
        rail.scrollTo({ left: targetScrollLeft, behavior: 'auto' });
      }
    };

    rail.addEventListener('scrollend', handleLoopSnap, { passive: true });
    return () => rail.removeEventListener('scrollend', handleLoopSnap);
  }, [items.length, realItemsLength]);

  // ✅ AUTO-UPDATE DATABASE: Sync database with visually centered item when scroll ends
  useEffect(() => {
    const rail = scrollContainerRef.current;
    if (!rail || items.length === 0) return;

    let updateDebounceTimer: NodeJS.Timeout;

    const handleScrollEndUpdate = () => {
      clearTimeout(updateDebounceTimer);
      updateDebounceTimer = setTimeout(() => {
        // Update database regardless of scroll source (user or programmatic)
        const vw = window.innerWidth;
        const cellWidth = vw * GRID_CONFIG.cellWidthVw;
        const currentIndex = Math.round(rail.scrollLeft / cellWidth);
        const realIndex = getVirtualToRealIndex(currentIndex);
        const centeredItem = items[realIndex];
        
        if (centeredItem && centeredItem.id !== selectedItemId) {
          console.log(`💾 Auto-updating DB selection: ${centeredItem.id}`);
          isLocalUpdateRef.current = true; // Mark as local update
          onItemClick(centeredItem.id);
          triggerHaptic('light');
        }
      }, 500); // Debounce to avoid excessive DB writes
    };

    rail.addEventListener('scrollend', handleScrollEndUpdate, { passive: true });
    return () => {
      clearTimeout(updateDebounceTimer);
      rail.removeEventListener('scrollend', handleScrollEndUpdate);
    };
  }, [items, selectedItemId, onItemClick]);

  // ✅ SCROLL HANDLER: Sync scroll index across all layers
  useEffect(() => {
    const rail = scrollContainerRef.current;
    if (!rail || items.length === 0) return;

    // Always update visual center, regardless of scroll source
    const updateVisualCenter = () => {
      const vw = window.innerWidth;
      const cellWidth = vw * GRID_CONFIG.cellWidthVw;
      const rawVirtualIndex = rail.scrollLeft / cellWidth;
      const snappedVirtualIndex = Math.round(rawVirtualIndex);
      const realIndex = getVirtualToRealIndex(snappedVirtualIndex);
      
      // Find the corresponding item
      const virtualItemIndex = Math.max(0, Math.min(snappedVirtualIndex, virtualItems.length - 1));
      const centeredItem = virtualItems[virtualItemIndex];
      
      if (centeredItem && centeredItem.id !== localCenterId) {
        console.log(`🎯 Visual center updated: ${centeredItem.id}`);
        setLocalCenterId(centeredItem.id);

        // Update visual feedback
        const cards = rail.querySelectorAll<HTMLElement>('[data-item-id]');
        cards.forEach((card, idx) => {
          card.classList.toggle('is-center', idx === virtualItemIndex);
        });
      }
      
      return realIndex;
    };

    const handleScroll = () => {
      // Only update visual center during programmatic scrolls
      // User scrolls are handled by the snap handler (lines 172-206)
      if (!isUserScrollingRef.current) {
        updateVisualCenter();
      }
      
      // No broadcasting to other layers (removed setActiveScrollIndex call)
    };

    const handleScrollStart = () => {
      isUserScrollingRef.current = true;
    };

    const handleScrollEnd = () => {
      setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 100);
    };

    rail.addEventListener('scroll', handleScroll, { passive: true });
    rail.addEventListener('touchstart', handleScrollStart, { passive: true });
    rail.addEventListener('touchend', handleScrollEnd, { passive: true });
    rail.addEventListener('mousedown', handleScrollStart);
    rail.addEventListener('mouseup', handleScrollEnd);
    
    return () => {
      rail.removeEventListener('scroll', handleScroll);
      rail.removeEventListener('touchstart', handleScrollStart);
      rail.removeEventListener('touchend', handleScrollEnd);
      rail.removeEventListener('mousedown', handleScrollStart);
      rail.removeEventListener('mouseup', handleScrollEnd);
    };
  }, [items, setActiveScrollIndex]);

  // ✅ INITIAL CENTER: Center first item on mount (use middle section)
  useEffect(() => {
    const rail = scrollContainerRef.current;
    if (!rail || items.length === 0 || selectedItemId) return;

    console.log(`📌 Initial center for ${layer.category}: first item (middle section)`);

    const vw = window.innerWidth;
    const middleFirstIndex = getRealToVirtualIndex(0); // First item in middle section
    const targetScrollLeft = getScrollLeftForIndex(middleFirstIndex, vw);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        rail.scrollTo({ left: targetScrollLeft, behavior: 'auto' });
        setLocalCenterId(items[0].id);
      });
    });
  }, [realItemsLength]);
  
  // ✅ REGISTER CAROUSEL: Register scroll function with context
  useEffect(() => {
    const scrollToIndex = (realIndex: number) => {
      const rail = scrollContainerRef.current;
      if (!rail || items.length === 0) return;

      console.log(`🔗 External scroll to real index ${realIndex}`);

      // Convert to virtual index (middle section)
      const virtualIndex = getRealToVirtualIndex(realIndex);
      const vw = window.innerWidth;
      const targetScrollLeft = getScrollLeftForIndex(virtualIndex, vw);

      isUserScrollingRef.current = false;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          rail.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });

          // Immediately update visual center after programmatic scroll
          const clampedRealIndex = Math.max(0, Math.min(realIndex, items.length - 1));
          const targetItem = items[clampedRealIndex];
          
          if (targetItem) {
            setLocalCenterId(targetItem.id);
            
            // Update .is-center class
            const cards = rail.querySelectorAll<HTMLElement>('[data-item-id]');
            cards.forEach((card, idx) => {
              card.classList.toggle('is-center', idx === virtualIndex);
            });
          }
        });
      });
    };

    registerCarousel(layer.id, scrollToIndex);
    return () => unregisterCarousel(layer.id);
  }, [layer.id, items, registerCarousel, unregisterCarousel]);

  // ✅ RESIZE HANDLER: No CSS variables needed - grid handles it automatically
  useEffect(() => {
    const handleResize = () => {
      const rail = scrollContainerRef.current;
      if (!rail || !selectedItemId) return;

      // Recenter current item after resize
      const itemIndex = items.findIndex(item => item.id === selectedItemId);
      if (itemIndex !== -1) {
        const vw = window.innerWidth;
        const targetScrollLeft = getScrollLeftForIndex(itemIndex, vw);
        rail.scrollTo({ left: targetScrollLeft, behavior: 'auto' });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedItemId, items]);

  // Determine which item to visually center
  const visualCenterId = selectedItemId || localCenterId || (items.length > 0 ? items[0].id : null);

  return (
    <div className="mb-0">
      {/* Header with Category Selector */}
      <div className="flex items-center justify-between px-2 mb-1">
        {/* Left: Category Dropdown + Count */}
        <div className="flex items-center gap-2">
          <Select
            value={layer.category}
            onValueChange={(value) => onCategoryChange(value as WardrobeLayer['category'])}
          >
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="top">Tops</SelectItem>
              <SelectItem value="bottom">Bottoms</SelectItem>
              <SelectItem value="dress">Dresses</SelectItem>
              <SelectItem value="outerwear">Outerwear</SelectItem>
              <SelectItem value="shoes">Shoes</SelectItem>
              <SelectItem value="bag">Bags</SelectItem>
              <SelectItem value="accessory">Accessories</SelectItem>
            </SelectContent>
          </Select>
          
          <span className="text-xs text-muted-foreground">
            ({items.length} items)
          </span>
          
          {layer.is_pinned && (
            <Pin className="w-3 h-3 fill-primary text-primary" />
          )}
        </div>

        {/* Right: Pin + Remove buttons */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onPinToggle}
            title={layer.is_pinned ? 'Unpin' : 'Pin'}
          >
            <Pin className={layer.is_pinned ? 'w-3 h-3 fill-primary text-primary' : 'w-3 h-3'} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive"
            onClick={onRemoveLayer}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative">
        {items.length === 0 ? (
          <div
            className="flex items-center justify-center"
            style={{ height: 'clamp(160px, 20vh, 200px)' }}
          >
            <div className="text-center text-sm text-muted-foreground">
              No {categoryLabels[layer.category].toLowerCase()} in your wardrobe
            </div>
          </div>
        ) : (
          <div
            ref={scrollContainerRef}
            className="rail-carousel"
            style={{
              height: 'clamp(200px, 26vh, 260px)', // 🔥 Match CSS card height
            }}
          >
            {virtualItems.map((item, virtualIndex) => {
              const isCenter = item.id === visualCenterId;

              return (
                <div
                  key={`${item.id}-${virtualIndex}`}
                  data-item-id={item.id}
                  data-category={layer.category}
                  className={isCenter ? 'rail-card is-center' : 'rail-card'}
                  onClick={() => {
                    isLocalUpdateRef.current = true; // Mark as local update
                    onItemClick(item.id); // Update database
                    
                    // If clicked item is not already centered, scroll it to center
                    if (item.id !== visualCenterId) {
                      const realIndex = items.findIndex(i => i.id === item.id);
                      if (realIndex !== -1) {
                        const vw = window.innerWidth;
                        const targetScrollLeft = getScrollLeftForIndex(
                          getRealToVirtualIndex(realIndex), 
                          vw
                        );
                        
                        requestAnimationFrame(() => {
                          scrollContainerRef.current?.scrollTo({
                            left: targetScrollLeft,
                            behavior: 'smooth'
                          });
                        });
                      }
                    }
                  }}
                >
                  {/* Pin icon - only show in middle section */}
                  {layer.is_pinned && isCenter && virtualIndex >= realItemsLength && virtualIndex < realItemsLength * 2 && (
                    <div className="absolute top-2 right-2 z-10">
                      <Pin className="w-4 h-4 fill-primary text-primary drop-shadow" />
                    </div>
                  )}
                  
                  <img
                    src={item.image_bg_removed_url || item.image_url}
                    alt={item.category}
                    loading="lazy"
                    draggable={false}
                    style={(() => {
                      const metrics = imageMetrics.get(item.id);
                      if (!metrics) return {}; // Fallback to default
                      
                      // Calculate trim offsets as percentages
                      const trimLeft = (metrics.trim.left / metrics.naturalWidth) * 100;
                      const trimRight = (metrics.trim.right / metrics.naturalWidth) * 100;
                      const trimTop = (metrics.trim.top / metrics.naturalHeight) * 100;
                      const trimBottom = (metrics.trim.bottom / metrics.naturalHeight) * 100;
                      
                      // Compensate for transparent padding
                      return {
                        objectFit: 'contain' as const,
                        objectPosition: `${50 - (trimLeft - trimRight) / 2}% ${50 - (trimTop - trimBottom) / 2}%`,
                        scale: 1 + ((trimLeft + trimRight + trimTop + trimBottom) / 400),
                      };
                    })()}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

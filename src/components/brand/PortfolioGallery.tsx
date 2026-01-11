import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Image as ImageIcon } from 'lucide-react';
import { usePortfolio, PortfolioItem } from '@/hooks/usePortfolio';

interface PortfolioGalleryProps {
  brandId: string;
  showEmptyState?: boolean;
}

export const PortfolioGallery: React.FC<PortfolioGalleryProps> = ({ 
  brandId,
  showEmptyState = false 
}) => {
  const { data: portfolioItems = [], isLoading } = usePortfolio(brandId);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[4/3] bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (portfolioItems.length === 0) {
    if (!showEmptyState) return null;
    
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/30">
        <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No portfolio items yet</p>
      </div>
    );
  }

  const openLightbox = (item: PortfolioItem) => {
    setSelectedItem(item);
    setCurrentImageIndex(0);
  };

  const closeLightbox = () => {
    setSelectedItem(null);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    if (!selectedItem) return;
    setCurrentImageIndex((prev) => 
      prev < selectedItem.image_urls.length - 1 ? prev + 1 : 0
    );
  };

  const prevImage = () => {
    if (!selectedItem) return;
    setCurrentImageIndex((prev) => 
      prev > 0 ? prev - 1 : selectedItem.image_urls.length - 1
    );
  };

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Portfolio</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {portfolioItems.map((item) => (
            <button
              key={item.id}
              onClick={() => openLightbox(item)}
              className="group relative aspect-[4/3] rounded-lg overflow-hidden bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {item.image_urls[0] ? (
                <img
                  src={item.image_urls[0]}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              
              {/* Overlay with title */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white font-medium text-sm truncate">{item.title}</p>
                  {item.image_urls.length > 1 && (
                    <p className="text-white/80 text-xs">{item.image_urls.length} photos</p>
                  )}
                </div>
              </div>
              
              {/* Image count badge */}
              {item.image_urls.length > 1 && (
                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  +{item.image_urls.length - 1}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => closeLightbox()}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-0">
          {selectedItem && (
            <div className="relative">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
                onClick={closeLightbox}
              >
                <X className="h-5 w-5" />
              </Button>
              
              {/* Main image */}
              <div className="relative aspect-[16/10] flex items-center justify-center">
                {selectedItem.image_urls[currentImageIndex] ? (
                  <img
                    src={selectedItem.image_urls[currentImageIndex]}
                    alt={`${selectedItem.title} - Image ${currentImageIndex + 1}`}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center">
                    <ImageIcon className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                
                {/* Navigation arrows */}
                {selectedItem.image_urls.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                      onClick={prevImage}
                    >
                      <ChevronLeft className="h-8 w-8" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                      onClick={nextImage}
                    >
                      <ChevronRight className="h-8 w-8" />
                    </Button>
                  </>
                )}
              </div>
              
              {/* Info panel */}
              <div className="p-6 bg-background">
                <h3 className="text-xl font-semibold">{selectedItem.title}</h3>
                {selectedItem.description && (
                  <p className="text-muted-foreground mt-2">{selectedItem.description}</p>
                )}
                
                {/* Thumbnail strip */}
                {selectedItem.image_urls.length > 1 && (
                  <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                    {selectedItem.image_urls.map((url, index) => (
                      <button
                        key={url}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                          index === currentImageIndex 
                            ? 'border-primary' 
                            : 'border-transparent hover:border-muted-foreground/50'
                        }`}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PortfolioGallery;

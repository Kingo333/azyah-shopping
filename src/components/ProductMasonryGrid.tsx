import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Info, Shirt } from 'lucide-react';
import { SmartImage } from '@/components/SmartImage';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Product } from '@/types';
import { CommunityOutfitBlock } from './CommunityOutfitBlock';

interface ProductMasonryGridProps {
  products: Product[];
  isLoading: boolean;
  communityOutfitsInterval?: number;
  onProductClick?: (product: Product) => void;
  onInfoClick?: (product: Product) => void;
  onTryOnClick?: (product: Product) => void;
}

export const ProductMasonryGrid: React.FC<ProductMasonryGridProps> = ({
  products,
  isLoading,
  communityOutfitsInterval = 12,
  onProductClick,
  onInfoClick,
  onTryOnClick,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [likedProducts, setLikedProducts] = useState<Set<string>>(new Set());
  const [communityOutfits, setCommunityOutfits] = useState<any[]>([]);

  // Fetch community outfits for interleaving
  useEffect(() => {
    const fetchCommunityOutfits = async () => {
      const { data } = await supabase
        .from('fits')
        .select('*, user:users(name, avatar_url)')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (data) {
        setCommunityOutfits(data);
      }
    };

    fetchCommunityOutfits();
  }, []);

  // Fetch user's liked products
  useEffect(() => {
    const fetchLiked = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('swipes')
        .select('product_id')
        .eq('user_id', user.id)
        .eq('action', 'right');
      
      if (data) {
        setLikedProducts(new Set(data.map(d => d.product_id).filter(Boolean) as string[]));
      }
    };

    fetchLiked();
  }, [user?.id]);

  const handleLikeToggle = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.id) return;

    const isLiked = likedProducts.has(productId);
    
    if (isLiked) {
      setLikedProducts(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
      await supabase
        .from('swipes')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);
    } else {
      setLikedProducts(prev => new Set(prev).add(productId));
      await supabase
        .from('swipes')
        .insert({ 
          user_id: user.id, 
          product_id: productId, 
          action: 'right' as const
        });
    }
  };

  const handleProductClick = (product: Product) => {
    if (onProductClick) {
      onProductClick(product);
    } else {
      navigate(`/p/${product.id}`);
    }
  };

  const handleInfoClick = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onInfoClick) {
      onInfoClick(product);
    } else {
      navigate(`/p/${product.id}`);
    }
  };

  const handleTryOnClick = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTryOnClick) {
      onTryOnClick(product);
    } else {
      navigate(`/p/${product.id}?tryon=true`);
    }
  };

  if (isLoading) {
    return (
      <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="break-inside-avoid mb-3">
            <Skeleton className="w-full aspect-[3/4] rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  // Chunk-based rendering to fix community block layout
  const renderContent = () => {
    const chunks: React.ReactNode[] = [];
    const chunkSize = communityOutfitsInterval;
    
    for (let i = 0; i < products.length; i += chunkSize) {
      const chunk = products.slice(i, i + chunkSize);
      const chunkIndex = Math.floor(i / chunkSize);
      
      // Add the masonry chunk
      chunks.push(
        <div key={`masonry-${i}`} className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
          {chunk.map(product => (
            <MasonryProductCard
              key={product.id}
              product={product}
              isLiked={likedProducts.has(product.id)}
              onLikeToggle={(e) => handleLikeToggle(product.id, e)}
              onClick={() => handleProductClick(product)}
              onInfoClick={(e) => handleInfoClick(product, e)}
              onTryOnClick={(e) => handleTryOnClick(product, e)}
            />
          ))}
        </div>
      );
      
      // Add community block after each chunk (except the last if partial)
      if (i + chunkSize < products.length && communityOutfits.length > 0) {
        const outfitSlice = communityOutfits.slice(
          (chunkIndex * 3) % communityOutfits.length,
          ((chunkIndex * 3) % communityOutfits.length) + 3
        );
        
        if (outfitSlice.length > 0) {
          chunks.push(
            <CommunityOutfitBlock key={`community-${i}`} outfits={outfitSlice} />
          );
        }
      }
    }
    
    return chunks;
  };

  return (
    <div className="space-y-4">
      {renderContent()}
    </div>
  );
};

interface MasonryProductCardProps {
  product: Product;
  isLiked: boolean;
  onLikeToggle: (e: React.MouseEvent) => void;
  onClick: () => void;
  onInfoClick: (e: React.MouseEvent) => void;
  onTryOnClick: (e: React.MouseEvent) => void;
}

const MasonryProductCard: React.FC<MasonryProductCardProps> = ({
  product,
  isLiked,
  onLikeToggle,
  onClick,
  onInfoClick,
  onTryOnClick,
}) => {
  const imageUrl = product.media_urls?.[0] || product.image_url || '/placeholder.svg';
  const brandName = product.merchant_name || product.brand?.name || 'Unknown';

  return (
    <div 
      className="break-inside-avoid mb-3 group cursor-pointer"
      onClick={onClick}
    >
      <div className="relative rounded-xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-md transition-shadow">
        {/* Image with natural aspect ratio */}
        <div className="relative">
          <SmartImage
            src={imageUrl}
            alt={product.title}
            className="w-full h-auto object-cover"
          />
          
          {/* Right-side buttons - stacked vertically */}
          <div className="absolute top-2 right-2 flex flex-col gap-1.5">
            {/* Like/Heart button */}
            <button
              onClick={onLikeToggle}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${
                isLiked 
                  ? 'bg-[hsl(var(--azyah-maroon))] text-white' 
                  : 'bg-white/90 text-muted-foreground opacity-0 group-hover:opacity-100'
              }`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>
            
            {/* Try-On button - below heart */}
            <button
              onClick={onTryOnClick}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/90 text-muted-foreground opacity-0 group-hover:opacity-100 shadow-sm transition-all hover:bg-white"
            >
              <Shirt className="h-4 w-4" />
            </button>
          </div>

          {/* Info button - bottom right */}
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="secondary"
              className="h-7 w-7 rounded-full bg-white/90 hover:bg-white shadow-sm"
              onClick={onInfoClick}
            >
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        </div>
        
        {/* Brand name overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-3 pointer-events-none">
          <p className="text-xs font-medium text-white truncate">{brandName}</p>
        </div>
      </div>
    </div>
  );
};

export default ProductMasonryGrid;

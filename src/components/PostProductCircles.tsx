import React from 'react';
import { SmartImage } from '@/components/SmartImage';

interface PostProduct {
  image_url?: string | null;
  title?: string;
  product_id?: string | null;
  external_url?: string | null;
}

interface PostProductCirclesProps {
  products: PostProduct[];
  maxVisible?: number;
  onProductClick?: (product: PostProduct) => void;
}

export const PostProductCircles: React.FC<PostProductCirclesProps> = ({
  products,
  maxVisible = 3,
  onProductClick,
}) => {
  if (!products.length) return null;

  const visible = products.slice(0, maxVisible);
  const remaining = products.length - maxVisible;

  return (
    <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
      {visible.map((product, i) => (
        <button
          key={i}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onProductClick?.(product);
          }}
          className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white shadow-md bg-muted cursor-pointer hover:ring-primary transition-all"
        >
          {product.image_url ? (
            <SmartImage
              src={product.image_url}
              alt={product.title || 'Product'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center text-[8px] text-muted-foreground">
              ?
            </div>
          )}
        </button>
      ))}
      {remaining > 0 && (
        <div className="w-9 h-9 rounded-full bg-foreground/70 ring-2 ring-white shadow-md flex items-center justify-center">
          <span className="text-[10px] font-bold text-white">+{remaining}</span>
        </div>
      )}
    </div>
  );
};

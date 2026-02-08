import React from 'react';
import { SmartImage } from '@/components/SmartImage';

interface PostProduct {
  image_url?: string | null;
  title?: string;
}

interface PostProductCirclesProps {
  products: PostProduct[];
  maxVisible?: number;
}

/**
 * Small circular product thumbnails stacked vertically on the right side of a post image.
 * Matches the Phia reference design — small circles with white border.
 */
export const PostProductCircles: React.FC<PostProductCirclesProps> = ({
  products,
  maxVisible = 3,
}) => {
  if (!products.length) return null;

  const visible = products.slice(0, maxVisible);
  const remaining = products.length - maxVisible;

  return (
    <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
      {visible.map((product, i) => (
        <div
          key={i}
          className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white shadow-md bg-muted"
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
        </div>
      ))}
      {remaining > 0 && (
        <div className="w-9 h-9 rounded-full bg-foreground/70 ring-2 ring-white shadow-md flex items-center justify-center">
          <span className="text-[10px] font-bold text-white">+{remaining}</span>
        </div>
      )}
    </div>
  );
};

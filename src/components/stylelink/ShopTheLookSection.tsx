import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SmartImage } from '@/components/SmartImage';
import { MoneyStatic } from '@/components/ui/Money';
import { PostProduct } from '@/hooks/useStyleLinkPosts';

const openExternalUrl = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

interface ShopTheLookSectionProps {
  products: PostProduct[];
}

const ShopTheLookSection: React.FC<ShopTheLookSectionProps> = ({ products }) => {
  const navigate = useNavigate();

  const handleProductClick = (product: PostProduct) => {
    if (product.product_id) {
      navigate(`/product/${product.product_id}`);
    } else if (product.external_url) {
      openExternalUrl(product.external_url);
    }
  };

  const getProductTitle = (product: PostProduct): string => {
    return product.product?.title || product.external_title || 'Untitled';
  };

  const getProductImage = (product: PostProduct): string | null => {
    return product.product?.image_url || product.external_image_url || null;
  };

  const getProductBrand = (product: PostProduct): { name: string; logo: string | null } | null => {
    if (product.product?.brand) {
      return { name: product.product.brand.name, logo: product.product.brand.logo_url };
    }
    if (product.external_brand_name) {
      return { name: product.external_brand_name, logo: product.external_brand_logo_url };
    }
    return null;
  };

  const getProductPrice = (product: PostProduct): { cents: number; currency: string } | null => {
    if (product.product?.price_cents) {
      return { cents: product.product.price_cents, currency: product.product.currency || 'USD' };
    }
    if (product.external_price_cents) {
      return { cents: product.external_price_cents, currency: product.external_currency || 'USD' };
    }
    return null;
  };

  if (products.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <ShoppingBag className="h-4 w-4" />
        Shop this Look
      </h3>
      
      <div className="space-y-3">
        {products.map((product, index) => {
          const title = getProductTitle(product);
          const image = getProductImage(product);
          const brand = getProductBrand(product);
          const price = getProductPrice(product);
          const isExternal = !product.product_id && !!product.external_url;

          return (
            <div
              key={product.id}
              className="flex gap-3 p-3 rounded-lg border bg-card cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleProductClick(product)}
            >
              {/* Product Number (if tapped-to-tag) */}
              {product.position_x != null && (
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
              )}

              {/* Product Image */}
              <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted">
                {image ? (
                  <SmartImage
                    src={image}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                {/* Brand */}
                {brand && (
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {brand.logo && (
                      <img 
                        src={brand.logo} 
                        alt={brand.name}
                        className="w-3.5 h-3.5 rounded-full object-cover"
                      />
                    )}
                    <span className="text-xs text-muted-foreground truncate">
                      {brand.name}
                    </span>
                  </div>
                )}

                {/* Title */}
                <h4 className="text-sm font-medium line-clamp-2">
                  {product.label || title}
                </h4>

                {/* Price */}
                {price && (
                  <MoneyStatic
                    cents={price.cents}
                    currency={price.currency}
                    size="sm"
                    className="font-semibold mt-1"
                  />
                )}
              </div>

              {/* Shop Button */}
              <div className="flex-shrink-0 flex items-center">
                <Button size="sm" variant="outline" className="gap-1">
                  Shop
                  {isExternal && <ExternalLink className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ShopTheLookSection;

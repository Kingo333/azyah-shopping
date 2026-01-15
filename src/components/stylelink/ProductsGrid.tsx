import React from 'react';
import { useCreatorProducts, CreatorProduct } from '@/hooks/useCreatorProducts';
import { ShoppingBag, Star, Trash2, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { SmartImage } from '@/components/SmartImage';
import { MoneyStatic } from '@/components/ui/Money';

const openExternalUrl = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

interface ProductsGridProps {
  userId: string;
  isOwner: boolean;
  searchQuery?: string;
}

const ProductsGrid: React.FC<ProductsGridProps> = ({ userId, isOwner, searchQuery }) => {
  const { 
    featuredProducts, 
    recentProducts, 
    isLoading, 
    removeProduct, 
    toggleFeatured 
  } = useCreatorProducts(userId);
  const navigate = useNavigate();

  // Filter products by search query
  const filterProducts = (products: CreatorProduct[]) => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(product => {
      const title = product.product?.title || product.external_title || '';
      const brand = product.product?.brand?.name || product.external_brand_name || '';
      return title.toLowerCase().includes(query) || brand.toLowerCase().includes(query);
    });
  };

  const filteredFeatured = filterProducts(featuredProducts);
  const filteredRecent = filterProducts(recentProducts);

  const handleProductClick = (product: CreatorProduct) => {
    if (product.product_id) {
      navigate(`/product/${product.product_id}`);
    } else if (product.external_url) {
      openExternalUrl(product.external_url);
    }
  };

  const getProductTitle = (product: CreatorProduct): string => {
    return product.product?.title || product.external_title || 'Untitled';
  };

  const getProductImage = (product: CreatorProduct): string | null => {
    return product.product?.image_url || product.external_image_url || null;
  };

  const getProductBrand = (product: CreatorProduct): { name: string; logo: string | null } | null => {
    if (product.product?.brand) {
      return { name: product.product.brand.name, logo: product.product.brand.logo_url };
    }
    if (product.external_brand_name) {
      return { name: product.external_brand_name, logo: product.external_brand_logo_url };
    }
    return null;
  };

  const ProductCard: React.FC<{ product: CreatorProduct }> = ({ product }) => {
    const title = getProductTitle(product);
    const image = getProductImage(product);
    const brand = getProductBrand(product);
    const isExternal = !product.product_id && !!product.external_url;

    return (
      <div className="relative group">
        <div 
          className="rounded-lg overflow-hidden border bg-card cursor-pointer"
          onClick={() => handleProductClick(product)}
        >
          {/* Product Image */}
          <div className="aspect-square relative">
            {image ? (
              <SmartImage
                src={image}
                alt={title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              </div>
            )}

            {/* External link badge */}
            {isExternal && (
              <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1">
                <ExternalLink className="h-3 w-3" />
              </div>
            )}

            {/* Featured badge */}
            {product.is_featured && (
              <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" />
                Featured
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="p-3">
            {/* Brand */}
            {brand && (
              <div className="flex items-center gap-1.5 mb-1">
                {brand.logo && (
                  <img 
                    src={brand.logo} 
                    alt={brand.name}
                    className="w-4 h-4 rounded-full object-cover"
                  />
                )}
                <span className="text-xs text-muted-foreground truncate">
                  {brand.name}
                </span>
              </div>
            )}

            {/* Title */}
            <h4 className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">
              {title}
            </h4>

            {/* Price */}
            {(product.product?.price_cents || product.external_price_cents) && (
              <div className="mt-1">
                <MoneyStatic
                  cents={product.product?.price_cents || product.external_price_cents || 0}
                  currency={product.product?.currency || product.external_currency || 'USD'}
                  size="sm"
                  className="font-semibold"
                />
              </div>
            )}
          </div>
        </div>

        {/* Owner Actions */}
        {isOwner && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <Button
              size="icon"
              variant="secondary"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                toggleFeatured.mutate({ productId: product.id, isFeatured: !product.is_featured });
              }}
            >
              <Star className={`h-3.5 w-3.5 ${product.is_featured ? 'fill-current' : ''}`} />
            </Button>
            <Button
              size="icon"
              variant="destructive"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                removeProduct.mutate(product.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-square rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (filteredFeatured.length === 0 && filteredRecent.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">
          {searchQuery ? 'No products found' : 'No products yet'}
        </h3>
        <p className="text-muted-foreground text-sm">
          {isOwner 
            ? "Curate your favorite products for your followers to shop!"
            : "Check back soon for product recommendations."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Featured Products */}
      {filteredFeatured.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            Featured
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {filteredFeatured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Products */}
      {filteredRecent.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Recent</h3>
          <div className="grid grid-cols-2 gap-3">
            {filteredRecent.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsGrid;

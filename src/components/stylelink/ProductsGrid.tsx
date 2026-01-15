import React, { useState } from 'react';
import { useCreatorProducts, CreatorProduct } from '@/hooks/useCreatorProducts';
import { ShoppingBag, Star, Trash2, ExternalLink, MoreVertical } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { SmartImage } from '@/components/SmartImage';
import { MoneyStatic } from '@/components/ui/Money';
import { getPrimaryImageUrl } from '@/utils/imageHelpers';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
    products,
    featuredProducts,
    recentProducts,
    isLoading,
    removeProduct,
    removeAllProducts,
    toggleFeatured,
  } = useCreatorProducts(userId);
  const navigate = useNavigate();

  const [removeTarget, setRemoveTarget] = useState<CreatorProduct | null>(null);
  const [removeAllOpen, setRemoveAllOpen] = useState(false);

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

  const getProductImage = (product: CreatorProduct): string => {
    // Use getPrimaryImageUrl for internal products (handles media_urls properly)
    if (product.product) {
      return getPrimaryImageUrl(product.product);
    }
    // Fallback to external image or placeholder
    return product.external_image_url || '/placeholder.svg';
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
          className="rounded-xl overflow-hidden border bg-card cursor-pointer hover:shadow-md transition-shadow"
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('[data-product-actions]')) return;
            handleProductClick(product);
          }}
        >
          {/* Product Image */}
          <div className="aspect-square relative bg-muted">
            <SmartImage
              src={image}
              alt={title}
              className="w-full h-full object-cover"
            />

            {/* External link badge */}
            {isExternal && (
              <div className="absolute top-1.5 right-1.5 bg-background/90 backdrop-blur-sm rounded-full p-1 shadow-sm">
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </div>
            )}

            {/* Featured badge */}
            {product.is_featured && (
              <div className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px] font-medium flex items-center gap-0.5 shadow-sm">
                <Star className="h-2.5 w-2.5 fill-current" />
                Featured
              </div>
            )}

            {/* Owner Actions - Always visible dropdown */}
            {isOwner && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    data-product-actions
                    size="icon"
                    variant="secondary"
                    aria-label="Product options"
                    className="absolute top-1.5 right-1.5 h-7 w-7 bg-background/90 backdrop-blur-sm hover:bg-background shadow-sm z-20"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-50">
                  <DropdownMenuItem
                    onSelect={() => {
                      toggleFeatured.mutate({
                        productId: product.id,
                        isFeatured: !product.is_featured,
                      });
                    }}
                  >
                    <Star className={`h-4 w-4 mr-2 ${product.is_featured ? 'fill-current' : ''}`} />
                    {product.is_featured ? 'Unfeature' : 'Feature'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => setRemoveTarget(product)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Product Info */}
          <div className="p-2.5">
            {/* Brand */}
            {brand && (
              <div className="flex items-center gap-1 mb-0.5">
                {brand.logo && (
                  <img 
                    src={brand.logo} 
                    alt={brand.name}
                    className="w-3.5 h-3.5 rounded-full object-cover"
                  />
                )}
                <span className="text-[10px] text-muted-foreground truncate">
                  {brand.name}
                </span>
              </div>
            )}

            {/* Title */}
            <h4 className="text-xs font-medium line-clamp-2 min-h-[2rem] leading-tight">
              {title}
            </h4>

            {/* Price */}
            {(product.product?.price_cents || product.external_price_cents) && (
              <div className="mt-1">
                <MoneyStatic
                  cents={product.product?.price_cents || product.external_price_cents || 0}
                  currency={product.product?.currency || product.external_currency || 'USD'}
                  size="sm"
                  className="font-semibold text-xs"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="aspect-square rounded-xl" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (filteredFeatured.length === 0 && filteredRecent.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
          <ShoppingBag className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium mb-1">
          {searchQuery ? 'No products found' : 'No products yet'}
        </h3>
        <p className="text-muted-foreground text-xs">
          {isOwner 
            ? "Add your favorite products for followers to shop"
            : "Check back soon for product picks"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isOwner && products.length > 0 && (
        <div className="flex justify-end">
          <AlertDialog open={removeAllOpen} onOpenChange={setRemoveAllOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="h-8 text-xs">
                Remove all products
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove all products?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove every product from your Style Link products list. You can add them again later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      removeAllProducts.mutate(undefined, {
                        onSettled: () => setRemoveAllOpen(false),
                      });
                    }}
                  >
                    Remove all
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove product?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove “{removeTarget ? getProductTitle(removeTarget) : ''}” from your Style Link products list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={() => {
                  if (!removeTarget) return;
                  removeProduct.mutate(removeTarget.id, {
                    onSettled: () => setRemoveTarget(null),
                  });
                }}
              >
                Remove
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Featured Products */}
      {filteredFeatured.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-primary" />
            Featured
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {filteredFeatured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Products */}
      {filteredRecent.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold mb-2">Recent</h3>
          <div className="grid grid-cols-2 gap-2">
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
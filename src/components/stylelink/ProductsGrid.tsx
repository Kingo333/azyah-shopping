import React, { useState } from 'react';
import { useCreatorProducts, CreatorProduct } from '@/hooks/useCreatorProducts';
import { ShoppingBag, Star, Trash2, ExternalLink, MoreVertical, Pencil, Check, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
} from '@/components/ui/alert-dialog';
import EditCreatorProductModal from './EditCreatorProductModal';

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
    removeMultipleProducts,
    removeAllProducts,
    updateProduct,
    toggleFeatured,
  } = useCreatorProducts(userId);
  const navigate = useNavigate();

  // Selection mode state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal states
  const [removeTarget, setRemoveTarget] = useState<CreatorProduct | null>(null);
  const [editTarget, setEditTarget] = useState<CreatorProduct | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

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
  const allFilteredProducts = [...filteredFeatured, ...filteredRecent];

  const handleProductClick = (product: CreatorProduct) => {
    if (isSelectMode) {
      toggleSelection(product.id);
      return;
    }
    if (product.product_id) {
      navigate(`/product/${product.product_id}`);
    } else if (product.external_url) {
      openExternalUrl(product.external_url);
    }
  };

  const toggleSelection = (productId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(allFilteredProducts.map(p => p.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = () => {
    removeMultipleProducts.mutate(Array.from(selectedIds), {
      onSettled: () => {
        setShowBulkDeleteConfirm(false);
        exitSelectMode();
      },
    });
  };

  const handleSaveProduct = async (productId: string, updates: Partial<CreatorProduct>) => {
    await updateProduct.mutateAsync({ productId, updates });
  };

  const getProductTitle = (product: CreatorProduct): string => {
    return product.product?.title || product.external_title || 'Untitled';
  };

  const getProductImage = (product: CreatorProduct): string => {
    if (product.product) {
      return getPrimaryImageUrl(product.product);
    }
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
    const isSelected = selectedIds.has(product.id);

    return (
      <div className="relative group">
        <div 
          className={`rounded-xl overflow-hidden border bg-card cursor-pointer hover:shadow-md transition-all ${
            isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
          }`}
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

            {/* Selection checkbox */}
            {isSelectMode && (
              <div className="absolute top-1.5 left-1.5 z-20">
                <div 
                  className="h-6 w-6 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelection(product.id);
                  }}
                >
                  <Checkbox
                    checked={isSelected}
                    className="h-4 w-4"
                  />
                </div>
              </div>
            )}

            {/* External link badge - only show when not in select mode and not owner actions */}
            {isExternal && !isSelectMode && !isOwner && (
              <div className="absolute top-1.5 right-1.5 bg-background/90 backdrop-blur-sm rounded-full p-1 shadow-sm">
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </div>
            )}

            {/* Featured badge */}
            {product.is_featured && !isSelectMode && (
              <div className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px] font-medium flex items-center gap-0.5 shadow-sm">
                <Star className="h-2.5 w-2.5 fill-current" />
                Featured
              </div>
            )}

            {/* Owner Actions dropdown - hide in select mode */}
            {isOwner && !isSelectMode && (
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
                  <DropdownMenuItem onSelect={() => setEditTarget(product)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
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

            <h4 className="text-xs font-medium line-clamp-2 min-h-[2rem] leading-tight">
              {title}
            </h4>

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
      {/* Owner controls */}
      {isOwner && products.length > 0 && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {isSelectMode ? (
            <>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={exitSelectMode}>
                  <X className="h-3.5 w-3.5 mr-1" />
                  Cancel
                </Button>
                <span className="text-xs text-muted-foreground">
                  {selectedIds.size} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selectedIds.size < allFilteredProducts.length ? (
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={selectAll}>
                    Select all
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={deselectAll}>
                    Deselect all
                  </Button>
                )}
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="h-8 text-xs" 
                  onClick={handleBulkDelete}
                  disabled={selectedIds.size === 0}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete ({selectedIds.size})
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 ml-auto">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-xs" 
                onClick={() => setIsSelectMode(true)}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Select
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                className="h-8 text-xs"
                onClick={() => removeAllProducts.mutate()}
              >
                Remove all
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Single product remove confirmation */}
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
              Remove "{removeTarget ? getProductTitle(removeTarget) : ''}" from your Style Link products list.
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

      {/* Bulk delete confirmation */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} products?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the selected products from your Style Link. You can add them again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={confirmBulkDelete}>
                Delete {selectedIds.size} products
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Product Modal */}
      <EditCreatorProductModal
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        product={editTarget}
        onSave={handleSaveProduct}
      />

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

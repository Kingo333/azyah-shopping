import React, { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { ProductFilters, FilterState } from '@/components/ProductFilters';
import { ProductDetailModal } from '@/components/ProductDetailModal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingBag, Camera } from 'lucide-react';
import { Product } from '@/types';
import { toast } from '@/hooks/use-toast';

const Explore: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    priceRange: [0, 2000],
    occasion: [],
    material: [],
    color: [],
    size: []
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Apply filters to products query
  const { data: products, isLoading } = useProducts({
    category: filters.categories[0], // Use first selected category for now
    limit: 60
  });

  const formatPrice = (cents: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  const handleAddToWishlist = (productId: string) => {
    toast({
      title: "Added to wishlist",
      description: "Product has been added to your wishlist.",
    });
  };

  const handleAddToBag = (productId: string, size?: string) => {
    toast({
      title: "Added to bag",
      description: `Product${size ? ` in size ${size}` : ''} has been added to your bag.`,
    });
  };

  // Filter products based on current filters
  const filteredProducts = products?.filter(product => {
    const priceInDollars = product.price_cents / 100;
    const attributes = product.attributes as any;

    // Price filter
    if (priceInDollars < filters.priceRange[0] || priceInDollars > filters.priceRange[1]) {
      return false;
    }

    // Occasion filter
    if (filters.occasion.length > 0 && !filters.occasion.includes(attributes.occasion)) {
      return false;
    }

    // Material filter
    if (filters.material.length > 0 && !filters.material.includes(attributes.material)) {
      return false;
    }

    // Color filter
    if (filters.color.length > 0 && !filters.color.includes(attributes.color_primary)) {
      return false;
    }

    // Size filter (simplified)
    if (filters.size.length > 0 && !filters.size.includes(attributes.size)) {
      return false;
    }

    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <ProductFilters 
          filters={filters} 
          onFiltersChange={setFilters} 
          isSticky={true}
        />
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-accent rounded-lg mb-3"></div>
                <div className="h-4 bg-accent rounded mb-2"></div>
                <div className="h-3 bg-accent rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Filters */}
      <ProductFilters 
        filters={filters} 
        onFiltersChange={setFilters} 
        isSticky={true}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Explore Fashion</h1>
            <p className="text-muted-foreground">
              {filteredProducts?.length || 0} products found
            </p>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts && filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <Card 
                key={product.id} 
                className="group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden"
                onClick={() => handleProductClick(product)}
              >
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={product.media_urls[0] || '/placeholder.svg'}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-white/90 hover:bg-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToWishlist(product.id);
                      }}
                    >
                      <Heart className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-white/90 hover:bg-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToBag(product.id);
                      }}
                    >
                      <ShoppingBag className="h-4 w-4" />
                    </Button>
                    {product.ar_mesh_url && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white/90 hover:bg-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          toast({
                            title: "AR Try-On",
                            description: "AR feature coming soon!",
                          });
                        }}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Price Badge */}
                  <Badge className="absolute top-2 left-2 bg-white/90 text-black">
                    {formatPrice(product.price_cents, product.currency)}
                  </Badge>

                  {/* AR Badge */}
                  {product.ar_mesh_url && (
                    <Badge className="absolute top-2 right-2 bg-purple-500">
                      <Camera className="h-3 w-3 mr-1" />
                      AR
                    </Badge>
                  )}
                </div>

                <CardContent className="p-4">
                  <div className="space-y-2">
                    <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
                      {product.title}
                    </h3>
                    {product.brand && (
                      <p className="text-sm text-muted-foreground">
                        {product.brand.name}
                      </p>
                    )}
                    
                    {/* Style Tags */}
                    {product.attributes.style_tags && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {product.attributes.style_tags.slice(0, 2).map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-medium mb-2">No products found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your filters to see more results
            </p>
            <Button 
              variant="outline" 
              onClick={() => setFilters({
                categories: [],
                priceRange: [0, 2000],
                occasion: [],
                material: [],
                color: [],
                size: []
              })}
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedProduct(null);
        }}
        onAddToWishlist={handleAddToWishlist}
        onAddToBag={handleAddToBag}
      />
    </div>
  );
};

export default Explore;
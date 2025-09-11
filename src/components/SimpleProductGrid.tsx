import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getResponsiveImageProps } from "@/utils/asosImageUtils";

interface Product {
  id: string;
  title: string;
  brand?: any;
  price_cents: number;
  currency?: string;
  image_url?: string;
  media_urls?: string[];
}

interface SimpleProductGridProps {
  products: Product[];
  isLoading: boolean;
}

const formatPrice = (cents: number, currency = "USD") => {
  const amount = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const SimpleProductGrid = ({ products, isLoading }: SimpleProductGridProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <Skeleton className="aspect-square w-full" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No products found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => {
        const imageUrl = product.image_url || (product.media_urls && product.media_urls[0]);
        
        return (
          <Card key={product.id} className="overflow-hidden group hover:shadow-md transition-shadow">
            <div className="aspect-square relative overflow-hidden bg-muted">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              )}
            </div>
            <div className="p-3">
              <h3 className="font-medium text-sm line-clamp-2 mb-1">
                {product.title}
              </h3>
              {product.brand && (
                <p className="text-xs text-muted-foreground mb-2">
                  {typeof product.brand === 'string' ? product.brand : product.brand.name || 'Brand'}
                </p>
              )}
              <p className="font-semibold text-sm">
                {formatPrice(product.price_cents, product.currency)}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
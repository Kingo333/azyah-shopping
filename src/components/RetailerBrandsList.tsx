
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRetailerBrands } from '@/hooks/useRetailerBrands';
import { Eye, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RetailerBrandsListProps {
  retailerId: string;
}

const RetailerBrandsList: React.FC<RetailerBrandsListProps> = ({ retailerId }) => {
  const { data: brands, isLoading, error } = useRetailerBrands(retailerId);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 w-16 bg-muted rounded-lg mb-4"></div>
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !brands) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load brands</p>
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="text-center py-8">
        <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Brands Connected</h3>
        <p className="text-muted-foreground mb-4">
          Connect brands to start managing their products through your retail portal.
        </p>
        <Button>Connect a Brand</Button>
      </div>
    );
  }

  const handleViewBrand = (brandId: string) => {
    navigate(`/retailer-portal/brands/${brandId}`);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {brands.map((brand) => (
        <Card key={brand.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                {brand.logo_url ? (
                  <img
                    src={brand.logo_url}
                    alt={brand.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground font-semibold">
                    {brand.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{brand.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {brand.bio || 'No description available'}
                </p>
                <Badge variant="secondary" className="text-xs">
                  {brand.product_count} Products
                </Badge>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewBrand(brand.id)}
              className="w-full"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Brand
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default RetailerBrandsList;

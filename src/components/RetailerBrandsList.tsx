
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
    // Show ASOS as an official available brand even if no products are imported yet
    const defaultBrands = [
      {
        id: '4201d7f8-7632-4d4d-8baa-fb48cfade0ce',
        name: 'ASOS',
        slug: 'asos', 
        logo_url: 'https://images.asos-media.com/navigation/asos-face-logo',
        bio: 'ASOS plc is a British online fashion and cosmetic retailer.',
        product_count: 0
      }
    ];
    
    return (
      <div className="space-y-6">
        <div className="text-center py-4">
          <h3 className="text-lg font-semibold mb-2">Official Retail Partners</h3>
          <p className="text-muted-foreground">
            Connect with top fashion brands through our platform.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {defaultBrands.map((brand) => (
            <Card key={brand.id} className="hover:shadow-md transition-shadow border-primary/20">
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
                      Official Partner
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleViewBrand(brand.id)}
                  className="w-full"
                >
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Import Products
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
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

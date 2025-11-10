import { useState } from 'react';
import { useUGCBrands } from '@/hooks/useUGCBrand';
import { BrandCard } from './BrandCard';
import { BrandSearchBar } from './BrandSearchBar';
import { BrandDetailModal } from './BrandDetailModal';
import { Button } from '@/components/ui/button';
import { PenSquare } from 'lucide-react';
import { ReviewFormModal } from './ReviewFormModal';
import { Skeleton } from '@/components/ui/skeleton';

export const ReviewsList = () => {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [filters, setFilters] = useState<{
    search?: string;
    category?: string;
    verified?: boolean;
  }>({});

  const { data: brands, isLoading } = useUGCBrands(filters);

  const handleSearchChange = (search: string) => {
    setFilters((prev) => ({ ...prev, search: search || undefined }));
  };

  const handleCategoryChange = (category: string) => {
    setFilters((prev) => ({ ...prev, category: category === 'all' ? undefined : category }));
  };

  const handleVerifiedChange = (verified: boolean | undefined) => {
    setFilters((prev) => ({ ...prev, verified }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Brand Reviews</h2>
          <Button onClick={() => setShowReviewForm(true)} className="gap-2">
            <PenSquare className="h-4 w-4" />
            Write Review
          </Button>
        </div>

        <BrandSearchBar
          onSearchChange={handleSearchChange}
          onCategoryChange={handleCategoryChange}
          onVerifiedChange={handleVerifiedChange}
        />

        {brands && brands.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No brands found. Be the first to add one!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {brands?.map((brand) => (
              <BrandCard
                key={brand.id}
                brand={brand}
                onClick={() => setSelectedBrandId(brand.id)}
              />
            ))}
          </div>
        )}
      </div>

      <BrandDetailModal
        brandId={selectedBrandId}
        open={!!selectedBrandId}
        onOpenChange={(open) => !open && setSelectedBrandId(null)}
      />

      <ReviewFormModal
        open={showReviewForm}
        onOpenChange={setShowReviewForm}
      />
    </>
  );
};

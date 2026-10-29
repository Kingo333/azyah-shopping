import React from 'react';
import { ChevronRight, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useRetailerBrands } from '@/hooks/useRetailerBrands';
import { PartnerSectionHeader } from '@/components/partner/PartnerShell';
import { plural } from '@/lib/partnerPortal';

interface RetailerBrandsListProps {
  retailerId: string;
}

// ASOS is the brand whose catalog stores can import from today.
const IMPORT_BRAND = {
  id: '4201d7f8-7632-4d4d-8baa-fb48cfade0ce',
  name: 'ASOS',
  logo_url: 'https://images.asos-media.com/navigation/asos-face-logo',
};

function BrandMark({ name, logo }: { name: string; logo?: string | null }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-fill text-[15px] font-semibold text-ink-2">
      {logo ? <img src={logo} alt="" className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
    </span>
  );
}

/** Store portal → Brands: the brands in this store's catalog, as rows. */
const RetailerBrandsList: React.FC<RetailerBrandsListProps> = ({ retailerId }) => {
  const { data: brands, isLoading, error } = useRetailerBrands(retailerId);
  const navigate = useNavigate();
  const openBrand = (brandId: string) => navigate(`/retailer-portal/brands/${brandId}`);

  const header = (
    <PartnerSectionHeader
      title="Brands"
      subtitle={brands && brands.length > 0 ? `${plural(brands.length, 'brand')} in your catalog` : 'The brands you sell'}
      actions={
        <Button variant="outline" onClick={() => openBrand(IMPORT_BRAND.id)}>
          <Download className="mr-2 h-4 w-4" />
          Import products
        </Button>
      }
    />
  );

  if (isLoading) {
    return (
      <section>
        {header}
        <div className="space-y-px overflow-hidden rounded-[20px] bg-card">
          {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse bg-fill/60" />)}
        </div>
      </section>
    );
  }

  if (error || !brands) {
    return (
      <section>
        {header}
        <p className="rounded-[20px] bg-card px-6 py-10 text-center text-[15px] text-ink-2">Couldn't load your brands. Please try again.</p>
      </section>
    );
  }

  if (brands.length === 0) {
    return (
      <section>
        {header}
        <div className="rounded-[20px] bg-card px-6 py-10 text-center">
          <h2 className="text-[17px] font-semibold">No brands yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-[14px] text-ink-2">
            Brands show here once you add or import their products. You can import from {IMPORT_BRAND.name}.
          </p>
          <Button className="mt-5" onClick={() => openBrand(IMPORT_BRAND.id)}>
            <Download className="mr-2 h-4 w-4" />
            Import from {IMPORT_BRAND.name}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section>
      {header}
      <ul className="overflow-hidden rounded-[20px] bg-card">
        {brands.map((brand, i) => (
          <li key={brand.id} className={i > 0 ? 'border-t border-line' : undefined}>
            <button
              type="button"
              onClick={() => openBrand(brand.id)}
              className="flex min-h-[64px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors active:bg-fill"
            >
              <BrandMark name={brand.name} logo={brand.logo_url} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] text-ink">{brand.name}</span>
                <span className="block text-[13px] text-ink-2">{plural(brand.product_count ?? 0, 'product')}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default RetailerBrandsList;

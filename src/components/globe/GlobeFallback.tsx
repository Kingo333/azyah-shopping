import React from 'react';
import { Globe, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COUNTRY_COORDINATES } from '@/lib/countryCoordinates';
import { getCountryNameFromCode } from '@/lib/countryCurrency';

interface GlobeFallbackProps {
  countriesWithBrands: { code: string; count: number }[];
  selectedCountry: string | null;
  onCountrySelect: (code: string) => void;
  onSkipToFeed: () => void;
}

export function GlobeFallback({
  countriesWithBrands,
  selectedCountry,
  onCountrySelect,
  onSkipToFeed
}: GlobeFallbackProps) {
  // Get countries that have brands
  const activeCountries = COUNTRY_COORDINATES.filter(
    c => countriesWithBrands.some(b => b.code === c.code)
  );

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-muted/30">
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <Globe className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-playfair font-bold mb-2">Explore by Country</h2>
        <p className="text-muted-foreground">Discover fashion from around the world</p>
      </div>

      {activeCountries.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md w-full mb-6">
          {activeCountries.map((country) => {
            const brandData = countriesWithBrands.find(c => c.code === country.code);
            return (
              <Button
                key={country.code}
                variant={selectedCountry === country.code ? 'default' : 'outline'}
                className="flex items-center gap-2 h-auto py-3"
                onClick={() => onCountrySelect(country.code)}
              >
                <MapPin className="w-4 h-4" />
                <div className="text-left">
                  <p className="font-medium text-sm">{country.name}</p>
                  <p className="text-xs opacity-70">{brandData?.count || 0} brands</p>
                </div>
              </Button>
            );
          })}
        </div>
      ) : (
        <div className="text-center text-muted-foreground mb-6">
          <p>No countries with brands yet.</p>
          <p className="text-sm">Start exploring our collection!</p>
        </div>
      )}

      <Button onClick={onSkipToFeed} variant="ghost" className="mt-4">
        Skip to Feed →
      </Button>
    </div>
  );
}

export default GlobeFallback;

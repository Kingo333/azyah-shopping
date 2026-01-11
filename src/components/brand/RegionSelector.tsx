import React, { useState, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Globe, X } from 'lucide-react';
import { COUNTRIES } from '@/lib/countries';
import { cn } from '@/lib/utils';

export const WORLDWIDE_VALUE = 'WORLDWIDE';

interface RegionSelectorProps {
  selectedRegions: string[];
  onChange: (regions: string[]) => void;
  label?: string;
  className?: string;
  maxHeight?: string;
}

// Group countries by region for better UX
const REGION_GROUPS = [
  { name: 'Middle East', codes: ['AE', 'SA', 'KW', 'QA', 'BH', 'OM', 'JO', 'LB', 'EG', 'MA', 'TN', 'DZ', 'LY', 'IQ', 'SY', 'YE', 'PS', 'IR', 'IL', 'SD'] },
  { name: 'Europe', codes: ['GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'IE', 'PT', 'GR', 'TR', 'RU', 'PL', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SI', 'SK', 'LT', 'LV', 'EE', 'IS', 'MT', 'CY', 'LU', 'UA', 'BY', 'MD', 'RS', 'ME', 'BA', 'MK', 'AL'] },
  { name: 'North America', codes: ['US', 'CA', 'MX', 'GT', 'BZ', 'SV', 'HN', 'NI', 'CR', 'PA'] },
  { name: 'South America', codes: ['BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'UY', 'PY', 'BO', 'GY', 'SR'] },
  { name: 'Asia Pacific', codes: ['IN', 'PK', 'BD', 'LK', 'NP', 'BT', 'MV', 'CN', 'JP', 'KR', 'TW', 'HK', 'MO', 'TH', 'VN', 'MY', 'SG', 'ID', 'PH', 'BN', 'KH', 'LA', 'MM', 'TL', 'AU', 'NZ', 'FJ', 'PG'] },
  { name: 'Africa', codes: ['ZA', 'NG', 'KE', 'GH', 'ET', 'TZ', 'UG', 'RW', 'ZM', 'ZW', 'BW', 'NA', 'SZ', 'LS', 'MW', 'MZ', 'AO', 'CM', 'CD', 'CG', 'GA', 'SN', 'GM', 'GN', 'SL', 'LR', 'CI', 'BF', 'ML', 'NE', 'MR', 'CV', 'MG', 'MU', 'SC'] }
];

export const RegionSelector: React.FC<RegionSelectorProps> = ({
  selectedRegions,
  onChange,
  label = 'Service Regions',
  className,
  maxHeight = '300px'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const isWorldwide = selectedRegions.includes(WORLDWIDE_VALUE);
  
  const handleWorldwideToggle = (checked: boolean) => {
    if (checked) {
      onChange([WORLDWIDE_VALUE]);
    } else {
      onChange([]);
    }
  };
  
  const handleCountryToggle = (countryCode: string, checked: boolean) => {
    if (isWorldwide && checked) {
      // If worldwide is selected and user selects a country, switch to country mode
      onChange([countryCode]);
      return;
    }
    
    if (checked) {
      onChange([...selectedRegions.filter(r => r !== WORLDWIDE_VALUE), countryCode]);
    } else {
      onChange(selectedRegions.filter(r => r !== countryCode));
    }
  };
  
  const handleRemoveRegion = (region: string) => {
    onChange(selectedRegions.filter(r => r !== region));
  };
  
  const filteredCountries = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return COUNTRIES;
    return COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);
  
  const getCountryName = (code: string) => {
    if (code === WORLDWIDE_VALUE) return 'Worldwide';
    return COUNTRIES.find(c => c.code === code)?.name || code;
  };
  
  const selectedCountryCodes = selectedRegions.filter(r => r !== WORLDWIDE_VALUE);
  
  return (
    <div className={cn('space-y-3', className)}>
      {/* Selected Regions Badges */}
      {selectedRegions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {isWorldwide ? (
            <Badge variant="default" className="gap-1 bg-primary">
              <Globe className="h-3 w-3" />
              Worldwide
              <button 
                type="button"
                onClick={() => handleRemoveRegion(WORLDWIDE_VALUE)}
                className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ) : (
            <>
              {selectedCountryCodes.slice(0, 5).map(code => (
                <Badge key={code} variant="outline" className="gap-1">
                  {getCountryName(code)}
                  <button 
                    type="button"
                    onClick={() => handleRemoveRegion(code)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {selectedCountryCodes.length > 5 && (
                <Badge variant="secondary">
                  +{selectedCountryCodes.length - 5} more
                </Badge>
              )}
            </>
          )}
        </div>
      )}
      
      {/* Worldwide Toggle */}
      <div 
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
          isWorldwide ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
        )}
        onClick={() => handleWorldwideToggle(!isWorldwide)}
      >
        <Checkbox 
          checked={isWorldwide}
          onCheckedChange={handleWorldwideToggle}
          className="pointer-events-none"
        />
        <Globe className={cn('h-5 w-5', isWorldwide ? 'text-primary' : 'text-muted-foreground')} />
        <div className="flex-1">
          <p className="font-medium">Worldwide</p>
          <p className="text-sm text-muted-foreground">Serve customers globally</p>
        </div>
      </div>
      
      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or select specific regions</span>
        </div>
      </div>
      
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search countries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          disabled={isWorldwide}
        />
      </div>
      
      {/* Country List */}
      <ScrollArea style={{ maxHeight }} className={cn('rounded-lg border', isWorldwide && 'opacity-50')}>
        <div className="p-2 space-y-4">
          {REGION_GROUPS.map(group => {
            const groupCountries = filteredCountries.filter(c => group.codes.includes(c.code));
            if (groupCountries.length === 0) return null;
            
            return (
              <div key={group.name}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                  {group.name}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {groupCountries.map(country => {
                    const isSelected = selectedCountryCodes.includes(country.code);
                    return (
                      <div
                        key={country.code}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors',
                          isSelected ? 'bg-primary/10' : 'hover:bg-muted/50',
                          isWorldwide && 'pointer-events-none'
                        )}
                        onClick={() => !isWorldwide && handleCountryToggle(country.code, !isSelected)}
                      >
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={(checked) => handleCountryToggle(country.code, !!checked)}
                          disabled={isWorldwide}
                          className="pointer-events-none"
                        />
                        <span className="text-sm">{country.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

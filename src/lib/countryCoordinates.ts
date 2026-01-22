/**
 * Country coordinates for 3D globe positioning
 * Lat/Lng for country centroids
 */

export interface CountryCoordinates {
  code: string;
  name: string;
  lat: number;
  lng: number;
  region: string;
}

export const COUNTRY_COORDINATES: CountryCoordinates[] = [
  // Middle East & North Africa (Priority Region)
  { code: 'AE', name: 'United Arab Emirates', lat: 23.4241, lng: 53.8478, region: 'Middle East' },
  { code: 'SA', name: 'Saudi Arabia', lat: 23.8859, lng: 45.0792, region: 'Middle East' },
  { code: 'KW', name: 'Kuwait', lat: 29.3759, lng: 47.9774, region: 'Middle East' },
  { code: 'QA', name: 'Qatar', lat: 25.3548, lng: 51.1839, region: 'Middle East' },
  { code: 'BH', name: 'Bahrain', lat: 26.0275, lng: 50.5500, region: 'Middle East' },
  { code: 'OM', name: 'Oman', lat: 21.4735, lng: 55.9754, region: 'Middle East' },
  { code: 'JO', name: 'Jordan', lat: 30.5852, lng: 36.2384, region: 'Middle East' },
  { code: 'LB', name: 'Lebanon', lat: 33.8547, lng: 35.8623, region: 'Middle East' },
  { code: 'EG', name: 'Egypt', lat: 26.8206, lng: 30.8025, region: 'North Africa' },
  { code: 'MA', name: 'Morocco', lat: 31.7917, lng: -7.0926, region: 'North Africa' },
  { code: 'TN', name: 'Tunisia', lat: 33.8869, lng: 9.5375, region: 'North Africa' },
  { code: 'DZ', name: 'Algeria', lat: 28.0339, lng: 1.6596, region: 'North Africa' },
  { code: 'TR', name: 'Turkey', lat: 38.9637, lng: 35.2433, region: 'Middle East' },
  
  // Europe
  { code: 'GB', name: 'United Kingdom', lat: 55.3781, lng: -3.4360, region: 'Europe' },
  { code: 'FR', name: 'France', lat: 46.2276, lng: 2.2137, region: 'Europe' },
  { code: 'DE', name: 'Germany', lat: 51.1657, lng: 10.4515, region: 'Europe' },
  { code: 'IT', name: 'Italy', lat: 41.8719, lng: 12.5674, region: 'Europe' },
  { code: 'ES', name: 'Spain', lat: 40.4637, lng: -3.7492, region: 'Europe' },
  { code: 'NL', name: 'Netherlands', lat: 52.1326, lng: 5.2913, region: 'Europe' },
  { code: 'BE', name: 'Belgium', lat: 50.5039, lng: 4.4699, region: 'Europe' },
  { code: 'CH', name: 'Switzerland', lat: 46.8182, lng: 8.2275, region: 'Europe' },
  { code: 'AT', name: 'Austria', lat: 47.5162, lng: 14.5501, region: 'Europe' },
  { code: 'SE', name: 'Sweden', lat: 60.1282, lng: 18.6435, region: 'Europe' },
  { code: 'NO', name: 'Norway', lat: 60.4720, lng: 8.4689, region: 'Europe' },
  { code: 'DK', name: 'Denmark', lat: 56.2639, lng: 9.5018, region: 'Europe' },
  { code: 'PL', name: 'Poland', lat: 51.9194, lng: 19.1451, region: 'Europe' },
  { code: 'PT', name: 'Portugal', lat: 39.3999, lng: -8.2245, region: 'Europe' },
  { code: 'GR', name: 'Greece', lat: 39.0742, lng: 21.8243, region: 'Europe' },
  { code: 'IE', name: 'Ireland', lat: 53.1424, lng: -7.6921, region: 'Europe' },
  { code: 'RU', name: 'Russia', lat: 61.5240, lng: 105.3188, region: 'Europe' },

  // North America
  { code: 'US', name: 'United States', lat: 37.0902, lng: -95.7129, region: 'North America' },
  { code: 'CA', name: 'Canada', lat: 56.1304, lng: -106.3468, region: 'North America' },
  { code: 'MX', name: 'Mexico', lat: 23.6345, lng: -102.5528, region: 'North America' },

  // South America
  { code: 'BR', name: 'Brazil', lat: -14.2350, lng: -51.9253, region: 'South America' },
  { code: 'AR', name: 'Argentina', lat: -38.4161, lng: -63.6167, region: 'South America' },
  { code: 'CO', name: 'Colombia', lat: 4.5709, lng: -74.2973, region: 'South America' },
  { code: 'CL', name: 'Chile', lat: -35.6751, lng: -71.5430, region: 'South America' },

  // Asia Pacific
  { code: 'IN', name: 'India', lat: 20.5937, lng: 78.9629, region: 'Asia' },
  { code: 'PK', name: 'Pakistan', lat: 30.3753, lng: 69.3451, region: 'Asia' },
  { code: 'CN', name: 'China', lat: 35.8617, lng: 104.1954, region: 'Asia' },
  { code: 'JP', name: 'Japan', lat: 36.2048, lng: 138.2529, region: 'Asia' },
  { code: 'KR', name: 'South Korea', lat: 35.9078, lng: 127.7669, region: 'Asia' },
  { code: 'TH', name: 'Thailand', lat: 15.8700, lng: 100.9925, region: 'Asia' },
  { code: 'VN', name: 'Vietnam', lat: 14.0583, lng: 108.2772, region: 'Asia' },
  { code: 'MY', name: 'Malaysia', lat: 4.2105, lng: 101.9758, region: 'Asia' },
  { code: 'SG', name: 'Singapore', lat: 1.3521, lng: 103.8198, region: 'Asia' },
  { code: 'ID', name: 'Indonesia', lat: -0.7893, lng: 113.9213, region: 'Asia' },
  { code: 'PH', name: 'Philippines', lat: 12.8797, lng: 121.7740, region: 'Asia' },
  { code: 'AU', name: 'Australia', lat: -25.2744, lng: 133.7751, region: 'Oceania' },
  { code: 'NZ', name: 'New Zealand', lat: -40.9006, lng: 174.8860, region: 'Oceania' },
  { code: 'HK', name: 'Hong Kong', lat: 22.3193, lng: 114.1694, region: 'Asia' },

  // Africa
  { code: 'ZA', name: 'South Africa', lat: -30.5595, lng: 22.9375, region: 'Africa' },
  { code: 'NG', name: 'Nigeria', lat: 9.0820, lng: 8.6753, region: 'Africa' },
  { code: 'KE', name: 'Kenya', lat: -0.0236, lng: 37.9062, region: 'Africa' },
  { code: 'GH', name: 'Ghana', lat: 7.9465, lng: -1.0232, region: 'Africa' },
  { code: 'ET', name: 'Ethiopia', lat: 9.1450, lng: 40.4897, region: 'Africa' },
];

/**
 * Get coordinates for a country code
 */
export function getCountryCoordinates(code: string): CountryCoordinates | undefined {
  return COUNTRY_COORDINATES.find(c => c.code === code.toUpperCase());
}

/**
 * Get all countries in a region
 */
export function getCountriesByRegion(region: string): CountryCoordinates[] {
  return COUNTRY_COORDINATES.filter(c => c.region === region);
}

/**
 * Convert lat/lng to 3D sphere coordinates
 */
export function latLngToVector3(lat: number, lng: number, radius: number = 1): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  
  return [x, y, z];
}

/**
 * Get featured countries (top 10 priority for launch)
 */
export const FEATURED_COUNTRIES = ['AE', 'SA', 'KW', 'QA', 'GB', 'FR', 'US', 'TR', 'EG', 'IN'];

/**
 * Check if a country is in our featured list
 */
export function isFeaturedCountry(code: string): boolean {
  return FEATURED_COUNTRIES.includes(code.toUpperCase());
}

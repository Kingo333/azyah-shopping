/**
 * Centralized tag taxonomy for Azyah Style
 * Used for product tags, brand survey suggestions, and user preference learning
 */

export const STYLE_TAGS = {
  fabric: [
    'Cotton',
    'Linen', 
    'Satin',
    'Silk',
    'Denim',
    'Knit',
    'Chiffon',
    'Leather',
    'Suede',
    'Mesh',
    'Breathable',
    'Stretch',
    'Polyester',
    'Wool',
    'Cashmere'
  ],
  fit: [
    'Relaxed fit',
    'Tailored fit',
    'Oversized',
    'Slim',
    'Flowy',
    'Structured',
    'Regular fit'
  ],
  coverage: [
    'Modest',
    'High coverage',
    'Medium coverage',
    'Low coverage',
    'Full length',
    'Knee length'
  ],
  style: [
    'Minimal',
    'Classic',
    'Street',
    'Occasion',
    'Workwear',
    'Resort',
    'Glam',
    'Casual',
    'Trendy',
    'Bohemian',
    'Sporty'
  ],
  pattern: [
    'Solid',
    'Floral',
    'Stripes',
    'Prints',
    'Geometric',
    'Abstract'
  ]
} as const;

export type FabricTag = typeof STYLE_TAGS.fabric[number];
export type FitTag = typeof STYLE_TAGS.fit[number];
export type CoverageTag = typeof STYLE_TAGS.coverage[number];
export type StyleTag = typeof STYLE_TAGS.style[number];
export type PatternTag = typeof STYLE_TAGS.pattern[number];

export const ALL_TAGS = [
  ...STYLE_TAGS.fabric,
  ...STYLE_TAGS.fit,
  ...STYLE_TAGS.coverage,
  ...STYLE_TAGS.style,
  ...STYLE_TAGS.pattern
];

/**
 * Get suggested tags from brand survey answers stored in localStorage
 */
export function getSuggestedTagsFromBrandSurvey(): string[] {
  try {
    const surveyData = localStorage.getItem('brand_product_survey');
    if (!surveyData) return [];
    
    const parsed = JSON.parse(surveyData);
    const tags: string[] = [];
    
    if (parsed.fabrics) tags.push(...parsed.fabrics);
    if (parsed.fit) tags.push(parsed.fit);
    if (parsed.coverage) tags.push(parsed.coverage);
    
    return tags;
  } catch {
    return [];
  }
}

/**
 * Calibration options for user preferences
 */
export const CALIBRATION_OPTIONS = {
  coverage: [
    { value: 'modest', label: 'Modest', description: 'Full coverage, longer lengths' },
    { value: 'flexible', label: 'Flexible', description: 'Mix of coverage levels' },
    { value: 'minimal', label: 'Minimal', description: 'Relaxed about coverage' }
  ],
  fit: [
    { value: 'relaxed', label: 'Relaxed', description: 'Loose, comfortable fits' },
    { value: 'tailored', label: 'Tailored', description: 'Fitted, structured pieces' },
    { value: 'mixed', label: 'Mixed', description: 'Depends on the item' }
  ],
  fabric: [
    { value: 'breathable', label: 'Breathable', description: 'Cotton, linen, natural fibers' },
    { value: 'structured', label: 'Structured', description: 'Holds shape well' },
    { value: 'stretch', label: 'Stretch', description: 'Flexible, moves with you' },
    { value: 'no_preference', label: 'No preference', description: 'Open to all fabrics' }
  ],
  style: [
    { value: 'minimal', label: 'Minimal', description: 'Clean, simple lines' },
    { value: 'classic', label: 'Classic', description: 'Timeless, elegant pieces' },
    { value: 'trendy', label: 'Trendy', description: 'Current fashion forward' },
    { value: 'street', label: 'Street', description: 'Urban, casual vibes' },
    { value: 'occasion', label: 'Occasionwear', description: 'Special events, formal' }
  ]
} as const;

import React from 'react';
import { Sparkles, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface XimilarTagsDisplayProps {
  primary_category?: string | null;
  subcategory?: string | null;
  colors?: string[];
  patterns?: string[];
  is_pattern_mode?: boolean;
  className?: string;
}

// Map color names to actual CSS colors for dot indicators
const COLOR_MAP: Record<string, string> = {
  black: '#1a1a1a',
  white: '#ffffff',
  grey: '#808080',
  gray: '#808080',
  beige: '#d4b896',
  cream: '#fffdd0',
  ivory: '#fffff0',
  navy: '#001f3f',
  blue: '#3498db',
  green: '#27ae60',
  olive: '#6b8e23',
  khaki: '#c3b091',
  brown: '#8b4513',
  camel: '#c19a6b',
  pink: '#ff69b4',
  red: '#e74c3c',
  burgundy: '#800020',
  maroon: '#800000',
  purple: '#9b59b6',
  gold: '#ffd700',
  silver: '#c0c0c0',
  orange: '#f39c12',
  yellow: '#f1c40f',
  coral: '#ff7f50',
  nude: '#e3bc9a',
  blush: '#de5d83',
  teal: '#008080',
  emerald: '#50c878',
  charcoal: '#36454f',
  sand: '#c2b280',
  taupe: '#483c32',
  sage: '#9dc183',
  rust: '#b7410e',
  mustard: '#ffdb58',
  multicolor: 'linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1, #96c93d)',
  'multi-color': 'linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1, #96c93d)',
  multi: 'linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1, #96c93d)',
};

function getColorStyle(colorName: string): React.CSSProperties {
  const normalized = colorName.toLowerCase().trim();
  const color = COLOR_MAP[normalized];
  
  if (!color) {
    return { backgroundColor: '#888' };
  }
  
  if (color.includes('gradient')) {
    return { background: color };
  }
  
  return { backgroundColor: color };
}

export function XimilarTagsDisplay({
  primary_category,
  subcategory,
  colors = [],
  patterns = [],
  is_pattern_mode = false,
  className,
}: XimilarTagsDisplayProps) {
  // Don't render if no meaningful data
  if (!primary_category && !subcategory && colors.length === 0 && patterns.length === 0) {
    return null;
  }

  const categoryLabel = subcategory || primary_category;

  return (
    <div
      className={cn(
        "rounded-xl p-3",
        "bg-white/40 dark:bg-white/5",
        "backdrop-blur-sm",
        "border border-white/20",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground/80">
          Detected: {categoryLabel ? capitalizeFirst(categoryLabel) : 'Item'}
        </span>
        
        {is_pattern_mode && (
          <span className="
            inline-flex items-center gap-1 
            px-1.5 py-0.5 rounded-full 
            bg-primary/10 text-primary
            text-[10px] font-medium
          ">
            <Sparkles className="h-2.5 w-2.5" />
            Pattern Mode
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {/* Color pills */}
        {colors.map((color, index) => (
          <span
            key={`color-${index}`}
            className="
              inline-flex items-center gap-1.5
              px-2 py-0.5 rounded-full
              bg-white/60 dark:bg-white/10
              text-[11px] font-medium text-foreground/80
              border border-white/30
            "
          >
            <span
              className="w-2.5 h-2.5 rounded-full border border-black/10 flex-shrink-0"
              style={getColorStyle(color)}
            />
            {capitalizeFirst(color)}
          </span>
        ))}

        {/* Pattern pills */}
        {patterns.map((pattern, index) => (
          <span
            key={`pattern-${index}`}
            className="
              inline-flex items-center
              px-2 py-0.5 rounded-full
              bg-primary/10 text-primary
              text-[11px] font-medium
            "
          >
            {capitalizeFirst(pattern)}
          </span>
        ))}
      </div>
    </div>
  );
}

function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default XimilarTagsDisplay;

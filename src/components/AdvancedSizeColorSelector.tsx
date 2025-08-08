
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, Ruler } from 'lucide-react';

interface Size {
  value: string;
  label: string;
  inStock: boolean;
  stockCount?: number;
}

interface Color {
  value: string;
  label: string;
  hexCode: string;
  inStock: boolean;
}

interface SizeChart {
  [key: string]: string;
}

interface AdvancedSizeColorSelectorProps {
  sizes: Size[];
  colors: Color[];
  selectedSize: string;
  selectedColor: string;
  onSizeSelect: (size: string) => void;
  onColorSelect: (color: string) => void;
  sizeChart?: SizeChart;
  sizeChartImage?: string | null;
  className?: string;
}

export const AdvancedSizeColorSelector: React.FC<AdvancedSizeColorSelectorProps> = ({
  sizes,
  colors,
  selectedSize,
  selectedColor,
  onSizeSelect,
  onColorSelect,
  sizeChart,
  sizeChartImage,
  className = ''
}) => {
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Size Selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-sm">Size</h3>
          <div className="flex items-center gap-2">
            {/* Size Chart Preview */}
            {sizeChartImage && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-1">
                    <img 
                      src={sizeChartImage} 
                      alt="Size chart preview" 
                      className="w-6 h-6 object-contain rounded border"
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Size Chart</h4>
                    <img 
                      src={sizeChartImage} 
                      alt="Size chart" 
                      className="w-full h-auto max-h-64 object-contain rounded border"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            )}
            
            {/* Size Guide Button */}
            {sizeChart && (
              <Popover open={showSizeGuide} onOpenChange={setShowSizeGuide}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                    <Ruler className="h-3 w-3 mr-1" />
                    Size Guide
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Size Guide
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {Object.entries(sizeChart).map(([size, measurement]) => (
                        <div key={size} className="flex justify-between text-sm">
                          <span className="font-medium">{size}:</span>
                          <span className="text-muted-foreground">{measurement}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => (
            <Button
              key={size.value}
              variant={selectedSize === size.value ? 'default' : 'outline'}
              size="sm"
              className={`text-xs min-w-12 ${
                !size.inStock 
                  ? 'opacity-50 cursor-not-allowed' 
                  : selectedSize === size.value 
                    ? 'bg-foreground text-background' 
                    : 'hover:bg-muted'
              }`}
              onClick={() => size.inStock && onSizeSelect(size.value)}
              disabled={!size.inStock}
            >
              {size.label}
              {size.inStock && size.stockCount && size.stockCount <= 3 && (
                <Badge variant="secondary" className="ml-1 text-xs px-1 py-0">
                  {size.stockCount}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Color Selection */}
      <div>
        <h3 className="font-medium text-sm mb-3">Color</h3>
        <div className="flex flex-wrap gap-3">
          {colors.map((color) => (
            <div key={color.value} className="flex flex-col items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={`w-8 h-8 rounded-full p-0 border-2 relative ${
                  selectedColor === color.value 
                    ? 'border-foreground ring-2 ring-offset-2 ring-foreground' 
                    : 'border-muted-foreground'
                } ${!color.inStock ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                style={{ backgroundColor: color.hexCode }}
                onClick={() => color.inStock && onColorSelect(color.value)}
                disabled={!color.inStock}
              >
                {!color.inStock && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-0.5 bg-red-500 rotate-45" />
                  </div>
                )}
              </Button>
              <span className="text-xs text-muted-foreground capitalize">
                {color.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Options Summary */}
      {(selectedSize || selectedColor) && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {selectedSize && (
            <Badge variant="outline" className="text-xs">
              Size: {sizes.find(s => s.value === selectedSize)?.label}
            </Badge>
          )}
          {selectedColor && (
            <Badge variant="outline" className="text-xs">
              Color: {colors.find(c => c.value === selectedColor)?.label}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

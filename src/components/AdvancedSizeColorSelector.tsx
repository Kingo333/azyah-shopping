
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Ruler, Info } from 'lucide-react';

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

interface AdvancedSizeColorSelectorProps {
  sizes: Size[];
  colors: Color[];
  selectedSize: string;
  selectedColor: string;
  onSizeSelect: (size: string) => void;
  onColorSelect: (color: string) => void;
  sizeChart?: Record<string, string>;
  sizeChartImage?: string | null;
}

export const AdvancedSizeColorSelector: React.FC<AdvancedSizeColorSelectorProps> = ({
  sizes,
  colors,
  selectedSize,
  selectedColor,
  onSizeSelect,
  onColorSelect,
  sizeChart,
  sizeChartImage
}) => {
  const [showSizeChart, setShowSizeChart] = useState(false);

  return (
    <div className="space-y-6">
      {/* Size Selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-base">Size</h3>
          <div className="flex items-center gap-2">
            {sizeChartImage && (
              <div className="w-8 h-8 rounded border overflow-hidden">
                <img 
                  src={sizeChartImage} 
                  alt="Size chart preview" 
                  className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setShowSizeChart(true)}
                />
              </div>
            )}
            {(sizeChart || sizeChartImage) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSizeChart(true)}
                className="text-xs p-1 h-auto"
              >
                <Ruler className="h-3 w-3 mr-1" />
                Size Guide
              </Button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-5 gap-2">
          {sizes.map((size) => (
            <Button
              key={size.value}
              variant={selectedSize === size.value ? "default" : "outline"}
              size="sm"
              onClick={() => size.inStock && onSizeSelect(size.value)}
              disabled={!size.inStock}
              className={`relative ${
                !size.inStock ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {size.label}
              {!size.inStock && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-px bg-gray-400 rotate-45" />
                </div>
              )}
            </Button>
          ))}
        </div>
        
        {selectedSize && (
          <div className="mt-2 text-sm text-muted-foreground">
            Selected: {sizes.find(s => s.value === selectedSize)?.label}
            {sizes.find(s => s.value === selectedSize)?.stockCount && (
              <span className="ml-2">
                ({sizes.find(s => s.value === selectedSize)?.stockCount} in stock)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Color Selection */}
      <div>
        <h3 className="font-medium mb-3 text-base">Color</h3>
        
        <div className="flex flex-wrap gap-3">
          {colors.map((color) => (
            <button
              key={color.value}
              onClick={() => color.inStock && onColorSelect(color.value)}
              disabled={!color.inStock}
              className={`relative w-10 h-10 rounded-full border-2 transition-all ${
                selectedColor === color.value 
                  ? 'border-primary scale-110 shadow-md' 
                  : 'border-gray-300 hover:border-gray-400'
              } ${
                !color.inStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
              style={{ backgroundColor: color.hexCode }}
              title={color.label}
            >
              {!color.inStock && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-px bg-gray-600 rotate-45" />
                </div>
              )}
            </button>
          ))}
        </div>
        
        {selectedColor && (
          <div className="mt-2 text-sm text-muted-foreground">
            Selected: {colors.find(c => c.value === selectedColor)?.label}
          </div>
        )}
      </div>

      {/* Size Chart Modal */}
      <Dialog open={showSizeChart} onOpenChange={setShowSizeChart}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5" />
              Size Guide
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {sizeChartImage && (
              <div className="w-full">
                <img
                  src={sizeChartImage}
                  alt="Size chart"
                  className="w-full h-auto rounded-lg border"
                />
              </div>
            )}
            
            {sizeChart && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Size</th>
                      <th className="text-left p-2 font-medium">Measurements</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(sizeChart).map(([size, measurement]) => (
                      <tr key={size} className="border-b">
                        <td className="p-2 font-medium">{size}</td>
                        <td className="p-2 text-muted-foreground">{measurement}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800 mb-1">Sizing Tips:</p>
                  <ul className="text-blue-700 space-y-1">
                    <li>• Measure yourself while wearing the type of undergarments you plan to wear with the item</li>
                    <li>• If you're between sizes, we recommend sizing up for a more comfortable fit</li>
                    <li>• Check the fabric composition for stretch and fit guidance</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

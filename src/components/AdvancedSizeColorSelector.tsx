import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Ruler, Palette, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface SizeOption {
  value: string;
  label: string;
  inStock: boolean;
  stockCount?: number;
}

interface ColorOption {
  value: string;
  label: string;
  hexCode: string;
  inStock: boolean;
}

interface AdvancedSizeColorSelectorProps {
  sizes: SizeOption[];
  colors: ColorOption[];
  selectedSize: string;
  selectedColor: string;
  onSizeSelect: (size: string) => void;
  onColorSelect: (color: string) => void;
  sizeChart?: Record<string, string>;
}

export const AdvancedSizeColorSelector: React.FC<AdvancedSizeColorSelectorProps> = ({
  sizes,
  colors,
  selectedSize,
  selectedColor,
  onSizeSelect,
  onColorSelect,
  sizeChart
}) => {
  const [stockWarning, setStockWarning] = useState<string | null>(null);

  useEffect(() => {
    const selectedSizeData = sizes.find(s => s.value === selectedSize);
    const selectedColorData = colors.find(c => c.value === selectedColor);
    
    if (selectedSizeData && selectedColorData) {
      if (!selectedSizeData.inStock || !selectedColorData.inStock) {
        setStockWarning('Selected combination is out of stock');
      } else if (selectedSizeData.stockCount && selectedSizeData.stockCount < 3) {
        setStockWarning(`Only ${selectedSizeData.stockCount} left in stock`);
      } else {
        setStockWarning(null);
      }
    }
  }, [selectedSize, selectedColor, sizes, colors]);

  return (
    <div className="space-y-6">
      {/* Size Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            Size
          </label>
          {sizeChart && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-primary">
                  Size Chart
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Size Chart</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {Object.entries(sizeChart).map(([size, measurement]) => (
                    <div key={size} className="flex justify-between p-2 border rounded">
                      <span className="font-medium">{size}</span>
                      <span>{measurement}</span>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          {sizes.map((size) => (
            <motion.div
              key={size.value}
              whileHover={{ scale: size.inStock ? 1.05 : 1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant={selectedSize === size.value ? "default" : "outline"}
                className={`w-full relative ${
                  !size.inStock 
                    ? 'opacity-50 cursor-not-allowed line-through' 
                    : selectedSize === size.value 
                    ? 'ring-2 ring-primary ring-offset-1' 
                    : 'hover:border-primary'
                }`}
                onClick={() => size.inStock && onSizeSelect(size.value)}
                disabled={!size.inStock}
              >
                {size.label}
                {size.inStock && size.stockCount && size.stockCount < 5 && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
                )}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Color Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Color
        </label>
        
        <div className="flex flex-wrap gap-3">
          {colors.map((color) => (
            <motion.button
              key={color.value}
              onClick={() => color.inStock && onColorSelect(color.value)}
              className={`relative group ${!color.inStock ? 'cursor-not-allowed' : ''}`}
              whileHover={{ scale: color.inStock ? 1.1 : 1 }}
              whileTap={{ scale: 0.9 }}
              disabled={!color.inStock}
            >
              <div
                className={`w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                  selectedColor === color.value
                    ? 'border-primary ring-2 ring-primary ring-offset-2'
                    : color.inStock
                    ? 'border-border hover:border-primary'
                    : 'border-border opacity-50'
                }`}
                style={{ backgroundColor: color.hexCode }}
              >
                {!color.inStock && (
                  <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
                    <div className="w-6 h-0.5 bg-red-500 rotate-45" />
                  </div>
                )}
                {selectedColor === color.value && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-white drop-shadow-lg" />
                  </div>
                )}
              </div>
              
              {/* Color Label Tooltip */}
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                <div className="bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  {color.label}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Stock Warning */}
      {stockWarning && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg"
        >
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <span className="text-sm text-orange-800">{stockWarning}</span>
        </motion.div>
      )}

      {/* Selected Combination Summary */}
      {selectedSize && selectedColor && (
        <div className="flex items-center gap-2 p-3 bg-accent/30 rounded-lg">
          <span className="text-sm font-medium">Selected:</span>
          <Badge variant="secondary">Size {selectedSize}</Badge>
          <Badge 
            variant="secondary" 
            className="flex items-center gap-1"
          >
            <div 
              className="w-3 h-3 rounded-full border" 
              style={{ backgroundColor: colors.find(c => c.value === selectedColor)?.hexCode }}
            />
            {colors.find(c => c.value === selectedColor)?.label}
          </Badge>
        </div>
      )}
    </div>
  );
};
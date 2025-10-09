import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BackgroundPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (background: { type: 'solid' | 'gradient' | 'pattern' | 'image'; value: string }) => void;
  currentBackground: { type: 'solid' | 'gradient' | 'pattern' | 'image'; value: string };
}

const SOLID_COLORS = [
  '#FFFFFF', '#F5F5F5', '#E0E0E0', '#BDBDBD',
  '#FFE5E5', '#E5F5FF', '#E5FFE5', '#FFF5E5',
  '#FFE5F5', '#F5E5FF', '#E5FFFF', '#FFFFE5',
];

const GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
];

export const BackgroundPicker: React.FC<BackgroundPickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentBackground,
}) => {
  const [customColor, setCustomColor] = useState('#FFFFFF');

  const handleSelectSolid = (color: string) => {
    onSelect({ type: 'solid', value: color });
    onClose();
  };

  const handleSelectGradient = (gradient: string) => {
    onSelect({ type: 'gradient', value: gradient });
    onClose();
  };

  const handleSelectCustom = () => {
    onSelect({ type: 'solid', value: customColor });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Background</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="solid" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="solid">Solid</TabsTrigger>
            <TabsTrigger value="gradient">Gradient</TabsTrigger>
          </TabsList>

          <TabsContent value="solid" className="space-y-4">
            {/* Preset Colors */}
            <div className="grid grid-cols-6 gap-2">
              {SOLID_COLORS.map((color) => (
                <button
                  key={color}
                  className="w-12 h-12 rounded-lg border-2 hover:border-primary transition-colors"
                  style={{ backgroundColor: color }}
                  onClick={() => handleSelectSolid(color)}
                />
              ))}
            </div>

            {/* Custom Color */}
            <div className="space-y-2">
              <Label>Custom Color</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  placeholder="#FFFFFF"
                  className="flex-1"
                />
                <Input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-16"
                />
                <Button onClick={handleSelectCustom}>Apply</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="gradient" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {GRADIENTS.map((gradient, idx) => (
                <button
                  key={idx}
                  className="h-24 rounded-lg border-2 hover:border-primary transition-all hover:shadow-lg"
                  style={{ backgroundImage: gradient }}
                  onClick={() => handleSelectGradient(gradient)}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

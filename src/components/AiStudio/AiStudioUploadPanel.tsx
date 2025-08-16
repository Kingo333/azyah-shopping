import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Upload } from 'lucide-react';

interface AiStudioUploadPanelProps {
  personFile: File | null;
  outfitFile: File | null;
  personImageId: string | null;
  outfitImageId: string | null;
  onPersonUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOutfitUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AiStudioUploadPanel: React.FC<AiStudioUploadPanelProps> = ({
  personFile,
  outfitFile,
  personImageId,
  outfitImageId,
  onPersonUpload,
  onOutfitUpload
}) => {
  return (
    <div className="space-y-2 lg:space-y-3">
      {/* Person Upload */}
      <GlassPanel variant="custom" className="p-2 lg:p-3 shadow-lg shadow-black/20 border border-white/30 md:shadow-none md:border-white/20">
        <div className="space-y-1.5 lg:space-y-2">
          <div className="flex items-center gap-2">
            <Upload className="h-3 w-3" />
            <Label className="text-sm font-medium">Person Image</Label>
          </div>
          <Input 
            type="file" 
            accept="image/*" 
            onChange={onPersonUpload}
            className="w-full h-8 text-xs"
          />
          {personFile && (
            <div className="relative">
              <img 
                src={URL.createObjectURL(personFile)} 
                alt="Person preview" 
                className="w-full h-12 sm:h-16 lg:h-20 object-cover rounded-md"
              />
              {personImageId && (
                <Badge className="absolute top-1 right-1 text-xs h-5">
                  ✓
                </Badge>
              )}
            </div>
          )}
        </div>
      </GlassPanel>

      {/* Outfit Upload */}
      <GlassPanel variant="custom" className="p-2 lg:p-3 shadow-lg shadow-black/20 border border-white/30 md:shadow-none md:border-white/20">
        <div className="space-y-1.5 lg:space-y-2">
          <div className="flex items-center gap-2">
            <Upload className="h-3 w-3" />
            <Label className="text-sm font-medium">Outfit Image</Label>
          </div>
          <Input 
            type="file" 
            accept="image/*" 
            onChange={onOutfitUpload}
            className="w-full h-8 text-xs"
          />
          {outfitFile && (
            <div className="relative">
              <img 
                src={URL.createObjectURL(outfitFile)} 
                alt="Outfit preview" 
                className="w-full h-12 sm:h-16 lg:h-20 object-cover rounded-md"
              />
              {outfitImageId && (
                <Badge className="absolute top-1 right-1 text-xs h-5">
                  ✓
                </Badge>
              )}
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
  );
};
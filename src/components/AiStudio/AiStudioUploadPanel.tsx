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
    <div className="space-y-4">
      {/* Person Upload */}
      <GlassPanel variant="custom" className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <Label className="font-medium">Person Image</Label>
          </div>
          <Input 
            type="file" 
            accept="image/*" 
            onChange={onPersonUpload}
            className="w-full"
          />
          {personFile && (
            <div className="relative">
              <img 
                src={URL.createObjectURL(personFile)} 
                alt="Person preview" 
                className="w-full h-32 object-cover rounded-lg"
              />
              {personImageId && (
                <Badge className="absolute top-2 right-2 text-xs">
                  Uploaded
                </Badge>
              )}
            </div>
          )}
        </div>
      </GlassPanel>

      {/* Outfit Upload */}
      <GlassPanel variant="custom" className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <Label className="font-medium">Outfit Image</Label>
          </div>
          <Input 
            type="file" 
            accept="image/*" 
            onChange={onOutfitUpload}
            className="w-full"
          />
          {outfitFile && (
            <div className="relative">
              <img 
                src={URL.createObjectURL(outfitFile)} 
                alt="Outfit preview" 
                className="w-full h-32 object-cover rounded-lg"
              />
              {outfitImageId && (
                <Badge className="absolute top-2 right-2 text-xs">
                  Uploaded
                </Badge>
              )}
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
  );
};
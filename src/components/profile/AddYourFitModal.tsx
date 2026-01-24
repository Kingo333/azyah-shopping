import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, Ruler } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AddYourFitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const TOP_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const BOTTOM_SIZES = ['24', '26', '28', '30', '32', '34', '36', '38', '40', '42'];
const DRESS_SIZES = ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20'];

export const AddYourFitModal: React.FC<AddYourFitModalProps> = ({
  open,
  onOpenChange,
  onComplete,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Form state
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [topSize, setTopSize] = useState('');
  const [bottomSize, setBottomSize] = useState('');
  const [dressSize, setDressSize] = useState('');
  const [bust, setBust] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');

  const handleSave = async () => {
    if (!user) return;
    
    if (!height) {
      toast({
        description: 'Please enter your height to continue',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Get current user preferences
      const { data: userData } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', user.id)
        .single();

      const currentPrefs = (userData?.preferences as Record<string, unknown>) || {};
      
      // Build measurements object
      const measurements = {
        height: parseFloat(height),
        weight: weight ? parseFloat(weight) : undefined,
        top_size: topSize || undefined,
        bottom_size: bottomSize || undefined,
        dress_size: dressSize || undefined,
        bust: bust ? parseFloat(bust) : undefined,
        waist: waist ? parseFloat(waist) : undefined,
        hips: hips ? parseFloat(hips) : undefined,
        updated_at: new Date().toISOString(),
      };

      // Update user preferences with measurements
      const { error } = await supabase
        .from('users')
        .update({
          preferences: {
            ...currentPrefs,
            measurements,
          },
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({ description: 'Your fit info saved!' });
      onComplete();
    } catch (error) {
      console.error('Error saving fit info:', error);
      toast({
        description: 'Failed to save. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md z-[70]" overlayClassName="z-[70]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Add Your Fit
          </DialogTitle>
          <DialogDescription>
            Help us find looks from people with similar measurements. This is optional and private.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Height - Required */}
          <div className="space-y-2">
            <Label htmlFor="height">
              Height (cm) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="height"
              type="number"
              placeholder="e.g., 165"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </div>

          {/* Weight - Optional */}
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (kg) - optional</Label>
            <Input
              id="weight"
              type="number"
              placeholder="e.g., 60"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>

          {/* Size Preferences */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Top Size</Label>
              <Select value={topSize} onValueChange={setTopSize}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {TOP_SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Bottom</Label>
              <Select value={bottomSize} onValueChange={setBottomSize}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {BOTTOM_SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Dress</Label>
              <Select value={dressSize} onValueChange={setDressSize}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {DRESS_SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Measurements */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                More measurements
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="bust">Bust (cm)</Label>
                  <Input
                    id="bust"
                    type="number"
                    placeholder="—"
                    value={bust}
                    onChange={(e) => setBust(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waist">Waist (cm)</Label>
                  <Input
                    id="waist"
                    type="number"
                    placeholder="—"
                    value={waist}
                    onChange={(e) => setWaist(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hips">Hips (cm)</Label>
                  <Input
                    id="hips"
                    type="number"
                    placeholder="—"
                    value={hips}
                    onChange={(e) => setHips(e.target.value)}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Skip for now
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save & Continue'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddYourFitModal;

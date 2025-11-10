import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateBrand } from '@/hooks/useUGCBrand';

interface CreateBrandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateBrandModal = ({ open, onOpenChange }: CreateBrandModalProps) => {
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [category, setCategory] = useState<string>('');
  const [country, setCountry] = useState('');

  const createBrand = useCreateBrand();

  const handleSubmit = async () => {
    if (!name) return;

    await createBrand.mutateAsync({
      name,
      website_url: website || undefined,
      instagram_handle: instagram || undefined,
      category: category || undefined,
      country: country || undefined,
    });

    // Reset form
    setName('');
    setWebsite('');
    setInstagram('');
    setCategory('');
    setCountry('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Brand or Agency</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Brand Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter brand name"
            />
          </div>

          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div>
            <Label htmlFor="instagram">Instagram Handle</Label>
            <Input
              id="instagram"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@brandname"
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fashion">Fashion</SelectItem>
                <SelectItem value="beauty">Beauty</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="United Arab Emirates"
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={!name || createBrand.isPending}
            className="w-full"
          >
            {createBrand.isPending ? 'Adding...' : 'Add Brand'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

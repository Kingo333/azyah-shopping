import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { useCreateBrand } from '@/hooks/useUGCBrand';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Check, ChevronsUpDown } from 'lucide-react';
import { COUNTRIES } from '@/lib/countries';
import { cn } from '@/lib/utils';

interface CreateBrandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateBrandModal = ({ open, onOpenChange }: CreateBrandModalProps) => {
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [country, setCountry] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);

  const createBrand = useCreateBrand();

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async () => {
    if (!logoFile) return null;

    setUploading(true);
    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `ugc-brand-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('ugc-brand-logos')
        .upload(filePath, logoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('ugc-brand-logos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Logo upload error:', error);
      toast.error('Failed to upload logo');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name) return;

    let logoUrl;
    if (logoFile) {
      logoUrl = await uploadLogo();
      if (!logoUrl) return;
    }

    await createBrand.mutateAsync({
      name,
      logo_url: logoUrl,
      website_url: website || undefined,
      instagram_handle: instagram || undefined,
      country: country || undefined,
    });

    // Reset form
    setName('');
    setWebsite('');
    setInstagram('');
    setCountry('');
    setLogoFile(null);
    setLogoPreview('');
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
            <Label htmlFor="logo">Brand Logo</Label>
            <div className="mt-2">
              {logoPreview ? (
                <div className="relative w-24 h-24 border-2 border-border rounded-lg overflow-hidden">
                  <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-1 right-1 h-6 w-6 p-0"
                    onClick={() => {
                      setLogoFile(null);
                      setLogoPreview('');
                    }}
                  >
                    ×
                  </Button>
                </div>
              ) : (
                <label
                  htmlFor="logo"
                  className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors"
                >
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1">Upload</span>
                  <input
                    id="logo"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </label>
              )}
            </div>
          </div>

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
            <Label>Country</Label>
            <Popover open={countryOpen} onOpenChange={setCountryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={countryOpen}
                  className="w-full justify-between"
                >
                  {country || "Select country..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search country..." />
                  <CommandList>
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandGroup>
                      {COUNTRIES.map((countryOption) => (
                        <CommandItem
                          key={countryOption.code}
                          value={countryOption.name}
                          onSelect={(currentValue) => {
                            setCountry(currentValue === country ? "" : currentValue);
                            setCountryOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              country === countryOption.name ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {countryOption.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={!name || createBrand.isPending || uploading}
            className="w-full"
          >
            {uploading ? 'Uploading logo...' : createBrand.isPending ? 'Adding...' : 'Add Brand'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
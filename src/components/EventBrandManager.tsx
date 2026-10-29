import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ChevronRight, Loader2, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/partner/ConfirmDialog';
import { BrandProductManager } from './BrandProductManager';
import { EVENT_MAX_BRANDS, EVENT_MAX_ITEMS_PER_BRAND, eventCounts } from '@/lib/partnerPortal';

interface EventBrand {
  id: string;
  brand_name: string;
  logo_url?: string | null;
  created_at: string;
  event_brand_products?: { id: string; try_on_ready: boolean | null }[] | null;
}

interface EventBrandManagerProps {
  eventId: string;
  eventName: string;
  /** Open this brand's items (from the address); null shows the brand list. */
  brandId: string | null;
  onSelectBrand: (brandId: string | null) => void;
  onCountsChange?: (counts: { brands: number; items: number; ready: number }) => void;
  onChanged?: () => void;
}

const EMPTY_FORM = { brand_name: '', logo_file: null as File | null, logo_preview: '' };

export const EventBrandManager = ({ eventId, eventName, brandId, onSelectBrand, onCountsChange, onChanged }: EventBrandManagerProps) => {
  const { toast } = useToast();
  const [brands, setBrands] = useState<EventBrand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<EventBrand | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const fetchBrands = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('event_brands')
        .select('*, event_brand_products(id, try_on_ready)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const list = (data as EventBrand[]) || [];
      setBrands(list);
      onCountsChange?.(eventCounts(list));
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast({ title: "Couldn't load brands", description: 'Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
    // onCountsChange is a state setter from the parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, toast]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const changed = () => {
    fetchBrands();
    onChanged?.();
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    onDrop: (files) => {
      const file = files[0];
      if (file) setFormData((prev) => ({ ...prev, logo_file: file, logo_preview: URL.createObjectURL(file) }));
    },
    onDropRejected: () => toast({ title: 'Use a JPG, PNG or WebP logo under 5 MB', variant: 'destructive' }),
  });

  const uploadLogo = async (file: File): Promise<string> => {
    const path = `${eventId}/brands/${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('event-assets').upload(path, file);
    if (error) throw error;
    return supabase.storage.from('event-assets').getPublicUrl(path).data.publicUrl;
  };

  const openDialog = (brand: EventBrand | null) => {
    setEditingBrand(brand);
    setFormData(brand ? { brand_name: brand.brand_name, logo_file: null, logo_preview: brand.logo_url || '' } : EMPTY_FORM);
    setDialogOpen(true);
  };

  const saveBrand = async () => {
    const name = formData.brand_name.trim();
    if (!name) return;
    setIsSubmitting(true);
    try {
      const logoUrl = formData.logo_file ? await uploadLogo(formData.logo_file) : editingBrand?.logo_url || null;
      const { error } = editingBrand
        ? await supabase
            .from('event_brands')
            .update({ brand_name: name, logo_url: logoUrl, updated_at: new Date().toISOString() })
            .eq('id', editingBrand.id)
        : await supabase.from('event_brands').insert({ event_id: eventId, brand_name: name, logo_url: logoUrl });
      if (error) throw error;
      toast({ title: editingBrand ? 'Brand saved' : 'Brand added', description: editingBrand ? undefined : 'Now add a photo of each item.' });
      setDialogOpen(false);
      changed();
    } catch (error) {
      toast({ title: "Couldn't save the brand", description: (error as { message?: string })?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeBrand = async () => {
    if (!editingBrand) return;
    const { error } = await supabase.from('event_brands').delete().eq('id', editingBrand.id);
    if (error) {
      toast({ title: "Couldn't remove the brand", description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Brand removed' });
    setDialogOpen(false);
    if (brandId === editingBrand.id) onSelectBrand(null);
    changed();
  };

  const selected = brandId ? brands.find((b) => b.id === brandId) : undefined;

  const dialogs = (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBrand ? 'Edit brand' : 'Add a brand'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="brand_name">Brand name</Label>
              <Input
                id="brand_name"
                value={formData.brand_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, brand_name: e.target.value }))}
                placeholder="For example, Hanna Studio"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Logo (optional)</Label>
              <div
                {...getRootProps()}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-3 transition-colors ${
                  isDragActive ? 'border-ink bg-fill' : 'border-line-strong hover:bg-fill/60'
                }`}
              >
                <input {...getInputProps()} />
                {formData.logo_preview ? (
                  <img src={formData.logo_preview} alt="" className="h-12 w-12 rounded-lg object-contain" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-fill text-ink-2">
                    <Upload className="h-5 w-5" aria-hidden />
                  </span>
                )}
                <span className="text-[14px] text-ink-2">{formData.logo_preview ? 'Tap to change' : 'Tap to add a logo'}</span>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={saveBrand} disabled={isSubmitting || !formData.brand_name.trim()}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingBrand ? 'Save' : 'Add brand'}
              </Button>
            </div>
            {editingBrand && (
              <button type="button" className="w-full py-2 text-center text-[14px] text-destructive" onClick={() => setConfirmRemove(true)}>
                Remove brand from this event
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Remove this brand?"
        description="Its items are removed from the event too. This can't be undone."
        confirmLabel="Remove"
        onConfirm={removeBrand}
      />
    </>
  );

  if (brandId) {
    if (selected) {
      return (
        <>
          <BrandProductManager
            brand={selected}
            eventName={eventName}
            onBack={() => onSelectBrand(null)}
            onEditBrand={() => openDialog(selected)}
            onChanged={changed}
          />
          {dialogs}
        </>
      );
    }
    return (
      <div className="rounded-[20px] bg-card px-6 py-10 text-center text-[15px] text-ink-2">
        {isLoading ? 'Loading…' : (
          <>
            <p>This brand isn't in the event any more.</p>
            <Button variant="outline" className="mt-4" onClick={() => onSelectBrand(null)}>Back to {eventName}</Button>
          </>
        )}
      </div>
    );
  }

  const full = brands.length >= EVENT_MAX_BRANDS;

  return (
    <section>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold">Brands</h2>
          <p className="text-[13px] text-ink-2">Up to {EVENT_MAX_BRANDS} brands, {EVENT_MAX_ITEMS_PER_BRAND} items each</p>
        </div>
        <Button size="sm" onClick={() => openDialog(null)} disabled={full}>
          <Plus className="mr-1 h-4 w-4" />
          Add brand
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-px overflow-hidden rounded-[20px] bg-card">
          {[0, 1].map((i) => <div key={i} className="h-16 animate-pulse bg-fill/60" />)}
        </div>
      ) : brands.length === 0 ? (
        <div className="rounded-[20px] bg-card px-6 py-10 text-center">
          <p className="text-[15px] text-ink">No brands yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[14px] text-ink-2">Add the brands taking part, then a photo of each item they bring.</p>
          <Button className="mt-4" onClick={() => openDialog(null)}>
            <Plus className="mr-1 h-4 w-4" />
            Add brand
          </Button>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-[20px] bg-card">
          {brands.map((brand, i) => {
            const items = brand.event_brand_products ?? [];
            const ready = items.filter((x) => x.try_on_ready).length;
            const meta =
              items.length === 0
                ? 'No items yet'
                : `${items.length} of ${EVENT_MAX_ITEMS_PER_BRAND} items · ${ready === items.length ? 'all ready for try-on' : `${ready} ready for try-on`}`;
            return (
              <li key={brand.id} className={`flex items-center ${i > 0 ? 'border-t border-line' : ''}`}>
                <button
                  type="button"
                  onClick={() => onSelectBrand(brand.id)}
                  className="flex min-h-[64px] min-w-0 flex-1 items-center gap-3 px-4 py-2.5 text-left transition-colors active:bg-fill"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-fill text-[15px] font-semibold text-ink-2">
                    {brand.logo_url ? <img src={brand.logo_url} alt="" className="h-full w-full object-contain" /> : brand.brand_name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-ink">{brand.brand_name}</span>
                    <span className="block truncate text-[13px] text-ink-2">{meta}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {full && <p className="mt-2 text-[13px] text-ink-2">This event has the most brands it can take ({EVENT_MAX_BRANDS}).</p>}
      {dialogs}
    </section>
  );
};

import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChevronLeft, Upload, Trash2, Shirt, Loader2, CheckCircle, Box, ImagePlus } from 'lucide-react';
import { StatusLabel } from '@/components/StatusLabel';
import { ConfirmDialog } from '@/components/partner/ConfirmDialog';
import { EVENT_MAX_ITEMS_PER_BRAND, plural } from '@/lib/partnerPortal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validateGLBModel } from '@/ar/utils/modelValidator';
import { AlertTriangle as AlertTriangleIcon } from 'lucide-react';

const GARMENT_TYPES = [
  { value: 'shirt', label: 'Shirt / Top' },
  { value: 'abaya', label: 'Abaya / Dress' },
  { value: 'pants', label: 'Pants / Bottoms' },
  { value: 'jacket', label: 'Jacket / Outerwear' },
  { value: 'headwear', label: 'Headwear' },
  { value: 'accessory', label: 'Accessory' },
] as const;

interface EventBrandProduct {
  id: string;
  image_url: string;
  try_on_data: any;
  sort_order: number;
  created_at: string;
  product_id?: string;
  try_on_ready?: boolean | null;
  ar_model_url?: string;
  ar_enabled?: boolean;
  ar_scale?: number;
  garment_type?: string;
}

interface EventBrand {
  id: string;
  brand_name: string;
  logo_url?: string;
}

interface BrandProductManagerProps {
  brand: EventBrand;
  eventName: string;
  onBack: () => void;
  onEditBrand: () => void;
  /** Items changed (counts on the event page refresh). */
  onChanged?: () => void;
}

/**
 * A brand's items in an event. One photo per item is enough for try-on (the
 * try-on function falls back to it), so uploads are ready straight away; a
 * different try-on photo and a 3D model are options in the item sheet.
 */
export const BrandProductManager = ({ brand, eventName, onBack, onEditBrand, onChanged }: BrandProductManagerProps) => {
  const [products, setProducts] = useState<EventBrandProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<EventBrandProduct | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [uploadingOutfit, setUploadingOutfit] = useState(false);
  const [uploadingARModel, setUploadingARModel] = useState(false);
  // forceReupload removed — legacy BitStudio UI
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [removingAsset, setRemovingAsset] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<EventBrandProduct | null>(null);
  const { toast } = useToast();

  /** Extract storage path from a Supabase public URL */
  const extractStoragePath = (publicUrl: string, bucket: string): string | null => {
    const marker = `/object/public/${bucket}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(publicUrl.slice(idx + marker.length));
  };

  /** Remove an AR asset (try-on or 3D model). The 2D overlay path was removed in Session 3. */
  const handleRemoveAsset = async (product: EventBrandProduct, type: 'tryon' | 'model') => {
    const labels = { tryon: 'try-on image', model: '3D model' };
    if (!confirm(`Remove the ${labels[type]}? This will affect the shopper AR experience.`)) return;

    setRemovingAsset(type);
    try {
      // 1. Delete file from storage
      if (type === 'tryon') {
        const path = product.try_on_data?.outfit_image_path;
        if (path) {
          await supabase.storage.from('event-assets').remove([path]);
        }
      } else if (type === 'model') {
        const path = product.ar_model_url ? extractStoragePath(product.ar_model_url, 'event-ar-models') : null;
        if (path) {
          await supabase.storage.from('event-ar-models').remove([path]);
        }
      }

      // 2. Build DB update
      const update: Record<string, any> = { updated_at: new Date().toISOString() };

      if (type === 'tryon') {
        // The item photo is used for try-on again, so it stays ready.
        update.try_on_data = {};
        update.try_on_ready = true;
        update.try_on_config = null;
      } else if (type === 'model') {
        update.ar_model_url = null;
        update.ar_enabled = false;
      }

      const { error } = await supabase
        .from('event_brand_products')
        .update(update)
        .eq('id', product.id);
      if (error) throw error;

      toast({ title: "Removed", description: type === 'tryon' ? 'Shoppers now try on the item photo.' : `The ${labels[type]} was removed.` });

      // 3. Refresh
      if (editingProduct?.id === product.id) {
        setEditingProduct(prev => {
          if (!prev) return prev;
          if (type === 'tryon') return { ...prev, try_on_data: {} };
          if (type === 'model') return { ...prev, ar_model_url: undefined, ar_enabled: false };
          return prev;
        });
      }
      await fetchProducts();
      onChanged?.();
    } catch (error: any) {
      console.error(`Error removing ${type}:`, error);
      toast({ title: "Error", description: error.message || `Failed to remove ${labels[type]}`, variant: "destructive" });
    } finally {
      setRemovingAsset(null);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [brand.id]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('event_brand_products')
        .select('*')
        .eq('event_brand_id', brand.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: EVENT_MAX_ITEMS_PER_BRAND,
    maxSize: 10 * 1024 * 1024, // 10MB per file
    onDropRejected: () => toast({ title: 'Use JPG, PNG or WebP photos under 10 MB', variant: 'destructive' }),
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      const room = EVENT_MAX_ITEMS_PER_BRAND - products.length;
      if (acceptedFiles.length > room) {
        toast({
          title: `You can add ${plural(room, 'more item')}`,
          description: `Each brand can have up to ${EVENT_MAX_ITEMS_PER_BRAND} items.`,
          variant: "destructive"
        });
        return;
      }

      setIsUploading(true);
      try {
        for (const [i, file] of acceptedFiles.entries()) {
          await uploadProductImage(file, products.length + i);
        }
        toast({ title: acceptedFiles.length === 1 ? 'Item added' : `${acceptedFiles.length} items added`, description: 'Ready for try-on.' });
        await fetchProducts();
        onChanged?.();
      } catch (error) {
        console.error('Error uploading files:', error);
        toast({ title: "Couldn't upload", description: 'Please try again.', variant: 'destructive' });
      } finally {
        setIsUploading(false);
      }
    }
  });

  const uploadProductImage = async (file: File, sortOrder: number) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${brand.id}/products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('event-assets')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('event-assets')
      .getPublicUrl(filePath);

    const { error: insertError } = await supabase
      .from('event_brand_products')
      .insert({
        event_brand_id: brand.id,
        image_url: data.publicUrl,
        try_on_data: {},
        try_on_ready: true,
        sort_order: sortOrder
      });

    if (insertError) throw insertError;
  };

  const deleteProduct = async (product: EventBrandProduct) => {
    try {
      const { error } = await supabase.from('event_brand_products').delete().eq('id', product.id);
      if (error) throw error;
      toast({ title: 'Item removed' });
      await fetchProducts();
      onChanged?.();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast({ title: "Couldn't remove the item", description: error.message || 'Please try again.', variant: 'destructive' });
    }
  };

  // Items added before uploads were ready straight away.
  const makeReady = async (product: EventBrandProduct) => {
    const { error } = await supabase
      .from('event_brand_products')
      .update({ try_on_ready: true, updated_at: new Date().toISOString() })
      .eq('id', product.id);
    if (error) {
      toast({ title: "Couldn't update the item", description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Ready for try-on' });
    await fetchProducts();
    onChanged?.();
  };

  const openEditModal = (product: EventBrandProduct) => {
    setEditingProduct(product);
    setIsEditModalOpen(true);
  };

  const ready = products.filter((p) => p.try_on_ready).length;
  const room = EVENT_MAX_ITEMS_PER_BRAND - products.length;

  return (
    <section className="space-y-5">
      <button type="button" onClick={onBack} className="-ml-1 flex items-center gap-1 text-[15px] text-ink-2 hover:text-ink">
        <ChevronLeft className="h-5 w-5" aria-hidden />
        {eventName}
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-card text-[17px] font-semibold text-ink-2">
            {brand.logo_url ? <img src={brand.logo_url} alt="" className="h-full w-full object-contain" /> : brand.brand_name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[26px] font-semibold leading-tight tracking-tight">{brand.brand_name}</h1>
            <p className="text-[14px] text-ink-2">
              {isLoading ? 'Loading…' : products.length === 0 ? 'No items yet' : `${plural(products.length, 'item')} · ${ready} ready for try-on`}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={onEditBrand}>Edit brand</Button>
      </div>

      {/* Add photos: each photo becomes an item shoppers can try on */}
      {!isLoading && room > 0 && (
        <div
          {...getRootProps()}
          className={`flex cursor-pointer items-center gap-4 rounded-[20px] border border-dashed p-5 transition-colors ${
            isDragActive ? 'border-ink bg-fill' : 'border-line-strong bg-card hover:bg-fill/40'
          }`}
        >
          <input {...getInputProps()} />
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-fill text-ink-2">
            {isUploading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <ImagePlus className="h-5 w-5" aria-hidden />}
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] font-medium text-ink">{isUploading ? 'Uploading…' : 'Add item photos'}</span>
            <span className="block text-[13px] text-ink-2">
              One clear photo per item, up to {room} more. Each one is ready for try-on straight away.
            </span>
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {[0, 1].map((i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-[20px] bg-fill/60" />)}
        </div>
      ) : products.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product, i) => (
            <li key={product.id} className="overflow-hidden rounded-[20px] bg-card">
              <button type="button" onClick={() => openEditModal(product)} className="block w-full" aria-label={`Item ${i + 1} options`}>
                <img src={product.image_url} alt="" className="aspect-[3/4] w-full object-cover" loading="lazy" />
              </button>
              <div className="space-y-2 p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[14px] text-ink">Item {i + 1}</span>
                  {product.try_on_ready ? (
                    <StatusLabel status="live">Ready</StatusLabel>
                  ) : (
                    <StatusLabel status="hidden">Not ready</StatusLabel>
                  )}
                  {product.ar_enabled && product.ar_model_url && <StatusLabel status="other">3D</StatusLabel>}
                </div>
                <div className="flex items-center justify-between gap-2">
                  {product.try_on_ready ? (
                    <button type="button" className="text-[14px] text-ink-2 hover:text-ink" onClick={() => openEditModal(product)}>
                      Options
                    </button>
                  ) : (
                    <button type="button" className="text-[14px] font-medium text-ink" onClick={() => makeReady(product)}>
                      Make ready
                    </button>
                  )}
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-ink-3 hover:bg-fill hover:text-destructive"
                    onClick={() => setDeleting(product)}
                    aria-label={`Remove item ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Remove this item?"
        description="Shoppers won't be able to try it on any more. This can't be undone."
        confirmLabel="Remove"
        onConfirm={() => {
          if (deleting) deleteProduct(deleting);
          setDeleting(null);
        }}
      />

      {/* Edit Try-on Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={(open) => {
        setIsEditModalOpen(open);
        if (!open) {
          setValidationErrors([]);
          setValidationWarnings([]);
        }
      }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Item options</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-fill/60 p-3">
                <img src={editingProduct.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] text-ink">
                    {editingProduct.try_on_data?.outfit_image_url ? 'Shoppers try on your try-on photo' : 'Shoppers try on this photo'}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    {editingProduct.try_on_ready ? <StatusLabel status="live">Ready</StatusLabel> : <StatusLabel status="hidden">Not ready</StatusLabel>}
                    {editingProduct.ar_enabled && editingProduct.ar_model_url && <StatusLabel status="other">3D</StatusLabel>}
                  </div>
                </div>
              </div>

              {/* Tabbed content (3D-only AR — 2D overlay path was removed in Session 3) */}
              <Tabs defaultValue="image" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="image" className="flex-1 gap-1.5">
                    <Shirt className="w-4 h-4" />
                    Try-on photo
                  </TabsTrigger>
                  <TabsTrigger value="ar" className="flex-1 gap-1.5">
                    <Box className="w-4 h-4" />
                    3D model (AR)
                  </TabsTrigger>
                </TabsList>

                {/* ── Tab 1: Image Try-On ── */}
                <TabsContent value="image" className="space-y-4 pt-2">
                  <div>
                    <label className="text-sm font-medium">Different try-on photo (optional)</label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Try-on already uses the item photo. Add another only if you have a clearer one, like the garment alone on a plain background.
                    </p>

                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          if (!file.type.startsWith('image/')) {
                            toast({ title: "Invalid file type", description: "Please select an image file", variant: "destructive" });
                            return;
                          }
                          if (file.size > 10 * 1024 * 1024) {
                            toast({ title: "File too large", description: "Please select an image under 10MB", variant: "destructive" });
                            return;
                          }

                          try {
                            setUploadingOutfit(true);
                            const { data: brandData } = await supabase
                              .from('event_brands')
                              .select('event_id')
                              .eq('id', brand.id)
                              .single();
                            if (!brandData) throw new Error('Failed to get event_id');

                            const fileExt = file.name.split('.').pop();
                            const fileName = `outfit_${editingProduct.id}_${Date.now()}.${fileExt}`;
                            const filePath = `${brandData.event_id}/${brand.id}/${fileName}`;

                            const { error: uploadError } = await supabase.storage
                              .from('event-assets')
                              .upload(filePath, file, { contentType: file.type });
                            if (uploadError) throw uploadError;

                            const { data: urlData } = supabase.storage
                              .from('event-assets')
                              .getPublicUrl(filePath);

                            const updatedTryOnData = {
                              ...editingProduct.try_on_data,
                              outfit_image_path: filePath,
                              outfit_image_url: urlData.publicUrl,
                            };

                            setEditingProduct(prev => prev ? { ...prev, try_on_data: updatedTryOnData } : prev);

                            await supabase
                              .from('event_brand_products')
                              .update({
                                try_on_data: updatedTryOnData,
                                try_on_config: { outfit_image_url: urlData.publicUrl, outfitImagePath: filePath },
                                try_on_provider: 'thenewblack',
                                try_on_ready: true,
                                updated_at: new Date().toISOString()
                              })
                              .eq('id', editingProduct.id);

                            toast({ title: "Try-on photo saved", description: "Shoppers now try on this photo." });
                            await fetchProducts();
                            onChanged?.();
                            setIsEditModalOpen(false);
                            setEditingProduct(null);
                          } catch (error: any) {
                            console.error('[BrandProductManager] Upload error:', error);
                            toast({ title: "Upload failed", description: error.message, variant: "destructive" });
                          } finally {
                            setUploadingOutfit(false);
                            e.target.value = '';
                          }
                        }}
                        className="w-full p-2 border rounded"
                        disabled={uploadingOutfit}
                      />
                      {uploadingOutfit && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded">
                          <div className="flex items-center gap-2 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Uploading…
                          </div>
                        </div>
                      )}
                    </div>

                    {editingProduct.try_on_data?.outfit_image_url && (
                      <div className="mt-3 flex items-center gap-3 p-2 rounded-md bg-muted/50">
                        <img
                          src={editingProduct.try_on_data.outfit_image_url}
                          alt="Outfit preview"
                          className="w-16 h-16 object-cover rounded border"
                        />
                        <div className="flex-1">
                          <p className="text-xs text-ink-2">Try-on uses this photo</p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={removingAsset === 'tryon'}
                          onClick={() => handleRemoveAsset(editingProduct, 'tryon')}
                        >
                          {removingAsset === 'tryon' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          <span className="ml-1 text-xs">Remove</span>
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                      Close
                    </Button>
                  </div>
                </TabsContent>

                {/* ── Tab 2: 3D AR Model ── */}
                <TabsContent value="ar" className="space-y-4 pt-2">
                  {/* Garment type */}
                  <div>
                    <label className="text-sm font-medium">Garment Type</label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Select the type of garment to optimize AR placement.
                    </p>
                    <Select
                      value={editingProduct.garment_type || 'shirt'}
                      onValueChange={async (value) => {
                        try {
                          await supabase
                            .from('event_brand_products')
                            .update({ garment_type: value, updated_at: new Date().toISOString() })
                            .eq('id', editingProduct.id);
                          setEditingProduct(prev => prev ? { ...prev, garment_type: value } : prev);
                          toast({ title: "Garment type updated", description: `Set to ${GARMENT_TYPES.find(t => t.value === value)?.label || value}` });
                          fetchProducts();
                        } catch (error: any) {
                          toast({ title: "Error", description: error.message || "Failed to update garment type", variant: "destructive" });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select garment type" />
                      </SelectTrigger>
                      <SelectContent>
                        {GARMENT_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status */}
                  {editingProduct.ar_model_url && editingProduct.ar_enabled && (
                    <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-md">
                      <CheckCircle className="w-4 h-4 text-purple-600" />
                      <span className="text-sm text-purple-700 flex-1">AR model uploaded — AR enabled</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={removingAsset === 'model'}
                        onClick={() => handleRemoveAsset(editingProduct, 'model')}
                      >
                        {removingAsset === 'model' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        <span className="ml-1 text-xs">Remove</span>
                      </Button>
                    </div>
                  )}

                  {/* GLB upload */}
                  <div>
                    <label className="text-sm font-medium">Upload 3D Model (.glb)</label>
                    <p className="text-xs text-muted-foreground mb-1">
                      Max 50 MB. For best AR performance, keep models under 10 MB.
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      <strong>Tip:</strong> Use <a href="https://gltf-transform.dev/cli" target="_blank" rel="noopener noreferrer" className="underline text-primary">gltf-transform</a> to apply Draco compression (60-90% smaller).
                      Generate from images with{' '}
                      <a href="https://meshy.ai" target="_blank" rel="noopener noreferrer" className="underline text-primary">Meshy.ai</a>{' '}or{' '}
                      <a href="https://tripo3d.ai" target="_blank" rel="noopener noreferrer" className="underline text-primary">Tripo3D</a>.
                    </p>

                    <input
                      type="file"
                      accept=".glb,.gltf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
                        if (!['.glb', '.gltf'].includes(ext)) {
                          toast({ title: "Invalid file type", description: "Please upload a .glb or .gltf file", variant: "destructive" });
                          return;
                        }

                        if (file.size > 50 * 1024 * 1024) {
                          toast({ title: "File too large", description: "Please select a 3D model under 50 MB", variant: "destructive" });
                          return;
                        }

                        try {
                          setUploadingARModel(true);

                          const validation = await validateGLBModel(file);
                          setValidationErrors(validation.errors);
                          setValidationWarnings(validation.warnings);

                          if (!validation.valid) {
                            toast({ title: "Model validation failed", description: validation.errors[0] || "The 3D model has structural issues", variant: "destructive" });
                            setUploadingARModel(false);
                            e.target.value = '';
                            return;
                          }

                          if (validation.warnings.length > 0) {
                            toast({ title: "Model uploaded with warnings", description: `${validation.warnings.length} warning(s) detected. Check details below.` });
                          }

                          const { data: brandData } = await supabase
                            .from('event_brands')
                            .select('event_id')
                            .eq('id', brand.id)
                            .single();
                          if (!brandData) throw new Error('Failed to get event_id');

                          const fileName = `${brandData.event_id}/${brand.id}/${editingProduct.id}/${Date.now()}${ext}`;

                          const { error: uploadError } = await supabase.storage
                            .from('event-ar-models')
                            .upload(fileName, file, {
                              contentType: ext === '.glb' ? 'model/gltf-binary' : 'model/gltf+json'
                            });
                          if (uploadError) throw uploadError;

                          const { data: urlData } = supabase.storage
                            .from('event-ar-models')
                            .getPublicUrl(fileName);

                          await supabase
                            .from('event_brand_products')
                            .update({ ar_model_url: urlData.publicUrl, ar_enabled: true, updated_at: new Date().toISOString() })
                            .eq('id', editingProduct.id);

                          setEditingProduct(prev => prev ? { ...prev, ar_model_url: urlData.publicUrl, ar_enabled: true } : prev);
                          toast({ title: "3D model uploaded!", description: "AR try-on is now enabled for this product" });
                          setValidationErrors([]);
                          setValidationWarnings([]);
                          await fetchProducts();
                        } catch (error: any) {
                          console.error('AR model upload error:', error);
                          toast({ title: "Upload failed", description: error.message, variant: "destructive" });
                        } finally {
                          setUploadingARModel(false);
                          e.target.value = '';
                        }
                      }}
                      className="w-full p-2 border rounded"
                      disabled={uploadingARModel}
                    />

                    {uploadingARModel && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Validating & uploading…
                      </div>
                    )}

                    {validationErrors.length > 0 && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm font-medium text-red-800 flex items-center gap-1">
                          <AlertTriangleIcon className="w-4 h-4" />
                          Model validation failed:
                        </p>
                        <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                          {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                      </div>
                    )}
                    {validationWarnings.length > 0 && validationErrors.length === 0 && (
                      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm font-medium text-yellow-800 flex items-center gap-1">
                          <AlertTriangleIcon className="w-4 h-4" />
                          Model warnings:
                        </p>
                        <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                          {validationWarnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                      Close
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};
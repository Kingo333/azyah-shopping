import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/partner/ConfirmDialog';

export interface RetailEvent {
  id: string;
  name: string;
  description?: string | null;
  event_date: string;
  end_date?: string | null;
  location?: string | null;
  status: string;
  retailer_id: string;
  banner_image_url?: string | null;
  created_at: string;
}

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  retailerId: string;
  /** Leave out to create a new event. */
  event?: RetailEvent | null;
  onSaved: () => void;
  onDeleted?: () => void;
}

const EMPTY = { name: '', description: '', event_date: '', end_date: '', location: '', shown: false, banner_image_url: '' };

/** Resize to at most 2400px and save as JPEG, then upload to event-assets. */
async function uploadBanner(file: File, retailerId: string): Promise<string> {
  if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
    throw new Error('Please use a JPG, PNG or WebP image.');
  }
  if (file.size > 10 * 1024 * 1024) throw new Error('Please choose an image under 10 MB.');
  const blob = await new Promise<Blob>((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => {
      const scale = Math.min(1, 2400 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      URL.revokeObjectURL(img.src);
      if (!ctx) return reject(new Error('Could not read this image. Please try another one.'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read this image.'))), 'image/jpeg', 0.8);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Could not read this image. Please try another one.'));
    };
    img.src = URL.createObjectURL(file);
  });
  const path = `event-banners/${retailerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from('event-assets').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(error.message.includes('exceeded') ? 'This image is too large.' : "Couldn't upload the photo. Please try again.");
  return supabase.storage.from('event-assets').getPublicUrl(path).data.publicUrl;
}

/** One form for new and existing events (it used to be two copies). */
export function EventFormDialog({ open, onOpenChange, retailerId, event, onSaved, onDeleted }: EventFormDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const isNew = !event;

  useEffect(() => {
    if (!open) return;
    setForm(
      event
        ? {
            name: event.name,
            description: event.description || '',
            event_date: event.event_date,
            end_date: event.end_date || event.event_date,
            location: event.location || '',
            shown: event.status === 'active',
            banner_image_url: event.banner_image_url || '',
          }
        : EMPTY,
    );
    setBannerFile(null);
  }, [open, event]);

  // Preview the chosen photo, and let the browser free it afterwards.
  useEffect(() => {
    if (!bannerFile) {
      setBannerPreview('');
      return;
    }
    const url = URL.createObjectURL(bannerFile);
    setBannerPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [bannerFile]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const datesWrong = !!form.event_date && !!form.end_date && form.end_date < form.event_date;
  const canSave = form.name.trim() && form.event_date && form.end_date && !datesWrong && !saving;
  const banner = bannerPreview || form.banner_image_url;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const bannerUrl = bannerFile ? await uploadBanner(bannerFile, retailerId) : form.banner_image_url;
      const row = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        event_date: form.event_date,
        end_date: form.end_date,
        location: form.location.trim() || null,
        status: form.shown ? 'active' : 'draft',
        banner_image_url: bannerUrl || null,
      };
      const { error } = isNew
        ? await supabase.from('retail_events').insert({ ...row, retailer_id: retailerId })
        : await supabase.from('retail_events').update(row).eq('id', event!.id);
      if (error) throw error;
      toast({
        title: isNew ? 'Event created' : 'Event saved',
        description: form.shown ? 'Shoppers can see it.' : "It's hidden from shoppers until you turn on Show to shoppers.",
      });
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast({ title: "Couldn't save the event", description: (error as { message?: string })?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!event) return;
    // Brands aren't linked to the event in the database, so remove them first
    // (their items go with them).
    const { error: brandsError } = await supabase.from('event_brands').delete().eq('event_id', event.id);
    if (brandsError) {
      toast({ title: "Couldn't delete the event", description: brandsError.message, variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('retail_events').delete().eq('id', event.id);
    if (error) {
      toast({ title: "Couldn't delete the event", description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Event deleted' });
    onOpenChange(false);
    onDeleted?.();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? 'New event' : 'Edit event'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="event-name">Name</Label>
              <Input id="event-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="For example, Summer pop-up" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="event-start">First day</Label>
                <Input
                  id="event-start"
                  type="date"
                  value={form.event_date}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) => ({ ...f, event_date: v, end_date: !f.end_date || f.end_date < v ? v : f.end_date }));
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="event-end">Last day</Label>
                <Input id="event-end" type="date" min={form.event_date || undefined} value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
              </div>
            </div>
            {datesWrong && <p className="text-[13px] text-destructive">The last day can't be before the first day.</p>}
            <div className="space-y-1.5">
              <Label htmlFor="event-location">Place</Label>
              <Input id="event-location" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="For example, City Walk, Dubai" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-description">About (optional)</Label>
              <Textarea id="event-description" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What shoppers can expect" />
            </div>
            <div className="space-y-1.5">
              <Label>Cover photo (optional)</Label>
              <input
                ref={fileInput}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setBannerFile(file);
                  e.target.value = '';
                }}
              />
              {banner ? (
                <div className="space-y-2">
                  <img src={banner} alt="" className="h-28 w-full rounded-xl object-cover" />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()}>Change</Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setBannerFile(null);
                        set('banner_image_url', '');
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line-strong text-[14px] text-ink-2 hover:bg-fill/60"
                >
                  <ImagePlus className="h-5 w-5" aria-hidden />
                  Add a cover photo
                </button>
              )}
            </div>
            <div className="flex items-start justify-between gap-4 rounded-xl bg-fill/60 p-3">
              <div>
                <Label htmlFor="event-shown" className="text-[15px]">Show to shoppers</Label>
                <p className="mt-0.5 text-[13px] text-ink-2">
                  {form.shown
                    ? 'Shoppers see it from now until the last day. Try-on opens on the first day.'
                    : 'Hidden while you add brands and items.'}
                </p>
              </div>
              <Switch id="event-shown" checked={form.shown} onCheckedChange={(v) => set('shown', v)} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={save} disabled={!canSave}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isNew ? 'Create event' : 'Save'}
              </Button>
            </div>
            {!isNew && (
              <button type="button" className="w-full py-2 text-center text-[14px] text-destructive" onClick={() => setConfirmDelete(true)}>
                Delete event
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this event?"
        description="Its brands and items are deleted too. This can't be undone."
        onConfirm={remove}
      />
    </>
  );
}

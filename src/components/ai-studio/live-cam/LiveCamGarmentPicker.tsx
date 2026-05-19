import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWardrobeItems } from '@/hooks/useWardrobeItems';
import { Loader2 } from 'lucide-react';
import type { LiveCamGarmentSelection, GarmentSource } from './liveCamTypes';

interface Props {
  value: LiveCamGarmentSelection | null;
  onChange: (g: LiveCamGarmentSelection) => void;
  disabled?: boolean;
}

interface GarmentOption {
  id: string;
  source: GarmentSource;
  label: string;
  imageUrl: string;
}

interface SettingsRow {
  garment_id: string;
  reference_image_url: string | null;
  prompt_hint: string | null;
}

export const LiveCamGarmentPicker: React.FC<Props> = ({ value, onChange, disabled }) => {
  const { data: wardrobe, isLoading: wardrobeLoading } = useWardrobeItems();
  const [extra, setExtra] = useState<GarmentOption[]>([]);
  const [extraLoading, setExtraLoading] = useState(true);
  const [settings, setSettings] = useState<Record<string, SettingsRow>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setExtraLoading(true);
      const [{ data: products }, { data: ebp }] = await Promise.all([
        supabase.from('products').select('id, title, image_url').limit(12),
        supabase.from('event_brand_products').select('id, image_url, garment_type').limit(12),
      ]);
      if (cancelled) return;
      const opts: GarmentOption[] = [];
      (products ?? []).forEach((p) => {
        if (p.image_url) opts.push({ id: p.id, source: 'product', label: p.title ?? 'Product', imageUrl: p.image_url });
      });
      (ebp ?? []).forEach((p) => {
        if (p.image_url) opts.push({ id: p.id, source: 'event_brand_product', label: p.garment_type ?? 'Event item', imageUrl: p.image_url });
      });
      setExtra(opts);
      setExtraLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const allOptions = useMemo<GarmentOption[]>(() => {
    const w: GarmentOption[] = (wardrobe ?? [])
      .filter((it) => !!it.image_url)
      .map((it) => ({
        id: it.id,
        source: 'wardrobe_item' as const,
        label: it.brand || it.category || 'My item',
        imageUrl: (it.image_bg_removed_url || it.image_url) as string,
      }));
    return [...w, ...extra];
  }, [wardrobe, extra]);

  // Lookup any per-garment Live Cam overrides.
  useEffect(() => {
    if (allOptions.length === 0) return;
    let cancelled = false;
    (async () => {
      const ids = allOptions.map((o) => o.id);
      const { data } = await supabase
        .from('live_cam_garment_settings')
        .select('garment_id, reference_image_url, prompt_hint')
        .in('garment_id', ids);
      if (cancelled || !data) return;
      const map: Record<string, SettingsRow> = {};
      for (const row of data as SettingsRow[]) map[row.garment_id] = row;
      setSettings(map);
    })();
    return () => { cancelled = true; };
  }, [allOptions]);

  const handlePick = (opt: GarmentOption) => {
    const override = settings[opt.id];
    onChange({
      id: opt.id,
      source: opt.source,
      label: opt.label,
      referenceImageUrl: override?.reference_image_url || opt.imageUrl,
      promptHint: override?.prompt_hint || undefined,
    });
  };

  const loading = wardrobeLoading || extraLoading;

  return (
    <div className="rounded-2xl border border-white/30 bg-white/50 backdrop-blur-sm shadow-sm p-3">
      <p className="text-sm text-muted-foreground mb-3">Pick a garment to try on live</p>
      {loading ? (
        <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
        </div>
      ) : allOptions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No garments available yet.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto">
          {allOptions.map((o) => {
            const selected = value?.id === o.id && value?.source === o.source;
            return (
              <button
                key={`${o.source}:${o.id}`}
                type="button"
                disabled={disabled}
                onClick={() => handlePick(o)}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${
                  selected ? 'border-primary ring-2 ring-primary/40' : 'border-transparent hover:border-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <img src={o.imageUrl} alt={o.label} className="w-full h-full object-cover" />
                <span className="absolute bottom-0 inset-x-0 text-[10px] bg-black/50 text-white px-1 py-0.5 truncate">
                  {o.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

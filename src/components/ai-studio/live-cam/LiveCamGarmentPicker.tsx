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
  category?: string;
  description?: string;
  /** Gemini final_prompt_hint preferred; falls back to legacy prompt_hint. */
  analysisPromptHint?: string;
  /** When true, do NOT merge any FashionCLIP hint into the final Live Cam prompt. */
  geminiReady?: boolean;
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
        supabase.from('products').select('id, title, image_url, description, category_slug').limit(12),
        supabase.from('event_brand_products').select('id, image_url, garment_type').limit(12),
      ]);
      if (cancelled) return;
      const opts: GarmentOption[] = [];
      (products ?? []).forEach((p: any) => {
        if (p.image_url) opts.push({
          id: p.id,
          source: 'product',
          label: p.title ?? 'Product',
          imageUrl: p.image_url,
          category: p.category_slug ?? undefined,
          description: p.description ?? undefined,
        });
      });
      (ebp ?? []).forEach((p: any) => {
        if (p.image_url) opts.push({
          id: p.id,
          source: 'event_brand_product',
          label: p.garment_type ?? 'Event item',
          imageUrl: p.image_url,
          category: p.garment_type ?? undefined,
        });
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
        label: (it as any).name || it.brand || it.category || 'My item',
        imageUrl: (it.image_bg_removed_url || it.image_url) as string,
        category: it.category ?? undefined,
        analysisPromptHint:
          it.analysis?.status === 'complete' && it.analysis.prompt_hint
            ? it.analysis.prompt_hint
            : undefined,
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
    // FashionCLIP hint first, manual per-garment override second.
    const combinedHint =
      [opt.analysisPromptHint, override?.prompt_hint || undefined]
        .filter((s): s is string => !!s && s.trim().length > 0)
        .join(' ') || undefined;
    onChange({
      id: opt.id,
      source: opt.source,
      label: opt.label,
      referenceImageUrl: override?.reference_image_url || opt.imageUrl,
      promptHint: combinedHint,
      category: opt.category,
      description: opt.description,
    });
  };

  const loading = wardrobeLoading || extraLoading;

  const wardrobeOpts = useMemo(() => allOptions.filter((o) => o.source === 'wardrobe_item'), [allOptions]);
  const productOpts = useMemo(() => allOptions.filter((o) => o.source !== 'wardrobe_item'), [allOptions]);

  const renderGrid = (opts: GarmentOption[], title: string) => {
    if (opts.length === 0) return null;
    return (
      <div className="mb-2 last:mb-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 px-0.5">
          {title}
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
          {opts.map((o) => {
            const selected = value?.id === o.id && value?.source === o.source;
            return (
              <button
                key={`${o.source}:${o.id}`}
                type="button"
                disabled={disabled}
                onClick={() => handlePick(o)}
                className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition ${
                  selected ? 'border-primary ring-2 ring-primary/40' : 'border-transparent hover:border-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <img src={o.imageUrl} alt={o.label} className="w-full h-full object-cover" />
                <span className="absolute bottom-0 inset-x-0 text-[9px] bg-black/50 text-white px-1 py-0.5 truncate leading-tight">
                  {o.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-white/30 bg-white/50 backdrop-blur-sm shadow-sm p-2 sm:p-3">
      <p className="text-xs text-muted-foreground mb-2">Pick an outfit</p>
      {loading ? (
        <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
        </div>
      ) : allOptions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No outfits available yet.</p>
      ) : (
        <div className="max-h-56 overflow-y-auto pr-0.5">
          {renderGrid(wardrobeOpts, 'My Closet')}
          {renderGrid(productOpts, 'Discover')}
        </div>
      )}
    </div>
  );
};

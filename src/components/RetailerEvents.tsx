import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, ChevronRight, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { StatusLabel } from '@/components/StatusLabel';
import { PartnerSectionHeader } from '@/components/partner/PartnerShell';
import { EventFormDialog, type RetailEvent } from '@/components/partner/EventFormDialog';
import { EventCatalogManager } from './EventCatalogManager';
import {
  eventCounts,
  eventCountsLine,
  eventPhase,
  eventPhaseLabel,
  formatDateRange,
  todayIso,
} from '@/lib/partnerPortal';

type EventRow = RetailEvent & {
  event_brands?: { id: string; event_brand_products?: { try_on_ready: boolean | null }[] | null }[] | null;
};

interface RetailerEventsProps {
  retailerId: string;
}

/**
 * Store portal → Events. The list, then an event's page (?event=…), then a
 * brand's items (?event=…&brand=…), so Back and refresh keep your place.
 */
export const RetailerEvents: React.FC<RetailerEventsProps> = ({ retailerId }) => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RetailEvent | null>(null);
  const today = todayIso();

  const eventId = searchParams.get('event');
  const brandId = searchParams.get('brand');

  const go = useCallback(
    (next: { event?: string | null; brand?: string | null }) => {
      const params = new URLSearchParams(searchParams);
      params.set('tab', 'events');
      for (const [key, value] of Object.entries(next)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      setSearchParams(params);
    },
    [searchParams, setSearchParams],
  );

  const fetchEvents = useCallback(async () => {
    if (!retailerId) return;
    try {
      const { data, error } = await supabase
        .from('retail_events')
        .select('*')
        .eq('retailer_id', retailerId)
        .order('event_date', { ascending: false });
      if (error) throw error;
      const list = (data || []) as RetailEvent[];
      // Brands aren't linked to events in the database, so they're read separately.
      const byEvent = new Map<string, NonNullable<EventRow['event_brands']>>();
      if (list.length > 0) {
        const { data: brands, error: brandsError } = await supabase
          .from('event_brands')
          .select('id, event_id, event_brand_products(try_on_ready)')
          .in('event_id', list.map((e) => e.id));
        if (brandsError) console.error('Error fetching event brands:', brandsError);
        for (const b of (brands || []) as { id: string; event_id: string; event_brand_products: { try_on_ready: boolean | null }[] | null }[]) {
          byEvent.set(b.event_id, [...(byEvent.get(b.event_id) ?? []), b]);
        }
      }
      setEvents(list.map((e) => ({ ...e, event_brands: byEvent.get(e.id) ?? [] })));
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({ title: "Couldn't load events", description: 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [retailerId, toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Live and upcoming first, then drafts, then ended; soonest first within each.
  const sorted = useMemo(() => {
    const order = { live: 0, upcoming: 1, draft: 2, ended: 3 } as const;
    return [...events].sort((a, b) => {
      const pa = order[eventPhase(a, today)];
      const pb = order[eventPhase(b, today)];
      if (pa !== pb) return pa - pb;
      return pa === 3 ? b.event_date.localeCompare(a.event_date) : a.event_date.localeCompare(b.event_date);
    });
  }, [events, today]);

  const openForm = (event: RetailEvent | null) => {
    setEditing(event);
    setFormOpen(true);
  };

  const selected = eventId ? events.find((e) => e.id === eventId) : undefined;

  const form = (
    <EventFormDialog
      open={formOpen}
      onOpenChange={setFormOpen}
      retailerId={retailerId}
      event={editing}
      onSaved={fetchEvents}
      onDeleted={() => {
        go({ event: null, brand: null });
        fetchEvents();
      }}
    />
  );

  if (eventId) {
    if (selected) {
      return (
        <>
          <EventCatalogManager
            event={selected}
            today={today}
            brandId={brandId}
            onBack={() => go({ event: null, brand: null })}
            onSelectBrand={(id) => go({ brand: id })}
            onEdit={() => openForm(selected)}
            onChanged={fetchEvents}
          />
          {form}
        </>
      );
    }
    if (!loading) {
      return (
        <div className="rounded-[20px] bg-card px-6 py-10 text-center">
          <p className="text-[15px] text-ink-2">This event isn't here any more.</p>
          <Button variant="outline" className="mt-4" onClick={() => go({ event: null, brand: null })}>
            Back to events
          </Button>
        </div>
      );
    }
  }

  return (
    <section>
      <PartnerSectionHeader
        title="Events"
        subtitle="Pop-ups where shoppers try your items on"
        actions={
          <Button onClick={() => openForm(null)}>
            <Plus className="mr-2 h-4 w-4" />
            New event
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-px overflow-hidden rounded-[20px] bg-card">
          {[0, 1, 2].map((i) => <div key={i} className="h-[72px] animate-pulse bg-fill/60" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-[20px] bg-card px-6 py-12 text-center">
          <CalendarDays className="mx-auto mb-3 h-10 w-10 text-ink-3" />
          <h2 className="text-[17px] font-semibold">No events yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-[14px] text-ink-2">
            Create an event, add the brands taking part and a photo of each item. Shoppers at the event can then try them on.
          </p>
          <Button className="mt-5" onClick={() => openForm(null)}>
            <Plus className="mr-2 h-4 w-4" />
            New event
          </Button>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-[20px] bg-card">
          {sorted.map((event, i) => {
            const phase = eventPhase(event, today);
            const { label, status } = eventPhaseLabel(phase);
            const counts = eventCounts(event.event_brands);
            const when = [formatDateRange(event.event_date, event.end_date ?? null, today), event.location].filter(Boolean).join(' · ');
            return (
              <li key={event.id} className={i > 0 ? 'border-t border-line' : undefined}>
                <button
                  type="button"
                  onClick={() => go({ event: event.id, brand: null })}
                  className="flex min-h-[72px] w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-fill"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-ink">{event.name}</span>
                    <span className="block truncate text-[13px] text-ink-2">{when}</span>
                    <span className="block text-[13px] text-ink-2">{eventCountsLine(counts)}</span>
                  </span>
                  <StatusLabel status={status}>{label}</StatusLabel>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {form}
    </section>
  );
};

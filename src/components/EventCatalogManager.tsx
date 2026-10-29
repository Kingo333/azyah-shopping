import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusLabel } from '@/components/StatusLabel';
import type { RetailEvent } from '@/components/partner/EventFormDialog';
import { EventBrandManager } from './EventBrandManager';
import {
  EVENT_MAX_BRANDS,
  eventPhase,
  eventPhaseHint,
  eventPhaseLabel,
  formatDateRange,
} from '@/lib/partnerPortal';

interface EventCatalogManagerProps {
  event: RetailEvent;
  today: string;
  /** The brand whose items are open, from the address. */
  brandId: string | null;
  onBack: () => void;
  onSelectBrand: (brandId: string | null) => void;
  onEdit: () => void;
  /** Brands or items changed (the events list counts refresh). */
  onChanged: () => void;
}

/** An event's page: what shoppers see, a short summary, then its brands. */
export const EventCatalogManager = ({ event, today, brandId, onBack, onSelectBrand, onEdit, onChanged }: EventCatalogManagerProps) => {
  const [counts, setCounts] = useState({ brands: 0, items: 0, ready: 0 });
  const phase = eventPhase(event, today);
  const { label, status } = eventPhaseLabel(phase);
  const when = [formatDateRange(event.event_date, event.end_date ?? null, today), event.location].filter(Boolean).join(' · ');

  if (brandId) {
    // A brand's items: the brand manager renders them with its own Back.
    return (
      <EventBrandManager
        eventId={event.id}
        eventName={event.name}
        brandId={brandId}
        onSelectBrand={onSelectBrand}
        onCountsChange={setCounts}
        onChanged={onChanged}
      />
    );
  }

  return (
    <section className="space-y-5">
      <button type="button" onClick={onBack} className="-ml-1 flex items-center gap-1 text-[15px] text-ink-2 hover:text-ink">
        <ChevronLeft className="h-5 w-5" aria-hidden />
        Events
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{event.name}</h1>
            <StatusLabel status={status}>{label}</StatusLabel>
          </div>
          {when && <p className="mt-1 text-[14px] text-ink-2">{when}</p>}
          <p className="mt-1 text-[14px] text-ink-2">{eventPhaseHint(phase)}</p>
        </div>
        <Button variant="outline" onClick={onEdit}>
          Edit event
        </Button>
      </div>

      {event.banner_image_url && <img src={event.banner_image_url} alt="" className="h-36 w-full rounded-[20px] object-cover md:h-48" />}

      <dl className="grid grid-cols-3 overflow-hidden rounded-[20px] bg-card text-center">
        {[
          ['Brands', `${counts.brands} of ${EVENT_MAX_BRANDS}`],
          ['Items', String(counts.items)],
          ['Ready for try-on', String(counts.ready)],
        ].map(([term, value], i) => (
          <div key={term} className={`flex flex-col-reverse px-2 py-3 ${i > 0 ? 'border-l border-line' : ''}`}>
            <dt className="text-[12px] text-ink-2">{term}</dt>
            <dd className="text-[20px] font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <EventBrandManager
        eventId={event.id}
        eventName={event.name}
        brandId={null}
        onSelectBrand={onSelectBrand}
        onCountsChange={setCounts}
        onChanged={onChanged}
      />
    </section>
  );
};

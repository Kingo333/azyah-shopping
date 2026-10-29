// Small rules shared by the brand portal, the store portal and the store's
// events (docs/superpowers/plans/2026-10-29-partner-portals.md).
import { publishProblems } from '@/lib/productPublishing';

// ---------- Events ----------

export type EventPhase = 'draft' | 'upcoming' | 'live' | 'ended';

interface EventDates {
  status: string;
  event_date: string | null;
  end_date?: string | null;
}

/**
 * What shoppers see. Shown events are status 'active' (Events page and the
 * try-on rule `isEventOpen`); the dates decide upcoming, live or ended.
 */
export function eventPhase(event: EventDates, todayIso: string): EventPhase {
  const last = event.end_date || event.event_date;
  if (event.status === 'ended' || (last && todayIso > last)) return 'ended';
  if (event.status !== 'active') return 'draft';
  if (event.event_date && todayIso < event.event_date) return 'upcoming';
  return 'live';
}

const PHASE: Record<EventPhase, { label: string; status: string }> = {
  live: { label: 'Live', status: 'live' },
  upcoming: { label: 'Upcoming', status: 'upcoming' },
  draft: { label: 'Draft', status: 'hidden' },
  ended: { label: 'Ended', status: 'ended' },
};

/** Words for the phase, and the key <StatusLabel> colors by (Live green, others neutral). */
export function eventPhaseLabel(phase: EventPhase) {
  return PHASE[phase];
}

/** One line under the phase label, saying what shoppers get. */
export function eventPhaseHint(phase: EventPhase): string {
  switch (phase) {
    case 'live':
      return 'Shoppers can see it and try items on.';
    case 'upcoming':
      return 'Shoppers can see it. Try-on opens on the first day.';
    case 'draft':
      return "Hidden. Shoppers can't see it until you turn on Show to shoppers.";
    case 'ended':
      return 'Finished. Shoppers no longer see it.';
  }
}

/** Today as yyyy-mm-dd in the person's own time zone. */
export function todayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** A yyyy-mm-dd date as that local day (new Date('yyyy-mm-dd') would be UTC midnight). */
export function parseDay(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "12 Nov", "12–14 Nov", "28 Nov – 2 Dec"; the year only when it isn't this year. */
export function formatDateRange(start: string | null, end: string | null, today: string): string {
  const a = parseDay(start);
  if (!a) return '';
  const b = parseDay(end) ?? a;
  const thisYear = Number(today.slice(0, 4));
  const showYear = a.getFullYear() !== thisYear || b.getFullYear() !== thisYear;
  const day = (d: Date, withYear: boolean) => `${d.getDate()} ${MONTHS[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ''}`;
  if (a.toDateString() === b.toDateString()) return day(a, showYear);
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
    return `${a.getDate()}–${day(b, showYear)}`;
  }
  const sameYear = a.getFullYear() === b.getFullYear();
  return `${day(a, showYear && !sameYear)} – ${day(b, showYear)}`;
}

// ---------- Words and money ----------

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "AED 329", "AED 34.50", "$19.99"; "No price" when there isn't one. */
export function formatMoney(cents: number | null | undefined, currency: string | null | undefined): string {
  if (!cents) return 'No price';
  const amount = cents / 100;
  const whole = Number.isInteger(amount);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'AED',
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2,
    })
      .format(amount)
      .replace(/\u00a0/g, ' ');
  } catch {
    return amount.toFixed(2);
  }
}

// ---------- Products ----------

export interface PartnerProductLike {
  title?: string | null;
  price_cents?: number | null;
  media_urls?: unknown;
  image_url?: string | null;
  category_slug?: string | null;
  status: string;
}

/** The product's photos, whether stored as a list or as JSON text. */
export function productImages(product: Pick<PartnerProductLike, 'media_urls' | 'image_url'>): string[] {
  let urls: unknown = product.media_urls;
  if (typeof urls === 'string') {
    try {
      urls = JSON.parse(urls);
    } catch {
      urls = [urls];
    }
  }
  const list = Array.isArray(urls) ? urls.filter((u): u is string => typeof u === 'string' && u.length > 0) : [];
  if (list.length === 0 && product.image_url) list.push(product.image_url);
  return list;
}

/** What's missing before it can go live (same checks and words as the edit screen). */
export function productIssues(product: PartnerProductLike): string[] {
  return publishProblems({
    title: product.title ?? '',
    price: product.price_cents ? String(product.price_cents / 100) : '',
    images: productImages(product),
    category: product.category_slug ?? '',
  });
}

/** The one action on a product row: Publish on Pending, Edit otherwise. */
export function productNextAction(product: PartnerProductLike): 'publish' | 'edit' {
  return product.status === 'draft' ? 'publish' : 'edit';
}

/** "6 products · 2 pending · 3 live". */
export function productSummary(products: PartnerProductLike[]): string {
  if (products.length === 0) return 'No products yet';
  const pending = products.filter((x) => x.status === 'draft').length;
  const live = products.filter((x) => x.status === 'active').length;
  return [plural(products.length, 'product'), pending ? `${pending} pending` : '', live ? `${live} live` : '']
    .filter(Boolean)
    .join(' · ');
}

// ---------- Event contents ----------

export const EVENT_MAX_BRANDS = 10;
export const EVENT_MAX_ITEMS_PER_BRAND = 5;

interface EventBrandWithItems {
  event_brand_products?: { try_on_ready?: boolean | null }[] | null;
}

/** Brands, items and items ready for try-on in an event. */
export function eventCounts(brands: EventBrandWithItems[] | null | undefined) {
  const list = brands ?? [];
  const items = list.flatMap((b) => b.event_brand_products ?? []);
  return { brands: list.length, items: items.length, ready: items.filter((i) => i.try_on_ready).length };
}

/** "2 brands · 4 items" (or "No brands yet"). */
export function eventCountsLine(counts: { brands: number; items: number }): string {
  if (counts.brands === 0) return 'No brands yet';
  return `${plural(counts.brands, 'brand')} · ${plural(counts.items, 'item')}`;
}

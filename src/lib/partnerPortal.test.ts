import { describe, expect, it } from 'vitest';
import {
  eventCounts,
  eventCountsLine,
  eventPhase,
  eventPhaseLabel,
  formatDateRange,
  formatMoney,
  parseDay,
  plural,
  productIssues,
  productNextAction,
  productSummary,
} from './partnerPortal';

const TODAY = '2026-10-29';

describe('eventPhase', () => {
  it('is draft when not shown to shoppers', () => {
    expect(eventPhase({ status: 'draft', event_date: '2026-10-28', end_date: '2026-10-31' }, TODAY)).toBe('draft');
  });
  it('is live when shown and today is within the dates', () => {
    expect(eventPhase({ status: 'active', event_date: '2026-10-28', end_date: '2026-10-31' }, TODAY)).toBe('live');
    expect(eventPhase({ status: 'active', event_date: TODAY, end_date: TODAY }, TODAY)).toBe('live');
  });
  it('is upcoming when shown but it has not started', () => {
    expect(eventPhase({ status: 'active', event_date: '2026-11-28', end_date: '2026-11-29' }, TODAY)).toBe('upcoming');
  });
  it('is ended after the last day, even if still marked active', () => {
    expect(eventPhase({ status: 'active', event_date: '2026-09-19', end_date: '2026-09-21' }, TODAY)).toBe('ended');
  });
  it('is ended when marked ended', () => {
    expect(eventPhase({ status: 'ended', event_date: '2026-11-28', end_date: '2026-11-29' }, TODAY)).toBe('ended');
  });
  it('uses the start date when there is no end date', () => {
    expect(eventPhase({ status: 'active', event_date: '2026-10-28', end_date: null }, TODAY)).toBe('ended');
    expect(eventPhase({ status: 'active', event_date: TODAY, end_date: null }, TODAY)).toBe('live');
  });
  it('a draft past its dates reads as ended', () => {
    expect(eventPhase({ status: 'draft', event_date: '2026-09-19', end_date: '2026-09-21' }, TODAY)).toBe('ended');
  });
});

describe('eventPhaseLabel', () => {
  it('gives words and a tone for each phase', () => {
    // status keys for <StatusLabel>: Live green, the rest neutral (spec 7.23)
    expect(eventPhaseLabel('live')).toEqual({ label: 'Live', status: 'live' });
    expect(eventPhaseLabel('upcoming')).toEqual({ label: 'Upcoming', status: 'upcoming' });
    expect(eventPhaseLabel('draft')).toEqual({ label: 'Draft', status: 'hidden' });
    expect(eventPhaseLabel('ended')).toEqual({ label: 'Ended', status: 'ended' });
  });
});

describe('parseDay', () => {
  it('reads a date-only string as that local day (not UTC)', () => {
    const d = parseDay('2026-11-12')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 12]);
  });
  it('accepts a full timestamp and returns null for empty', () => {
    expect(parseDay('2026-11-12T10:00:00Z')).toBeInstanceOf(Date);
    expect(parseDay(null)).toBeNull();
    expect(parseDay('')).toBeNull();
  });
});

describe('formatDateRange', () => {
  it('one day', () => {
    expect(formatDateRange('2026-11-12', '2026-11-12', TODAY)).toBe('12 Nov');
    expect(formatDateRange('2026-11-12', null, TODAY)).toBe('12 Nov');
  });
  it('same month', () => {
    expect(formatDateRange('2026-11-12', '2026-11-14', TODAY)).toBe('12–14 Nov');
  });
  it('different months', () => {
    expect(formatDateRange('2026-11-28', '2026-12-02', TODAY)).toBe('28 Nov – 2 Dec');
  });
  it('adds the year when it is not this year', () => {
    expect(formatDateRange('2026-12-30', '2027-01-02', TODAY)).toBe('30 Dec 2026 – 2 Jan 2027');
    expect(formatDateRange('2027-03-01', '2027-03-03', TODAY)).toBe('1–3 Mar 2027');
  });
});

describe('formatMoney', () => {
  it('uses the product currency', () => {
    expect(formatMoney(32900, 'AED')).toBe('AED 329');
    expect(formatMoney(3450, 'AED')).toBe('AED 34.50');
    expect(formatMoney(1999, 'USD')).toBe('$19.99');
  });
  it('falls back for missing values', () => {
    expect(formatMoney(null, null)).toBe('No price');
    expect(formatMoney(0, 'AED')).toBe('No price');
    expect(formatMoney(1000, 'XXX-bad')).toBe('10.00');
  });
});

describe('plural', () => {
  it('counts in words', () => {
    expect(plural(1, 'product')).toBe('1 product');
    expect(plural(2, 'product')).toBe('2 products');
    expect(plural(0, 'item')).toBe('0 items');
    expect(plural(3, 'brand', 'brands')).toBe('3 brands');
  });
});

const p = (over: Record<string, unknown> = {}) => ({
  title: 'Linen dress',
  price_cents: 32900,
  media_urls: ['a.jpg'],
  category_slug: 'clothing',
  status: 'active',
  ...over,
});

describe('productIssues', () => {
  it('is empty for a complete product', () => {
    expect(productIssues(p())).toEqual([]);
  });
  it('lists what is missing, in the same words as the edit screen', () => {
    expect(productIssues(p({ title: 'Product 4', price_cents: 0, media_urls: [], category_slug: '' }))).toEqual([
      'Add a product name',
      'Add a price',
      'Add at least one photo',
      'Choose a category',
    ]);
  });
  it('handles media_urls stored as text', () => {
    expect(productIssues(p({ media_urls: '["a.jpg"]' }))).toEqual([]);
    expect(productIssues(p({ media_urls: null, image_url: 'b.jpg' }))).toEqual([]);
  });
});

describe('productNextAction', () => {
  it('Publish on pending, Edit otherwise', () => {
    expect(productNextAction(p({ status: 'draft' }))).toBe('publish');
    expect(productNextAction(p({ status: 'active' }))).toBe('edit');
    expect(productNextAction(p({ status: 'archived' }))).toBe('edit');
  });
});

describe('productSummary', () => {
  it('counts products, pending and live', () => {
    expect(productSummary([p(), p({ status: 'draft' }), p({ status: 'draft' }), p({ status: 'archived' })])).toBe(
      '4 products · 2 pending · 1 live',
    );
  });
  it('leaves out zero parts', () => {
    expect(productSummary([p()])).toBe('1 product · 1 live');
    expect(productSummary([])).toBe('No products yet');
  });
});

describe('eventCounts', () => {
  it('counts brands, items and ready items', () => {
    const counts = eventCounts([
      { event_brand_products: [{ try_on_ready: true }, { try_on_ready: false }, { try_on_ready: null }] },
      { event_brand_products: [{ try_on_ready: true }] },
      { event_brand_products: null },
    ]);
    expect(counts).toEqual({ brands: 3, items: 4, ready: 2 });
    expect(eventCounts(undefined)).toEqual({ brands: 0, items: 0, ready: 0 });
  });
  it('reads as a short line', () => {
    expect(eventCountsLine({ brands: 2, items: 4 })).toBe('2 brands · 4 items');
    expect(eventCountsLine({ brands: 1, items: 1 })).toBe('1 brand · 1 item');
    expect(eventCountsLine({ brands: 0, items: 0 })).toBe('No brands yet');
  });
});

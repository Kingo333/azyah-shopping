import { describe, expect, it, vi } from 'vitest';
import { loadContactEmail, saveContactEmail, withContactEmail } from './partnerContacts';

function fakeClient(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const upsert = vi.fn().mockResolvedValue({ error: result.error });
  const from = vi.fn().mockReturnValue({ select, upsert });
  return { client: { from }, from, select, eq, upsert };
}

describe('loadContactEmail', () => {
  it('reads a brand email from brand_contacts', async () => {
    const f = fakeClient({ data: { contact_email: 'hi@brand.test' }, error: null });
    expect(await loadContactEmail(f.client, 'brand', 'b1')).toBe('hi@brand.test');
    expect(f.from).toHaveBeenCalledWith('brand_contacts');
    expect(f.eq).toHaveBeenCalledWith('brand_id', 'b1');
  });

  it('reads a retailer email from retailer_contacts', async () => {
    const f = fakeClient({ data: { contact_email: 'hi@store.test' }, error: null });
    expect(await loadContactEmail(f.client, 'retailer', 'r1')).toBe('hi@store.test');
    expect(f.from).toHaveBeenCalledWith('retailer_contacts');
    expect(f.eq).toHaveBeenCalledWith('retailer_id', 'r1');
  });

  it('returns null when there is no row or the table is not there yet', async () => {
    expect(await loadContactEmail(fakeClient({ data: null, error: null }).client, 'brand', 'b1')).toBeNull();
    expect(await loadContactEmail(fakeClient({ data: null, error: { code: '42P01' } }).client, 'brand', 'b1')).toBeNull();
  });
});

describe('withContactEmail', () => {
  it('prefers the private email', () => {
    expect(withContactEmail({ id: 'b1', contact_email: null }, 'hi@brand.test')).toEqual({ id: 'b1', contact_email: 'hi@brand.test' });
  });
  it('keeps the old column value when there is no private email (before the database change)', () => {
    expect(withContactEmail({ id: 'b1', contact_email: 'old@brand.test' }, null)).toEqual({ id: 'b1', contact_email: 'old@brand.test' });
  });
  it('passes null rows through', () => {
    expect(withContactEmail(null, 'x@y.test')).toBeNull();
  });
});

describe('saveContactEmail', () => {
  it('upserts the trimmed email for the owner', async () => {
    const f = fakeClient({ data: null, error: null });
    expect(await saveContactEmail(f.client, 'brand', 'b1', '  hi@brand.test ')).toBe(true);
    expect(f.from).toHaveBeenCalledWith('brand_contacts');
    expect(f.upsert).toHaveBeenCalledWith({ brand_id: 'b1', contact_email: 'hi@brand.test' }, { onConflict: 'brand_id' });
  });
  it('stores an empty email as null so it can be cleared', async () => {
    const f = fakeClient({ data: null, error: null });
    await saveContactEmail(f.client, 'retailer', 'r1', '   ');
    expect(f.upsert).toHaveBeenCalledWith({ retailer_id: 'r1', contact_email: null }, { onConflict: 'retailer_id' });
  });
  it('reports failure without throwing', async () => {
    const f = fakeClient({ data: null, error: { code: '42P01' } });
    expect(await saveContactEmail(f.client, 'brand', 'b1', 'x@y.test')).toBe(false);
  });
});

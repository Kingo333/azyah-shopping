import { describe, expect, it } from 'vitest';
import { BULK_UPLOAD_STATUS, productStatusLabel, publishProblems } from './productPublishing';

describe('BULK_UPLOAD_STATUS', () => {
  it('saves bulk uploads as pending (draft), never straight to shoppers', () => {
    expect(BULK_UPLOAD_STATUS).toBe('draft');
  });
});

describe('productStatusLabel', () => {
  it('names each status in plain words', () => {
    expect(productStatusLabel('draft')).toBe('Pending');
    expect(productStatusLabel('active')).toBe('Live');
    expect(productStatusLabel('archived')).toBe('Archived');
    expect(productStatusLabel('out_of_stock')).toBe('Out of stock');
    expect(productStatusLabel('sold_out')).toBe('Sold out');
    expect(productStatusLabel('inactive')).toBe('Hidden');
  });
  it('falls back to the raw value for anything new', () => {
    expect(productStatusLabel('something_new')).toBe('something new');
  });
});

describe('publishProblems', () => {
  const ready = { title: 'Linen wrap dress', price: '340', images: ['https://x/a.jpg'], category: 'clothing' };

  it('has no problems for a complete product', () => {
    expect(publishProblems(ready)).toEqual([]);
  });
  it('asks for a real name instead of the bulk-upload placeholder', () => {
    expect(publishProblems({ ...ready, title: 'Product 3' })).toContain('Add a product name');
    expect(publishProblems({ ...ready, title: '   ' })).toContain('Add a product name');
  });
  it('asks for a price above zero', () => {
    expect(publishProblems({ ...ready, price: '0' })).toContain('Add a price');
    expect(publishProblems({ ...ready, price: '' })).toContain('Add a price');
    expect(publishProblems({ ...ready, price: 'abc' })).toContain('Add a price');
  });
  it('asks for at least one photo', () => {
    expect(publishProblems({ ...ready, images: [] })).toContain('Add at least one photo');
  });
  it('asks for a category', () => {
    expect(publishProblems({ ...ready, category: '' })).toContain('Choose a category');
  });
  it('lists every problem at once', () => {
    expect(publishProblems({ title: 'Product 1', price: '0', images: [], category: '' })).toHaveLength(4);
  });
});

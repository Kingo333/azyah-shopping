// How brand and retailer products move from "pending" to "live".
// Shoppers only ever see 'active' products (database rule), so a bulk
// upload stays pending until the partner fills in the details and publishes.

/** Bulk uploads are saved as pending (the 'draft' status), never live. */
export const BULK_UPLOAD_STATUS = 'draft' as const;

const LABELS: Record<string, string> = {
  draft: 'Pending',
  active: 'Live',
  archived: 'Archived',
  inactive: 'Hidden',
  out_of_stock: 'Out of stock',
  sold_out: 'Sold out',
};

export function productStatusLabel(status: string): string {
  return LABELS[status] ?? status.replace(/_/g, ' ');
}

/** What's missing before a product can go live; empty means ready to publish. */
export function publishProblems(product: {
  title: string;
  price: string;
  images: string[];
  category: string;
}): string[] {
  const problems: string[] = [];
  const title = product.title.trim();
  if (!title || /^Product \d+$/i.test(title)) problems.push('Add a product name');
  const price = Number(product.price);
  if (!product.price.trim() || !Number.isFinite(price) || price <= 0) problems.push('Add a price');
  if (product.images.length === 0) problems.push('Add at least one photo');
  if (!product.category.trim()) problems.push('Choose a category');
  return problems;
}

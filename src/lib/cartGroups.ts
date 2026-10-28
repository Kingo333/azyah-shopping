// The bag (design v3) groups items by where they're sold: the site of the
// product's link. Each group gets one "Buy on [seller]" button (spec 7.13, B11).

export interface CartLine {
  quantity: number;
  product: {
    external_url?: string | null;
    merchant_name?: string | null;
    brand?: { name?: string | null } | null;
    price_cents: number;
  };
}

export interface CartGroup<T extends CartLine> {
  key: string;
  seller: string;
  items: T[];
  buyUrl: string | null;
  subtotalCents: number;
}

export const OFFLINE_GROUP_KEY = 'offline';

function siteOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== 'https:' && protocol !== 'http:') return null;
    return hostname.replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

export function groupCartBySeller<T extends CartLine>(items: T[]): CartGroup<T>[] {
  const groups = new Map<string, CartGroup<T>>();
  const offline: CartGroup<T> = { key: OFFLINE_GROUP_KEY, seller: 'Not sold online yet', items: [], buyUrl: null, subtotalCents: 0 };

  for (const item of items) {
    const site = siteOf(item.product.external_url);
    const lineTotal = item.product.price_cents * item.quantity;
    if (!site) {
      offline.items.push(item);
      offline.subtotalCents += lineTotal;
      continue;
    }
    let group = groups.get(site);
    if (!group) {
      const seller = item.product.merchant_name?.trim() || item.product.brand?.name?.trim() || site;
      group = { key: site, seller, items: [], buyUrl: item.product.external_url ?? null, subtotalCents: 0 };
      groups.set(site, group);
    }
    group.items.push(item);
    group.subtotalCents += lineTotal;
  }

  const result = [...groups.values()];
  if (offline.items.length > 0) result.push(offline);
  return result;
}

import React from 'react';
import { ImageOff } from 'lucide-react';
import { StatusLabel } from '@/components/StatusLabel';
import { productStatusLabel } from '@/lib/productPublishing';
import { formatMoney, productImages, productIssues, productNextAction, type PartnerProductLike } from '@/lib/partnerPortal';
import { cn } from '@/lib/utils';

export interface PartnerProductRow extends PartnerProductLike {
  id: string;
  currency?: string | null;
  brand?: { name?: string | null } | null;
}

interface PartnerProductListProps<T extends PartnerProductRow> {
  products: T[];
  /** Used when a product has no currency of its own. */
  fallbackCurrency?: string;
  /** Store portal: show which brand each product is from. */
  showBrand?: boolean;
  onOpen?: (product: T) => void;
  onEdit: (product: T) => void;
  onPublish: (product: T) => void;
  /** Ids being published right now (the button shows "Publishing…"). */
  busyIds?: Set<string>;
  selection?: { selected: Set<string>; toggle: (id: string) => void };
}

/**
 * Products as rows (spec 7.23): photo, name (+ what's missing), price, status,
 * and the next action in the same spot on every row.
 */
export function PartnerProductList<T extends PartnerProductRow>({
  products,
  fallbackCurrency = 'AED',
  showBrand,
  onOpen,
  onEdit,
  onPublish,
  busyIds,
  selection,
}: PartnerProductListProps<T>) {
  return (
    <div className="overflow-hidden rounded-[20px] bg-card">
      <div className="hidden grid-cols-[minmax(0,1fr)_120px_110px_96px] gap-4 border-b border-line px-4 py-2.5 text-[12px] text-ink-2 md:grid">
        <span className={cn(selection && 'pl-8')}>Product</span>
        <span className="text-right">Price</span>
        <span>Status</span>
        <span className="sr-only">Action</span>
      </div>
      <ul>
        {products.map((product, i) => {
          const image = productImages(product)[0];
          const action = productNextAction(product);
          const issue = product.status === 'draft' ? productIssues(product)[0] : undefined;
          const meta = [showBrand ? product.brand?.name : null, issue].filter(Boolean).join(' · ');
          const price = formatMoney(product.price_cents, product.currency || fallbackCurrency);
          const busy = busyIds?.has(product.id);
          const status = (
            <StatusLabel status={product.status}>{productStatusLabel(product.status)}</StatusLabel>
          );
          return (
            <li
              key={product.id}
              className={cn(
                'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_120px_110px_96px] md:gap-4',
                i > 0 && 'border-t border-line',
              )}
            >
              <div className="contents md:flex md:min-w-0 md:items-center md:gap-3">
                <div className="flex items-center gap-3">
                  {selection && (
                    <input
                      type="checkbox"
                      className="h-5 w-5 shrink-0 accent-[hsl(var(--ink))]"
                      checked={selection.selected.has(product.id)}
                      onChange={() => selection.toggle(product.id)}
                      aria-label={`Select ${product.title || 'product'}`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => (onOpen ?? onEdit)(product)}
                    className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-fill"
                    aria-label={`Open ${product.title || 'product'}`}
                  >
                    {image ? (
                      <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-ink-3">
                        <ImageOff className="h-5 w-5" aria-hidden />
                      </span>
                    )}
                  </button>
                </div>
                <button type="button" onClick={() => (onOpen ?? onEdit)(product)} className="min-w-0 text-left">
                  <p className="truncate text-[15px] text-ink">{product.title || 'Untitled product'}</p>
                  {meta && <p className="truncate text-[13px] text-ink-2">{meta}</p>}
                  {/* Phone: price and status under the name */}
                  <p className="mt-1 flex items-center gap-2 text-[13px] text-ink-2 md:hidden">
                    <span className="tabular-nums">{price}</span>
                    {status}
                  </p>
                </button>
              </div>
              <span className="hidden text-right text-[15px] tabular-nums md:block">{price}</span>
              <span className="hidden md:block">{status}</span>
              <div className="flex justify-end">
                {action === 'publish' ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onPublish(product)}
                    className="min-h-[36px] rounded-full bg-ink px-4 text-[14px] font-medium text-white disabled:opacity-60 dark:text-black"
                  >
                    {busy ? 'Publishing…' : 'Publish'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onEdit(product)}
                    className="min-h-[36px] rounded-full px-3 text-[14px] text-ink-2 hover:bg-fill hover:text-ink"
                  >
                    Edit
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * URL-friendly slug generation utilities.
 * Used for creating human-readable share URLs.
 */

/**
 * Convert a string to a URL-friendly slug.
 * - Lowercase
 * - Replace non-alphanumeric with hyphens
 * - Trim leading/trailing hyphens
 * - Max 60 characters
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Build outfit share slug: "{creator}-closet-{title}"
 */
export function buildOutfitSlug(
  creatorName: string | null | undefined,
  outfitTitle: string | null | undefined,
  outfitId?: string
): string {
  const creator = creatorName || 'azyah-user';
  const title = outfitTitle || 'outfit';
  const base = slugify(`${creator}-closet-${title}`);
  // If slug is empty, use short ID suffix
  return base || `outfit-${outfitId?.slice(0, 8) || 'share'}`;
}

/**
 * Build item share slug: "{creator}-closet-item" or "{brand}-{category}"
 */
export function buildItemSlug(
  creatorName: string | null | undefined,
  brand: string | null | undefined,
  category: string | null | undefined,
  itemId?: string
): string {
  if (creatorName) {
    return slugify(`${creatorName}-closet-item`);
  }
  if (brand || category) {
    const parts = [brand, category].filter(Boolean).join('-');
    return slugify(parts);
  }
  return `item-${itemId?.slice(0, 8) || 'share'}`;
}

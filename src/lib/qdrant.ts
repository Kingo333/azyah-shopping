import { QdrantClient } from '@qdrant/js-client-rest';

export const qdrant = new QdrantClient({
  url: 'http://localhost:6333', // Default Qdrant URL - update with environment
  apiKey: undefined // Update with environment
});

export const COLLECTION_DOCS = "kb_beauty_docs";
export const COLLECTION_PRODUCTS = "kb_products";

export type ProductPayload = {
  product_id: string;
  brand: string;
  name: string;
  category: "primer" | "foundation" | "concealer" | "brow" | "eyeliner" | "bronzer" | "shadow";
  finish?: "matte" | "natural" | "glow" | "satin";
  coverage?: "light" | "medium" | "full";
  undertone_tags?: string[];
  shade_name?: string;
  shade_hex?: string;
  price: number;
  currency: string;
  region?: string[];
  url?: string;
  image_url?: string;
  availability?: "in_stock" | "out_of_stock";
  popularity_score?: number;
  brand_tier?: "drugstore" | "mid" | "premium";
  tags?: string[];
  last_seen_at: string;
};

export const normalizeProductString = (p: ProductPayload) =>
  `brand:${p.brand}; name:${p.name}; category:${p.category}; finish:${p.finish ?? ""}; coverage:${p.coverage ?? ""}; undertone:${(p.undertone_tags ?? []).join("|")}; shade:${p.shade_name ?? ""}; price:${p.price} ${p.currency}; region:${(p.region ?? []).join("|")}; tags:${(p.tags ?? []).join("|")}; tier:${p.brand_tier ?? ""}`;

export async function embedQuery(query: string): Promise<number[]> {
  // Placeholder for embedding function
  // In real implementation, use OpenAI embeddings
  return new Array(1536).fill(0).map(() => Math.random());
}

export function tierFromPriceAED(aed: number): "drugstore" | "mid" | "premium" {
  const dMax = 60; // AZ_PRICE_TIER_DRUGSTORE_MAX
  const mMax = 180; // AZ_PRICE_TIER_MID_MAX
  if (aed <= dMax) return "drugstore";
  if (aed <= mMax) return "mid";
  return "premium";
}
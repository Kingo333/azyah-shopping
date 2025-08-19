import { qdrant, COLLECTION_PRODUCTS, embedQuery, ProductPayload } from './qdrant';

export async function findGroundedProducts(
  query: string, 
  category: string, 
  region = "AE"
): Promise<{ drugstore: ProductPayload | null; mid: ProductPayload | null; premium: ProductPayload | null }> {
  try {
    const limit = 12;
    const vector = await embedQuery(query);
    
    const res = await qdrant.search(COLLECTION_PRODUCTS, {
      vector,
      limit,
      with_payload: true,
      filter: {
        must: [
          { key: "category", match: { value: category } },
          { key: "region", match: { any: [region] } }
        ]
      }
    });

    const items = (res ?? [])
      .map((p: any) => p.payload as ProductPayload)
      .filter((p: ProductPayload) => p.category === category);

    // Group by price tier
    const tiers = { 
      drugstore: null as ProductPayload | null, 
      mid: null as ProductPayload | null, 
      premium: null as ProductPayload | null 
    };
    
    for (const tier of ["drugstore", "mid", "premium"] as const) {
      tiers[tier] = items.find((i: ProductPayload) => i.brand_tier === tier) ?? null;
    }
    
    // Fill empty tiers with remaining items
    const remaining = items.filter(i => !Object.values(tiers).includes(i));
    if (!tiers.drugstore && remaining.length > 0) tiers.drugstore = remaining.shift()!;
    if (!tiers.mid && remaining.length > 0) tiers.mid = remaining.shift()!;
    if (!tiers.premium && remaining.length > 0) tiers.premium = remaining.shift()!;

    return tiers;
  } catch (error) {
    console.error('Error finding grounded products:', error);
    return { drugstore: null, mid: null, premium: null };
  }
}

export async function searchBeautyDocs(query: string, limit = 5): Promise<any[]> {
  try {
    const vector = await embedQuery(query);
    
    const res = await qdrant.search("kb_beauty_docs", {
      vector,
      limit,
      with_payload: true
    });

    return (res ?? []).map((p: any) => ({
      content: p.payload.content,
      source_type: p.payload.source_type,
      file_name: p.payload.file_name,
      score: p.score
    }));
  } catch (error) {
    console.error('Error searching beauty docs:', error);
    return [];
  }
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-key",
};

type SerperShoppingItem = {
  title?: string;
  price?: string;
  imageUrl?: string;
  link?: string;
  source?: string; // merchant/store
  productId?: string;
};

type IngestSummary = {
  source: "serper";
  started_at: string;
  finished_at: string;
  attempted: number;
  valid: number;
  inserted: number;
  updated: number;
  rejected: number;
  status: "pending" | "dry_run" | "completed" | "failed";
  reasons?: Record<string, number>;
  notes?: Record<string, unknown>;
};

const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY");
const SERPER_COUNTRY = (Deno.env.get("SERPER_COUNTRY") || "ae").toLowerCase();
const SERPER_LOCALE = (Deno.env.get("SERPER_LOCALE") || "en").toLowerCase();
const FEATURE_SERPER_INGEST = (Deno.env.get("FEATURE_SERPER_INGEST") || "false").toLowerCase() === "true";
const CRON_KEY = Deno.env.get("SERPER_INGEST_CRON_KEY");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const QUERIES: string[] = [
  "abaya summer 2025",
  "modest fashion dresses",
  "men’s linen shirts",
  "sneakers white women",
  "perfume oud unisex",
  "abaya satin",
  "activewear modest",
  "heels evening",
  "abaya black",
  "abaya open front",
  "abaya kimono",
  "abaya embellished",
  "kaftan women",
  "evening clutch",
  "gold earrings",
  "white sneakers men",
  "linen shirt men",
  "eau de parfum women"
];

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

const textHashSHA256 = async (text: string) => {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const sanitizeUrl = (urlStr?: string): string | null => {
  if (!urlStr) return null;
  try {
    const u = new URL(urlStr);
    // Drop obvious tracking parameters
    const paramsToDrop = new Set([
      "gclid","gclsrc","fbclid","utm_source","utm_medium","utm_campaign","utm_term","utm_content","utm_id","irclickid","affid","affiliate","cid"
    ]);
    [...u.searchParams.keys()].forEach((k) => {
      if (paramsToDrop.has(k)) u.searchParams.delete(k);
    });
    u.hash = "";
    if (!/^https?:$/.test(u.protocol)) return null;
    return u.toString();
  } catch {
    return null;
  }
};

const getDomain = (urlStr: string): string => {
  try {
    return new URL(urlStr).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
};

const parsePrice = (priceRaw?: string): { cents: number | null; currency: string | null } => {
  if (!priceRaw) return { cents: null, currency: null };
  const m = priceRaw.match(/([A-Z]{3}|\$|£|€|AED|SAR|QAR|KWD|BHD)?\s*([\d.,]+)/i);
  const amount = m?.[2] ? parseFloat(m[2].replace(/,/g, "")) : NaN;
  let currency = "USD";
  const map: Record<string, string> = {
    "$": "USD", "£": "GBP", "€": "EUR",
    "AED": "AED", "SAR": "SAR", "QAR": "QAR", "KWD": "KWD", "BHD": "BHD"
  };
  if (m && m[1]) {
    currency = map[m[1].toUpperCase()] || (m[1].length === 3 ? m[1].toUpperCase() : "USD");
  }
  if (!isFinite(amount)) return { cents: null, currency: null };
  return { cents: Math.round(amount * 100), currency };
};

const imageLooksValid = async (url: string) => {
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (!res.ok) return false;
    const ctype = res.headers.get("content-type") || "";
    return ctype.startsWith("image/");
  } catch {
    return false;
  }
};

const mapCategory = (title: string, url: string): { category: string; sub?: string } => {
  const t = `${title} ${url}`.toLowerCase();
  if (t.includes("abaya")) return { category: "modestwear", sub: "abayas" };
  if (t.includes("sneaker")) return { category: "footwear", sub: "sneakers" };
  if (/(perfume|oud|eau de parfum|eau-de-parfum|edp)/.test(t)) return { category: "fragrance" };
  if (/(heel|pump|stiletto)/.test(t)) return { category: "footwear", sub: "heels" };
  if (/(earring|necklace|bracelet|ring)/.test(t)) return { category: "jewelry" };
  if (/(clutch|handbag|bag)/.test(t)) return { category: "accessories", sub: "handbags" };
  if (/(linen shirt)/.test(t)) return { category: "clothing", sub: "shirts" };
  return { category: "clothing" };
};

const fetchSerperShopping = async (query: string, num = 30): Promise<SerperShoppingItem[]> => {
  if (!SERPER_API_KEY) throw new Error("SERPER_API_KEY not configured");
  const body = { q: query, gl: SERPER_COUNTRY, hl: SERPER_LOCALE, num };
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch("https://google.serper.dev/shopping", {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (res.status === 429 || res.status >= 500) {
      console.warn(`Serper.dev backoff (status ${res.status}), attempt ${attempt}`);
      await sleep(600 * attempt);
      continue;
    }
    if (!res.ok) throw new Error(`Serper.dev HTTP ${res.status}`);
    const json = await res.json();
    const items: SerperShoppingItem[] = json.shopping || [];
    return items;
  }
  return [];
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = new Date().toISOString();
  let summary: IngestSummary = {
    source: "serper",
    started_at: startedAt,
    finished_at: startedAt,
    attempted: 0,
    valid: 0,
    inserted: 0,
    updated: 0,
    rejected: 0,
    status: "pending",
    reasons: {},
    notes: {},
  };

  try {
    const url = new URL(req.url);
    const { dryRun = true, queries } = await req.json().catch(() => ({ dryRun: true })) as { dryRun?: boolean; queries?: string[] };

    // Authorization: allow either CRON key or authenticated admin user
    const cronKeyHeader = req.headers.get("x-cron-key");
    const hasCronAccess = !!CRON_KEY && cronKeyHeader === CRON_KEY;

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let isAdmin = false;
    if (!hasCronAccess) {
      // Check auth user role
      const { data: authUser } = await anonClient.auth.getUser();
      const uid = authUser?.user?.id;
      if (uid) {
        const { data: u } = await anonClient.from("users").select("role").eq("id", uid).maybeSingle();
        isAdmin = u?.role === "admin";
      }
    }

    if (!hasCronAccess && !isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    if (!FEATURE_SERPER_INGEST && !dryRun) {
      return new Response(JSON.stringify({ error: "Feature disabled", feature: "serper_ingest" }), { status: 403, headers: corsHeaders });
    }

    const intents = Array.isArray(queries) && queries.length > 0 ? queries : QUERIES;
    const perQuery = 30; // modest to avoid rate issues
    const maxUnique = 320;

    const uniqueByUrl = new Map<string, SerperShoppingItem>();
    const reasons: Record<string, number> = {};
    const perMerchantCounts: Record<string, number> = {};

    // Fetch in series with small backoff to be gentle
    for (const q of intents) {
      console.log("Fetching Serper shopping:", q);
      const items = await fetchSerperShopping(q, perQuery);
      summary.attempted += items.length;

      for (const it of items) {
        const sanitized = sanitizeUrl(it.link);
        if (!sanitized) {
          reasons["invalid_url"] = (reasons["invalid_url"] || 0) + 1;
          continue;
        }
        if (!uniqueByUrl.has(sanitized)) {
          uniqueByUrl.set(sanitized, it);
        }
        if (uniqueByUrl.size >= maxUnique) break;
      }
      await sleep(250);
      if (uniqueByUrl.size >= maxUnique) break;
    }

    // Normalize and validate
    type Normalized = {
      title: string;
      source_url: string;
      image_url: string;
      price_raw: string;
      price_cents: number;
      currency: string;
      merchant_name: string;
      external_id: string;
      category_slug: string;
      subcategory_slug?: string;
      sku: string;
      media_urls: string[];
    };

    const normalized: Normalized[] = [];
    for (const [srcUrl, item] of uniqueByUrl.entries()) {
      const title = (item.title || "Product").slice(0, 180).trim();
      const image = item.imageUrl ? sanitizeUrl(item.imageUrl) : null;
      if (!image) {
        reasons["no_image"] = (reasons["no_image"] || 0) + 1;
        continue;
      }
      const priceInfo = parsePrice(item.price);
      if (priceInfo.cents == null || !priceInfo.currency) {
        reasons["bad_price"] = (reasons["bad_price"] || 0) + 1;
        continue;
      }
      const okImg = await imageLooksValid(image);
      if (!okImg) {
        reasons["dead_image"] = (reasons["dead_image"] || 0) + 1;
        continue;
      }

      const merchant = (item.source && item.source.trim()) || getDomain(srcUrl);
      perMerchantCounts[merchant] = perMerchantCounts[merchant] || 0;
      if (perMerchantCounts[merchant] >= 40) {
        reasons["merchant_cap"] = (reasons["merchant_cap"] || 0) + 1;
        continue;
      }
      perMerchantCounts[merchant]++;

      const { category, sub } = mapCategory(title, srcUrl);
      const eid = await textHashSHA256(srcUrl);
      normalized.push({
        title,
        source_url: srcUrl,
        image_url: image,
        price_raw: item.price || "",
        price_cents: priceInfo.cents!,
        currency: priceInfo.currency || "USD",
        merchant_name: merchant,
        external_id: eid,
        category_slug: category,
        subcategory_slug: sub,
        sku: `serper-${eid.slice(0, 12)}`,
        media_urls: [image],
      });
    }

    summary.valid = normalized.length;

    if (!dryRun && normalized.length < 200) {
      summary.status = "failed";
      summary.finished_at = new Date().toISOString();
      summary.rejected = summary.attempted - summary.valid;
      summary.reasons = reasons;
      // write run summary as failed
      await serviceClient.from("ingest_runs").insert({
        source: "serper",
        started_at: summary.started_at,
        finished_at: summary.finished_at,
        attempted: summary.attempted,
        inserted: 0,
        updated: 0,
        rejected: summary.rejected,
        status: "failed",
        notes: { reasons },
      });
      return new Response(JSON.stringify({ error: "Not enough valid items", summary }), { status: 409, headers: corsHeaders });
    }

    // Build batches of 50
    const batches: Normalized[][] = [];
    for (let i = 0; i < normalized.length; i += 50) {
      batches.push(normalized.slice(i, i + 50));
    }

    let inserted = 0;
    let updated = 0;

    if (!dryRun) {
      for (const batch of batches) {
        const extIds = batch.map((b) => b.external_id);
        const { data: existing } = await serviceClient
          .from("products")
          .select("id, external_id")
          .eq("external_source", "serper")
          .in("external_id", extIds);

        const existingIds = new Set((existing || []).map((e: any) => e.external_id));

        const toInsert = batch.filter((b) => !existingIds.has(b.external_id)).map((b) => ({
          title: b.title,
          description: null,
          price_cents: b.price_cents,
          compare_at_price_cents: null,
          currency: b.currency,
          category_slug: b.category_slug,
          subcategory_slug: b.subcategory_slug || null,
          attributes: {},
          media_urls: b.media_urls,
          ar_mesh_url: null,
          external_url: b.source_url,
          source_url: b.source_url,
          image_url: b.image_url,
          price_raw: b.price_raw,
          merchant_name: b.merchant_name,
          category_guess: [b.category_slug, b.subcategory_slug].filter(Boolean),
          stock_qty: 0,
          min_stock_alert: 5,
          status: "active",
          weight_grams: null,
          dimensions: null,
          tags: [],
          seo_title: null,
          seo_description: null,
          retailer_id: null,
          brand_id: null,
          is_partner_item: false,
          affiliate_url: null,
          external_source: "serper",
          external_id: b.external_id,
          sku: b.sku,
        }));

        const toUpdate = batch.filter((b) => existingIds.has(b.external_id));

        if (toInsert.length > 0) {
          const { error: insertErr } = await serviceClient
            .from("products")
            .insert(toInsert);
          if (insertErr) {
            console.error("Insert error:", insertErr);
          } else {
            inserted += toInsert.length;
          }
        }

        if (toUpdate.length > 0) {
          // Update mutable fields on existing products
          const { error: updateErr } = await serviceClient
            .from("products")
            .update({
              // never touch is_partner_item on updates
              price_cents: null, // set individually below with upserts via loop as varying
            })
            .eq("id", "00000000-0000-0000-0000-000000000000"); // no-op; we will update per external_id below due to differing values

          // Update per external_id with differing values
          for (const u of toUpdate) {
            const { error } = await serviceClient
              .from("products")
              .update({
                price_cents: u.price_cents,
                currency: u.currency,
                price_raw: u.price_raw,
                merchant_name: u.merchant_name,
                image_url: u.image_url,
                source_url: u.source_url,
                external_url: u.source_url,
                category_guess: [u.category_slug, u.subcategory_slug].filter(Boolean),
                media_urls: u.media_urls,
                updated_at: new Date().toISOString(),
              })
              .eq("external_source", "serper")
              .eq("external_id", u.external_id);
            if (error) {
              console.error("Update error:", error);
            } else {
              updated += 1;
            }
          }
        }
        await sleep(150);
      }
    }

    summary.inserted = inserted;
    summary.updated = updated;
    summary.rejected = summary.attempted - summary.valid;
    summary.reasons = reasons;
    summary.status = dryRun ? "dry_run" : "completed";
    summary.finished_at = new Date().toISOString();

    // Store run summary
    await serviceClient.from("ingest_runs").insert({
      source: "serper",
      started_at: summary.started_at,
      finished_at: summary.finished_at,
      attempted: summary.attempted,
      inserted: summary.inserted,
      updated: summary.updated,
      rejected: summary.rejected,
      status: summary.status,
      notes: { reasons, country: SERPER_COUNTRY, locale: SERPER_LOCALE, dryRun },
    });

    return new Response(JSON.stringify({ success: true, summary }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("serper-weekly-ingest error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), { status: 500, headers: corsHeaders });
  }
});

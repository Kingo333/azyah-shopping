import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RecItem = {
  name: string; brand?: string; finish?: string; why_it_matches: string;
  shade_family?: string; price_tier?: "drugstore"|"mid"|"premium";
  alt_options?: string[]; price?: number; currency?: string;
  image_url?: string; url?: string; availability?: string; rating?: number;
};

type BeautyConsultation = {
  skin_profile: {
    tone_depth: "fair"|"light"|"medium"|"tan"|"deep";
    undertone: "cool"|"warm"|"neutral"|"olive";
    skin_type: "dry"|"oily"|"combination"|"normal"|"sensitive";
    visible_concerns: string[];
    confidence: number;
  };
  questions?: string[];
  recommendations: {
    primer: RecItem[];
    foundation_concealer: RecItem[];
    brows_eyeliner_bronzer: RecItem[];
    shadow_palette: RecItem[];
  };
  technique_notes: string[];
  real_products?: boolean;
  lighting_note?: string;
};

const SYSTEM_PROMPT = `
You are "Azyah Beauty Consultant", a licensed-quality makeup artist.
Cosmetic advice only (never medical). Be concise, friendly, factual.
GOAL
1) From the user's selfie, infer: skin_type, tone_depth, undertone, visible_concerns. Include confidence 0..1.
2) Ask at most 2 clarifying questions if essential.
3) Return ranked recommendations for: Primer; Foundation/Concealer; Brows/Eyeliner/Bronzer; Shadow Palette.
   Each RecItem: name, finish, why_it_matches, shade_family (generic), price_tier (drugstore|mid|premium). Add alt_options if helpful.
4) Add technique_notes tied to face traits (e.g., liner angle, brow shape).
RULES
- If lighting looks warm/cool or low, include a lighting_note and temper confidence.
- If unsure of exact shade numbers, give shade families (2–3) across price tiers.
- Never give medical claims.
- Return EXACTLY the JSON schema provided by the app.
`;

const schema = {
  type: "object",
  properties: {
    skin_profile: {
      type: "object",
      properties: {
        tone_depth: { enum: ["fair","light","medium","tan","deep"] },
        undertone: { enum: ["cool","warm","neutral","olive"] },
        skin_type: { enum: ["dry","oily","combination","normal","sensitive"] },
        visible_concerns: { type: "array", items: { type: "string" } },
        confidence: { type: "number", minimum: 0, maximum: 1 }
      },
      required: ["tone_depth","undertone","skin_type","visible_concerns","confidence"]
    },
    questions: { type: "array", items: { type: "string" }, maxItems: 2 },
    recommendations: {
      type: "object",
      properties: {
        primer: { type: "array", items: { $ref: "#/$defs/RecItem" } },
        foundation_concealer: { type: "array", items: { $ref: "#/$defs/RecItem" } },
        brows_eyeliner_bronzer: { type: "array", items: { $ref: "#/$defs/RecItem" } },
        shadow_palette: { type: "array", items: { $ref: "#/$defs/RecItem" } }
      },
      required: ["primer","foundation_concealer","brows_eyeliner_bronzer","shadow_palette"]
    },
    technique_notes: { type: "array", items: { type: "string" } },
    lighting_note: { type: "string" }
  },
  required: ["skin_profile","recommendations","technique_notes"],
  $defs: {
    RecItem: {
      type: "object",
      properties: {
        name: { type: "string" },
        brand: { type: "string" },
        finish: { type: "string" },
        why_it_matches: { type: "string" },
        shade_family: { type: "string" },
        price_tier: { enum: ["drugstore","mid","premium"] },
        alt_options: { type: "array", items: { type: "string" } }
      },
      required: ["name","why_it_matches"]
    }
  },
  additionalProperties: false
};

function toDataURLParts(input: string) {
  // Accept dataURL OR raw base64. Returns `data:<mime>;base64,<b64>`
  if (input.startsWith("data:")) return input;
  // try to guess jpeg if not provided
  return `data:image/jpeg;base64,${input}`;
}

async function openAIAnalyze(imageDataOrURL: string, prefs?: any) {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
  const MODEL = Deno.env.get("AZ_VISION_MODEL") ?? "gpt-4o";
  const body = {
    model: MODEL,
    instructions: SYSTEM_PROMPT,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: "Analyze my selfie and return ONLY JSON per the schema." },
          { type: "input_image", image_url: toDataURLParts(imageDataOrURL), detail: "auto" },
          ...(prefs ? [{ type: "input_text", text: `Preferences: ${JSON.stringify(prefs)}` }] : [])
        ]
      }
    ],
    response_format: { type: "json_schema", json_schema: { name: "BeautyConsultation", schema, strict: true } },
    max_output_tokens: 2000
  };

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`OpenAI Responses error ${res.status}: ${JSON.stringify(data)}`);
  }
  // Structured Outputs => find output_json item:
  const json =
    data.output?.[0]?.content?.find?.((c: any) => c.type === "output_json")?.json ??
    data.output?.[0]?.content?.[0]?.json;
  if (!json) throw new Error("Model did not return JSON (check schema).");
  return json as BeautyConsultation;
}

/** Simple live product fetcher via SerpAPI (Google Shopping / Web) */
async function fetchOnlineProducts(q: string, limit = 3) : Promise<RecItem[]> {
  const key = Deno.env.get("SERPAPI_API_KEY");
  if (!key) return [];
  // Google Shopping search:
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_shopping");
  url.searchParams.set("q", q);
  url.searchParams.set("api_key", key);
  url.searchParams.set("num", String(Math.max(3, limit)));

  const r = await fetch(url.toString());
  const j = await r.json();

  const items: RecItem[] = (j.shopping_results ?? []).slice(0, limit).map((it: any) => ({
    name: it.title,
    brand: it.source || it.brand,
    finish: undefined,
    why_it_matches: "Matched to your tone/undertone and category keywords.",
    shade_family: undefined,
    price_tier: undefined,
    price: it.price ? Number(String(it.price).replace(/[^\d.]/g, "")) : undefined,
    currency: it.currency || (it.price ? (String(it.price).match(/[A-Z]{3}/)?.[0] ?? undefined) : undefined),
    image_url: it.thumbnail || it.product_photos?.[0],
    url: it.link,
    availability: it.is_store_local ? "in_stock" : undefined,
    rating: it.rating
  }));

  // fallback to regular web results if shopping empty
  if (!items.length) {
    const wurl = new URL("https://serpapi.com/search.json");
    wurl.searchParams.set("engine", "google");
    wurl.searchParams.set("q", q);
    wurl.searchParams.set("api_key", key);
    const wr = await fetch(wurl.toString());
    const wj = await wr.json();
    return (wj.organic_results ?? []).slice(0, limit).map((r: any) => ({
      name: r.title,
      brand: new URL(r.link).hostname.replace("www.",""),
      why_it_matches: "Top web match for your category & undertone.",
      price_tier: undefined,
      url: r.link,
      image_url: r.thumbnail
    }));
  }

  return items;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method === "GET") {
    return new Response(JSON.stringify({
      ok: true,
      hasOPENAI: !!Deno.env.get("OPENAI_API_KEY"),
      visionModel: Deno.env.get("AZ_VISION_MODEL") ?? "unset"
    }), { headers: { ...cors, "Content-Type": "application/json" }});
  }

  try {
    const { image_base64, prefs, user_id } = await req.json();
    if (!image_base64) {
      return new Response(JSON.stringify({ error: "Image is required" }), { status: 400, headers: cors });
    }

    // 1) Analyze selfie with vision model → strict JSON
    const consultation = await openAIAnalyze(image_base64, prefs);

    // 2) Fetch live products from the web per category (simple queries)
    const region = Deno.env.get("REGION_CODE") ?? "AE";
    const qbits = (p: BeautyConsultation["skin_profile"]) =>
      `${p.tone_depth} ${p.undertone} ${p.skin_type} ${region}`;

    const live: Record<string, RecItem[]> = {};
    const skin = consultation.skin_profile;

    live.primer = await fetchOnlineProducts(`primer for ${qbits(skin)} makeup`, 3);
    live.foundation_concealer = await fetchOnlineProducts(`foundation concealer ${skin.tone_depth} ${skin.undertone} ${region}`, 3);
    live.brows_eyeliner_bronzer = await fetchOnlineProducts(`brow gel eyeliner bronzer ${qbits(skin)}`, 3);
    live.shadow_palette = await fetchOnlineProducts(`eyeshadow palette for ${skin.undertone} undertone ${skin.tone_depth} ${region}`, 3);

    // 3) If we got live results, blend them in at the top
    let hasLive = false;
    (["primer","foundation_concealer","brows_eyeliner_bronzer","shadow_palette"] as const).forEach(cat => {
      if (live[cat]?.length) {
        hasLive = true;
        const base = consultation.recommendations[cat] ?? [];
        consultation.recommendations[cat] = [...live[cat], ...base].slice(0, 6);
      }
    });
    consultation.real_products = hasLive;

    return new Response(JSON.stringify(consultation), {
      headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("beauty-consult error", err);
    return new Response(JSON.stringify({
      error: "Failed to analyze image",
      details: String(err)
    }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
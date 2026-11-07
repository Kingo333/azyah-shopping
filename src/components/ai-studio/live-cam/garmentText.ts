// Garment-only text for the try-on models (owner, 7 Nov 2026).
//
// The text sent to JoyAI and FluxRT should describe ONLY the outfit: garment type, colour,
// pattern or print, material, cut or fit, and visible details (logo, embroidery, buttons,
// length, sleeves). Store descriptions also carry model height and size worn, care labels,
// bag dimensions, fabric percentages for linings nobody sees, and sometimes prices, delivery
// terms, codes and marketing lines. Those cost tokens (FluxRT's text encoder stops at 512)
// and can nudge the model ("Model's height: 188cm").
//
// Behind switches, off by default (see liveCamFlags.ts):
//   VITE_LIVE_CAM_CLEAN_DETAILS / ?livecam_clean=1           -> cleanGarmentText for both engines
//   VITE_LIVE_CAM_FLUXRT_PROMPT=compact / ?livecam_fluxrt_prompt=compact -> buildCompactTryOnPrompt
//
// Pure functions, unit-tested with real catalogue descriptions.

/** Whole lines or sentences that say nothing about how the garment looks. */
const NOISE: RegExp[] = [
  // model and sizing
  /model'?s? (height|is wearing|wears|wearing)/i,
  /\bmodel\b.*(\d{2,3}\s?cm|\d'\s?\d|\bwears\b|\bwearing\b|\bsize\b)/i,
  /\b(wears|wearing) (a )?size\b/i,
  /\b(how our fits work|length is measured|this length is a guide|size guide|size chart|sizing|true to size|runs (small|large)|fits? (small|large)|take (a|one) size|size (up|down))\b/i,
  /\b(chest|bust|waist|hips?|inseam|leg length)\s*:?\s*\d/i,
  /^\s*(h|w|d|height|width|depth|length|strap drop|handle drop)\s*:\s*\d/i,
  // care
  /\b(machine wash|hand wash|dry clean|wipe clean|spot clean|do not (bleach|tumble|iron|wring)|tumble dry|line dry|iron (on|at)|care labels?|wash (cold|warm|at|inside out|separately)|leather protector|maintain appearance)\b/i,
  // price, discounts
  /(\b(aed|usd|eur|gbp|sar|dhs?)\s?\d|\d\s?(aed|usd|eur|gbp|sar|dhs?)\b|[$£€]\s?\d)/i,
  /\b(price|discount|\d+\s?% off|sale|promo(tion)? code|coupon|voucher)\b/i,
  // delivery and returns
  /\b(deliver(y|ed|s)?|shipping|ships|shipped|dispatch(ed)?|returns?|exchanges?|refunds?|cash on delivery|orders? over|in stock|out of stock|pre-?order)\b/i,
  // codes
  /\b(sku|product code|item (no|number|code)|style (no|number|code)|article (no|number)|ref(erence)? (no|number))\b/i,
  /#\s?\d{3,}/,
  // marketing and styling advice (styling advice names OTHER garments: "Pair with jeans")
  /^\s*(pair|style|team|wear|dress) (it|them|this|these|with|up|down)\b/i,
  /^\s*(perfect|ideal|great|made) for\b/i,
  /\b(shop (now|the look)|buy now|order now|don'?t miss|limited (edition|stock)|new arrivals?|free gift)\b/i,
];

/** Marketing words removed from inside an otherwise useful sentence or name. */
const FLUFF_WORDS = /\b(our (signature|bestselling|best-selling|iconic|favourite|favorite)|signature|bestselling|best-selling|iconic|must-have|wardrobe staple|exclusive)\b\s*/gi;

/** Composition parts nobody sees on camera. */
const HIDDEN_PARTS = new Set(['lining', 'lining sock', 'backing', 'padding', 'filling', 'interlining', 'wadding', 'insole', 'sock']);

/**
 * "Contrast: 67% Polyester, 33% Cotton, Fabric: 74% Viscose, 23% Nylon" ->
 * "polyester contrast, viscose". Keeps the main material of each visible part.
 */
function summarizeComposition(text: string): { rest: string; materials: string[] } {
  const materials: string[] = [];
  // A part label is one capitalised word, optionally "sock" or a number ("Lining sock", "Fabric 1").
  const re = /\b([A-Z][a-z]+(?: sock| \d)?):\s*(\d{1,3}%\s*[A-Za-z][A-Za-z -]*?)(?:,\s*\d{1,3}%\s*[A-Za-z][A-Za-z -]*?)*(?=,\s*[A-Z][a-z]+(?: sock| \d)?:\s*\d|\s*\.|\s*$)/g;
  const rest = text.replace(re, (_m, rawLabel: string, first: string) => {
    const label = rawLabel.trim().toLowerCase();
    const material = first.replace(/^\d{1,3}%\s*/, '').trim().toLowerCase();
    if (!HIDDEN_PARTS.has(label) && material) {
      const plain = ['main', 'fabric', 'fabric 1', 'outer', 'shell', 'body', 'material'].includes(label);
      const phrase = plain ? material : `${material} ${label}`;
      if (!materials.includes(phrase)) materials.push(phrase);
    }
    return ' ';
  });
  const tidy = rest
    .replace(/(\s*,)+\s*(?=\.|$)/g, '') // commas left where a material list was cut out
    .replace(/,\s*,/g, ',')
    .replace(/\s+\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,.]+|[\s,]+$/g, '');
  return { rest: tidy, materials };
}

function cutAtWord(s: string, maxChars: number): string {
  if (s.length <= maxChars) return s;
  const cut = s.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.-]+$/, '');
}

/** Garment-only description, or '' when nothing visual is left. */
export function cleanGarmentText(raw: string | null | undefined, maxChars = 320): string {
  if (!raw) return '';
  const text = raw
    .replace(/<\s*(br|\/p|\/li|\/div)\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&[a-z]+;/gi, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[•▪●◦|]/g, '\n');
  const kept: string[] = [];
  const materials: string[] = [];
  for (const line of text.split(/\n+/)) {
    const { rest, materials: m } = summarizeComposition(line.trim());
    for (const x of m) if (!materials.includes(x)) materials.push(x);
    // Sentences; a "Label: value" fragment counts as one.
    for (const s of rest.split(/(?<=[.!?])\s+/)) {
      const sentence = s.replace(FLUFF_WORDS, '').replace(/\s{2,}/g, ' ').trim().replace(/^[,;:\s]+/, '');
      if (sentence.replace(/[^a-z]/gi, '').length < 3) continue;
      if (NOISE.some((re) => re.test(sentence))) continue;
      const clean = sentence.replace(/[.!?]+$/, '');
      if (clean && !kept.some((k) => k.toLowerCase() === clean.toLowerCase())) kept.push(clean);
    }
  }
  if (materials.length) kept.push(`Material: ${materials.join(', ')}`);
  return cutAtWord(kept.map((k) => k.charAt(0).toUpperCase() + k.slice(1)).join('. '), maxChars);
}

/** Product name without marketing words and set notes ("- part of a set"). */
export function cleanGarmentName(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s*-\s*part of a set\b/i, '')
    .replace(FLUFF_WORDS, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

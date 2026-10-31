// Category-aware Live Cam try-on prompt builder.
// Pure function — no AI, no network. Uses existing item metadata only.

export type TryOnCategory =
  | 'tops'
  | 'bottoms'
  | 'dresses'
  | 'outerwear'
  | 'shoes'
  | 'bags'
  | 'accessories';

export type SleeveLength =
  | 'sleeveless'
  | 'short_sleeve'
  | 'long_sleeve'
  | 'three_quarter_sleeve'
  | 'unknown';

const UNIVERSAL_BASE =
  "Realistic virtual fashion try-on. Apply the exact clothing item from the reference image onto the person in the live camera frame. Preserve the person's face, body pose, body shape, skin tone, lighting, and background. Preserve the selected item faithfully: color, fabric appearance, visible texture, print, graphics, logo, seams, buttons, shape, and all visible design details. Do not redesign the item. Do not turn a patterned item into a plain item. Do not invent a different garment.";

const CATEGORY_CLAUSES: Record<TryOnCategory, string> = {
  tops:
    "Replace only the upper-body clothing with the exact top from the reference image. Preserve the person's lower-body clothing exactly as it appears in the camera frame. Preserve the neckline, hem, color, print, logo, pattern, fabric appearance, silhouette, and visible sleeve style from the reference image. Do not change the pants, skirt, shoes, or accessories.",
  bottoms:
    "Replace only the lower-body clothing with the exact bottoms from the reference image. Preserve the person's existing top/shirt exactly as it appears in the camera frame. Preserve the waistline, leg length, fit, color, fabric appearance, pockets, seams, print, and visible design details of the bottoms. Do not change the shirt, face, hair, arms, shoes, or background.",
  dresses:
    "Apply the exact dress from the reference image as a full-body garment. Preserve the dress length, neckline, waist shape, silhouette, color, fabric appearance, print, pattern, logo, embroidery, and visible design details. Preserve the exact visible sleeve style and sleeve length from the reference image. Do not shorten the dress. Do not remove or add sleeves. Do not turn the dress into a top and skirt.",
  outerwear:
    "Apply the exact outerwear from the reference image over the person's existing outfit. Preserve the clothing underneath where visible. Preserve the outerwear length, collar, opening, buttons, zipper, color, fabric appearance, pattern, silhouette, and visible sleeve style. Do not replace the entire outfit unless the reference item clearly covers it.",
  shoes:
    "Replace only the footwear with the exact shoes from the reference image. Preserve the person's legs, pants, pose, background, and lighting. Place the shoes naturally on the feet. Preserve shoe shape, color, material appearance, sole, logo, laces, straps, and visible design details. Do not change the pants or legs.",
  bags:
    "Add or apply the exact bag from the reference image naturally with the person. Preserve the person's outfit, body, face, background, and lighting. Preserve the bag shape, handle/strap, color, material appearance, logo, pattern, and visible design details. Do not replace the clothing.",
  accessories:
    "Apply only the selected accessory from the reference image. Preserve the person's clothing, face, body, background, and lighting. Preserve the accessory shape, color, material appearance, logo, and visible design details. Do not replace the outfit.",
};

const KEYWORD_MAP: Array<[TryOnCategory, string[]]> = [
  ['dresses', ['dress', 'gown', 'kaftan', 'abaya', 'jumpsuit', 'romper']],
  ['outerwear', ['jacket', 'coat', 'blazer', 'parka', 'puffer', 'trench', 'vest', 'outerwear']],
  ['shoes', ['shoe', 'sneaker', 'boot', 'heel', 'sandal', 'loafer', 'mule', 'footwear']],
  ['bags', ['bag', 'purse', 'tote', 'clutch', 'backpack', 'handbag']],
  ['accessories', ['accessor', 'hat', 'cap', 'scarf', 'belt', 'sunglass', 'glove', 'watch', 'jewel', 'ring', 'necklace', 'bracelet', 'earring']],
  ['bottoms', ['bottom', 'pant', 'trouser', 'jean', 'short', 'skirt', 'legging', 'jogger', 'chino']],
  ['tops', ['top', 'shirt', 'tee', 't-shirt', 'blouse', 'sweater', 'hoodie', 'jumper', 'cardigan', 'polo', 'tank', 'crop']],
];

export function normalizeCategory(raw?: string | null): TryOnCategory | null {
  if (!raw) return null;
  const v = raw.toLowerCase();
  for (const [cat, keys] of KEYWORD_MAP) {
    for (const k of keys) {
      if (v.includes(k)) return cat;
    }
  }
  return null;
}

// Sleeve keyword sets. Order matters: explicit phrases checked before generic.
const SLEEVELESS_KEYS = ['sleeveless', 'no sleeve', 'tank', 'camisole', 'cami', 'strapless', 'spaghetti strap', 'halter'];
const SHORT_SLEEVE_KEYS = ['short sleeve', 'short-sleeve', 'short sleeved', 'cap sleeve', 'tee', 't-shirt', 'tshirt', 'polo'];
const LONG_SLEEVE_KEYS = ['long sleeve', 'long-sleeve', 'long sleeved', 'full sleeve', 'full-sleeve', 'sweater', 'sweatshirt', 'hoodie', 'jumper', 'cardigan'];
const THREE_QUARTER_KEYS = ['3/4 sleeve', 'three quarter sleeve', 'three-quarter sleeve', 'elbow sleeve'];

// Explicit phrases that should override any generic keyword conflict.
const EXPLICIT_SLEEVELESS = ['sleeveless', 'no sleeve', 'strapless', 'spaghetti strap', 'halter'];
const EXPLICIT_SHORT = ['short sleeve', 'short-sleeve', 'short sleeved', 'cap sleeve'];
const EXPLICIT_LONG = ['long sleeve', 'long-sleeve', 'long sleeved', 'full sleeve', 'full-sleeve'];
const EXPLICIT_THREE_QUARTER = ['3/4 sleeve', 'three quarter sleeve', 'three-quarter sleeve', 'elbow sleeve'];

function anyIncludes(text: string, keys: string[]): boolean {
  for (const k of keys) if (text.includes(k)) return true;
  return false;
}

export interface InferSleeveInput {
  category?: string | null;
  name?: string | null;
  description?: string | null;
  promptHint?: string | null;
}

export function inferSleeveLength(input: InferSleeveInput): SleeveLength {
  const text = [input.category, input.name, input.description, input.promptHint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (!text) return 'unknown';

  // Prefer the most explicit phrase if multiple appear.
  const hasExplicitSleeveless = anyIncludes(text, EXPLICIT_SLEEVELESS);
  const hasExplicitShort = anyIncludes(text, EXPLICIT_SHORT);
  const hasExplicitLong = anyIncludes(text, EXPLICIT_LONG);
  const hasExplicitThreeQuarter = anyIncludes(text, EXPLICIT_THREE_QUARTER);

  const explicitCount =
    Number(hasExplicitSleeveless) +
    Number(hasExplicitShort) +
    Number(hasExplicitLong) +
    Number(hasExplicitThreeQuarter);

  if (explicitCount === 1) {
    if (hasExplicitSleeveless) return 'sleeveless';
    if (hasExplicitShort) return 'short_sleeve';
    if (hasExplicitLong) return 'long_sleeve';
    if (hasExplicitThreeQuarter) return 'three_quarter_sleeve';
  }
  if (explicitCount > 1) return 'unknown';

  // No explicit phrase — fall back to generic keyword sets, but require unique match.
  const sleeveless = anyIncludes(text, SLEEVELESS_KEYS);
  const short = anyIncludes(text, SHORT_SLEEVE_KEYS);
  const long = anyIncludes(text, LONG_SLEEVE_KEYS);
  const threeQ = anyIncludes(text, THREE_QUARTER_KEYS);

  const count = Number(sleeveless) + Number(short) + Number(long) + Number(threeQ);
  if (count !== 1) return 'unknown';
  if (sleeveless) return 'sleeveless';
  if (short) return 'short_sleeve';
  if (long) return 'long_sleeve';
  if (threeQ) return 'three_quarter_sleeve';
  return 'unknown';
}

const SLEEVE_CLAUSE: Record<SleeveLength, string> = {
  sleeveless:
    "The selected item appears to be sleeveless. Keep it sleeveless. Do not add sleeves.",
  short_sleeve:
    "The selected item appears to be short-sleeved. Keep the sleeves short. Do not convert it into a long-sleeve item.",
  long_sleeve:
    "The selected item appears to be long-sleeved. Keep the sleeves full length. Do not shorten, remove, or roll up the sleeves.",
  three_quarter_sleeve:
    "The selected item appears to have three-quarter sleeves. Preserve that sleeve length. Do not make the sleeves short or full length.",
  unknown:
    "Preserve the exact visible sleeve style and sleeve length from the reference image.",
};

// Categories where sleeve guidance is meaningful.
const SLEEVE_CATEGORIES: ReadonlySet<TryOnCategory> = new Set(['tops', 'dresses', 'outerwear']);

export interface BuildTryOnPromptInput {
  category?: string | null;
  name?: string | null;
  description?: string | null;
  promptHint?: string | null;
}

export function buildTryOnPrompt(input: BuildTryOnPromptInput): string {
  const parts: string[] = [UNIVERSAL_BASE];

  const cat = normalizeCategory(input.category);
  if (cat) parts.push(CATEGORY_CLAUSES[cat]);

  if (cat && SLEEVE_CATEGORIES.has(cat)) {
    const sleeve = inferSleeveLength(input);
    parts.push(SLEEVE_CLAUSE[sleeve]);
  }

  const name = input.name?.trim();
  if (name) parts.push(`Selected item name: ${name}.`);

  const description = input.description?.trim();
  if (description) parts.push(`Item description: ${description}.`);

  const hint = input.promptHint?.trim();
  if (hint) parts.push(`Additional item guidance: ${hint}.`);

  return parts.join(' ');
}

// Short, Lucy-VTON-style edit instruction for instruction-following video
// editors (JoyAI). FluxRT ignores it and keeps using the long prompt above.
const INSTRUCTIONS: Record<TryOnCategory, string> = {
  tops: 'Substitute the current top with the garment in the reference image.',
  bottoms: 'Substitute the current pants or skirt with the garment in the reference image.',
  dresses: 'Substitute the current outfit with the dress in the reference image.',
  outerwear: 'Put the outerwear from the reference image on the person, over their current outfit.',
  shoes: 'Substitute the current shoes with the shoes in the reference image.',
  bags: 'Have the person carry the bag from the reference image.',
  accessories: 'Put the accessory from the reference image on the person.',
};
const INSTRUCTION_FALLBACK = 'Substitute the matching clothing item with the garment in the reference image.';
const INSTRUCTION_KEEP = "Keep the person's face, body, pose and the background unchanged.";

const INSTRUCTION_FIDELITY =
  'Match its exact color, pattern, print, logo, fabric and construction details.';
const MAX_DETAIL_CHARS = 320;

/** Plain, short product text: no HTML, URLs or line breaks, cut at a word boundary. */
export function cleanProductText(raw: string | null | undefined, maxChars = MAX_DETAIL_CHARS): string {
  if (!raw) return '';
  let s = raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (s.length > maxChars) {
    const cut = s.slice(0, maxChars);
    const lastSpace = cut.lastIndexOf(' ');
    s = (lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.-]+$/, '');
  }
  return s;
}

// Generic sentences the Gemini wardrobe analysis wraps around its garment details
// (supabase/functions/analyze-wardrobe-gemini). JoyAI's instruction already says to
// keep the person, so only the garment-specific sentences are worth sending.
const GEMINI_BOILERPLATE = [
  /^preserve face, identity/i,
  /^only change the selected garment region/i,
  /^replace only the /i,
  /^the reference image is the source of truth/i,
  /^if any text description conflicts/i,
];

/** Garment-specific sentences from a Gemini prompt hint (colours, prints, logo placement...). */
export function garmentDetailsFromHint(hint: string | null | undefined): string {
  const text = cleanProductText(hint, 2000);
  if (!text) return '';
  const sentences = text.match(/[^.!?]+[.!?]?/g) ?? [];
  const kept = sentences.map((s) => s.trim()).filter((s) => s && !GEMINI_BOILERPLATE.some((re) => re.test(s)));
  return cleanProductText(kept.join(' '));
}

/**
 * Edit instruction for JoyAI (Premium HD). JoyAI follows prompts that name the
 * garment's concrete visible features, so the product name and description are
 * added when the item has them.
 */
export function buildTryOnInstruction(
  input: BuildTryOnPromptInput,
  opts: { useHintDetails?: boolean } = {},
): string {
  const cat =
    normalizeCategory(input.category) ??
    normalizeCategory(input.name) ??
    normalizeCategory(input.promptHint);
  const parts = [cat ? INSTRUCTIONS[cat] : INSTRUCTION_FALLBACK];
  const name = cleanProductText(input.name, 120);
  // Store products have a description; wardrobe items have the Gemini analysis hint.
  const description =
    cleanProductText(input.description) || (opts.useHintDetails === false ? '' : garmentDetailsFromHint(input.promptHint));
  if (name || description) {
    const label = name ? `The reference garment is the ${name}` : 'The reference garment';
    parts.push(description ? `${label}: ${description.replace(/[.!]?$/, '.')}` : `${label}.`);
    parts.push(INSTRUCTION_FIDELITY);
  }
  parts.push(INSTRUCTION_KEEP);
  return parts.join(' ');
}

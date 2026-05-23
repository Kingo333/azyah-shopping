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

const UNIVERSAL_BASE =
  "Realistic virtual fashion try-on. Apply the exact clothing item from the reference image onto the person in the live camera frame. Preserve the person's face, body pose, body shape, skin tone, lighting, and background. Preserve the selected item faithfully: color, fabric appearance, visible texture, print, graphics, logo, seams, buttons, shape, and all visible design details. Do not redesign the item. Do not turn a patterned item into a plain item. Do not invent a different garment.";

const CATEGORY_CLAUSES: Record<TryOnCategory, string> = {
  tops:
    "Replace only the upper-body clothing with the exact top from the reference image. Preserve the person's lower-body clothing exactly as it appears in the camera frame. Preserve the neckline, sleeve length, hem, color, print, logo, pattern, and fabric appearance visible in the reference image. If the reference top has long sleeves, keep the sleeves long. Do not change the pants, skirt, shoes, or accessories.",
  bottoms:
    "Replace only the lower-body clothing with the exact bottoms from the reference image. Preserve the person's existing top/shirt exactly as it appears in the camera frame. Preserve the waistline, leg length, fit, color, fabric appearance, pockets, seams, print, and visible design details of the bottoms. Do not change the shirt, face, hair, arms, shoes, or background.",
  dresses:
    "Apply the exact dress from the reference image as a full-body garment. Preserve the dress length, sleeve length, neckline, waist shape, silhouette, color, fabric appearance, print, pattern, logo, embroidery, and visible design details. If the reference dress has long sleeves, keep the sleeves long. Do not shorten the dress. Do not remove sleeves. Do not turn the dress into a top and skirt.",
  outerwear:
    "Apply the exact outerwear from the reference image over the person's existing outfit. Preserve the clothing underneath where visible. Preserve the outerwear length, sleeve length, collar, opening, buttons, zipper, color, fabric appearance, pattern, and silhouette. Do not replace the entire outfit unless the reference item clearly covers it.",
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

  const name = input.name?.trim();
  if (name) parts.push(`Selected item name: ${name}.`);

  const description = input.description?.trim();
  if (description) parts.push(`Item description: ${description}.`);

  const hint = input.promptHint?.trim();
  if (hint) parts.push(`Additional item guidance: ${hint}.`);

  return parts.join(' ');
}

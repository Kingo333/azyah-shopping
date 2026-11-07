import { describe, expect, it } from 'vitest';
import { cleanGarmentName, cleanGarmentText } from '../garmentText';
import { buildCompactTryOnPrompt, buildTryOnInstruction, buildTryOnPrompt } from '../buildTryOnPrompt';
import { liveCamCleanDetails, liveCamFluxrtPrompt } from '../liveCamFlags';

// Real descriptions from the store catalogue (products table, 7 Nov 2026), verbatim.
const REAL = {
  midiDress: {
    name: 'ASOS DESIGN dropped waist pleated skirt cami midi dress in lemon yellow',
    category: 'clothing',
    description: "Model's height: 173.5cm / 5' 8½'' Model is wearing: US 4\nMachine wash according to instructions on care labels\nChiffon: a soft, drapey, sheer fabric with a dry handle Contrast: 67% Polyester, 33% Cotton, Fabric: 74% Viscose, 23% Nylon, 3% Spandex.",
  },
  maxiSkirt: {
    name: 'ASOS DESIGN wrap front maxi skirt in paisley print',
    category: 'clothing',
    description: 'How our fits work: Our maxi styles are between 103-113cm in length. Length is measured from your waist to garment hemline. This length is a guide only.\nMachine wash according to instructions on care labels\nPlain-woven fabric Main: 100% Cotton.',
  },
  laceDress: {
    name: 'ASOS LUXE lace bandeau mini dress with velvet bow detail in dark cherry',
    category: 'clothing',
    description: "Model's height: 168cm/5'6\" Model is wearing: US 4\nDry clean only\nLace: delicate, decorative, open-knit fabric Contrast: 95% Polyester, 5% Elastane, Lining: 100% Polyester, Main: 37% Polyamide, 34% Cotton, 29% Viscose, Mesh: 100% Polyester.",
  },
  sweatpants: {
    name: 'ASOS DESIGN premium heavyweight balloon sweatpants in brown - part of a set',
    category: 'clothing',
    description: "Model's height: 188cm/6'2\" Model is wearing: M - W34\nMachine wash according to instructions on care labels\nSweatshirt fabric: soft and warm fabric with a cozy raised texture inside Main: 100% Cotton.",
  },
  bag: {
    name: 'Accessorize croc bamboo top handle and crossbody bag in red',
    category: 'bags',
    description: 'H: 15cm/6" W: 7cm/2" D: 19cm/7"\nWipe clean with a damp cloth or sponge\nMatte finish Main: 100% Polyester, Outer: 100% Polyurethane.',
  },
  sneakers: {
    name: 'ASOS DESIGN Divine lace up sneakers in off white',
    category: 'footwear',
    description: 'Mesh upper Lining sock: 100% Textile, Sole: 100% Thermoplastic Polyurethane, Upper: 100% Textile.',
  },
  mules: {
    name: 'Topshop Idea patent square toe mules in black',
    category: 'clothing',
    description: 'Heel height: 6cm/2"\nWipe clean with a soft dry cloth\nSole: 100% Resin, Upper: 100% Polyurethane.',
  },
  murci: {
    name: 'Murci exclusive lace high neck long sleeve diamante detail drape front mini dress in red',
    category: 'clothing',
    description: "Model's height: 170cm / 5' 7'' Model is wearing: US 4\nMachine wash according to instructions on care labels\nLace: delicate, decorative open-knit fabric Main: 41% Polyamide, 35% Cotton, 23% Viscose, 1% Polyester.",
  },
};

// Typical brand copy with every kind of noise the owner listed (not from our catalogue).
const BRAND_COPY = {
  name: 'Essential Crew Neck Tee - White',
  category: 'tops',
  description: '<p>Our signature heavyweight cotton tee in crisp white. Relaxed fit, ribbed crew neckline, short sleeves and a straight hem.</p><ul><li>100% organic cotton, 240gsm</li><li>Machine wash cold</li><li>Free delivery on orders over AED 200</li><li>Easy 30-day returns</li></ul><p>Model is 185cm and wears size M. True to size. SKU: TEE-001-WHT. Was AED 149, now AED 99 (33% off). Pair it with our wide-leg jeans. Shop now!</p>',
};

// The Gemini closet analysis (analyze-wardrobe-gemini composeFinalPromptHint): generic rules
// + the garment sentence + texture + placement + "source of truth".
const GEMINI_HINT =
  'Preserve face, identity, body shape, pose, skin tone, lighting, camera angle, and background. Only change the selected garment region. Replace only the upper body. Black short-sleeve crew-neck t-shirt in a soft cotton jersey with a small white swoosh logo on the left chest, regular fit, hip length. Preserve the soft, matte, midweight jersey texture with ribbing at the collar. Keep the small logo on the left chest and contained within the garment area. The reference image is the source of truth. If any text description conflicts with the reference image, follow the reference image.';

const NOISE_WORDS = [/model'?s height/i, /model is/i, /wearing/i, /wash/i, /dry clean/i, /wipe clean/i, /how our fits work/i,
  /length is measured/i, /\bcm\b/i, /delivery/i, /returns?/i, /aed/i, /sku/i, /% off/i, /pair it/i, /shop now/i,
  /true to size/i, /size m\b/i, /lining/i, /<\/?[a-z]/i, /signature/i];

describe('cleanGarmentText: only the garment', () => {
  it.each(Object.entries(REAL))('real store description (%s): no sizing, care, dimensions or hidden linings', (_k, item) => {
    const out = cleanGarmentText(item.description);
    for (const re of NOISE_WORDS) expect(out, `${re} in "${out}"`).not.toMatch(re);
    expect(out).not.toMatch(/\d{1,3}%/); // percentages summarised to the main material
    expect(out).not.toMatch(/,\s*[,.]|\s\./); // no stray punctuation where lists were cut out
  });

  it('keeps the fabric description and the visible materials', () => {
    expect(cleanGarmentText(REAL.midiDress.description)).toBe('Chiffon: a soft, drapey, sheer fabric with a dry handle. Material: polyester contrast, viscose');
    expect(cleanGarmentText(REAL.laceDress.description)).toBe('Lace: delicate, decorative, open-knit fabric. Material: polyester contrast, polyamide, polyester mesh');
    expect(cleanGarmentText(REAL.sneakers.description)).toBe('Mesh upper. Material: thermoplastic polyurethane sole, textile upper');
    expect(cleanGarmentText(REAL.bag.description)).toBe('Matte finish. Material: polyester, polyurethane');
    expect(cleanGarmentText(REAL.maxiSkirt.description)).toBe('Plain-woven fabric. Material: cotton');
  });

  it('keeps a design measurement that shapes the item (heel height)', () => {
    expect(cleanGarmentText(REAL.mules.description)).toMatch(/^Heel height: 6cm/);
    expect(cleanGarmentText(REAL.mules.description)).toMatch(/resin sole, polyurethane upper/);
  });

  it('brand copy: HTML, price, discount, delivery, returns, care, size worn, model height, SKU, styling advice and fluff all go', () => {
    const out = cleanGarmentText(BRAND_COPY.description);
    expect(out).toBe('Heavyweight cotton tee in crisp white. Relaxed fit, ribbed crew neckline, short sleeves and a straight hem. 100% organic cotton, 240gsm');
    for (const re of NOISE_WORDS) expect(out, String(re)).not.toMatch(re);
  });

  it('returns nothing for a description that is only noise, and for empty input', () => {
    expect(cleanGarmentText('Machine wash cold\nFree delivery over AED 200\nModel is wearing: S')).toBe('');
    expect(cleanGarmentText(null)).toBe('');
    expect(cleanGarmentText('')).toBe('');
  });

  it('stays within the length budget, cut at a word', () => {
    const long = Array.from({ length: 40 }, (_, i) => `Detail ${i} with a pleated panel`).join('. ');
    const out = cleanGarmentText(long, 120);
    expect(out.length).toBeLessThanOrEqual(120);
    expect(out.endsWith(' ')).toBe(false);
  });
});

describe('cleanGarmentName', () => {
  it('drops marketing words and set notes, keeps type, colour and print', () => {
    expect(cleanGarmentName(REAL.sweatpants.name)).toBe('ASOS DESIGN premium heavyweight balloon sweatpants in brown');
    expect(cleanGarmentName(REAL.murci.name)).toBe('Murci lace high neck long sleeve diamante detail drape front mini dress in red');
    expect(cleanGarmentName(REAL.maxiSkirt.name)).toBe(REAL.maxiSkirt.name);
  });
});

describe('switches off: prompts are exactly as before', () => {
  it.each(Object.entries({ ...REAL, brand: BRAND_COPY }))('%s', (_k, item) => {
    expect(buildTryOnPrompt(item, {})).toBe(buildTryOnPrompt(item));
    expect(buildTryOnPrompt(item, { cleanDetails: false, fluxrtPrompt: 'full' })).toBe(buildTryOnPrompt(item));
    expect(buildTryOnInstruction(item, { useHintDetails: true })).toBe(buildTryOnInstruction(item, { useHintDetails: true, cleanDetails: false }));
  });
});

describe('clean details on: both engines get garment-only text', () => {
  it('JoyAI instruction (store item)', () => {
    expect(buildTryOnInstruction(BRAND_COPY, { cleanDetails: true })).toBe(
      'Substitute the current top with the garment in the reference image. The reference garment is the Essential Crew Neck Tee - White: Heavyweight cotton tee in crisp white. Relaxed fit, ribbed crew neckline, short sleeves and a straight hem. 100% organic cotton, 240gsm. Match its exact color, pattern, print, logo, fabric and construction details. Keep the person\'s face, body, pose and the background unchanged.',
    );
  });
  it('FluxRT long prompt (store item): no noise, item text intact', () => {
    const p = buildTryOnPrompt(REAL.laceDress, { cleanDetails: true });
    for (const re of NOISE_WORDS) expect(p, String(re)).not.toMatch(re);
    expect(p).toContain('Item description: Lace: delicate, decorative, open-knit fabric.');
  });
  it('closet item (Gemini): JoyAI keeps the texture and logo placement (longer budget)', () => {
    const i = buildTryOnInstruction({ category: 'tops', name: 'Black tee', promptHint: GEMINI_HINT }, { cleanDetails: true });
    expect(i).toContain('small white swoosh logo on the left chest');
    expect(i).toContain('jersey texture with ribbing at the collar');
    expect(i).toContain('Keep the small logo on the left chest');
    expect(i).not.toMatch(/source of truth|Preserve face, identity|Only change the selected/);
  });
  it('closet item (Gemini): FluxRT long prompt drops the duplicated generic rules', () => {
    const before = buildTryOnPrompt({ category: 'tops', name: 'Black tee', promptHint: GEMINI_HINT });
    const after = buildTryOnPrompt({ category: 'tops', name: 'Black tee', promptHint: GEMINI_HINT }, { cleanDetails: true });
    expect(before).toMatch(/source of truth/);
    expect(after).not.toMatch(/source of truth|Preserve face, identity/);
    expect(after).toContain('small white swoosh logo on the left chest');
    expect(after.length).toBeLessThan(before.length);
    expect(after).not.toContain('..');
  });
});

describe('compact FluxRT prompt: item first, short, positive', () => {
  const opts = { cleanDetails: true, fluxrtPrompt: 'compact' as const };
  it('reads as one item-first paragraph (store item)', () => {
    expect(buildTryOnPrompt(BRAND_COPY, opts)).toBe(
      'Virtual try-on. The person in the camera frame wears the Essential Crew Neck Tee - White from the reference image: Heavyweight cotton tee in crisp white. Relaxed fit, ribbed crew neckline, short sleeves and a straight hem. 100% organic cotton, 240gsm. It replaces the current top; the pants or skirt stay as they are. Keep its exact colour, print, pattern, logo, fabric and fit, with short sleeves. Keep the person\'s face, hair, body, pose and the background unchanged.',
    );
  });
  it('is much shorter than the long prompt and well inside 512 tokens', () => {
    for (const item of [...Object.values(REAL), BRAND_COPY]) {
      const compact = buildTryOnPrompt(item, opts);
      expect(compact.length).toBeLessThan(buildTryOnPrompt(item).length * 0.6);
      expect(compact.length / 4).toBeLessThan(250); // ~4 characters per token
    }
  });
  it('uses the product name when the stored category is generic ("clothing")', () => {
    expect(buildTryOnPrompt(REAL.mules, opts)).toContain('They replace the current shoes, on the feet.');
    expect(buildTryOnPrompt(REAL.maxiSkirt, opts)).toContain('It replaces the current pants or skirt');
    expect(buildTryOnPrompt(REAL.laceDress, opts)).toContain('worn as a dress');
  });
  it('never forces a dress long, and words sleeves naturally', () => {
    expect(buildTryOnPrompt(REAL.laceDress, opts)).toContain('at its own length');
    expect(buildTryOnPrompt(REAL.murci, opts)).toContain('with full-length sleeves');
    expect(buildTryOnPrompt({ category: 'tops', name: 'Sleeveless ribbed tank in black' }, opts)).toContain(', and keep it sleeveless.');
  });
  it('closet item (Gemini): only the garment sentences', () => {
    const p = buildCompactTryOnPrompt({ category: 'tops', name: 'Black tee', promptHint: GEMINI_HINT }, opts);
    expect(p).toContain('wears the Black tee from the reference image: Black short-sleeve crew-neck t-shirt');
    expect(p).not.toMatch(/source of truth|Preserve face, identity|Only change the selected|Replace only the upper body/);
  });
  it('works without cleaning too (compact only)', () => {
    const p = buildTryOnPrompt(BRAND_COPY, { fluxrtPrompt: 'compact' });
    expect(p.startsWith('Virtual try-on. The person in the camera frame wears the Essential Crew Neck Tee - White')).toBe(true);
    expect(p).not.toMatch(/<\/?[a-z]/i); // the old cleaner still removes HTML
  });
});

describe('switches: URL > localStorage > env > off', () => {
  const store = (v: Record<string, string>) => ({ getItem: (k: string) => v[k] ?? null });
  it('clean details is off unless turned on', () => {
    expect(liveCamCleanDetails('', store({}), {})).toBe(false);
    expect(liveCamCleanDetails('', store({}), { VITE_LIVE_CAM_CLEAN_DETAILS: 'true' })).toBe(true);
    expect(liveCamCleanDetails('', store({ 'azyah.livecam.clean': '1' }), {})).toBe(true);
    expect(liveCamCleanDetails('?livecam_clean=0', store({ 'azyah.livecam.clean': '1' }), { VITE_LIVE_CAM_CLEAN_DETAILS: '1' })).toBe(false);
    expect(liveCamCleanDetails('?livecam_clean=1', store({}), {})).toBe(true);
  });
  it('a URL value is remembered on the device, and =0 turns it back off', () => {
    const saved: Record<string, string> = {};
    const mem = { getItem: (k: string) => saved[k] ?? null, setItem: (k: string, v: string) => { saved[k] = v; } };
    expect(liveCamCleanDetails('?livecam_clean=1', mem, {})).toBe(true);
    expect(liveCamCleanDetails('', mem, {})).toBe(true); // later page without the parameter
    expect(liveCamCleanDetails('?livecam_clean=0', mem, {})).toBe(false);
    expect(liveCamCleanDetails('', mem, {})).toBe(false);
    expect(liveCamFluxrtPrompt('?livecam_fluxrt_prompt=compact', mem, {})).toBe('compact');
    expect(liveCamFluxrtPrompt('', mem, {})).toBe('compact');
  });
  it('FluxRT prompt is full unless set to compact', () => {
    expect(liveCamFluxrtPrompt('', store({}), {})).toBe('full');
    expect(liveCamFluxrtPrompt('', store({}), { VITE_LIVE_CAM_FLUXRT_PROMPT: 'compact' })).toBe('compact');
    expect(liveCamFluxrtPrompt('?livecam_fluxrt_prompt=full', store({}), { VITE_LIVE_CAM_FLUXRT_PROMPT: 'compact' })).toBe('full');
    expect(liveCamFluxrtPrompt('', store({ 'azyah.livecam.fluxrt_prompt': 'compact' }), {})).toBe('compact');
    expect(liveCamFluxrtPrompt('', store({}), { VITE_LIVE_CAM_FLUXRT_PROMPT: 'weird' })).toBe('full');
  });
});

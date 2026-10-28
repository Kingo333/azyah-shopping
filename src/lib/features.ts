
export const features = {
  aiTryOn: true,
  arTryOn: false,
  // UGC collaborations: hidden (owner decision 2026-10-27). /ugc and its data stay.
  ugc_collab: false,
  axessoImport: true,
  axessoImportBulk: true,
  ai_beauty_consultant: false,
  style_link: false,
  // Your Fit (body-measurement matching): hidden, owner decision 2026-10-26.
  // Data and code stay; set to true to bring it back.
  your_fit: false,
  // New 4-tab shopper bar (Discover, Try on, Community, Profile). Off for
  // everyone; a device opts in with ?nav_v2=1 (see src/lib/navV2.ts).
  nav_v2: false,
  // Design v3 (neutral redesign, five-tab bar). Off for everyone; a device
  // opts in with ?design=v3 and leaves with ?design=v2 (see src/lib/designV3.ts).
  design_v3: false,
  // Deals tab on the Explore globe: hidden for later (design v3, 2026-10-27).
  deals: false,
} as const;

export type FeatureFlag = keyof typeof features;

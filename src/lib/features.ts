
export const features = {
  aiTryOn: true,
  arTryOn: false,
  ugc_collab: true,
  axessoImport: true,
  axessoImportBulk: true,
  ai_beauty_consultant: false,
  style_link: false,
  // Your Fit (body-measurement matching): hidden, owner decision 2026-10-26.
  // Data and code stay; set to true to bring it back.
  your_fit: false,
} as const;

export type FeatureFlag = keyof typeof features;

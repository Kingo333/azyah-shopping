
export const features = {
  aiTryOn: true,
  arTryOn: false,
  ugc_collab: true,
  axessoImport: true,
  axessoImportBulk: true,
  ai_beauty_consultant: true
} as const;

export type FeatureFlag = keyof typeof features;

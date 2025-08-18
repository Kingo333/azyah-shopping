
export const features = {
  aiTryOn: true,
  arTryOn: false,
  ugc_collab: true,
  axessoImport: true,
  axessoImportBulk: true
} as const;

export type FeatureFlag = keyof typeof features;

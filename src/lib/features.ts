
export const features = {
  aiTryOn: true,
  arTryOn: false,
  ugc_collab: true,
  axessoImport: true,
  axessoImportBulk: true,
  ai_beauty_consultant: true
} as const;

export type FeatureFlag = keyof typeof features;

// Environment-agnostic feature flag getter for debugging
export const getFeatureFlag = (flag: FeatureFlag): boolean => {
  const value = features[flag];
  console.log(`🚩 Feature flag ${flag}:`, value, 'from features.ts');
  return value;
};

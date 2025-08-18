
export const features = {
  aiTryOn: true,
  arTryOn: false,
  ugc_collab: true
} as const;

export type FeatureFlag = keyof typeof features;

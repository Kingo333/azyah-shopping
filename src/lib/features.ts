
export const features = {
  aiTryOn: true,
  arTryOn: false
} as const;

export type FeatureFlag = keyof typeof features;

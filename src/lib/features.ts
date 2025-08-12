
export const features = {
  aiTryOn: true,
  arTryOn: false,
  // Additive feature flag for Serper ingest (default OFF)
  serper_ingest: false,
} as const;

export type FeatureFlag = keyof typeof features;

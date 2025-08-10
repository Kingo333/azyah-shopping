
// Helper functions for BitStudio API compatibility
export const normalizeBitStudioType = (type: string): string => {
  // Convert hyphenated types to underscore format for BitStudio API
  return type.replace(/-/g, '_');
};

export const logTypeNormalization = (originalType: string, normalizedType: string) => {
  console.log(`BitStudio type normalization: "${originalType}" → "${normalizedType}"`);
};

// Helper functions for BitStudio API compatibility

// Note: BitStudio API uses hyphens in type names like "virtual-try-on-person"
// Keep types as-is per their documentation
export const validateBitStudioType = (type: string): boolean => {
  const validTypes = [
    'virtual-try-on-person',
    'virtual-try-on-outfit'
  ];
  return validTypes.includes(type);
};

export const logApiCall = (endpoint: string, params: any) => {
  console.log(`BitStudio API call: ${endpoint}`, params);
};

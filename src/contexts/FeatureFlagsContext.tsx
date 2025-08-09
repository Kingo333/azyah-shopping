
import React, { createContext, useContext } from 'react';
import { features, FeatureFlag } from '@/lib/features';

interface FeatureFlagsContextType {
  isEnabled: (flag: FeatureFlag) => boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(undefined);

export const FeatureFlagsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isEnabled = (flag: FeatureFlag): boolean => {
    return features[flag];
  };

  return (
    <FeatureFlagsContext.Provider value={{ isEnabled }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagsContext);
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  }
  return context;
};

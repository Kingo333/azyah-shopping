import React, { createContext, useContext, useCallback } from 'react';
import { layerPositionManager } from '@/lib/layerPositionManager';

interface LayerPositionContextType {
  syncAllLayers: (pinnedLayerIds?: Set<string>) => void;
}

const LayerPositionContext = createContext<LayerPositionContextType | undefined>(undefined);

export const LayerPositionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const syncAllLayers = useCallback((pinnedLayerIds?: Set<string>) => {
    layerPositionManager.shuffleAll(pinnedLayerIds);
  }, []);

  return (
    <LayerPositionContext.Provider value={{ syncAllLayers }}>
      {children}
    </LayerPositionContext.Provider>
  );
};

export const useLayerPosition = () => {
  const context = useContext(LayerPositionContext);
  if (!context) {
    throw new Error('useLayerPosition must be used within LayerPositionProvider');
  }
  return context;
};

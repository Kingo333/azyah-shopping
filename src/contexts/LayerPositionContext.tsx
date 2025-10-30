import React, { createContext, useContext, useCallback } from 'react';
import { layerPositionManager } from '@/lib/layerPositionManager';

interface LayerPositionContextType {
  syncAllPositions: (position: number, layerIds: string[]) => void;
  shuffleAll: (layers: Array<{ id: string; itemCount: number; isPinned: boolean }>) => void;
}

const LayerPositionContext = createContext<LayerPositionContextType | undefined>(undefined);

export const LayerPositionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const syncAllPositions = useCallback((position: number, layerIds: string[]) => {
    console.log(`🔄 Syncing all ${layerIds.length} layers to position ${position}`);
    layerIds.forEach(layerId => {
      layerPositionManager.setPosition(layerId, position);
    });
  }, []);

  const shuffleAll = useCallback((layers: Array<{ id: string; itemCount: number; isPinned: boolean }>) => {
    console.log(`🎲 Shuffling ${layers.filter(l => !l.isPinned).length} unpinned layers`);
    layerPositionManager.shuffleAll(layers);
  }, []);

  return (
    <LayerPositionContext.Provider
      value={{
        syncAllPositions,
        shuffleAll,
      }}
    >
      {children}
    </LayerPositionContext.Provider>
  );
};

export const useLayerPositionContext = () => {
  const context = useContext(LayerPositionContext);
  if (!context) {
    throw new Error('useLayerPositionContext must be used within LayerPositionProvider');
  }
  return context;
};

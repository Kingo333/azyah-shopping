import { useState, useEffect } from 'react';

interface ConnectionInfo {
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  downlink?: number;
  saveData?: boolean;
}

interface ConnectionAwareConfig {
  slowConnectionFeatures: string[];
  deferredFeatures: string[];
  priorityFeatures: string[];
}

export const useConnectionAware = (config: ConnectionAwareConfig) => {
  const [connectionSpeed, setConnectionSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [saveData, setSaveData] = useState(false);
  const [enabledFeatures, setEnabledFeatures] = useState<Set<string>>(new Set());

  useEffect(() => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    const updateConnection = () => {
      if (!connection) {
        setConnectionSpeed('medium');
        return;
      }

      const connectionInfo = connection as ConnectionInfo;
      setSaveData(connectionInfo.saveData || false);
      
      if (connectionInfo.effectiveType === 'slow-2g' || connectionInfo.effectiveType === '2g') {
        setConnectionSpeed('slow');
      } else if (connectionInfo.effectiveType === '3g' || (connectionInfo.downlink && connectionInfo.downlink < 1.5)) {
        setConnectionSpeed('medium');
      } else {
        setConnectionSpeed('fast');
      }
    };

    updateConnection();

    if (connection) {
      connection.addEventListener('change', updateConnection);
      return () => connection.removeEventListener('change', updateConnection);
    }
  }, []);

  useEffect(() => {
    const enabled = new Set<string>();
    
    // Always enable priority features
    config.priorityFeatures.forEach(feature => enabled.add(feature));
    
    // Enable features based on connection speed
    if (connectionSpeed === 'fast') {
      config.deferredFeatures.forEach(feature => enabled.add(feature));
      config.slowConnectionFeatures.forEach(feature => enabled.add(feature));
    } else if (connectionSpeed === 'medium') {
      config.deferredFeatures.forEach(feature => enabled.add(feature));
      // Only enable slow connection features if not on save data
      if (!saveData) {
        config.slowConnectionFeatures.forEach(feature => enabled.add(feature));
      }
    }
    // On slow connections, only priority features are enabled
    
    setEnabledFeatures(enabled);
  }, [connectionSpeed, saveData, config]);

  const isFeatureEnabled = (feature: string) => enabledFeatures.has(feature);

  const getImageQuality = () => {
    if (saveData) return 60;
    switch (connectionSpeed) {
      case 'slow': return 70;
      case 'medium': return 85;
      case 'fast': return 95;
      default: return 85;
    }
  };

  const shouldPreload = (priority: 'high' | 'medium' | 'low') => {
    if (saveData) return false;
    if (connectionSpeed === 'slow') return priority === 'high';
    if (connectionSpeed === 'medium') return priority !== 'low';
    return true;
  };

  return {
    connectionSpeed,
    saveData,
    isFeatureEnabled,
    getImageQuality,
    shouldPreload,
    enabledFeatures: Array.from(enabledFeatures)
  };
};
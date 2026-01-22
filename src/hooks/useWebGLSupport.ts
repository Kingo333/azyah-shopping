import { useState, useEffect } from 'react';

export const useWebGLSupport = () => {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        const context = 
          canvas.getContext('webgl') || 
          canvas.getContext('experimental-webgl');
        
        if (context) {
          // Check for low-power mode by testing if rendering is stable
          const gl = context as WebGLRenderingContext;
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            // Some devices report software renderers which are slow
            const isSoftwareRenderer = 
              renderer.includes('SwiftShader') || 
              renderer.includes('llvmpipe');
            setIsSupported(!isSoftwareRenderer);
            return;
          }
          setIsSupported(true);
        } else {
          setIsSupported(false);
        }
      } catch {
        setIsSupported(false);
      }
    };

    checkWebGL();
  }, []);

  return isSupported;
};

export default useWebGLSupport;

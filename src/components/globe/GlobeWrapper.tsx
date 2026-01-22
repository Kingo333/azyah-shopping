import React, { useState, useEffect, lazy, Suspense } from 'react';
import { GlobeFallback } from './GlobeFallback';

// Lazy load the GlobeScene to reduce initial bundle size
const GlobeScene = lazy(() => import('./GlobeScene'));

interface GlobeWrapperProps {
  countriesWithBrands: { code: string; count: number }[];
  selectedCountry: string | null;
  onCountrySelect: (code: string) => void;
  autoRotate?: boolean;
  featuredCountry?: string | null;
  className?: string;
  onSkipToFeed?: () => void;
}

// Detect WebGL support
function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!(gl && gl instanceof WebGLRenderingContext);
  } catch {
    return false;
  }
}

// Simple error boundary for the globe
class GlobeErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Globe error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function GlobeWrapper({
  countriesWithBrands,
  selectedCountry,
  onCountrySelect,
  autoRotate = true,
  featuredCountry,
  className = '',
  onSkipToFeed,
}: GlobeWrapperProps) {
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Check WebGL support on mount
    const webglSupported = detectWebGL();
    setHasWebGL(webglSupported);
    
    if (!webglSupported) {
      console.warn('WebGL not supported, using fallback');
    }
  }, []);

  // Loading state
  if (hasWebGL === null) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 ${className}`}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading globe...</p>
        </div>
      </div>
    );
  }

  // Use fallback if no WebGL or if there was an error
  if (!hasWebGL || hasError) {
    return (
      <GlobeFallback
        countriesWithBrands={countriesWithBrands}
        selectedCountry={selectedCountry}
        onCountrySelect={onCountrySelect}
        onSkipToFeed={onSkipToFeed || (() => {})}
      />
    );
  }

  return (
    <GlobeErrorBoundary
      fallback={
        <GlobeFallback
          countriesWithBrands={countriesWithBrands}
          selectedCountry={selectedCountry}
          onCountrySelect={onCountrySelect}
          onSkipToFeed={onSkipToFeed || (() => {})}
        />
      }
    >
      <Suspense
        fallback={
          <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 ${className}`}>
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Loading 3D globe...</p>
            </div>
          </div>
        }
      >
        <GlobeScene
          countriesWithBrands={countriesWithBrands}
          selectedCountry={selectedCountry}
          onCountrySelect={onCountrySelect}
          autoRotate={autoRotate}
          featuredCountry={featuredCountry}
          className={className}
        />
      </Suspense>
    </GlobeErrorBoundary>
  );
}

export default GlobeWrapper;

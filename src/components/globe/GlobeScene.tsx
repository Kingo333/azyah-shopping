import React, { useRef, useMemo, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { OrbitControls, Html, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { COUNTRY_COORDINATES, latLngToVector3, type CountryCoordinates } from '@/lib/countryCoordinates';

// Extend THREE classes to avoid lovable-tagger conflicts
extend({ 
  Group: THREE.Group, 
  Mesh: THREE.Mesh, 
  SphereGeometry: THREE.SphereGeometry,
  MeshStandardMaterial: THREE.MeshStandardMaterial,
  MeshBasicMaterial: THREE.MeshBasicMaterial,
  MeshPhongMaterial: THREE.MeshPhongMaterial
});

// Earth texture URLs - using reliable CDN sources
const EARTH_TEXTURE = 'https://cdn.jsdelivr.net/npm/three-globe@2.31.0/example/img/earth-blue-marble.jpg';
const EARTH_BUMP = 'https://cdn.jsdelivr.net/npm/three-globe@2.31.0/example/img/earth-topology.png';
const EARTH_SPEC = 'https://cdn.jsdelivr.net/npm/three-globe@2.31.0/example/img/earth-water.png';
const CLOUDS_TEXTURE = 'https://cdn.jsdelivr.net/npm/three-globe@2.31.0/example/img/earth-clouds.png';

// Tab-specific pin colors for consistent category coloring
const TAB_PIN_COLORS = {
  brands: '#7c1d3e',    // Burgundy/maroon
  following: '#3b82f6', // Blue
  shoppers: '#22c55e',  // Green
  'your-fit': '#a855f7' // Purple
};

interface CountryPinProps {
  country: CountryCoordinates;
  isActive: boolean;
  hasBrands: boolean;
  brandCount: number;
  isFeatured?: boolean;
  onClick: () => void;
  activeTab?: 'brands' | 'following' | 'shoppers' | 'your-fit';
}

function CountryPin({ country, isActive, hasBrands, brandCount, isFeatured, onClick, activeTab = 'brands' }: CountryPinProps) {
  const position = useMemo(() => 
    latLngToVector3(country.lat, country.lng, 1.02), 
    [country.lat, country.lng]
  );
  
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current && hasBrands) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.15;
      meshRef.current.scale.setScalar(scale);
    }
  });

  // Only show pins for countries with brands
  if (!hasBrands) return null;
  
  const pinSize = isFeatured ? 0.04 : isActive ? 0.035 : 0.03;

  // Determine pin color based on state and active tab
  const getColor = () => {
    if (isActive) return '#f97316'; // Orange for selected (always)
    if (isFeatured) return '#fbbf24'; // Gold for featured
    // Use tab-specific color for all pins in that category
    return TAB_PIN_COLORS[activeTab] || '#7c1d3e';
  };

  const color = getColor();
  const emissiveIntensity = isActive ? 1.2 : isFeatured ? 1.0 : 0.8;

  return (
    <group position={position}>
      <mesh 
        ref={meshRef} 
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <sphereGeometry args={[pinSize, 16, 16]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
      {/* Outer glow ring - only for countries with brands */}
      {hasBrands && (
        <mesh>
          <sphereGeometry args={[isFeatured ? 0.045 : 0.038, 16, 16]} />
          <meshBasicMaterial 
            color={color}
            transparent
            opacity={0.3}
          />
        </mesh>
      )}
      {isActive && (
        <Html
          position={[0, 0.12, 0]}
          center
          style={{
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-xl">
            <p className="text-sm font-medium text-foreground">{country.name}</p>
            <p className="text-xs text-muted-foreground">{brandCount} brand{brandCount !== 1 ? 's' : ''}</p>
          </div>
        </Html>
      )}
      {isFeatured && !isActive && (
        <Html
          position={[0, 0.08, 0]}
          center
          style={{
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <div className="bg-amber-500/90 backdrop-blur-sm rounded-full px-2 py-0.5 shadow-lg">
            <p className="text-[10px] font-medium text-white">★ Featured</p>
          </div>
        </Html>
      )}
    </group>
  );
}

// Realistic Earth component with textures
function RealisticEarth() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Load all Earth textures
  const [earthMap, bumpMap, specMap] = useTexture([
    EARTH_TEXTURE,
    EARTH_BUMP,
    EARTH_SPEC
  ]);

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshPhongMaterial
        map={earthMap}
        bumpMap={bumpMap}
        bumpScale={0.05}
        specularMap={specMap}
        specular={new THREE.Color(0x333333)}
        shininess={5}
      />
    </mesh>
  );
}

// Safe wrapper for RealisticEarth - falls back to SimpleFallbackEarth on texture load errors
function SafeRealisticEarth() {
  const [hasError, setHasError] = useState(false);
  
  if (hasError) return <SimpleFallbackEarth />;
  
  return (
    <ErrorBoundary onError={() => setHasError(true)}>
      <Suspense fallback={<SimpleFallbackEarth />}>
        <RealisticEarth />
      </Suspense>
    </ErrorBoundary>
  );
}

// Cloud layer component - renders clouds over Earth
function CloudLayer() {
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudsTexture = useTexture(CLOUDS_TEXTURE);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0003; // Slow cloud rotation
    }
  });

  return (
    <mesh ref={meshRef} scale={[1.01, 1.01, 1.01]}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        map={cloudsTexture}
        transparent
        opacity={0.35}
        depthWrite={false}
      />
    </mesh>
  );
}

// Wrapper to safely render CloudLayer - catches texture loading errors
function SafeCloudLayer() {
  const [hasError, setHasError] = useState(false);
  
  if (hasError) return null;
  
  return (
    <ErrorBoundary onError={() => setHasError(true)}>
      <Suspense fallback={null}>
        <CloudLayer />
      </Suspense>
    </ErrorBoundary>
  );
}

// Simple error boundary for 3D components
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// Atmosphere glow - subtle for cleaner look
function AtmosphereGlow() {
  return (
    <mesh scale={[1.08, 1.08, 1.08]}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshBasicMaterial
        color="#4da6ff"
        transparent
        opacity={0.04}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

// Simple fallback Earth (no textures, for loading state)
function SimpleFallbackEarth() {
  return (
    <mesh>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        color="#1a5f7a"
        metalness={0.1}
        roughness={0.8}
      />
    </mesh>
  );
}

interface GlobeProps {
  countriesWithBrands: { code: string; count: number }[];
  selectedCountry: string | null;
  onCountrySelect: (code: string) => void;
  autoRotate: boolean;
  featuredCountry?: string | null;
  activeTab?: 'brands' | 'following' | 'shoppers' | 'your-fit';
}

function Globe({ countriesWithBrands, selectedCountry, onCountrySelect, autoRotate, featuredCountry, activeTab = 'brands' }: GlobeProps) {
  const globeRef = useRef<THREE.Group>(null);
  
  const brandCountMap = useMemo(() => {
    const map = new Map<string, number>();
    countriesWithBrands.forEach(c => map.set(c.code.toUpperCase(), c.count));
    return map;
  }, [countriesWithBrands]);

  useFrame(() => {
    if (globeRef.current && autoRotate && !selectedCountry) {
      globeRef.current.rotation.y += 0.002;
    }
  });

  return (
    <group ref={globeRef}>
      {/* Realistic Earth with textures - falls back to simple sphere offline */}
      <SafeRealisticEarth />
      
      {/* Cloud layer - optional, fails gracefully */}
      <SafeCloudLayer />
      
      {/* Atmosphere glow */}
      <AtmosphereGlow />

      {/* Country pins */}
      {COUNTRY_COORDINATES.map((country) => {
        const upperCode = country.code.toUpperCase();
        return (
          <CountryPin
            key={country.code}
            country={country}
            isActive={selectedCountry?.toUpperCase() === upperCode}
            hasBrands={brandCountMap.has(upperCode)}
            brandCount={brandCountMap.get(upperCode) || 0}
            isFeatured={featuredCountry?.toUpperCase() === upperCode}
            onClick={() => onCountrySelect(country.code)}
            activeTab={activeTab}
          />
        );
      })}
    </group>
  );
}

interface GlobeSceneProps {
  countriesWithBrands: { code: string; count: number }[];
  selectedCountry: string | null;
  onCountrySelect: (code: string) => void;
  autoRotate?: boolean;
  featuredCountry?: string | null;
  className?: string;
  activeTab?: 'brands' | 'following' | 'shoppers' | 'your-fit';
}

export function GlobeScene({ 
  countriesWithBrands, 
  selectedCountry, 
  onCountrySelect,
  autoRotate = true,
  featuredCountry,
  className = '',
  activeTab = 'brands'
}: GlobeSceneProps) {
  const [isClient, setIsClient] = useState(false);

  // Ensure we only render on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-900 ${className}`}>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: 'default'
        }}
        style={{ background: 'transparent' }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 5, 5]} intensity={1.8} />
          <directionalLight position={[-5, 3, -5]} intensity={0.6} />
          <pointLight position={[-10, -10, -10]} intensity={0.5} color="#7c1d3e" />
          
          <Globe 
            countriesWithBrands={countriesWithBrands}
            selectedCountry={selectedCountry}
            onCountrySelect={onCountrySelect}
            autoRotate={autoRotate}
            featuredCountry={featuredCountry}
            activeTab={activeTab}
          />
          
          <OrbitControls 
            enableZoom={true}
            enablePan={false}
            minDistance={1.5}
            maxDistance={4}
            autoRotate={false}
            rotateSpeed={0.5}
            zoomSpeed={0.5}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default GlobeScene;

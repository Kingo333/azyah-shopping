import React, { useRef, useMemo, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { COUNTRY_COORDINATES, latLngToVector3, type CountryCoordinates } from '@/lib/countryCoordinates';

// Extend THREE classes to avoid lovable-tagger conflicts
extend({ 
  Group: THREE.Group, 
  Mesh: THREE.Mesh, 
  SphereGeometry: THREE.SphereGeometry,
  MeshStandardMaterial: THREE.MeshStandardMaterial,
  MeshBasicMaterial: THREE.MeshBasicMaterial
});

interface CountryPinProps {
  country: CountryCoordinates;
  isActive: boolean;
  hasBrands: boolean;
  brandCount: number;
  isFeatured?: boolean;
  onClick: () => void;
}

function CountryPin({ country, isActive, hasBrands, brandCount, isFeatured, onClick }: CountryPinProps) {
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

  if (!hasBrands) return null;

  // Determine pin color based on state
  const getColor = () => {
    if (isFeatured) return '#fbbf24'; // Gold for featured
    if (isActive) return '#f97316'; // Orange for selected
    return '#7c1d3e'; // Maroon for normal
  };

  const color = getColor();

  return (
    <group position={position}>
      <mesh 
        ref={meshRef} 
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <sphereGeometry args={[isFeatured ? 0.03 : 0.025, 16, 16]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={isActive ? 0.9 : isFeatured ? 0.7 : 0.5}
        />
      </mesh>
      {isActive && (
        <Html
          position={[0, 0.1, 0]}
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
          position={[0, 0.06, 0]}
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

interface GlobeProps {
  countriesWithBrands: { code: string; count: number }[];
  selectedCountry: string | null;
  onCountrySelect: (code: string) => void;
  autoRotate: boolean;
  featuredCountry?: string | null;
}

function Globe({ countriesWithBrands, selectedCountry, onCountrySelect, autoRotate, featuredCountry }: GlobeProps) {
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
      {/* Earth sphere - dark cinematic */}
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.2}
          roughness={0.7}
        />
      </mesh>
      
      {/* Atmosphere glow - maroon tint */}
      <mesh>
        <sphereGeometry args={[1.02, 64, 64]} />
        <meshStandardMaterial
          color="#7c1d3e"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Grid lines for visual appeal */}
      <mesh>
        <sphereGeometry args={[1.005, 32, 32]} />
        <meshBasicMaterial
          color="#4a4a6a"
          wireframe
          transparent
          opacity={0.12}
        />
      </mesh>

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
}

export function GlobeScene({ 
  countriesWithBrands, 
  selectedCountry, 
  onCountrySelect,
  autoRotate = true,
  featuredCountry,
  className = ''
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
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1.2} />
          <pointLight position={[-10, -10, -10]} intensity={0.4} color="#7c1d3e" />
          
          <Globe 
            countriesWithBrands={countriesWithBrands}
            selectedCountry={selectedCountry}
            onCountrySelect={onCountrySelect}
            autoRotate={autoRotate}
            featuredCountry={featuredCountry}
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

import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { COUNTRY_COORDINATES, latLngToVector3, type CountryCoordinates } from '@/lib/countryCoordinates';

interface CountryPinProps {
  country: CountryCoordinates;
  isActive: boolean;
  hasBrands: boolean;
  brandCount: number;
  onClick: () => void;
}

function CountryPin({ country, isActive, hasBrands, brandCount, onClick }: CountryPinProps) {
  const position = useMemo(() => 
    latLngToVector3(country.lat, country.lng, 1.02), 
    [country.lat, country.lng]
  );
  
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current && hasBrands) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.1);
    }
  });

  if (!hasBrands) return null;

  return (
    <group position={position}>
      <mesh ref={meshRef} onClick={onClick}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshStandardMaterial 
          color={isActive ? '#f97316' : '#7c1d3e'} 
          emissive={isActive ? '#f97316' : '#7c1d3e'}
          emissiveIntensity={isActive ? 0.8 : 0.4}
        />
      </mesh>
      {isActive && (
        <Html
          position={[0, 0.08, 0]}
          center
          style={{
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 shadow-xl">
            <p className="text-sm font-medium text-foreground">{country.name}</p>
            <p className="text-xs text-muted-foreground">{brandCount} brands</p>
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
}

function Globe({ countriesWithBrands, selectedCountry, onCountrySelect, autoRotate }: GlobeProps) {
  const globeRef = useRef<THREE.Group>(null);
  
  const brandCountMap = useMemo(() => {
    const map = new Map<string, number>();
    countriesWithBrands.forEach(c => map.set(c.code, c.count));
    return map;
  }, [countriesWithBrands]);

  useFrame(() => {
    if (globeRef.current && autoRotate && !selectedCountry) {
      globeRef.current.rotation.y += 0.001;
    }
  });

  return (
    <group ref={globeRef}>
      {/* Earth sphere */}
      <Sphere args={[1, 64, 64]}>
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.1}
          roughness={0.8}
        />
      </Sphere>
      
      {/* Atmosphere glow */}
      <Sphere args={[1.015, 64, 64]}>
        <meshStandardMaterial
          color="#7c1d3e"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Grid lines for visual appeal */}
      <Sphere args={[1.005, 32, 32]}>
        <meshBasicMaterial
          color="#3f3f5a"
          wireframe
          transparent
          opacity={0.15}
        />
      </Sphere>

      {/* Country pins */}
      {COUNTRY_COORDINATES.map((country) => (
        <CountryPin
          key={country.code}
          country={country}
          isActive={selectedCountry === country.code}
          hasBrands={brandCountMap.has(country.code)}
          brandCount={brandCountMap.get(country.code) || 0}
          onClick={() => onCountrySelect(country.code)}
        />
      ))}
    </group>
  );
}

interface GlobeSceneProps {
  countriesWithBrands: { code: string; count: number }[];
  selectedCountry: string | null;
  onCountrySelect: (code: string) => void;
  autoRotate?: boolean;
  className?: string;
}

export function GlobeScene({ 
  countriesWithBrands, 
  selectedCountry, 
  onCountrySelect,
  autoRotate = true,
  className = ''
}: GlobeSceneProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <pointLight position={[-10, -10, -10]} intensity={0.3} color="#7c1d3e" />
          
          <Globe 
            countriesWithBrands={countriesWithBrands}
            selectedCountry={selectedCountry}
            onCountrySelect={onCountrySelect}
            autoRotate={autoRotate}
          />
          
          <OrbitControls 
            enableZoom={true}
            enablePan={false}
            minDistance={1.5}
            maxDistance={4}
            autoRotate={autoRotate && !selectedCountry}
            autoRotateSpeed={0.5}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default GlobeScene;

import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Crown, Sparkles, Shirt, ShoppingBag, Heart, Watch, Glasses, Footprints, Gem, Star, Scissors, Palette, Zap, Triangle, Circle, Diamond } from 'lucide-react';

const icons = [Crown, Sparkles, Shirt, ShoppingBag, Heart, Watch, Glasses, Footprints, Gem, Star, Scissors, Palette, Zap, Triangle, Circle, Diamond];

interface FloatingIcon {
  id: number;
  Icon: typeof Crown;
  baseX: number;
  baseY: number;
  size: number;
  delay: number;
  duration: number;
}

export function FloatingFashionIcons() {
  const [floatingIcons, setFloatingIcons] = useState<FloatingIcon[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize icons
  useEffect(() => {
    const iconData: FloatingIcon[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      Icon: icons[Math.floor(Math.random() * icons.length)],
      baseX: Math.random() * 100,
      baseY: Math.random() * 100,
      size: 8 + Math.random() * 8, // Random size between 8-16
      delay: Math.random() * 5,
      duration: 10 + Math.random() * 8
    }));
    
    setFloatingIcons(iconData);
  }, []);

  // Track mouse/touch position
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      let clientX: number, clientY: number;
      
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      setMousePos({
        x: ((clientX - rect.left) / rect.width) * 100,
        y: ((clientY - rect.top) / rect.height) * 100
      });
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
    };
  }, []);

  // Track device orientation (gyroscope)
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta !== null && e.gamma !== null) {
        // beta: front-to-back tilt (-180 to 180)
        // gamma: left-to-right tilt (-90 to 90)
        setTilt({
          x: (e.gamma / 90) * 15, // Max 15% shift
          y: (e.beta / 180) * 15
        });
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  // Calculate repulsion effect
  const getRepulsionOffset = (iconX: number, iconY: number) => {
    const dx = iconX - mousePos.x;
    const dy = iconY - mousePos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const repulsionRadius = 25; // 25% of screen width/height
    
    if (distance < repulsionRadius && distance > 0) {
      const force = (repulsionRadius - distance) / repulsionRadius;
      return {
        x: (dx / distance) * force * 15, // Max 15% push
        y: (dy / distance) * force * 15
      };
    }
    
    return { x: 0, y: 0 };
  };

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden">
      {floatingIcons.map(({ id, Icon, baseX, baseY, size, delay, duration }) => {
        const repulsion = getRepulsionOffset(baseX, baseY);
        
        return (
          <motion.div
            key={id}
            className="absolute opacity-15 md:opacity-25"
            style={{
              left: `${baseX}%`,
              top: `${baseY}%`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`
            }}
            initial={{ x: 0, y: 0 }}
            animate={{
              x: repulsion.x + tilt.x,
              y: repulsion.y + tilt.y,
            }}
            transition={{
              type: "spring",
              stiffness: 50,
              damping: 15,
              mass: 1
            }}
          >
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 0.9, 1]
              }}
              transition={{
                duration: duration,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Icon 
                className="text-[#E68BA5]/50" 
                style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
              />
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
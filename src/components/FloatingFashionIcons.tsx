import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Crown, Sparkles, Shirt, ShoppingBag, Heart, Watch, Glasses, Footprints, Gem, Star, Scissors, Palette, ShoppingCart, Tag, Gift, Wallet } from 'lucide-react';

const icons = [Crown, Sparkles, Shirt, ShoppingBag, Heart, Watch, Glasses, Footprints, Gem, Star, Scissors, Palette, ShoppingCart, Tag, Gift, Wallet];

interface FloatingIcon {
  id: number;
  Icon: typeof Crown;
  baseX: number;
  baseY: number;
  size: number;
  delay: number;
  duration: number;
  floatX: number;
  floatY: number;
}

export function FloatingFashionIcons() {
  const [floatingIcons, setFloatingIcons] = useState<FloatingIcon[]>([]);

  // Initialize icons
  useEffect(() => {
    const iconData: FloatingIcon[] = Array.from({ length: 35 }, (_, i) => ({
      id: i,
      Icon: icons[Math.floor(Math.random() * icons.length)],
      baseX: Math.random() * 100,
      baseY: Math.random() * 100,
      size: 8 + Math.random() * 8, // Random size between 8-16
      delay: Math.random() * 5,
      duration: 10 + Math.random() * 8,
      floatX: (Math.random() - 0.5) * 40, // Random float range -20 to 20
      floatY: (Math.random() - 0.5) * 40
    }));
    
    setFloatingIcons(iconData);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {floatingIcons.map(({ id, Icon, baseX, baseY, size, delay, duration, floatX, floatY }) => {
        
        return (
          <motion.div
            key={id}
            className="absolute opacity-25 md:opacity-35"
            style={{
              left: `${baseX}%`,
              top: `${baseY}%`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`
            }}
            initial={{ x: 0, y: 0 }}
            animate={{
              x: [0, floatX, -floatX, 0],
              y: [0, floatY, -floatY, 0],
            }}
            transition={{
              x: {
                duration: duration,
                repeat: Infinity,
                ease: "easeInOut"
              },
              y: {
                duration: duration,
                repeat: Infinity,
                ease: "easeInOut"
              }
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
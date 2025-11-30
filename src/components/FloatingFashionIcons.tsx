import { useState, useEffect } from 'react';
import { Crown, Sparkles, Shirt, ShoppingBag, Heart, Watch, Glasses, Footprints, Gem, Star } from 'lucide-react';

const icons = [Crown, Sparkles, Shirt, ShoppingBag, Heart, Watch, Glasses, Footprints, Gem, Star];

interface FloatingIcon {
  id: number;
  Icon: typeof Crown;
  x: number;
  y: number;
  delay: number;
  duration: number;
}

export function FloatingFashionIcons() {
  const [floatingIcons, setFloatingIcons] = useState<FloatingIcon[]>([]);

  useEffect(() => {
    const iconData: FloatingIcon[] = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      Icon: icons[Math.floor(Math.random() * icons.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 10 + Math.random() * 8
    }));
    
    setFloatingIcons(iconData);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {floatingIcons.map(({ id, Icon, x, y, delay, duration }) => (
        <div
          key={id}
          className="absolute opacity-15 md:opacity-25 animate-float-gentle"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`
          }}
        >
          <Icon className="w-10 h-10 md:w-12 md:h-12 text-rose-200/40" />
        </div>
      ))}
    </div>
  );
}
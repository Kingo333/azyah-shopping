import { useState, useEffect } from 'react';
import { Crown, Sparkles, Shirt, ShoppingBag, Heart } from 'lucide-react';

const icons = [Crown, Sparkles, Shirt, ShoppingBag, Heart];

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
    const iconData: FloatingIcon[] = Array.from({ length: 5 }, (_, i) => ({
      id: i,
      Icon: icons[i % icons.length],
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 8 + Math.random() * 4
    }));
    
    setFloatingIcons(iconData);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {floatingIcons.map(({ id, Icon, x, y, delay, duration }) => (
        <div
          key={id}
          className="absolute opacity-20 animate-float-gentle"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`
          }}
        >
          <Icon className="w-6 h-6 text-primary/40" />
        </div>
      ))}
    </div>
  );
}
import { useEffect, useState } from 'react';
import afterOutfit from '@/assets/after-outfit.jpg';
import beforeOutfit from '@/assets/before-outfit.jpg';

const GARMENTS = ['/onboarding/product-shirt.png', '/onboarding/product-bag.png', '/onboarding/product-shoes.png'];

/**
 * Marketing picture of Live Cam for the home pages: the live try-on stage
 * with a "Live" badge, the shopper's camera as a small inset, and a strip of
 * clothes with one picked. Illustration only; it doesn't start a camera.
 */
export function LiveTryOnPreview({ className = '' }: { className?: string }) {
  const [picked, setPicked] = useState(0);

  // Step through the garments so it reads as "switching outfits live".
  useEffect(() => {
    const id = setInterval(() => setPicked((p) => (p + 1) % GARMENTS.length), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`relative w-full overflow-hidden rounded-[24px] bg-black shadow-2xl ${className}`}>
      <img src={afterOutfit} alt="Live try-on preview" className="absolute inset-0 h-full w-full object-cover" />

      <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[12px] font-semibold text-white">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        Live
      </span>

      <div className="absolute right-3 top-3 aspect-[3/4] w-[26%] overflow-hidden rounded-xl ring-2 ring-white/70">
        <img src={beforeOutfit} alt="" className="h-full w-full object-cover" />
        <span className="absolute left-1 top-1 rounded-full bg-black/60 px-1.5 text-[9px] font-medium text-white">You</span>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-10">
        {GARMENTS.map((src, i) => (
          <span
            key={src}
            className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white transition-all duration-300 ${
              i === picked ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-105' : 'opacity-80'
            }`}
          >
            <img src={src} alt="" className="h-10 w-10 object-contain" />
          </span>
        ))}
      </div>
    </div>
  );
}

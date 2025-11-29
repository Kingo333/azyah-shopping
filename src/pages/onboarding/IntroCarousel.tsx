import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BeforeAfterSlider } from '@/components/BeforeAfterSlider';
import { SwipeableImages } from '@/components/SwipeableImages';
import { Heart, X } from 'lucide-react';

type SlideType = 
  | { type: 'hero'; image: string; title: string; subtitle: string }
  | { type: 'interactive-swipe'; title: string; subtitle: string; images: string[] }
  | { type: 'interactive-slider'; title: string; subtitle: string }
  | { type: 'gallery'; title: string; subtitle: string; image: string };

const slides: SlideType[] = [
  {
    type: 'hero',
    image: '/onboarding/slide-hero.png',
    title: 'Discover Your Style',
    subtitle: 'Curated fashion that matches your unique taste',
  },
  {
    type: 'interactive-swipe',
    title: 'Your Style, Your Swipes',
    subtitle: 'Swipe right on items you love. We learn your taste.',
    images: [
      '/onboarding/swipe-outfit-1.png',
      '/onboarding/swipe-outfit-2.png',
      '/onboarding/swipe-outfit-3.png',
    ],
  },
  {
    type: 'interactive-slider',
    title: 'Try Before You Buy',
    subtitle: 'See how items look on you with AI try-on technology',
  },
  {
    type: 'gallery',
    title: 'Create, Collaborate, Earn',
    subtitle: 'Join creators & brands. Build looks, share style, earn rewards.',
    image: '/onboarding/slide-collabs.png',
  },
];

export default function IntroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const navigate = useNavigate();

  const handleSwipe = (offset: number) => {
    if (offset > 100 && currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(prev => prev - 1);
    } else if (offset < -100 && currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    handleSwipe(info.offset.x);
  };

  const handleJoinCommunity = () => {
    navigate('/onboarding/signup');
  };

  const slide = slides[currentSlide];

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Azyah Branding at Top */}
      <div className="pt-6 pb-4 z-10">
        <div className="flex items-center justify-center gap-2">
          <img 
            src="/marketing/azyah-logo.png" 
            alt="Azyah" 
            className="h-8 w-8 object-contain"
          />
          <h1 className="text-3xl font-serif text-foreground tracking-wider" style={{ fontWeight: 300, letterSpacing: '0.1em' }}>
            Azyah
          </h1>
        </div>
      </div>

      {/* Main Content Area with Swipe */}
      <div className="flex-1 overflow-hidden relative" style={{ paddingBottom: '140px' }}>
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            {slide.type === 'hero' && (
              <div className="h-full flex flex-col">
                {/* Full-bleed hero image */}
                <div className="relative h-[55%] overflow-hidden">
                  <img 
                    src={slide.image} 
                    alt={slide.title}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-white" />
                </div>
                
                {/* Title & Subtitle */}
                <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                    {slide.title}
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed max-w-md">
                    {slide.subtitle}
                  </p>
                </div>
              </div>
            )}

            {slide.type === 'interactive-swipe' && (
              <div className="h-full flex flex-col px-6">
                {/* Title & Subtitle */}
                <div className="text-center mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    {slide.title}
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {slide.subtitle}
                  </p>
                </div>

                {/* Interactive Swipe Area */}
                <div className="flex-1 relative max-w-sm mx-auto w-full">
                  <SwipeableImages images={slide.images} />
                  
                  {/* Swipe Action Indicators */}
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-8 pointer-events-none z-20">
                    <motion.div 
                      className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-lg"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <X className="w-7 h-7 text-white" strokeWidth={3} />
                    </motion.div>
                    <motion.div 
                      className="w-14 h-14 rounded-full bg-pink-500 flex items-center justify-center shadow-lg"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                    >
                      <Heart className="w-7 h-7 text-white fill-white" />
                    </motion.div>
                  </div>
                </div>
              </div>
            )}

            {slide.type === 'interactive-slider' && (
              <div className="h-full flex flex-col px-6">
                {/* Title & Subtitle */}
                <div className="text-center mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    {slide.title}
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {slide.subtitle}
                  </p>
                </div>

                {/* Interactive Slider Area */}
                <div className="flex-1 relative max-w-sm mx-auto w-full rounded-2xl overflow-hidden shadow-2xl">
                  <BeforeAfterSlider />
                </div>
              </div>
            )}

            {slide.type === 'gallery' && (
              <div className="h-full flex flex-col">
                {/* Background Image with Overlay */}
                <div className="relative h-[55%] overflow-hidden">
                  <img 
                    src={slide.image} 
                    alt={slide.title}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-white" />
                </div>
                
                {/* Title & Subtitle */}
                <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                    {slide.title}
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed max-w-md mb-4">
                    {slide.subtitle}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium">
                    Join 10,000+ creators
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Fixed Bottom CTA Section */}
      <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-6 bg-gradient-to-t from-white via-white to-transparent z-20">
        {/* Navigation Dots */}
        <div className="flex justify-center gap-2 mb-6">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentSlide ? 1 : -1);
                setCurrentSlide(index);
              }}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide 
                  ? 'w-8 bg-[#E91E8C]' 
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
        
        {/* Primary CTA */}
        <Button 
          onClick={handleJoinCommunity}
          className="w-full h-14 text-lg font-semibold rounded-full bg-[#E91E8C] hover:bg-[#D11A7F] text-white shadow-lg"
        >
          Join the Community
        </Button>
        
        {/* Login Link */}
        <button
          onClick={handleJoinCommunity}
          className="w-full mt-3 text-[#E91E8C] font-medium hover:text-[#D11A7F] transition-colors"
        >
          Already have an account? <span className="font-semibold">Log In</span>
        </button>
      </div>
    </div>
  );
}

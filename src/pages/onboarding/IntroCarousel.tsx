import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BeforeAfterSlider } from '@/components/BeforeAfterSlider';
import { SwipeableImages } from '@/components/SwipeableImages';

const slides = [
  {
    image: '/onboarding/slide-hero.png',
    title: 'Elegant style, carefully curated',
    subtitle: 'Find styles you love & build looks (earn points for salons)',
    type: 'image' as const,
  },
  {
    title: 'Try on outfits with AI',
    subtitle: 'See how items look on you before buying.',
    type: 'swipeable' as const,
    images: [
      '/onboarding/swipe-outfit-1.png',
      '/onboarding/swipe-outfit-2.png',
      '/onboarding/swipe-outfit-3.png',
    ],
  },
  {
    image: '/onboarding/slide-discovery.png',
    title: 'Discover your style, faster',
    subtitle: 'Swipe or browse; results adapt to your taste.',
    type: 'image' as const,
  },
  {
    image: '/onboarding/slide-dressme.png',
    title: 'Build outfits, your way',
    subtitle: 'Add your wardrobe and arrange shareable looks.',
    type: 'image' as const,
  },
  {
    image: '/onboarding/slide-events-new.png',
    title: "What's happening near you",
    subtitle: 'Find pop-ups and local style events.',
    type: 'image' as const,
  },
  {
    image: '/onboarding/slide-collabs.png',
    title: '(UGC) Create, collaborate, & earn',
    subtitle: 'Apply for brand collab; earn points (Premium redeems).',
    type: 'image' as const,
  },
] as const;

export default function IntroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleJoinFree = () => {
    navigate('/onboarding/signup');
  };

  const handleLogin = () => {
    navigate('/onboarding/signup');
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Azyah Branding at Top */}
      <div className="pt-6 pb-4">
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

      {/* Main Content */}
      <div className="flex items-center justify-center px-4 py-6 overflow-auto">
        <div className="w-full max-w-xs mx-auto flex flex-col items-center gap-0">
          {/* Phone Mockup with Screenshot or Slider */}
          <div className="relative w-64 h-auto pt-1">
            <div className="relative bg-white rounded-[2rem] shadow-xl border-[2px] border-gray-900 overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-3 bg-gray-900 rounded-b-xl z-10" />
              {slides[currentSlide].type === 'swipeable' ? (
                <div className="w-full aspect-[9/16]">
                  <SwipeableImages images={slides[currentSlide].images || []} />
                </div>
              ) : (
                <img 
                  src={slides[currentSlide].image} 
                  alt={slides[currentSlide].title}
                  className="w-full h-auto object-contain"
                />
              )}
            </div>
          </div>
          
          {/* Text Content */}
          <div className="text-center space-y-1 px-2 mt-3">
            <h2 className="text-base font-bold text-foreground leading-tight line-clamp-1">
              {slides[currentSlide].title}
            </h2>
            <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">
              {slides[currentSlide].subtitle}
            </p>
          </div>

          {/* Progress Dots with Arrow Navigation */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="p-1 rounded-full hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex justify-center gap-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentSlide 
                      ? 'w-8 bg-foreground' 
                      : 'w-2 bg-muted-foreground/30'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            <button
              onClick={nextSlide}
              disabled={currentSlide === slides.length - 1}
              className="p-1 rounded-full hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="px-6 py-4 space-y-2 bg-white mt-auto">
        <Button 
          onClick={handleJoinFree}
          className="w-full h-12 text-base font-semibold rounded-full bg-[#8B4567] hover:bg-[#7A3A57] text-white"
        >
          Join for free
        </Button>
        
        <button
          onClick={handleLogin}
          className="w-full h-12 text-base font-semibold text-foreground hover:text-foreground/80 transition-colors"
        >
          Log in
        </button>
      </div>
    </div>
  );
}

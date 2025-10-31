import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BeforeAfterSlider } from '@/components/BeforeAfterSlider';
import { useServerSideAnalytics } from '@/hooks/useServerSideAnalytics';

interface Slide {
  id: string;
  image?: string;
  title: string;
  subtitle: string;
  type: 'image' | 'slider';
  cta?: {
    primary: { text: string; route: string };
    secondary?: { text: string; route: string };
  };
}

const slides: Slide[] = [
  {
    id: 'hero',
    image: '/onboarding/slide-hero.png',
    title: 'Azyah',
    subtitle: 'Elegant style, discovered by AI.',
    type: 'image',
    cta: {
      primary: { text: 'Join for free', route: '/onboarding/signup' },
    },
  },
  {
    id: 'tryon',
    title: 'Try on outfits with AI',
    subtitle: 'See how clothes look on you before buying.',
    type: 'slider',
  },
  {
    id: 'discovery',
    image: '/onboarding/slide-discovery.png',
    title: 'Discover your style, faster',
    subtitle: 'Swipe or browse—AI learns your taste.',
    type: 'image',
    cta: {
      primary: { text: 'Start discovering', route: '/swipe' },
    },
  },
  {
    id: 'dressme',
    image: '/onboarding/slide-dressme.png',
    title: 'Build outfits, your way',
    subtitle: 'Your closet—now digital.',
    type: 'image',
    cta: {
      primary: { text: 'Open Dress Me', route: '/dress-me' },
    },
  },
  {
    id: 'events',
    image: '/onboarding/slide-events.png',
    title: 'What\'s happening near you',
    subtitle: 'Discover pop-ups and local style.',
    type: 'image',
    cta: {
      primary: { text: 'Explore events', route: '/events' },
    },
  },
  {
    id: 'collabs',
    image: '/onboarding/slide-collabs.png',
    title: 'Create, collaborate, and earn',
    subtitle: 'For brands, creators, and Premium members.',
    type: 'image',
    cta: {
      primary: { text: 'View collabs', route: '/ugc' },
      secondary: { text: 'Go Premium', route: '/dashboard/upgrade' },
    },
  },
];

export default function IntroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();
  const { trackEvent } = useServerSideAnalytics();

  // Track slide impressions
  useEffect(() => {
    trackEvent({
      event_type: 'landing_slide_impression',
      event_data: {
        slide_id: slides[currentSlide].id,
        slide_index: currentSlide,
      },
    });
  }, [currentSlide, trackEvent]);

  // Preload adjacent slide images
  useEffect(() => {
    const nextIndex = (currentSlide + 1) % slides.length;
    const prevIndex = (currentSlide - 1 + slides.length) % slides.length;
    
    [nextIndex, prevIndex].forEach(index => {
      const slide = slides[index];
      if (slide.image) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = slide.image;
        document.head.appendChild(link);
      }
    });
  }, [currentSlide]);

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

  const handleCtaClick = (slideId: string, ctaType: 'primary' | 'secondary', route: string) => {
    trackEvent({
      event_type: 'landing_cta_click',
      event_data: {
        slide_id: slideId,
        cta_type: ctaType,
        target_route: route,
      },
    });
    navigate(route);
  };

  const handleJoinFree = () => {
    handleCtaClick('default', 'primary', '/onboarding/signup');
  };

  const handleLogin = () => {
    handleCtaClick('default', 'secondary', '/onboarding/signup');
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Azyah Branding at Top */}
      <div className="pt-6 pb-4">
        <h1 className="text-3xl font-bold text-foreground text-center tracking-tight">
          Azyah
        </h1>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center px-4 py-1 overflow-auto">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-1">
          {/* Phone Mockup with Screenshot or Slider */}
          <div className="relative w-48 h-auto">
            <div className="relative bg-white rounded-[1.5rem] shadow-lg border-[3px] border-gray-800 overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-gray-800 rounded-b-lg z-10" />
              {slides[currentSlide].type === 'slider' ? (
                <div className="w-full h-[450px]">
                  <BeforeAfterSlider />
                </div>
              ) : (
                <img 
                  src={slides[currentSlide].image} 
                  alt={`${slides[currentSlide].title} - ${slides[currentSlide].subtitle}`}
                  className="w-full h-auto object-contain"
                />
              )}
            </div>
          </div>
          
          {/* Text Content */}
          <div className="text-center space-y-0.5 px-2">
            <h2 className="text-sm font-bold text-foreground leading-tight">
              {slides[currentSlide].title}
            </h2>
            <p className="text-xs text-muted-foreground">
              {slides[currentSlide].subtitle}
            </p>
          </div>

          {/* Progress Dots with Arrow Navigation */}
          <div className="flex items-center justify-center gap-3 mt-0">
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
      <div className="p-3 space-y-2 border-t bg-background mt-auto">
        {slides[currentSlide].cta ? (
          <>
            <Button 
              onClick={() => handleCtaClick(
                slides[currentSlide].id,
                'primary',
                slides[currentSlide].cta!.primary.route
              )}
              className="w-full h-12 text-base font-semibold rounded-full bg-black hover:bg-black/90 text-white"
            >
              {slides[currentSlide].cta.primary.text}
            </Button>
            
            {slides[currentSlide].cta.secondary && (
              <Button
                variant="outline"
                onClick={() => handleCtaClick(
                  slides[currentSlide].id,
                  'secondary',
                  slides[currentSlide].cta!.secondary!.route
                )}
                className="w-full h-12 text-base font-semibold"
              >
                {slides[currentSlide].cta.secondary.text}
              </Button>
            )}
          </>
        ) : (
          <>
            <Button 
              onClick={handleJoinFree}
              className="w-full h-12 text-base font-semibold rounded-full bg-black hover:bg-black/90 text-white"
            >
              Join for free
            </Button>
            
            <button
              onClick={handleLogin}
              className="w-full h-12 text-base font-semibold text-foreground hover:text-foreground/80 transition-colors"
            >
              Log in
            </button>
          </>
        )}
      </div>
    </div>
  );
}

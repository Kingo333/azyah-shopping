import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
  {
    image: '/onboarding/intro-wardrobe.png',
    title: 'Keep track of the clothes you own',
    subtitle: 'Manage and visualize your wardrobe easily.',
  },
  {
    image: '/onboarding/intro-outfits.png',
    title: 'Discover outfits that match your mood',
    subtitle: 'Get AI-based outfit suggestions daily.',
  },
  {
    image: '/onboarding/intro-community.png',
    title: 'Connect with friends and see what they\'re wearing',
    subtitle: 'See how others style and share their looks.',
  },
  {
    image: '/onboarding/intro-rewards.png',
    title: 'Earn salon & fashion rewards as you engage',
    subtitle: 'Shop, share, and redeem — effortlessly.',
  },
];

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
    navigate('/auth');
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
      <div className="flex-1 flex items-center justify-center px-6 pb-4 overflow-auto">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-4">
          {/* Phone Mockup with Screenshot */}
          <div className="relative w-56 h-auto">
            <div className="relative bg-white rounded-[2rem] shadow-xl border-4 border-gray-800 overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-gray-800 rounded-b-xl z-10" />
              <img 
                src={slides[currentSlide].image} 
                alt={slides[currentSlide].title}
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
          
          {/* Text Content */}
          <div className="text-center space-y-2 px-2">
            <h2 className="text-xl font-bold text-foreground leading-tight">
              {slides[currentSlide].title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {slides[currentSlide].subtitle}
            </p>
          </div>

          {/* Progress Dots */}
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
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-6 space-y-3 border-t bg-background">
        <Button 
          onClick={handleJoinFree}
          className="w-full h-12 text-base font-semibold rounded-xl"
        >
          Join for free
        </Button>
        
        <button
          onClick={handleLogin}
          className="w-full text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          Already have an account? <span className="font-semibold">Log in</span>
        </button>
      </div>
    </div>
  );
}

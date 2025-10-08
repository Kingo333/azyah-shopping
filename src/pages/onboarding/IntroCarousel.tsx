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
    title: 'Connect and get inspired',
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Slide Content */}
        <div className="text-center mb-8">
          <div className="mb-8 flex justify-center">
            <img 
              src={slides[currentSlide].image} 
              alt={slides[currentSlide].title}
              className="w-64 h-64 object-contain"
            />
          </div>
          
          <h1 className="text-2xl font-bold mb-3 text-foreground">
            {slides[currentSlide].title}
          </h1>
          <p className="text-muted-foreground">
            {slides[currentSlide].subtitle}
          </p>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide 
                  ? 'w-8 bg-foreground' 
                  : 'w-2 bg-muted'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Navigation Arrows */}
        <div className="flex justify-between mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="opacity-50 disabled:opacity-20"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextSlide}
            disabled={currentSlide === slides.length - 1}
            className="opacity-50 disabled:opacity-20"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
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
    </div>
  );
}

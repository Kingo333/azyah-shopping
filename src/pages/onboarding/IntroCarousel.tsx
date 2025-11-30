import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BeforeAfterSlider } from '@/components/BeforeAfterSlider';
import { SwipeableImages } from '@/components/SwipeableImages';
import { Heart, X } from 'lucide-react';

type SlideType = 
  | { type: 'hero'; image: string; title: string; subtitle: string; showSocial?: boolean }
  | { type: 'interactive-swipe'; title: string; subtitle: string; images: string[]; productInfo?: Array<{ name: string; brand: string }> }
  | { type: 'interactive-slider'; title: string; subtitle: string }
  | { type: 'gallery'; title: string; subtitle: string };

const slides: SlideType[] = [
  {
    type: 'hero',
    image: '/onboarding/hero-visual-gender-neutral.png',
    title: 'Discover Your Style',
    subtitle: 'The ultimate platform for discovering new fashion, beauty products, and local events.',
    showSocial: true,
  },
  {
    type: 'interactive-swipe',
    title: 'Your Style, Your Swipes',
    subtitle: 'Swipe right to save items to your digital closet. Swipe left to pass.',
    images: [
      '/onboarding/swipe-outfit-1.png',
      '/onboarding/swipe-outfit-2.png',
      '/onboarding/swipe-outfit-3.png',
    ],
    productInfo: [
      { name: 'Designer Handbag', brand: 'Stella McCartney' },
      { name: 'Summer Dress', brand: 'Zara' },
      { name: 'Statement Coat', brand: 'Mango' },
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
    subtitle: 'Showcase your style and get rewarded',
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
      {/* Main Content Area with Swipe */}
      <div className="flex-1 overflow-hidden relative" style={{ paddingBottom: currentSlide === 0 ? '220px' : '140px' }}>
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
                {/* Full-bleed hero image with overlaid branding */}
                <div className="relative h-[60%] overflow-hidden">
                  <img 
                    src={slide.image} 
                    alt={slide.title}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-white" />
                  
                  {/* Azyah branding overlaid on image */}
                  <div className="absolute bottom-6 left-6 flex items-center gap-2">
                    <img 
                      src="/marketing/azyah-logo.png" 
                      alt="Azyah" 
                      className="h-10 w-10 object-contain drop-shadow-lg"
                    />
                    <h1 className="text-4xl font-serif text-white tracking-wider drop-shadow-lg" style={{ fontWeight: 300, letterSpacing: '0.15em' }}>
                      Azyah
                    </h1>
                  </div>
                </div>
                
                {/* Title & Subtitle */}
                <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                    {slide.title}
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed max-w-md">
                    {slide.subtitle}
                  </p>
                </div>
              </div>
            )}

            {slide.type === 'interactive-swipe' && (
              <div className="h-full flex flex-col px-6 pt-8">
                {/* Title & Subtitle */}
                <div className="text-center mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    {slide.title}
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {slide.subtitle}
                  </p>
                </div>

                {/* Interactive Swipe Area with Side Indicators */}
                <div className="flex-1 relative max-w-sm mx-auto w-full px-12">
                  <SwipeableImages 
                    images={slide.images} 
                    productInfo={slide.productInfo}
                  />
                  
                  {/* Side X/Heart Indicators */}
                  <motion.div 
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center shadow-lg pointer-events-none z-20"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <X className="w-7 h-7 text-red-500" strokeWidth={2.5} />
                  </motion.div>
                  
                  <motion.div 
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center shadow-lg pointer-events-none z-20"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                  >
                    <Heart className="w-7 h-7 text-green-500 fill-green-500" />
                  </motion.div>
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
              <div className="h-full flex flex-col px-6 pt-8">
                {/* Title & Subtitle */}
                <div className="text-center mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    {slide.title}
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {slide.subtitle}
                  </p>
                </div>

                {/* Horizontal Scrollable Creator Content */}
                <div className="overflow-x-auto flex gap-3 py-2 -mx-6 px-6 scrollbar-hide mb-4">
                  {[
                    { img: '/onboarding/intro-outfits.png', label: 'Outfit Boards' },
                    { img: '/onboarding/intro-community.png', label: 'Community' },
                    { img: '/onboarding/intro-rewards.png', label: 'Rewards' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex-shrink-0 w-48 rounded-xl overflow-hidden shadow-md">
                      <img 
                        src={item.img} 
                        alt={item.label}
                        className="w-full h-32 object-cover"
                      />
                      <div className="bg-white p-2 text-center">
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Feature Cards */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <span className="text-3xl mb-2 block">📝</span>
                    <h4 className="font-semibold text-sm text-foreground mb-1">Review Your Faves</h4>
                    <p className="text-xs text-muted-foreground">Post reviews for brands you love</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <span className="text-3xl mb-2 block">🎨</span>
                    <h4 className="font-semibold text-sm text-foreground mb-1">Style Collages</h4>
                    <p className="text-xs text-muted-foreground">Create outfit boards & earn rewards</p>
                  </div>
                </div>

                {/* Join creators badge */}
                <p className="text-center text-sm text-muted-foreground font-medium">
                  Join 10,000+ creators
                </p>
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

        {/* Social Sign-in (Hero Slide Only) */}
        {slide.type === 'hero' && slide.showSocial && (
          <div className="mt-6">
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-muted-foreground">Or sign up with</span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={handleJoinCommunity}
                variant="outline"
                className="flex-1 h-12 rounded-full border-2 hover:bg-gray-50"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </Button>
              <Button
                onClick={handleJoinCommunity}
                variant="outline"
                className="flex-1 h-12 rounded-full border-2 hover:bg-gray-50"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Apple
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

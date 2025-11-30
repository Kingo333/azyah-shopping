import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BeforeAfterSlider } from '@/components/BeforeAfterSlider';
import { SwipeableImages } from '@/components/SwipeableImages';
import { Heart, X } from 'lucide-react';

type SlideType = 
  | { type: 'hero'; image: string; title: string; subtitle: string }
  | { type: 'interactive-swipe'; title: string; subtitle: string; images: string[]; productInfo?: Array<{ name: string; brand: string }> }
  | { type: 'interactive-slider'; title: string; subtitle: string }
  | { type: 'ugc'; title: string; subtitle: string }
  | { type: 'gallery'; title: string; subtitle: string };

const slides: SlideType[] = [
  {
    type: 'hero',
    image: '/marketing/hero-visual-gender-neutral.png',
    title: 'Discover Your Style',
    subtitle: 'The ultimate platform for discovering new fashion, beauty products, and local events.',
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
    type: 'ugc',
    title: 'Rate & Review Brands',
    subtitle: 'Share your experience working with brands and help fellow creators make informed decisions',
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
      <div className="flex-1 overflow-hidden relative" style={{ paddingTop: '32px', paddingBottom: '200px' }}>
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
                <div className="relative h-[55%] overflow-hidden">
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
                <div className="flex-1 flex flex-col items-center justify-start pt-6 px-8 text-center">
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
              <div className="h-full flex flex-col px-6">
                {/* Title & Subtitle */}
                <div className="text-center mb-6 pt-4">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    {slide.title}
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {slide.subtitle}
                  </p>
                </div>

                {/* Interactive Swipe Area with Side Indicators */}
                <div className="flex-1 relative max-w-sm mx-auto w-full px-12 flex items-start pt-4 max-h-[350px]">
                  <SwipeableImages 
                    images={slide.images} 
                    productInfo={slide.productInfo}
                  />
                  
                  {/* Side X/Heart Indicators */}
                  <motion.div 
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center shadow-lg pointer-events-none z-20"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <X className="w-5 h-5 text-red-500" strokeWidth={2.5} />
                  </motion.div>
                  
                  <motion.div 
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-12 h-12 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center shadow-lg pointer-events-none z-20"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                  >
                    <Heart className="w-5 h-5 text-green-500 fill-green-500" />
                  </motion.div>
                </div>
              </div>
            )}

            {slide.type === 'interactive-slider' && (
              <div className="h-full flex flex-col px-6">
                {/* Title & Subtitle */}
                <div className="text-center mb-6 pt-4">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    {slide.title}
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {slide.subtitle}
                  </p>
                </div>

                {/* Interactive Slider Area */}
                <div className="flex-1 flex items-start justify-center pt-4">
                  <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl h-[450px]">
                    <BeforeAfterSlider />
                  </div>
                </div>
              </div>
            )}

            {slide.type === 'ugc' && (
              <div className="h-full flex flex-col px-6">
                {/* Title & Subtitle */}
                <div className="text-center mb-6 pt-4">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    {slide.title}
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {slide.subtitle}
                  </p>
                </div>

                {/* UGC Features Grid */}
                <div className="flex-1 flex flex-col justify-start pt-2">
                  <div className="grid grid-cols-1 gap-2 mb-3">
                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-4 border border-primary/20">
                      <span className="text-2xl mb-3 block">⭐</span>
                      <h4 className="font-bold text-base text-foreground mb-2">Honest Reviews</h4>
                      <p className="text-sm text-muted-foreground">Rate brands on payment, communication, and overall experience</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-2xl p-4 border border-accent/20">
                      <span className="text-2xl mb-3 block">🚨</span>
                      <h4 className="font-bold text-base text-foreground mb-2">Report Scams</h4>
                      <p className="text-sm text-muted-foreground">Warn other creators about brands with unfair practices</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-2xl p-4 border border-secondary/20">
                      <span className="text-2xl mb-3 block">❓</span>
                      <h4 className="font-bold text-base text-foreground mb-2">Ask Questions</h4>
                      <p className="text-sm text-muted-foreground">Get answers from creators who've worked with the brand</p>
                    </div>
                  </div>

                  {/* Community Badge */}
                  <p className="text-center text-sm text-muted-foreground font-medium">
                    100% anonymous • Community-powered
                  </p>
                </div>
              </div>
            )}

            {slide.type === 'gallery' && (
              <div className="h-full flex flex-col px-6">
                {/* Title & Subtitle */}
                <div className="text-center mb-6 pt-4">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    {slide.title}
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {slide.subtitle}
                  </p>
                </div>

                {/* Content Container */}
                <div className="flex-1 flex flex-col justify-start pt-2">
                  {/* Horizontal Scrollable Creator Content */}
                  <div className="overflow-x-auto flex gap-3 py-2 -mx-6 px-6 scrollbar-hide mb-4">
                    {[
                      { img: '/onboarding/intro-outfits.png', label: 'Outfit Boards' },
                      { img: '/onboarding/intro-community.png', label: 'Community' },
                      { img: '/onboarding/intro-rewards.png', label: 'Rewards' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex-shrink-0 w-36 rounded-xl overflow-hidden shadow-md">
                        <img 
                          src={item.img} 
                          alt={item.label}
                          className="w-full h-24 object-cover"
                        />
                        <div className="bg-white p-2 text-center">
                          <p className="text-sm font-medium text-foreground">{item.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Feature Cards */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <span className="text-2xl mb-2 block">📝</span>
                      <h4 className="font-semibold text-sm text-foreground mb-1">Review Your Faves</h4>
                      <p className="text-xs text-muted-foreground">Post reviews for brands you love</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <span className="text-2xl mb-2 block">🎨</span>
                      <h4 className="font-semibold text-sm text-foreground mb-1">Style Collages</h4>
                      <p className="text-xs text-muted-foreground">Create outfit boards & earn rewards</p>
                    </div>
                  </div>

                  {/* Join creators badge */}
                  <p className="text-center text-sm text-muted-foreground font-medium">
                    Join 10,000+ creators
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Fixed Bottom CTA Section */}
      <div className="fixed bottom-0 left-0 right-0 px-3 pb-3 pt-2 bg-gradient-to-t from-background via-background to-transparent z-20">
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
                  ? 'w-8 bg-primary' 
                  : 'w-2 bg-muted hover:bg-muted-foreground/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
        
        {/* Primary CTA */}
        <Button 
          onClick={handleJoinCommunity}
          className="w-full h-14 text-lg font-semibold rounded-full shadow-lg"
        >
          Join the Community
        </Button>
        
        {/* Login Link */}
        <button
          onClick={handleJoinCommunity}
          className="w-full mt-3 text-primary font-medium hover:text-primary/80 transition-colors"
        >
          Already have an account? <span className="font-semibold">Log In</span>
        </button>
      </div>
    </div>
  );
}

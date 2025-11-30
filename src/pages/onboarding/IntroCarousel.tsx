import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BeforeAfterSlider } from '@/components/BeforeAfterSlider';
import { SwipeableImages } from '@/components/SwipeableImages';
import { Heart, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { InvestorContactModal } from '@/components/InvestorContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
type SlideType = {
  type: 'hero';
  image: string;
  title: string;
  subtitle: string;
} | {
  type: 'interactive-swipe';
  title: string;
  subtitle: string;
  images: string[];
  productInfo?: Array<{
    name: string;
    brand: string;
  }>;
} | {
  type: 'interactive-slider';
  title: string;
  subtitle: string;
} | {
  type: 'ugc';
  title: string;
  subtitle: string;
} | {
  type: 'gallery';
  title: string;
  subtitle: string;
};
const slides: SlideType[] = [{
  type: 'hero',
  image: '/marketing/hero-visual-gender-neutral.png',
  title: 'Discover Your Style',
  subtitle: 'The platform for discovering fashion brands, beauty products, and events. (Powered by AI)\nWe empower brands, shoppers and content creators.'
}, {
  type: 'interactive-swipe',
  title: 'Your Style, Your Swipes',
  subtitle: 'Swipe right to save, left to pass. Our AI learns your unique style with every choice.',
  images: ['/onboarding/product-bag.png', '/onboarding/product-shoes.png', '/onboarding/product-shirt.png'],
  productInfo: [{
    name: 'Designer Handbag',
    brand: 'Coach'
  }, {
    name: 'Fashion Sneakers',
    brand: 'Nike'
  }, {
    name: 'Men\'s Button-Up Shirt',
    brand: 'H&M'
  }]
}, {
  type: 'interactive-slider',
  title: 'Try Before You Buy',
  subtitle: 'See how items look on you with AI try-on technology'
}, {
  type: 'ugc',
  title: 'Rate & Review Brands',
  subtitle: 'Share your experience working with brands and help fellow creators make informed decisions'
}, {
  type: 'gallery',
  title: 'Create, Collaborate, Earn',
  subtitle: 'Showcase your style and get rewarded'
}];
const faqData = [{
  question: "How does AI-powered fashion discovery work?",
  answer: "Our AI learns from your swipes and preferences to show you fashion pieces you'll love. The more you use Azyah, the better our recommendations become."
}, {
  question: "Do you sell the products directly?",
  answer: "No, Azyah is a fashion discovery platform. We show you products that match your style, then redirect you to the retailer where you can purchase them."
}, {
  question: "How does the swipe discovery work?",
  answer: "Swipe right on styles you love, left on ones you don't. Our AI learns from these interactions to show you more items you'll love."
}, {
  question: "What are the benefits of Premium?",
  answer: "Premium members get 20 virtual fittings daily, unlimited AI replicas, UGC collaboration access, and priority support."
}, {
  question: "Can I save items to my closet and wishlist?",
  answer: "Yes! You can save items to your personal closet, create wishlists, and organize your favorite finds. Share your collections with friends or keep them private - it's up to you."
}, {
  question: "How do I connect with the community?",
  answer: "Join our global fashion community! Share your discoveries, follow other users, and get inspired by trending looks."
}];
export default function IntroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const [investorModalOpen, setInvestorModalOpen] = useState(false);
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
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };
  return <div className="h-screen bg-white flex flex-col overflow-hidden">
      <SEOHead title="Azyah — Luxury Fashion Curation" description="AI-curated luxury fashion discovery. Exclusive designer collections for the discerning style connoisseur." canonical="https://azyah.app/" />
      
      {/* Floating Navigation Elements - Only on first slide */}
      {currentSlide === 0 && <div className="fixed top-3 sm:top-4 left-3 right-3 sm:left-4 sm:right-4 z-50 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-white/90 backdrop-blur-md rounded-full px-3 py-1.5 sm:px-4 sm:py-2 shadow-lg">
            <img src="/marketing/azyah-logo.png" alt="Azyah" className="h-5 w-5 sm:h-6 sm:w-6 object-contain" />
            <span className="font-serif text-sm sm:text-base font-light tracking-wider text-foreground">Azyah</span>
          </div>
          
          {/* Right Side Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="sm" className="font-light bg-white/90 backdrop-blur-md text-foreground hover:bg-white shadow-lg rounded-full text-xs sm:text-sm h-8 px-3 sm:h-9 sm:px-4">
                  FAQ
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="font-serif text-2xl">Frequently Asked Questions</SheetTitle>
                  <SheetDescription>
                    Everything you need to know about fashion discovery with Azyah.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {faqData.map((item, index) => <div key={index} className="bg-muted/30 rounded-lg p-4 border border-primary/10 hover:border-primary/20 transition-colors">
                      <div className="flex items-start gap-3">
                        <ChevronRight className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-foreground mb-2">{item.question}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
                        </div>
                      </div>
                    </div>)}
                </div>
              </SheetContent>
            </Sheet>
            
            <Button size="sm" className="font-light bg-white/90 backdrop-blur-md text-foreground hover:bg-white shadow-lg rounded-full text-xs sm:text-sm h-8 px-3 sm:h-9 sm:px-4" onClick={() => setInvestorModalOpen(true)}>
              For Investors
            </Button>
          </div>
        </div>}
      
      <InvestorContactModal isOpen={investorModalOpen} onOpenChange={setInvestorModalOpen} />
      
      {/* Main Content Area with Swipe */}
      <div className="flex-1 overflow-hidden relative" style={{
      paddingBottom: '200px'
    }}>
        {/* Navigation Arrows */}
        {currentSlide > 0 && <button onClick={() => {
        setDirection(-1);
        setCurrentSlide(prev => prev - 1);
      }} className="fixed left-4 bottom-32 z-30 w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/60 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-primary/80 hover:scale-110 transition-all shadow-lg hover:shadow-xl" aria-label="Previous slide">
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-lg" strokeWidth={2.5} />
          </button>}
        
        {currentSlide < slides.length - 1 && <button onClick={() => {
        setDirection(1);
        setCurrentSlide(prev => prev + 1);
      }} className="fixed right-4 bottom-32 z-30 w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/60 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-primary/80 hover:scale-110 transition-all shadow-lg hover:shadow-xl" aria-label="Next slide">
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-lg" strokeWidth={2.5} />
          </button>}
        
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div key={currentSlide} custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{
          x: {
            type: "spring",
            stiffness: 300,
            damping: 30
          },
          opacity: {
            duration: 0.2
          }
        }} drag="x" dragConstraints={{
          left: 0,
          right: 0
        }} dragElastic={0.2} onDragEnd={handleDragEnd} className="absolute inset-0 cursor-grab active:cursor-grabbing">
            {slide.type === 'hero' && <div className="h-full flex flex-col">
                {/* Full-bleed hero image with overlaid branding */}
                <div className="relative h-[55%] overflow-hidden">
                  <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" draggable={false} />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-white" />
                  
                  {/* Azyah branding overlaid on image */}
                  <div className="absolute bottom-6 left-6 flex items-center gap-2">
                    <img src="/marketing/azyah-logo.png" alt="Azyah" className="h-10 w-10 object-contain drop-shadow-lg" />
                    <h1 className="text-4xl font-serif text-white tracking-wider drop-shadow-lg" style={{
                  fontWeight: 300,
                  letterSpacing: '0.15em'
                }}>
                      zyah
                    </h1>
                  </div>
                </div>
                
                {/* Title & Subtitle */}
                <div className="flex-1 flex flex-col items-center justify-start pt-6 px-8 text-center">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                    {slide.title}
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed max-w-xl">
                    {slide.subtitle}
                  </p>
                </div>
              </div>}

            {slide.type === 'interactive-swipe' && <div className="h-full flex flex-col px-6">
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
                  <SwipeableImages images={slide.images} productInfo={slide.productInfo} />
                  
                  {/* Side X/Heart Indicators */}
                  <motion.div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center shadow-lg pointer-events-none z-20" animate={{
                scale: [1, 1.1, 1]
              }} transition={{
                duration: 2,
                repeat: Infinity
              }}>
                    <X className="w-5 h-5 text-red-500" strokeWidth={2.5} />
                  </motion.div>
                  
                  <motion.div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-12 h-12 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center shadow-lg pointer-events-none z-20" animate={{
                scale: [1, 1.1, 1]
              }} transition={{
                duration: 2,
                repeat: Infinity,
                delay: 1
              }}>
                    <Heart className="w-5 h-5 text-green-500 fill-green-500" />
                  </motion.div>
                </div>
              </div>}

            {slide.type === 'interactive-slider' && <div className="h-full flex flex-col px-6">
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
              </div>}

            {slide.type === 'ugc' && <div className="h-full flex flex-col px-6">
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
              </div>}

            {slide.type === 'gallery' && <div className="h-full flex flex-col px-6">
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
                <div className="flex-1 flex flex-col justify-start pt-2 px-6">
                  {/* Outfit Collages Grid - Taller with Overlay Labels */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {[{
                  img: '/onboarding/outfit-collage-1.jpg',
                  label: 'Outfit Boards'
                }, {
                  img: '/onboarding/outfit-collage-2.jpg',
                  label: 'Style Collages'
                }].map((item, idx) => <div key={idx} className="rounded-xl overflow-hidden shadow-md relative">
                        <img src={item.img} alt={item.label} className="w-full h-52 object-cover" />
                        {/* Gradient Overlay with Label */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent py-3 px-3">
                          <p className="text-sm font-bold text-white drop-shadow-md">{item.label}</p>
                        </div>
                      </div>)}
                  </div>

                  {/* Divider with Arrow */}
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="h-px bg-border flex-1"></div>
                    <span className="text-muted-foreground text-lg">↓</span>
                    <div className="h-px bg-border flex-1"></div>
                  </div>

                  {/* Benefit Cards - Horizontal Compact Layout */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="rounded-xl overflow-hidden shadow-md bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
                      <div className="p-3 flex items-center gap-3">
                        <div className="bg-gradient-to-br from-amber-400 to-orange-500 w-10 h-10 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                          <span className="text-xl">⭐</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs text-foreground mb-0.5">Earn Points</h4>
                          <p className="text-[10px] text-muted-foreground leading-tight">Create boards to earn rewards</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="rounded-xl overflow-hidden shadow-md bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                      <div className="p-3 flex items-center gap-3">
                        <div className="bg-gradient-to-br from-blue-400 to-indigo-500 w-10 h-10 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                          <span className="text-xl">🤝</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs text-foreground mb-0.5">Brand Deals</h4>
                          <p className="text-[10px] text-muted-foreground leading-tight">Get discovered & create UGC</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Join creators badge */}
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground font-medium inline-flex items-center gap-2 bg-accent/10 px-3 py-1.5 rounded-full">
                      <span className="text-base">✨</span>
                      Join 10,000+ creators earning through style
                    </p>
                  </div>
                </div>
              </div>}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Fixed Bottom CTA Section */}
      <div className="fixed bottom-0 left-0 right-0 px-3 pb-2 md:pb-3 pt-2 bg-gradient-to-t from-background via-background to-transparent z-20">
        {/* Navigation Dots */}
        <div className="flex justify-center gap-2 mb-4 md:mb-6">
          {slides.map((_, index) => <button key={index} onClick={() => {
          setDirection(index > currentSlide ? 1 : -1);
          setCurrentSlide(index);
        }} className={`h-2 rounded-full transition-all ${index === currentSlide ? 'w-8 bg-primary' : 'w-2 bg-muted hover:bg-muted-foreground/50'}`} aria-label={`Go to slide ${index + 1}`} />)}
        </div>
        
        {/* Primary CTA */}
        <Button onClick={handleJoinCommunity} className="w-full h-12 md:h-14 text-base md:text-lg font-semibold rounded-full shadow-lg">
          Join the Community
        </Button>
        
        {/* Login Link */}
        <button onClick={handleJoinCommunity} className="w-full mt-2 md:mt-3 text-sm md:text-base text-primary font-medium hover:text-primary/80 transition-colors">
          Already have an account? <span className="font-semibold">Log In</span>
        </button>
      </div>
    </div>;
}
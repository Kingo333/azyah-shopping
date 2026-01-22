import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { setGuestMode } from "@/hooks/useGuestMode";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { SwipeableImages } from "@/components/SwipeableImages";
import { Heart, X, ChevronLeft, ChevronRight, ChevronDown, Globe as GlobeIcon, MapPin, Sparkles } from "lucide-react";
import { InvestorContactModal } from "@/components/InvestorContactModal";
import { SEOHead } from "@/components/SEOHead";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCountryBrands } from "@/hooks/useCountryBrands";
import { useWebGLSupport } from "@/hooks/useWebGLSupport";
import { GlobeFallback, CountryDrawer } from "@/components/globe";
import { COUNTRY_COORDINATES } from "@/lib/countryCoordinates";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

// Lazy load the heavy 3D component
const GlobeScene = lazy(() => import("@/components/globe/GlobeScene"));

type SlideType =
  | { type: "globe" }
  | {
      type: "hero";
      image: string;
      mobileImage?: string;
      title: string;
      subtitle: string;
    }
  | {
      type: "interactive-swipe";
      title: string;
      subtitle: string;
      images: string[];
      productInfo?: Array<{
        name: string;
        brand: string;
      }>;
    }
  | {
      type: "interactive-slider";
      title: string;
      subtitle: string;
    }
  | {
      type: "ugc";
      title: string;
      subtitle: string;
    }
  | {
      type: "gallery";
      title: string;
      subtitle: string;
    };

const slides: SlideType[] = [
  // Globe-first hero
  { type: "globe" },
  {
    type: "interactive-swipe",
    title: "Your Style, Your Swipes",
    subtitle: "Swipe right to save, left to pass. Our AI learns your unique style with every choice.",
    images: ["/onboarding/product-bag.png", "/onboarding/product-shoes.png", "/onboarding/product-shirt.png"],
    productInfo: [
      { name: "Designer Handbag", brand: "Coach" },
      { name: "Fashion Sneakers", brand: "Nike" },
      { name: "Men's Button-Up Shirt", brand: "H&M" },
    ],
  },
  {
    type: "interactive-slider",
    title: "See It On You",
    subtitle: "See how items look on you with AI try-on technology",
  },
  {
    type: "gallery",
    title: "Create. Collaborate. Inspire.",
    subtitle: "Showcase your vision and be rewarded",
  },
  {
    type: "ugc",
    title: "Rate & Review Brands",
    subtitle: "Share your experience working with brands and help fellow creators",
  },
];

const faqData = [
  {
    question: "How does AI-powered fashion discovery work?",
    answer: "Our AI learns from your swipes and preferences to show you fashion pieces you'll love. The more you use Azyah, the better our recommendations become.",
  },
  {
    question: "Do you sell the products directly?",
    answer: "No, Azyah is a fashion discovery platform. We show you products that match your style, then redirect you to the retailer where you can purchase them.",
  },
  {
    question: "How does the swipe discovery work?",
    answer: "Swipe right on styles you love, left on ones you don't. Our AI learns from these interactions to show you more items you'll love.",
  },
  {
    question: "What are the benefits of Premium?",
    answer: "Premium members get 20 virtual fittings daily, unlimited AI replicas, UGC collaboration access, and priority support.",
  },
  {
    question: "Can I save items to my closet and wishlist?",
    answer: "Yes! You can save items to your personal closet, create wishlists, and organize your favorite finds.",
  },
  {
    question: "How do I connect with the community?",
    answer: "Join our global fashion community! Share your discoveries, follow other users, and get inspired by trending looks.",
  },
];

// Auto-playing outfit inspo slider component
const OutfitInspoSlider = () => {
  const [currentImage, setCurrentImage] = useState(0);
  const images = ["/onboarding/outfit-collage-1.jpg", "/onboarding/outfit-collage-2.jpg"];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="flex-shrink-0 w-52 rounded-2xl overflow-hidden shadow-lg hover-scale transition-all duration-300 relative">
      <div className="relative h-64 overflow-hidden">
        {images.map((image, index) => (
          <motion.img
            key={index}
            src={image}
            alt={`Outfit Inspiration ${index + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
            initial={false}
            animate={{
              opacity: currentImage === index ? 1 : 0,
              scale: currentImage === index ? 1 : 1.05,
            }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />
        ))}
        <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1 z-10">
          <span>⭐</span>
          <span>Earn</span>
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {images.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${currentImage === index ? "w-6 bg-white" : "w-1.5 bg-white/50"}`}
            />
          ))}
        </div>
      </div>
      <div className="bg-white p-3 text-center">
        <p className="text-sm font-semibold text-foreground">Create Outfit Inspo</p>
        <p className="text-xs text-muted-foreground">Earn points at salons</p>
      </div>
    </div>
  );
};

export default function IntroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const [investorModalOpen, setInvestorModalOpen] = useState(false);
  const [creatorCount, setCreatorCount] = useState(0);
  const [cardOffset, setCardOffset] = useState(0);
  const [isCarouselDragging, setIsCarouselDragging] = useState(false);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Globe state
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: countriesWithBrands = [] } = useCountryBrands();
  const webGLSupported = useWebGLSupport();

  const handleCountrySelect = (code: string) => {
    setSelectedCountry(code);
    setDrawerOpen(true);
    setIsUserInteracting(true);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      const match = COUNTRY_COORDINATES.find(
        (c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.code.toLowerCase() === query.toLowerCase()
      );
      if (match) {
        handleCountrySelect(match.code);
      }
    }
  };

  const totalBrands = countriesWithBrands.reduce((sum, c) => sum + c.count, 0);
  const totalCountries = countriesWithBrands.length;

  // Auto-advance slides (pause on globe if interacting)
  useEffect(() => {
    if (isUserInteracting || isCarouselDragging || drawerOpen) return;
    // Don't auto-advance from globe slide
    if (currentSlide === 0) return;

    const interval = setInterval(() => {
      setDirection(1);
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isUserInteracting, isCarouselDragging, drawerOpen, currentSlide]);

  // Preload images
  useEffect(() => {
    const images = [
      "/onboarding/product-bag.png",
      "/onboarding/product-shoes.png",
      "/onboarding/product-shirt.png",
      "/onboarding/outfit-collage-1.jpg",
      "/onboarding/outfit-collage-2.jpg",
    ];
    images.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Animated counter for gallery slide
  useEffect(() => {
    if (currentSlide === 3) {
      const duration = 1500;
      const targetCount = 100;
      const steps = 50;
      const increment = targetCount / steps;
      const intervalTime = duration / steps;

      let currentCount = 0;
      const timer = setInterval(() => {
        currentCount += increment;
        if (currentCount >= targetCount) {
          setCreatorCount(targetCount);
          clearInterval(timer);
        } else {
          setCreatorCount(Math.floor(currentCount));
        }
      }, intervalTime);

      return () => clearInterval(timer);
    } else {
      setCreatorCount(0);
    }
  }, [currentSlide]);

  // Auto-scroll gallery carousel
  useEffect(() => {
    if (currentSlide !== 3 || isCarouselDragging || !isMobile) {
      if (currentSlide !== 3) setCardOffset(0);
      return;
    }

    const interval = setInterval(() => {
      setCardOffset((prev) => (prev + 1) % 4);
    }, 3500);

    return () => clearInterval(interval);
  }, [currentSlide, isCarouselDragging, isMobile]);

  const handleSwipe = (offset: number) => {
    if (offset > 100 && currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide((prev) => prev - 1);
    } else if (offset < -100 && currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    handleSwipe(info.offset.x);
    setIsUserInteracting(true);
    setTimeout(() => setIsUserInteracting(false), 8000);
  };

  const handleJoinCommunity = () => {
    navigate("/onboarding/signup");
  };

  const handleExploreAsGuest = () => {
    setGuestMode();
    navigate("/explore");
  };

  const scrollToContent = () => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const slide = slides[currentSlide];

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  const isGlobeSlide = slide.type === "globe";

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <SEOHead
        title="Azyah — Luxury Fashion Curation"
        description="AI-curated luxury fashion discovery. Exclusive designer collections for the discerning style connoisseur."
      />

      {/* Floating Navigation - Only on globe slide */}
      {isGlobeSlide && (
        <div
          className="fixed left-3 right-3 sm:left-4 sm:right-4 z-50 flex items-center justify-between"
          style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 bg-white/90 backdrop-blur-md rounded-full px-3 py-1.5 sm:px-4 sm:py-2 shadow-lg">
            <img src="/marketing/azyah-logo.png" alt="Azyah" className="h-5 w-5 sm:h-6 sm:w-6 object-contain" />
            <span className="font-serif text-sm sm:text-base font-light tracking-wider text-foreground">Azyah</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  size="sm"
                  className="font-light bg-white/70 backdrop-blur-md text-foreground hover:bg-white/80 shadow-lg rounded-full text-xs sm:text-sm h-8 px-3 sm:h-9 sm:px-4"
                >
                  FAQ
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="font-serif text-2xl">Frequently Asked Questions</SheetTitle>
                  <SheetDescription>Everything you need to know about fashion discovery with Azyah.</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {faqData.map((item, index) => (
                    <div
                      key={index}
                      className="bg-muted/30 rounded-lg p-4 border border-primary/10 hover:border-primary/20 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <ChevronRight className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-foreground mb-2">{item.question}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>

            <Button
              size="sm"
              className="font-light bg-white/70 backdrop-blur-md text-foreground hover:bg-white/80 shadow-lg rounded-full text-xs sm:text-sm h-8 px-3 sm:h-9 sm:px-4"
              onClick={() => setInvestorModalOpen(true)}
            >
              For Investors
            </Button>
          </div>
        </div>
      )}

      <InvestorContactModal isOpen={investorModalOpen} onOpenChange={setInvestorModalOpen} />

      {/* Globe Slide - Full Screen */}
      {isGlobeSlide && (
        <div className="h-screen w-full relative bg-gradient-to-b from-[#0a0a14] via-[#12121f] to-[#1a1a2e] overflow-hidden">
          {/* Globe */}
          <div className="absolute inset-0">
            {webGLSupported === null ? (
              <div className="flex items-center justify-center h-full">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                  <GlobeIcon className="w-16 h-16 text-primary/50" />
                </motion.div>
              </div>
            ) : webGLSupported ? (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                      <GlobeIcon className="w-16 h-16 text-primary/50" />
                    </motion.div>
                  </div>
                }
              >
                <GlobeScene
                  countriesWithBrands={countriesWithBrands}
                  selectedCountry={selectedCountry}
                  onCountrySelect={handleCountrySelect}
                  autoRotate={!drawerOpen}
                />
              </Suspense>
            ) : (
              <GlobeFallback
                countriesWithBrands={countriesWithBrands}
                selectedCountry={selectedCountry}
                onCountrySelect={handleCountrySelect}
                onSkipToFeed={handleExploreAsGuest}
              />
            )}
          </div>

          {/* Globe Overlay Content */}
          <div className="absolute inset-x-0 top-1/4 z-10 flex flex-col items-center px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-center mb-6">
              <h1 className="text-3xl md:text-5xl font-serif text-white font-light tracking-wide mb-3">
                Discover Fashion Worldwide
              </h1>
              <p className="text-white/60 text-base md:text-lg font-light max-w-md mx-auto">
                Tap a country to explore brands and start swiping
              </p>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-full px-5 py-2 mb-4 border border-white/10"
            >
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-white/90 text-sm font-medium">{totalBrands} Brands</span>
              </div>
              <div className="w-px h-4 bg-white/20" />
              <span className="text-white/70 text-sm">{totalCountries} Countries</span>
            </motion.div>

            {/* Search */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="w-full max-w-sm">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <Input
                  type="text"
                  placeholder="Search by country..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-12 pr-4 h-11 bg-white/10 backdrop-blur-md border-white/20 text-white placeholder:text-white/40 rounded-full focus:border-primary/50"
                />
              </div>
            </motion.div>
          </div>

          {/* Globe Bottom CTAs */}
          <div className="absolute bottom-0 inset-x-0 z-20 p-4 pb-32 sm:pb-36">
            <div className="max-w-sm mx-auto flex flex-col items-center gap-3">
              <div className="flex gap-3 w-full">
                <Button onClick={handleJoinCommunity} className="flex-1 h-11 rounded-full">
                  Join Free
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/onboarding/signup?mode=login")}
                  className="flex-1 h-11 rounded-full border-white/30 text-white hover:bg-white/10 hover:text-white"
                >
                  Log In
                </Button>
              </div>
              <Button
                variant="ghost"
                onClick={handleExploreAsGuest}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <GlobeIcon className="w-4 h-4 mr-2" />
                Continue as Guest
              </Button>
              
              {/* Scroll hint */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: [0, 6, 0] }}
                transition={{ opacity: { delay: 1 }, y: { delay: 1, duration: 2, repeat: Infinity } }}
                onClick={scrollToContent}
                className="flex flex-col items-center gap-1 text-white/40 hover:text-white/60 transition-colors mt-2"
              >
                <span className="text-xs font-light">How it works</span>
                <ChevronDown className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Country Drawer */}
          <CountryDrawer countryCode={selectedCountry} open={drawerOpen} onOpenChange={setDrawerOpen} />
        </div>
      )}

      {/* Other Slides - Carousel */}
      {!isGlobeSlide && (
        <div
          className="flex-1 overflow-hidden relative h-screen"
          style={{ paddingBottom: "200px" }}
        >
          {/* Navigation Arrows */}
          {currentSlide > 0 && (
            <button
              onClick={() => {
                setIsUserInteracting(true);
                setDirection(-1);
                setCurrentSlide((prev) => prev - 1);
                setTimeout(() => setIsUserInteracting(false), 8000);
              }}
              className="fixed left-4 bottom-32 z-30 w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/60 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-primary/80 transition-all shadow-lg"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-lg" strokeWidth={2.5} />
            </button>
          )}

          <div className="fixed right-4 bottom-32 z-30 flex flex-col items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-medium bg-muted/80 backdrop-blur-sm px-2 py-0.5 rounded-full animate-pulse">
              Swipe →
            </span>
            <button
              onClick={() => {
                setIsUserInteracting(true);
                if (currentSlide === slides.length - 1) {
                  setDirection(-1);
                  setCurrentSlide(0);
                } else {
                  setDirection(1);
                  setCurrentSlide((prev) => prev + 1);
                }
                setTimeout(() => setIsUserInteracting(false), 8000);
              }}
              className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/60 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-primary/80 transition-all shadow-lg"
              aria-label={currentSlide === slides.length - 1 ? "Back to start" : "Next slide"}
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-lg" strokeWidth={2.5} />
            </button>
          </div>

          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={currentSlide}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "tween", duration: 0.3, ease: "easeOut" },
                opacity: { duration: 0.15 },
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className="absolute inset-0 cursor-grab active:cursor-grabbing bg-background"
            >
              {slide.type === "interactive-swipe" && (
                <div className="h-full flex flex-col px-6 pt-16">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl md:text-3xl font-serif font-medium text-foreground mb-2">{slide.title}</h2>
                    <p className="text-base font-light text-muted-foreground leading-relaxed">{slide.subtitle}</p>
                  </div>

                  <div className="flex-1 relative max-w-sm mx-auto w-full px-12 flex items-start pt-4 max-h-[350px]">
                    <SwipeableImages images={slide.images} productInfo={slide.productInfo} />

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

              {slide.type === "interactive-slider" && (
                <div className="h-full flex flex-col px-6 pt-16">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl md:text-3xl font-serif font-medium text-foreground mb-2">{slide.title}</h2>
                    <p className="text-base font-light text-muted-foreground leading-relaxed">{slide.subtitle}</p>
                  </div>

                  <div className="flex-1 flex items-start justify-center pt-4">
                    <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl h-[450px]">
                      <BeforeAfterSlider />
                    </div>
                  </div>
                </div>
              )}

              {slide.type === "ugc" && (
                <div className="h-full flex flex-col px-6 pt-16">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl md:text-3xl font-serif font-medium text-foreground mb-2">{slide.title}</h2>
                    <p className="text-base font-light text-muted-foreground leading-relaxed">{slide.subtitle}</p>
                  </div>

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

                    <p className="text-center text-sm text-muted-foreground font-medium -mt-2">100% anonymous • Community-powered</p>
                  </div>
                </div>
              )}

              {slide.type === "gallery" && (
                <div className="h-full flex flex-col px-6 pt-16 bg-gradient-to-b from-background via-background to-primary/5">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl md:text-3xl font-serif font-medium text-foreground mb-2 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                      {slide.title}
                    </h2>
                    <p className="text-base font-light text-muted-foreground leading-relaxed">{slide.subtitle}</p>
                  </div>

                  <div className="flex-1 flex flex-col justify-start pt-4">
                    <div className="relative mb-6 w-full">
                      <div className="overflow-hidden">
                        <motion.div
                          className="flex gap-6 py-3 cursor-grab active:cursor-grabbing"
                          style={isMobile ? { paddingLeft: "calc(50vw - 104px)" } : {}}
                          animate={isMobile ? { x: -cardOffset * 232 } : { x: 0 }}
                          transition={{ duration: 0.8, ease: "easeInOut" }}
                          drag={isMobile ? "x" : false}
                          dragConstraints={{ left: -696, right: 0 }}
                          dragElastic={0.1}
                          onDragStart={() => setIsCarouselDragging(true)}
                          onDragEnd={(e, info) => {
                            setIsCarouselDragging(false);
                            const offset = info.offset.x;
                            const velocity = info.velocity.x;
                            if (Math.abs(offset) > 100 || Math.abs(velocity) > 500) {
                              if (offset < 0 && cardOffset < 3) {
                                setCardOffset((prev) => Math.min(prev + 1, 3));
                              } else if (offset > 0 && cardOffset > 0) {
                                setCardOffset((prev) => Math.max(prev - 1, 0));
                              }
                            }
                          }}
                        >
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={currentSlide === 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                            transition={{ delay: 0, duration: 0.3 }}
                            className="flex-shrink-0"
                          >
                            <div className="w-52 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] shadow-lg">
                              <OutfitInspoSlider />
                            </div>
                          </motion.div>

                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={currentSlide === 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                            transition={{ delay: 0.05, duration: 0.3 }}
                            className="flex-shrink-0"
                          >
                            <div className="w-52 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] bg-white shadow-lg">
                              <div className="h-64 bg-gradient-to-br from-blue-500 to-indigo-600 flex flex-col items-center justify-center p-6">
                                <span className="text-6xl mb-4">🤝</span>
                                <h4 className="font-bold text-lg text-white mb-2 text-center">Brand Deals</h4>
                                <p className="text-sm text-center text-white/90">Get discovered by brands & create UGC content</p>
                              </div>
                              <div className="bg-white p-3 text-center">
                                <p className="text-sm font-semibold text-foreground">Earn Money</p>
                              </div>
                            </div>
                          </motion.div>

                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={currentSlide === 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                            transition={{ delay: 0.1, duration: 0.3 }}
                            className="flex-shrink-0"
                          >
                            <div className="w-52 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] bg-white shadow-lg">
                              <div className="h-64 bg-gradient-to-br from-pink-500 to-rose-600 flex flex-col items-center justify-center p-6">
                                <span className="text-6xl mb-4">👯</span>
                                <h4 className="font-bold text-lg text-white mb-2 text-center">Style Friends</h4>
                                <p className="text-sm text-center text-white/90">Create outfits for your friends with their clothes</p>
                              </div>
                              <div className="bg-white p-3 text-center">
                                <p className="text-sm font-semibold text-foreground">Be Creative</p>
                              </div>
                            </div>
                          </motion.div>

                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={currentSlide === 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                            transition={{ delay: 0.15, duration: 0.3 }}
                            className="flex-shrink-0"
                          >
                            <div className="w-52 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] bg-white shadow-lg">
                              <div className="h-64 bg-gradient-to-br from-purple-500 to-violet-600 flex flex-col items-center justify-center p-6">
                                <span className="text-6xl mb-4">🎉</span>
                                <h4 className="font-bold text-lg text-white mb-2 text-center">Pop-Up Events</h4>
                                <p className="text-sm text-center text-white/90">Discover exclusive fashion events and join them</p>
                              </div>
                              <div className="bg-white p-3 text-center">
                                <p className="text-sm font-semibold text-foreground">Get Exclusive Access</p>
                              </div>
                            </div>
                          </motion.div>
                        </motion.div>
                      </div>
                    </div>

                    <motion.div
                      className="text-center"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={currentSlide === 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                      transition={{ delay: 0.5, duration: 0.4 }}
                    >
                      <p className="text-sm text-muted-foreground font-medium inline-flex items-center gap-2 bg-accent/10 px-4 py-2 rounded-full">
                        <span className="text-lg">✨</span>
                        Start earning with your digital closet
                      </p>
                    </motion.div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Fixed Bottom CTA Section - Only for non-globe slides */}
      {!isGlobeSlide && (
        <div
          className="fixed bottom-0 left-0 right-0 px-3 pt-2 bg-gradient-to-t from-background via-background to-transparent z-20"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
        >
          <div className="flex justify-center gap-2 mb-3 md:mb-4">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setDirection(index > currentSlide ? 1 : -1);
                  setCurrentSlide(index);
                }}
                className={`h-2 rounded-full transition-all ${index === currentSlide ? "w-8 bg-primary" : "w-2 bg-muted hover:bg-muted-foreground/50"}`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          <Button onClick={handleJoinCommunity} className="w-full h-11 md:h-12 text-sm md:text-base font-semibold rounded-full shadow-lg">
            Join the Community
          </Button>

          <div className="flex flex-col items-center gap-3 mt-3">
            <div className="flex items-center justify-center gap-3 w-full">
              <Button
                onClick={() => navigate("/onboarding/signup?mode=login")}
                variant="outline"
                className="flex-1 h-11 md:h-12 text-sm md:text-base font-semibold rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                Log In
              </Button>
              <Button
                onClick={handleExploreAsGuest}
                variant="outline"
                className="h-11 md:h-12 px-6 text-sm md:text-base font-semibold rounded-full border-muted-foreground/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                Guest
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Scroll Target for "How it works" */}
      <div ref={scrollRef} className="pt-8">
        {isGlobeSlide && (
          <div className="bg-background px-4 py-12">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-serif text-center mb-8 text-foreground">How Azyah Works</h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-6 rounded-2xl bg-muted/30">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <GlobeIcon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">1. Explore the Globe</h3>
                  <p className="text-sm text-muted-foreground">Discover fashion brands from around the world by tapping countries on our interactive globe.</p>
                </div>
                
                <div className="text-center p-6 rounded-2xl bg-muted/30">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <Heart className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">2. Swipe Your Style</h3>
                  <p className="text-sm text-muted-foreground">Swipe right on pieces you love. Our AI learns your taste to show you perfect matches.</p>
                </div>
                
                <div className="text-center p-6 rounded-2xl bg-muted/30">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">3. Try Before You Buy</h3>
                  <p className="text-sm text-muted-foreground">Use AI virtual try-on to see how items look on you before purchasing.</p>
                </div>
              </div>

              {/* CTA to continue exploring */}
              <div className="mt-12 text-center">
                <Button onClick={() => setCurrentSlide(1)} size="lg" className="rounded-full">
                  See Features
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

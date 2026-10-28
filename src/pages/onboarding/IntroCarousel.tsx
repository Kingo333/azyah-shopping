import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setGuestMode } from "@/hooks/useGuestMode";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LiveTryOnPreview } from "@/components/LiveTryOnPreview";
import { SwipeableImages } from "@/components/SwipeableImages";
import { Heart, X, ChevronLeft, ChevronRight, Menu, Search, Play } from "lucide-react";
import { InvestorContactModal } from "@/components/InvestorContactModal";
import { SEOHead } from "@/components/SEOHead";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { GlobeWrapper } from "@/components/globe/GlobeWrapper";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { features } from "@/lib/features";


type SlideType =
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
      type: "live";
      title: string;
      subtitle: string;
    }
  | {
      type: "gallery";
      title: string;
      subtitle: string;
    };
const slides: SlideType[] = [
  {
    type: "hero",
    image: "/marketing/hero-visual-desktop.png",
    mobileImage: "/marketing/hero-visual-mobile.png",
    title: "Discover Your Style",
    subtitle: "Discover fashion and pop-ups from brands worldwide, and see clothes on you live before you buy.",
  },
  // Live Cam is the selling point, so it comes right after the globe.
  {
    type: "live",
    title: "See It On You, Live",
    subtitle: "Point your camera and watch clothes appear on you in real time.",
  },
  {
    type: "interactive-swipe",
    title: "Your Style, Your Swipes",
    subtitle: "Swipe right to save, left to pass. Your feed learns your style over time.",
    images: ["/onboarding/product-bag.png", "/onboarding/product-shoes.png", "/onboarding/product-shirt.png"],
    productInfo: [
      {
        name: "Designer Handbag",
        brand: "Coach",
      },
      {
        name: "Fashion Sneakers",
        brand: "Nike",
      },
      {
        name: "Men's Button-Up Shirt",
        brand: "H&M",
      },
    ],
  },
  {
    type: "gallery",
    title: "Build Your Outfits",
    subtitle: "Mix pieces from your closet and share your looks with the community.",
  },
];
// The gallery slide's animations key off its position.
const GALLERY_SLIDE_INDEX = slides.findIndex((s) => s.type === "gallery");
const faqData = [
  {
    question: "How does AI-powered fashion discovery work?",
    answer:
      "Our AI learns from your swipes and preferences to show you fashion pieces you'll love. The more you use Azyah, the better our recommendations become.",
  },
  {
    question: "Do you sell the products directly?",
    answer:
      "No, Azyah is a fashion discovery platform. We show you products that match your style, then redirect you to the retailer where you can purchase them.",
  },
  {
    question: "How does the swipe discovery work?",
    answer:
      "Swipe right on styles you love, left on ones you don't. Our AI learns from these interactions to show you more items you'll love.",
  },
  {
    question: "What are the benefits of Premium?",
    answer:
      "Premium members get 10 AI try-ons a day, unlimited outfits and closet items, can turn points into credits, and get priority support.",
  },
  {
    question: "Can I save items to my closet and wishlist?",
    answer:
      "Yes! You can save items to your personal closet, create wishlists, and organize your favorite finds. Share your collections with friends or keep them private - it's up to you.",
  },
  {
    question: "How do I connect with the community?",
    answer:
      "Build outfits from your closet and share them with the community, style your friends, and get inspired by looks from people worldwide.",
  },
];
// Inline version for grid cards
const OutfitInspoInlineSlider = () => {
  const [currentImage, setCurrentImage] = useState(0);
  const images = ["/onboarding/outfit-collage-1.jpg", "/onboarding/outfit-collage-2.jpg"];
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [images.length]);
  return (
    <>
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
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {images.map((_, index) => (
          <div
            key={index}
            className={`h-1.5 rounded-full transition-all duration-300 ${currentImage === index ? "w-6 bg-white" : "w-1.5 bg-white/50"}`}
          />
        ))}
      </div>
    </>
  );
};

// Feature pills for animated slideshow
const FEATURE_PILLS = [
  "Live try-on",
  "AI curation",
  "Discover premium brands",
  "Pop-up events"
];

// HeroSlide component for the first carousel slide
interface HeroSlideProps {
  countriesWithBrands: { code: string; count: number }[];
  brandDataByCountry: Map<string, { name: string; logo_url: string | null }>;
  handleSkipToFeed: () => void;
  navigate: (path: string) => void;
  setIsUserInteracting: (interacting: boolean) => void;
  isMobile: boolean;
}

const HeroSlide: React.FC<HeroSlideProps> = ({
  countriesWithBrands,
  brandDataByCountry,
  handleSkipToFeed,
  navigate,
  setIsUserInteracting,
  isMobile,
}) => {
  const [isGlobeInteracting, setIsGlobeInteracting] = useState(false);
  const [currentPillIndex, setCurrentPillIndex] = useState(0);

  // Animate pills as slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPillIndex((prev) => (prev + 1) % FEATURE_PILLS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleGlobeInteractionStart = () => {
    setIsGlobeInteracting(true);
    setIsUserInteracting(true);
  };

  const handleGlobeInteractionEnd = () => {
    setTimeout(() => {
      setIsGlobeInteracting(false);
      setIsUserInteracting(false);
    }, 8000);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Full-bleed globe hero - fills entire slide */}
      <div 
        className="relative h-full overflow-hidden bg-gray-900"
        onPointerDown={(e) => {
          e.stopPropagation(); // Prevent carousel from capturing this event
          handleGlobeInteractionStart();
        }}
        onPointerUp={handleGlobeInteractionEnd}
        onTouchStart={(e) => {
          e.stopPropagation(); // Prevent carousel swipe on touch
          handleGlobeInteractionStart();
        }}
        onTouchEnd={handleGlobeInteractionEnd}
        onTouchMove={(e) => {
          e.stopPropagation(); // Prevent carousel drag during globe interaction
        }}
      >
        {/* Interactive 3D Globe - zoomed out more on mobile */}
        <GlobeWrapper
          countriesWithBrands={countriesWithBrands}
          selectedCountry={null}
          onCountrySelect={() => {
            // Set guest mode and navigate to explore when clicking a pin (after popup)
            setGuestMode();
            navigate("/explore");
          }}
          autoRotate={!isGlobeInteracting}
          className="w-full h-full"
          cameraDistance={isMobile ? 4.5 : 3.5}
          brandDataByCountry={brandDataByCountry}
          showBrandPopupOnClick={true}
        />
        
        {/* Reduced gradient overlay for better globe visibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none" />

        {/* Search bar - redirects to Explore page */}
        <div 
          className="absolute top-16 left-1/2 -translate-x-1/2 z-10 w-full max-w-md px-4 cursor-pointer"
          onClick={() => {
            // Set guest mode and navigate to explore when clicking search
            setGuestMode();
            navigate("/explore");
          }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
            <Input
              type="text"
              placeholder="Search brands, items, shoppers..."
              className="pl-10 h-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-full focus-visible:ring-primary/50 backdrop-blur-sm cursor-pointer"
              style={{ fontSize: '16px' }}
              readOnly
            />
          </div>
        </div>

        {/* Skip to Feed, Add your pin, and Feature pill - top right */}
        <div className="absolute top-16 right-4 z-10 flex flex-col gap-2 items-end">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSkipToFeed}
            className="h-10 px-4 bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-full backdrop-blur-sm"
          >
            Skip to Feed
          </Button>
          {/* Row with Add your pin + Feature pill slideshow */}
          <div className="flex items-center gap-2">
            {/* Animated pill slideshow */}
            <div className="relative h-8 overflow-hidden min-w-[130px]">
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentPillIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="absolute right-0 inline-flex items-center bg-white/15 backdrop-blur-sm border border-white/25 text-white text-xs px-3 py-1.5 rounded-full whitespace-nowrap"
                >
                  {FEATURE_PILLS[currentPillIndex]}
                </motion.span>
              </AnimatePresence>
            </div>
            {/* Add your pin */}
            <button 
              onClick={() => navigate("/onboarding/signup")}
              className="group flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 hover:border-primary/50 rounded-full px-3 py-2 transition-all duration-300"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-primary to-amber-400 animate-pulse" />
              <span className="text-xs text-white/90 group-hover:text-white">Add your pin</span>
            </button>
          </div>
        </div>

        {/* Overlays that hide when interacting with globe */}
        <AnimatePresence>
          {!isGlobeInteracting && (
            <>
              {/* Discovery text pill - centered in lower area */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
                className="absolute bottom-52 left-0 right-0 z-20 text-center px-4 pointer-events-none"
              >
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-4 max-w-sm mx-auto">
                  <h2 className="text-xl font-serif text-white mb-2 drop-shadow-lg">Discover Your Style</h2>
                  <p className="text-sm text-white/80 leading-relaxed">
                    Discover fashion and pop-ups from brands worldwide,
                    <br />
                    and see clothes on you live before you buy.
                  </p>
                </div>
              </motion.div>

            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
export default function IntroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const [investorModalOpen, setInvestorModalOpen] = useState(false);
  const [isCarouselDragging, setIsCarouselDragging] = useState(false);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [isNavMinimized, setIsNavMinimized] = useState(false);
  
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Listen for bottom nav state changes
  useEffect(() => {
    const handleNavStateChange = (event: CustomEvent<{ minimized: boolean }>) => {
      setIsNavMinimized(event.detail.minimized);
    };
    
    window.addEventListener('bottomNavStateChange', handleNavStateChange as EventListener);
    return () => {
      window.removeEventListener('bottomNavStateChange', handleNavStateChange as EventListener);
    };
  }, []);

  // Fetch countries with brands for globe (including brand data for popup)
  interface BrandWithCountry {
    country_code: string | null;
    name: string;
    logo_url: string | null;
  }
  
  const { data: countriesData = { countries: [], brandDataByCountry: new Map() } } = useQuery({
    queryKey: ['countries-with-brands-intro-detailed'],
    queryFn: async () => {
      const result = await supabase
        .from('brands')
        .select('country_code, name, logo_url')
        .not('country_code', 'is', null);
      
      if (result.error) {
        console.error('Error fetching countries:', result.error);
        return { countries: [], brandDataByCountry: new Map() };
      }

      const counts = new Map<string, number>();
      const brandDataMap = new Map<string, { name: string; logo_url: string | null }>();
      
      (result.data || []).forEach((b: BrandWithCountry) => {
        if (b.country_code) {
          const code = b.country_code.toUpperCase();
          counts.set(code, (counts.get(code) || 0) + 1);
          // Keep first brand as representative for popup
          if (!brandDataMap.has(code)) {
            brandDataMap.set(code, { name: b.name, logo_url: b.logo_url });
          }
        }
      });
      
      return {
        countries: Array.from(counts.entries()).map(([code, count]) => ({ code, count })),
        brandDataByCountry: brandDataMap
      };
    },
  });
  
  const countriesWithBrands = countriesData.countries;
  const brandDataByCountry = countriesData.brandDataByCountry;

  const handleSkipToFeed = () => {
    setGuestMode();
    navigate("/swipe");
  };

  // Auto-advance slides
  useEffect(() => {
    if (isUserInteracting || isCarouselDragging) return;
    
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3000); // 3 seconds between slides

    return () => clearInterval(interval);
  }, [isUserInteracting, isCarouselDragging]);

  // Preload hero image immediately with high priority
  useEffect(() => {
    // Add preload link for hero image
    const heroSrc = isMobile ? "/marketing/hero-visual-mobile.png" : "/marketing/hero-visual-desktop.png";
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = heroSrc;
    link.fetchPriority = 'high';
    document.head.appendChild(link);

    // Preload other images with lower priority
    const otherImages = [
      "/onboarding/product-bag.png",
      "/onboarding/product-shoes.png",
      "/onboarding/product-shirt.png",
      "/onboarding/outfit-collage-1.jpg",
      "/onboarding/outfit-collage-2.jpg",
    ];
    
    otherImages.forEach((src) => {
      const img = new Image();
      img.src = src;
    });

    return () => {
      document.head.removeChild(link);
    };
  }, [isMobile]);

  const handleSwipe = (offset: number) => {
    if (offset > 100 && currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide((prev) => prev - 1);
    } else if (offset < -100 && currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide((prev) => prev + 1);
    }
  };
  const handleDragEnd = (event: any, info: PanInfo) => {
    handleSwipe(info.offset.x);
    setIsUserInteracting(true);
    setTimeout(() => setIsUserInteracting(false), 8000); // Resume after 8 seconds
  };
  const handleJoinCommunity = () => {
    navigate("/onboarding/signup");
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
  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <SEOHead
        title="Azyah — Luxury Fashion Curation"
        description="AI-curated luxury fashion discovery. Exclusive designer collections for the discerning style connoisseur."
      />

      {/* Floating Navigation Elements - Only on first slide */}
      {currentSlide === 0 && (
        <div className="fixed left-3 right-3 sm:left-4 sm:right-4 z-50 flex items-center justify-between" style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}>
          {/* Logo */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-white/90 backdrop-blur-md rounded-full px-3 py-1.5 sm:px-4 sm:py-2 shadow-lg">
            <img src="/marketing/azyah-logo.png" alt="Azyah" className="h-5 w-5 sm:h-6 sm:w-6 object-contain" />
            <span className="font-serif text-sm sm:text-base font-light tracking-wider text-foreground">Azyah</span>
          </div>

          {/* Right Side - Hamburger Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                size="sm"
                className="font-light bg-white/70 backdrop-blur-md text-foreground hover:bg-white/80 shadow-lg rounded-full h-8 w-8 sm:h-9 sm:w-9 p-0"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="font-serif text-2xl">Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {/* FAQ Section */}
                <div className="border-b border-border pb-4">
                  <h3 className="font-semibold text-lg mb-3">Frequently Asked Questions</h3>
                  {faqData.map((item, index) => (
                    <div
                      key={index}
                      className="bg-muted/30 rounded-lg p-3 mb-2 border border-primary/10 hover:border-primary/20 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-sm text-foreground mb-1">{item.question}</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">{item.answer}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* For Investors */}
                <Button
                  className="w-full"
                  onClick={() => setInvestorModalOpen(true)}
                >
                  For Investors
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}

      <InvestorContactModal isOpen={investorModalOpen} onOpenChange={setInvestorModalOpen} />

      {/* Main Content Area with Swipe */}
      <div
        className="flex-1 overflow-hidden relative"
        style={{
          paddingBottom: "200px",
        }}
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
            className="fixed left-4 bottom-32 z-30 w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/60 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-primary/80 transition-all shadow-lg hover:shadow-xl animate-[pulse-scale_2s_ease-in-out_infinite]"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-lg" strokeWidth={2.5} />
          </button>
        )}

        <div className="fixed right-4 bottom-32 z-30 flex flex-col items-center gap-2">
          <span className="text-[10px] text-white/80 font-medium bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full animate-pulse">
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
            className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/60 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-primary/80 transition-all shadow-lg hover:shadow-xl animate-[pulse-scale_2s_ease-in-out_infinite]"
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
            drag={currentSlide === 0 && isUserInteracting ? false : "x"}
            dragConstraints={{
              left: 0,
              right: 0,
            }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            {slide.type === "hero" && (
              <HeroSlide 
                countriesWithBrands={countriesWithBrands}
                brandDataByCountry={brandDataByCountry}
                handleSkipToFeed={handleSkipToFeed}
                navigate={navigate}
                setIsUserInteracting={setIsUserInteracting}
                isMobile={isMobile}
              />
            )}

            {slide.type === "interactive-swipe" && (
              <div className="h-full flex flex-col px-6">
                {/* Title & Subtitle */}
                <div className="text-center mb-6 pt-4">
                  <h2 className="text-2xl md:text-3xl font-serif font-medium text-foreground mb-2">{slide.title}</h2>
                  <p className="text-base font-light text-muted-foreground leading-relaxed">{slide.subtitle}</p>
                </div>

                {/* Interactive Swipe Area with Side Indicators */}
                <div className="flex-1 relative max-w-sm mx-auto w-full px-12 flex items-start pt-4 max-h-[350px]">
                  <SwipeableImages images={slide.images} productInfo={slide.productInfo} />

                  {/* Side X/Heart Indicators */}
                  <motion.div
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center shadow-lg pointer-events-none z-20"
                    animate={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  >
                    <X className="w-5 h-5 text-red-500" strokeWidth={2.5} />
                  </motion.div>

                  <motion.div
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-12 h-12 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center shadow-lg pointer-events-none z-20"
                    animate={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: 1,
                    }}
                  >
                    <Heart className="w-5 h-5 text-green-500 fill-green-500" />
                  </motion.div>
                </div>
              </div>
            )}

            {slide.type === "live" && (
              <div className="h-full flex flex-col px-6">
                {/* Title & Subtitle */}
                <div className="text-center mb-4 pt-4">
                  <h2 className="text-2xl md:text-3xl font-serif font-medium text-foreground mb-2">{slide.title}</h2>
                  <p className="text-base font-light text-muted-foreground leading-relaxed">{slide.subtitle}</p>

                  {/* Live first; photo (and video, when it's on) come second */}
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Live camera
                    </span>
                    <span className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground/70">
                      Photo
                    </span>
                    {features.video_tryon && (
                    <span className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground/70">
                      Video
                    </span>
                    )}
                  </div>
                </div>

                {/* Live try-on stage */}
                <div className="flex-1 flex items-start justify-center pt-2">
                  <LiveTryOnPreview className="max-w-sm aspect-[3/4] max-h-[440px]" />
                </div>
              </div>
            )}

            {slide.type === "gallery" && (
              <div className="h-full flex flex-col px-6">
                {/* One feature, one short caption */}
                <div className="text-center mb-4 pt-4">
                  <h2 className="text-2xl md:text-3xl font-serif font-medium text-foreground mb-2">{slide.title}</h2>
                  <p className="text-base font-light text-muted-foreground leading-relaxed">{slide.subtitle}</p>
                </div>

                <div className="flex-1 flex items-start justify-center pt-2">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={currentSlide === GALLERY_SLIDE_INDEX ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    transition={{ duration: 0.3 }}
                    className="relative h-[min(440px,55vh)] aspect-[9/16] overflow-hidden rounded-3xl bg-muted shadow-lg"
                  >
                    <OutfitInspoInlineSlider />
                  </motion.div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Fixed Bottom CTA Section - dynamically adjusts based on nav state */}
      <div 
        className="fixed bottom-0 left-0 right-0 px-3 pt-2 bg-gradient-to-t from-background via-background to-transparent z-20 transition-all duration-300"
        style={{ paddingBottom: isNavMinimized ? 'calc(env(safe-area-inset-bottom) + 16px)' : 'calc(env(safe-area-inset-bottom) + 80px)' }}
      >
        {/* Azyah branding - centered above dots */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <img
            src="/marketing/azyah-logo.png"
            alt="Azyah"
            className="h-5 w-5 object-contain"
          />
          <span className="text-base font-serif text-foreground tracking-wider" style={{ fontWeight: 300 }}>
            Azyah
          </span>
        </div>
        
        {/* Navigation Dots */}
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

        {/* Primary CTA - reddish see-through pill */}
        <Button
          onClick={handleJoinCommunity}
          className="w-full h-11 md:h-12 text-sm md:text-base font-semibold rounded-full bg-primary/20 backdrop-blur-sm border border-primary/40 text-primary hover:bg-primary/30 transition-colors"
        >
          Join the Community
        </Button>
      </div>
    </div>
  );
}

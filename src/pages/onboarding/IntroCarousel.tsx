import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { SwipeableImages } from "@/components/SwipeableImages";
import { Heart, X, ChevronLeft, ChevronRight } from "lucide-react";
import { InvestorContactModal } from "@/components/InvestorContactModal";
import { SEOHead } from "@/components/SEOHead";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

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
  {
    type: "hero",
    image: "/marketing/hero-visual-desktop.png",
    mobileImage: "/marketing/hero-visual-mobile.png",
    title: "Discover Your Style",
  subtitle:
    "The platform for discovering fashion, beauty products, and pop-ups. \nWe empower brands, shoppers and content creators.",
  },
  {
    type: "interactive-swipe",
    title: "Your Style, Your Swipes",
    subtitle: "Swipe right to save, left to pass. Our AI learns your unique style with every choice.",
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
    type: "interactive-slider",
    title: "Try Before You Buy",
    subtitle: "See how items look on you with AI try-on technology",
  },
  {
    type: "gallery",
    title: "Create, Collaborate, Earn",
    subtitle: "Showcase your style and get rewarded",
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
      "Premium members get 20 virtual fittings daily, unlimited AI replicas, UGC collaboration access, and priority support.",
  },
  {
    question: "Can I save items to my closet and wishlist?",
    answer:
      "Yes! You can save items to your personal closet, create wishlists, and organize your favorite finds. Share your collections with friends or keep them private - it's up to you.",
  },
  {
    question: "How do I connect with the community?",
    answer:
      "Join our global fashion community! Share your discoveries, follow other users, and get inspired by trending looks.",
  },
];
// Auto-playing outfit inspo slider component
const OutfitInspoSlider = () => {
  const [currentImage, setCurrentImage] = useState(0);
  const images = ["/onboarding/outfit-collage-1.jpg", "/onboarding/outfit-collage-2.jpg"];
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 2000); // Auto-advance every 2 seconds

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
            transition={{
              duration: 0.6,
              ease: "easeInOut",
            }}
          />
        ))}
        {/* Earn Badge Overlay */}
        <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1 z-10">
          <span>⭐</span>
          <span>Earn</span>
        </div>

        {/* Slide indicators */}
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
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Animated counter for creator count - only when gallery slide is active
  useEffect(() => {
    if (currentSlide === 3) {
      // Gallery slide is at index 3
      const duration = 1500; // 1.5 seconds
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
      setCreatorCount(0); // Reset when leaving slide
    }
  }, [currentSlide]);

  // Auto-scroll carousel for gallery slide - only on mobile/tablet
  useEffect(() => {
    if (currentSlide !== 3 || isCarouselDragging || !isMobile) {
      if (currentSlide !== 3) setCardOffset(0); // Reset offset when leaving gallery slide
      return;
    }

    const interval = setInterval(() => {
      setCardOffset((prev) => (prev + 1) % 4); // 4 cards total
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
  const handleDragEnd = (event: any, info: PanInfo) => {
    handleSwipe(info.offset.x);
  };
  const handleJoinCommunity = () => {
    navigate("/onboarding/signup");
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
    <div className="h-screen bg-white flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <SEOHead
        title="Azyah — Luxury Fashion Curation"
        description="AI-curated luxury fashion discovery. Exclusive designer collections for the discerning style connoisseur."
        canonical="https://azyah.app/"
      />

      {/* Floating Navigation Elements - Only on first slide */}
      {currentSlide === 0 && (
        <div className="fixed left-3 right-3 sm:left-4 sm:right-4 z-50 flex items-center justify-between" style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}>
          {/* Logo */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-white/90 backdrop-blur-md rounded-full px-3 py-1.5 sm:px-4 sm:py-2 shadow-lg">
            <img src="/marketing/azyah-logo.png" alt="Azyah" className="h-5 w-5 sm:h-6 sm:w-6 object-contain" />
            <span className="font-serif text-sm sm:text-base font-light tracking-wider text-foreground">Azyah</span>
          </div>

          {/* Right Side Buttons */}
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
              setDirection(-1);
              setCurrentSlide((prev) => prev - 1);
            }}
            className="fixed left-4 bottom-32 z-30 w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/60 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-primary/80 hover:scale-110 transition-all shadow-lg hover:shadow-xl"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-lg" strokeWidth={2.5} />
          </button>
        )}

        <button
          onClick={() => {
            if (currentSlide === slides.length - 1) {
              setDirection(-1);
              setCurrentSlide(0);
            } else {
              setDirection(1);
              setCurrentSlide((prev) => prev + 1);
            }
          }}
          className="fixed right-4 bottom-32 z-30 w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/60 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-primary/80 hover:scale-110 transition-all shadow-lg hover:shadow-xl"
          aria-label={currentSlide === slides.length - 1 ? "Back to start" : "Next slide"}
        >
          <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-lg" strokeWidth={2.5} />
        </button>

        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: {
                type: "spring",
                stiffness: 300,
                damping: 30,
              },
              opacity: {
                duration: 0.2,
              },
            }}
            drag="x"
            dragConstraints={{
              left: 0,
              right: 0,
            }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            {slide.type === "hero" && (
              <div className="h-full flex flex-col">
                {/* Full-bleed hero image with overlaid branding */}
                <div className="relative h-[55%] overflow-hidden">
                  <img
                    src={isMobile && slide.mobileImage ? slide.mobileImage : slide.image}
                    alt={slide.title}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-white" />

                  {/* Azyah branding overlaid on image */}
                  <div className="absolute bottom-6 left-6 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <img
                        src="/marketing/azyah-logo.png"
                        alt="Azyah"
                        className="h-10 w-10 object-contain drop-shadow-lg"
                      />
                      <h1
                        className="text-4xl font-serif text-white tracking-wider"
                        style={{
                          fontWeight: 300,
                          letterSpacing: "0.15em",
                          textShadow:
                            "0 2px 8px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.2)",
                        }}
                      >
                        zyah
                      </h1>
                    </div>

                    {/* Feature Bubbles */}
                    <div className="flex flex-wrap gap-2">
                      <div className="font-light bg-white/70 backdrop-blur-md text-foreground shadow-lg rounded-full text-xs px-3 py-1.5">
                        Let AI find your style
                      </div>
                      <div className="font-light bg-white/70 backdrop-blur-md text-foreground shadow-lg rounded-full text-xs px-3 py-1.5">
                        Create digital closets • Earn salon rewards
                      </div>
                      <div className="font-light bg-white/70 backdrop-blur-md text-foreground shadow-lg rounded-full text-xs px-3 py-1.5">
                        Collaborate with brands
                      </div>
                    </div>
                  </div>
                </div>

                {/* Title & Subtitle */}
                <div className="flex-1 flex flex-col items-center justify-start pt-6 px-8 text-center">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">{slide.title}</h2>
                  <p className="text-base text-muted-foreground leading-relaxed max-w-xl">{slide.subtitle}</p>
                </div>
              </div>
            )}

            {slide.type === "interactive-swipe" && (
              <div className="h-full flex flex-col px-6">
                {/* Title & Subtitle */}
                <div className="text-center mb-6 pt-4">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{slide.title}</h2>
                  <p className="text-base text-muted-foreground leading-relaxed">{slide.subtitle}</p>
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

            {slide.type === "interactive-slider" && (
              <div className="h-full flex flex-col px-6">
                {/* Title & Subtitle */}
                <div className="text-center mb-6 pt-4">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{slide.title}</h2>
                  <p className="text-base text-muted-foreground leading-relaxed">{slide.subtitle}</p>
                </div>

                {/* Interactive Slider Area */}
                <div className="flex-1 flex items-start justify-center pt-4">
                  <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl h-[450px]">
                    <BeforeAfterSlider />
                  </div>
                </div>
              </div>
            )}

            {slide.type === "ugc" && (
              <div className="h-full flex flex-col px-6">
                {/* Title & Subtitle */}
                <div className="text-center mb-6 pt-4">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{slide.title}</h2>
                  <p className="text-base text-muted-foreground leading-relaxed">{slide.subtitle}</p>
                </div>

                {/* UGC Features Grid */}
                <div className="flex-1 flex flex-col justify-start pt-2">
                  <div className="grid grid-cols-1 gap-2 mb-3">
                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-4 border border-primary/20">
                      <span className="text-2xl mb-3 block">⭐</span>
                      <h4 className="font-bold text-base text-foreground mb-2">Honest Reviews</h4>
                      <p className="text-sm text-muted-foreground">
                        Rate brands on payment, communication, and overall experience
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-2xl p-4 border border-accent/20">
                      <span className="text-2xl mb-3 block">🚨</span>
                      <h4 className="font-bold text-base text-foreground mb-2">Report Scams</h4>
                      <p className="text-sm text-muted-foreground">
                        Warn other creators about brands with unfair practices
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-2xl p-4 border border-secondary/20">
                      <span className="text-2xl mb-3 block">❓</span>
                      <h4 className="font-bold text-base text-foreground mb-2">Ask Questions</h4>
                      <p className="text-sm text-muted-foreground">
                        Get answers from creators who've worked with the brand
                      </p>
                    </div>
                  </div>

                  {/* Community Badge */}
                  <p className="text-center text-sm text-muted-foreground font-medium -mt-2">
                    100% anonymous • Community-powered
                  </p>
                </div>
              </div>
            )}

            {slide.type === "gallery" && (
              <div className="h-full flex flex-col px-6 bg-gradient-to-b from-white via-white to-primary/5">
                {/* Title & Subtitle */}
                <div className="text-center mb-6 pt-4">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                    {slide.title}
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed">{slide.subtitle}</p>
                </div>

                {/* Content Container */}
                <div className="flex-1 flex flex-col justify-start pt-4">
                  {/* Horizontal Carousel - Auto-scroll on mobile, static on desktop */}
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

                          // Calculate which card to snap to based on drag distance
                          if (Math.abs(offset) > 100 || Math.abs(velocity) > 500) {
                            if (offset < 0 && cardOffset < 3) {
                              setCardOffset((prev) => Math.min(prev + 1, 3));
                            } else if (offset > 0 && cardOffset > 0) {
                              setCardOffset((prev) => Math.max(prev - 1, 0));
                            }
                          }
                        }}
                      >
                        {/* Auto-Playing Outfit Inspo Slider */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={currentSlide === 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                          transition={{ delay: 0, duration: 0.5 }}
                          className="flex-shrink-0"
                        >
                          <div
                            className="w-52 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                            style={{
                              boxShadow: "0 8px 32px rgba(251, 191, 36, 0.3), 0 0 48px rgba(251, 191, 36, 0.15)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow =
                                "0 12px 48px rgba(251, 191, 36, 0.4), 0 0 64px rgba(251, 191, 36, 0.2)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow =
                                "0 8px 32px rgba(251, 191, 36, 0.3), 0 0 48px rgba(251, 191, 36, 0.15)";
                            }}
                          >
                            <OutfitInspoSlider />
                          </div>
                        </motion.div>

                        {/* Brand Deals Card */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={currentSlide === 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                          transition={{ delay: 0.1, duration: 0.5 }}
                          className="flex-shrink-0"
                        >
                          <div
                            className="w-52 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] bg-white"
                            style={{
                              boxShadow: "0 8px 32px rgba(59, 130, 246, 0.3), 0 0 48px rgba(59, 130, 246, 0.15)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow =
                                "0 12px 48px rgba(59, 130, 246, 0.4), 0 0 64px rgba(59, 130, 246, 0.2)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow =
                                "0 8px 32px rgba(59, 130, 246, 0.3), 0 0 48px rgba(59, 130, 246, 0.15)";
                            }}
                          >
                            <div className="h-64 bg-gradient-to-br from-blue-500 to-indigo-600 flex flex-col items-center justify-center p-6">
                              <span className="text-6xl mb-4">🤝</span>
                              <h4 className="font-bold text-lg text-white mb-2 text-center">Brand Deals</h4>
                              <p className="text-sm text-center text-white/90">
                                Get discovered by brands & create UGC content
                              </p>
                            </div>
                            <div className="bg-white p-3 text-center">
                              <p className="text-sm font-semibold text-foreground">Earn Money</p>
                            </div>
                          </div>
                        </motion.div>

                        {/* Style Friends Card */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={currentSlide === 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                          transition={{ delay: 0.2, duration: 0.5 }}
                          className="flex-shrink-0"
                        >
                          <div
                            className="w-52 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] bg-white"
                            style={{
                              boxShadow: "0 8px 32px rgba(236, 72, 153, 0.3), 0 0 48px rgba(236, 72, 153, 0.15)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow =
                                "0 12px 48px rgba(236, 72, 153, 0.4), 0 0 64px rgba(236, 72, 153, 0.2)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow =
                                "0 8px 32px rgba(236, 72, 153, 0.3), 0 0 48px rgba(236, 72, 153, 0.15)";
                            }}
                          >
                            <div className="h-64 bg-gradient-to-br from-pink-500 to-rose-600 flex flex-col items-center justify-center p-6">
                              <span className="text-6xl mb-4">👯</span>
                              <h4 className="font-bold text-lg text-white mb-2 text-center">Style Friends</h4>
                              <p className="text-sm text-center text-white/90">
                                Create outfits for your friends with their clothes
                              </p>
                            </div>
                            <div className="bg-white p-3 text-center">
                              <p className="text-sm font-semibold text-foreground">Be Creative</p>
                            </div>
                          </div>
                        </motion.div>

                        {/* Pop-Up Events Card */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={currentSlide === 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                          transition={{ delay: 0.3, duration: 0.5 }}
                          className="flex-shrink-0"
                        >
                          <div
                            className="w-52 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] bg-white"
                            style={{
                              boxShadow: "0 8px 32px rgba(168, 85, 247, 0.3), 0 0 48px rgba(168, 85, 247, 0.15)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow =
                                "0 12px 48px rgba(168, 85, 247, 0.4), 0 0 64px rgba(168, 85, 247, 0.2)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow =
                                "0 8px 32px rgba(168, 85, 247, 0.3), 0 0 48px rgba(168, 85, 247, 0.15)";
                            }}
                          >
                            <div className="h-64 bg-gradient-to-br from-purple-500 to-violet-600 flex flex-col items-center justify-center p-6">
                              <span className="text-6xl mb-4">🎉</span>
                              <h4 className="font-bold text-lg text-white mb-2 text-center">Pop-Up Events</h4>
                              <p className="text-sm text-center text-white/90">
                                Discover exclusive fashion events and join them
                              </p>
                            </div>
                            <div className="bg-white p-3 text-center">
                              <p className="text-sm font-semibold text-foreground">Get Exclusive Access</p>
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>
                    </div>
                  </div>

                  {/* Join creators badge with Animated Counter */}
                  <motion.div
                    className="text-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={currentSlide === 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                  >
                    <p className="text-sm text-muted-foreground font-medium inline-flex items-center gap-2 bg-accent/10 px-4 py-2 rounded-full">
                      <span className="text-lg">✨</span>
                      Join {creatorCount.toLocaleString()}+ creators earning with digital closet
                    </p>
                  </motion.div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Fixed Bottom CTA Section */}
      <div 
        className="fixed bottom-0 left-0 right-0 px-3 pt-2 bg-gradient-to-t from-background via-background to-transparent z-20"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
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

        {/* Primary CTA */}
        <Button
          onClick={handleJoinCommunity}
          className="w-full h-11 md:h-12 text-sm md:text-base font-semibold rounded-full shadow-lg"
        >
          Join the Community
        </Button>

        {/* Login Link */}
        <button
          onClick={handleJoinCommunity}
          className="w-full mt-3 text-sm md:text-base text-primary font-medium hover:text-primary/80 transition-colors"
        >
          Already have an account? <span className="font-semibold">Log In</span>
        </button>
      </div>
    </div>
  );
}

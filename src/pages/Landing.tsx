import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Heart, Users, Star, Sparkles, Play, Menu, X, CheckCircle, ShoppingBag, Globe, Crown, ChevronRight, LayoutGrid, ExternalLink, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import SwipeDeck from '@/components/SwipeDeck';
import LandingSwipeDeck from '@/components/LandingSwipeDeck';
import { clearInvalidSession, debugAuthState } from "@/utils/sessionDebug";
import { useSmartSwipeProducts } from "@/hooks/useSmartSwipeProducts";
import { getResponsiveImageProps } from "@/utils/asosImageUtils";
import { InvestorContactModal } from "@/components/InvestorContactModal";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import luxuryFashionEditorial from "@/assets/luxury-fashion-editorial.jpg";
import { useScrollAnimation, useStaggeredScrollAnimation } from "@/hooks/useScrollAnimation";
import { FloatingFashionIcons } from "@/components/FloatingFashionIcons";
import { TrustBadges } from "@/components/TrustBadges";
import { LiveActivityIndicator } from "@/components/LiveActivityIndicator";
import { BeautyAssistantFab } from "@/components/BeautyAssistantFab";
function FeatureCarousel() {
  const [currentFeature, setCurrentFeature] = useState(0);
  const features = ["Virtual Try-On Technology", "UGC Collaboration Hub", "Beauty AI Assistant", "AI-Curated Fashion", "Personalized Recommendations", "Global Style Community"];
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature(prev => (prev + 1) % features.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [features.length]);
  return <div className="flex items-center justify-center">
      {/* Sliding Text Container */}
      <div className="relative h-6 w-56 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent whitespace-nowrap transition-all duration-700 ease-in-out animate-fade-in" key={currentFeature}>
            {features[currentFeature]}
          </span>
        </div>
      </div>
    </div>;
}
export default function Landing() {
  const [isVisible, setIsVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'swipe'>('grid');
  const [investorModalOpen, setInvestorModalOpen] = useState(false);
  const {
    user,
    loading
  } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Scroll animations
  const trendingSection = useScrollAnimation({
    animationType: 'fade-up',
    delay: 200
  });
  const qualitySection = useScrollAnimation({
    animationType: 'scale-bounce',
    delay: 300
  });
  const modernSection = useScrollAnimation({
    animationType: 'fade-left',
    delay: 200
  });
  const faqSection = useScrollAnimation({
    animationType: 'fade-up',
    delay: 100
  });
  const ctaSection = useScrollAnimation({
    animationType: 'scale-bounce',
    delay: 200
  });
  const footerSection = useScrollAnimation({
    animationType: 'fade-up',
    delay: 100
  });

  // Staggered animations for grids and lists
  const qualityCards = useStaggeredScrollAnimation(3, {
    animationType: 'fade-up',
    staggerDelay: 150
  });
  const faqCards = useStaggeredScrollAnimation(6, {
    animationType: 'fade-up',
    staggerDelay: 100
  });

  // Fetch products for grid view with stable configuration
  const gridProductsConfig = useMemo(() => ({
    filter: 'all' as const,
    priceRange: {
      min: 0,
      max: 1000
    },
    searchQuery: ''
  }), []);
  const {
    products: gridProducts,
    isLoading: productsLoading
  } = useSmartSwipeProducts(gridProductsConfig);
  useEffect(() => setIsVisible(true), []);

  // Debug auth state and redirect logic
  useEffect(() => {
    console.log('Landing page: user state:', user, 'loading:', loading);
    debugAuthState(); // Debug current auth state

    if (!loading && user) {
      console.log('User is authenticated, redirecting to appropriate dashboard');
      // Import getRedirectRoute to redirect to correct dashboard based on role
      import('@/lib/rbac').then(({
        getRedirectRoute
      }) => {
        const userRole = user.user_metadata?.role || 'shopper';
        const redirectPath = getRedirectRoute(userRole);
        console.log('Redirecting to:', redirectPath, 'for role:', userRole);
        navigate(redirectPath);
      });
    } else {
      console.log('No user or still loading, staying on landing page');
    }
  }, [user, loading, navigate]);

  // Add logout button for debugging
  const handleDebugLogout = () => {
    console.log('Debug: Force clearing session...');
    clearInvalidSession();
  };
  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth'
      });
    }
  };

  // Show loading while auth state is being determined
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>;
  }

  // If user is authenticated, don't render landing page content (prevents flash)
  if (user) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Redirecting...</p>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-background">
        <SEOHead title="Azyah — Luxury Fashion Curation" description="AI-curated luxury fashion discovery. Exclusive designer collections for the discerning style connoisseur." canonical="https://azyah.app/" />
      {/* NAV - More Minimal for Mobile */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-primary/10 animate-slide-down-fade">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo - Show Azyah text on all screen sizes */}
          <div className="flex items-center space-x-2 sm:space-x-4 animate-scale-bounce" style={{
          animationDelay: '0.1s',
          animationFillMode: 'both'
        }}>
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg overflow-hidden shadow-lg">
              <img src="/marketing/azyah-logo.png" alt="Azyah" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-cormorant text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Azyah</h1>
              <p className="text-xs text-primary/70 uppercase tracking-wider hidden lg:block">
                Fashion Discovery
              </p>
            </div>
          </div>

          {/* Desktop links */}
          <nav className="hidden lg:flex items-center space-x-8 xl:space-x-12">
            {[["Discover", "#discover"], ["Features", "#features"], ["For Brands", "#brands"], ["For Retailers", "#retailers"], ["For Investors", "investors"]].map(([label, href], index) => <button key={href} onClick={() => href === "investors" ? setInvestorModalOpen(true) : scrollToSection(href)} className="relative text-sm font-medium text-muted-foreground hover:text-primary transition-colors group animate-slide-right-fade" style={{
            animationDelay: `${0.2 + index * 0.1}s`,
            animationFillMode: 'both'
          }}>
                {label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
              </button>)}
          </nav>

          {/* CTA + Actions - Hidden on Mobile */}
          <div className="hidden lg:flex items-center space-x-3 animate-slide-right-fade" style={{
          animationDelay: '0.7s',
          animationFillMode: 'both'
        }}>
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="font-light">
              Sign In
            </Button>
            <Button variant="default" size="sm" onClick={() => navigate("/auth")} className="font-medium">
              Explore
            </Button>
            {/* Debug button - only show if user exists */}
            {user && <Button variant="destructive" size="sm" onClick={handleDebugLogout} className="font-medium">
                Force Logout
              </Button>}
          </div>

          {/* Mobile hamburger menu */}
          <div className="flex lg:hidden items-center">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu" className="p-2 rounded-lg hover:bg-primary/10 transition-colors">
              {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer - Fashion-focused */}
        {mobileMenuOpen && <div role="dialog" aria-modal="true" className="lg:hidden bg-background/98 backdrop-blur-lg border-t border-primary/10 py-4 sm:py-6 px-4 sm:px-6 space-y-4 sm:space-y-6" onClick={e => {
        if (e.target === e.currentTarget) {
          setMobileMenuOpen(false);
        }
      }} onKeyDown={e => {
        if (e.key === 'Escape') {
          setMobileMenuOpen(false);
        }
      }}>
            <nav className="flex flex-col space-y-3 sm:space-y-4">
              {[["Discover", "#discover"], ["Features", "#features"], ["For Brands", "#brands"], ["For Retailers", "#retailers"], ["For Investors", "investors"]].map(([label, href]) => <button key={href} onClick={() => {
            if (href === "investors") {
              setInvestorModalOpen(true);
              setMobileMenuOpen(false);
            } else {
              scrollToSection(href);
              setMobileMenuOpen(false);
            }
          }} className="text-base sm:text-lg text-muted-foreground hover:text-primary text-left font-light transition-colors">
                  {label}
                </button>)}
            </nav>
            <div className="border-t border-primary/10 pt-3 sm:pt-4 space-y-2 sm:space-y-3">
              <Button variant="ghost" size="sm" className="justify-center w-full font-light" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
              <Button variant="default" size="sm" className="justify-center w-full font-medium" onClick={() => navigate("/auth")}>
                Explore Collection
              </Button>
            </div>
          </div>}
      </header>

      {/* HERO */}
      <section id="discover" className="relative overflow-hidden min-h-[60vh] sm:min-h-[75vh] lg:min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-background">
        {/* Floating Fashion Icons */}
        <FloatingFashionIcons />
        
        {/* Live Activity Indicator */}
        <LiveActivityIndicator />
        
        {/* Beauty Assistant Fab */}
        <BeautyAssistantFab onClick={() => navigate("/auth")} />
        
        {/* Enhanced Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(239,68,68,0.15),transparent_70%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-gray-900/30" />
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 animate-gradient-shift opacity-60" />
        </div>
        
        {/* Subtle Background Text - Smaller on Mobile */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="font-cormorant text-[15vw] sm:text-[12vw] lg:text-[10vw] font-bold text-primary/5 leading-none tracking-wider">
            AZYAH
          </div>
        </div>

        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-6 pb-8 sm:pt-10 sm:pb-12 lg:pt-16 lg:pb-20 relative">
          <div className="flex justify-center items-center transition-all duration-1000" style={{
          opacity: isVisible ? 1 : 0,
          transform: `translateY(${isVisible ? 0 : 32}px)`
        }}>
            
          {/* Hero Content - Centered */}
            <div className="space-y-6 sm:space-y-8 lg:space-y-12 z-10 text-center max-w-4xl">
              <div className="space-y-3 sm:space-y-4 lg:space-y-8">
                
                
                <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                  <h1 className="font-cormorant text-6xl sm:text-7xl md:text-8xl lg:text-8xl xl:text-9xl font-bold leading-[0.9] sm:leading-[0.85] tracking-tight">
                    <span className="block text-white animate-slide-up-fade" style={{
                    animationDelay: '0.2s',
                    animationFillMode: 'both'
                  }}>
                      Find Your
                    </span>
                    <span className="block bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent italic animate-scale-bounce hover-scale" style={{
                    animationDelay: '0.5s',
                    animationFillMode: 'both'
                  }}>
                      Perfect
                    </span>
                    <span className="block text-white animate-slide-up-fade" style={{
                    animationDelay: '0.8s',
                    animationFillMode: 'both'
                  }}>
                      Style
                    </span>
                  </h1>
                  <p className="text-lg sm:text-xl lg:text-2xl text-gray-200 max-w-md lg:max-w-lg leading-relaxed font-light mx-auto animate-blur-focus" style={{
                  animationDelay: '1.1s',
                  animationFillMode: 'both'
                }}>Where AI meets fashion - discover pieces as unique as you are.</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:gap-4">
                <Button size="sm" className="group px-6 py-3 sm:px-8 sm:py-4 lg:px-8 lg:py-4 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 text-sm sm:text-base font-medium animate-scale-bounce" style={{
                animationDelay: '1.4s',
                animationFillMode: 'both'
              }} onClick={() => navigate("/auth")}>
                  <span>Explore Our AI &amp; More</span>
                  <ArrowRight className="ml-2 w-4 h-4 lg:w-5 lg:h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button variant="outline" size="sm" className="px-6 py-3 sm:px-8 sm:py-4 lg:px-8 lg:py-4 bg-background/50 backdrop-blur-sm border border-primary/30 hover:bg-background/80 hover:border-primary/50 text-sm sm:text-base font-light animate-scale-bounce" style={{
                animationDelay: '1.6s',
                animationFillMode: 'both'
              }} onClick={() => scrollToSection("#featured-collections")}>
                  <Play className="mr-2 w-4 h-4 lg:w-5 lg:h-5" /> 
                  <span>View Lookbook</span>
                </Button>
              </div>

              {/* Trust Badges */}
              

              {/* Feature Carousel - Enhanced Elegant Design */}
              <div className="mt-8 sm:mt-10 lg:mt-12 animate-slide-up-fade" style={{
              animationDelay: '1.8s',
              animationFillMode: 'both'
            }}>
                <div className="flex justify-center">
                  <div className="relative group">
                    {/* Subtle outer glow */}
                    <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-md"></div>
                    
                    {/* Glass morphism container */}
                    <div className="relative bg-gradient-to-r from-background/95 via-white/90 to-background/95 backdrop-blur-lg rounded-full px-8 py-4 border border-primary/30 shadow-xl">
                      {/* Inner shimmer effect */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-50"></div>
                      <div className="relative">
                        <FeatureCarousel />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRENDING STYLES SECTION - Mobile Optimized */}
      <section className="py-16 sm:py-20 lg:py-32 bg-gradient-to-b from-background to-muted/30 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-60 animate-parallax-slow" />
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 relative">

          {/* Interactive Preview Section - Mobile First */}
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl sm:rounded-2xl lg:rounded-3xl p-4 sm:p-6 lg:p-12 mb-8 sm:mb-12 lg:mb-16">
            {/* Section Title */}
            <div className="text-center mb-8 sm:mb-12">
              <div className="inline-flex items-center bg-primary/10 rounded-full px-4 py-2 mb-4">
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">Experience The Magic</span>
              </div>
              <h3 className="font-cormorant text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
                Two Powerful Features in One Platform
              </h3>
            </div>

            {/* Features Grid */}
            <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16">
              
              {/* Feature 1: AI Try-On Technology */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-primary/10 p-4 sm:p-6 max-w-sm mx-auto lg:mx-0">
                  <div className="aspect-[3/4] rounded-lg sm:rounded-xl mb-4 relative overflow-hidden">
                    <BeforeAfterSlider className="rounded-lg sm:rounded-xl" />
                  </div>
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-3 py-1 mb-2">
                      <Sparkles className="w-3 h-3 text-primary" />
                      <span className="text-xs font-semibold text-primary">AI Try-On</span>
                    </div>
                    <h4 className="font-semibold text-sm mb-1">See Before You Buy</h4>
                    <p className="text-xs text-muted-foreground">Virtual try-on technology</p>
                  </div>
                </div>
                
                <div className="text-center lg:text-left space-y-4">
                  <h4 className="font-cormorant text-xl sm:text-2xl font-bold">
                    <span className="text-primary">AI-Powered</span> Virtual Try-On
                  </h4>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed"> Our advanced AI technology creates realistic try-on experiences, helping you make confident decisions.</p>
                  <div className="flex items-center justify-center lg:justify-start gap-2 text-sm text-primary font-medium">
                    <CheckCircle className="w-4 h-4" />
                    <span>Realistic fit visualization</span>
                  </div>
                </div>
              </div>

              {/* Feature 2: Smart Swipe Discovery */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-primary/10 p-4 sm:p-6 max-w-sm mx-auto lg:mx-0 animate-auto-swipe">
                  <div className="aspect-[3/4] bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg sm:rounded-xl mb-4 relative overflow-hidden">
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3">
                        <h4 className="font-semibold text-sm">Designer Dress</h4>
                        <p className="text-xs text-muted-foreground">Premium Brand</p>
                        <p className="text-lg font-bold text-primary">$299</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex justify-center space-x-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <X className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-accent" />
                    </div>
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Heart className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </div>
                
                <div className="text-center lg:text-left space-y-4">
                  <h4 className="font-cormorant text-xl sm:text-2xl font-bold">
                    <span className="text-primary">Smart Swipe</span> Discovery
                  </h4>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed"> Our AI learns your preferences and shows you increasingly better matches.</p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-center lg:justify-start gap-3">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <Heart className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm">Swipe right to like and save</span>
                    </div>
                    <div className="flex items-center justify-center lg:justify-start gap-3">
                      <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <X className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm">Swipe left to pass and refine</span>
                    </div>
                    <div className="flex items-center justify-center lg:justify-start gap-3">
                      <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                        <ShoppingBag className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm">Swipe up to add to wishlist</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="text-center mt-8 sm:mt-12">
              <Button size="lg" className="px-8 py-4 bg-primary hover:bg-primary/90 text-base font-medium" onClick={() => navigate("/auth")}>
                <span>Start Your Style Journey</span>
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Toggle Between Grid and List View */}
          <div id="featured-collections" className="flex items-center justify-between mb-8 animate-slide-up-fade" style={{
          animationDelay: '1.1s',
          animationFillMode: 'both'
        }}>
            <h3 className="font-cormorant text-2xl font-bold">Featured Collections</h3>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">View:</span>
              <div className="flex items-center space-x-2 bg-background/80 backdrop-blur-sm rounded-lg p-1 border border-primary/20">
                <Button variant="ghost" size="sm" className={`h-8 px-3 ${viewMode === 'grid' ? 'bg-primary text-white' : ''}`} onClick={() => setViewMode('grid')}>
                  <LayoutGrid className="w-4 h-4 mr-1" />
                  Grid
                </Button>
                <Button variant="ghost" size="sm" className={`h-8 px-3 ${viewMode === 'swipe' ? 'bg-primary text-white' : ''}`} onClick={() => setViewMode('swipe')}>
                  <Shuffle className="w-4 h-4 mr-1" />
                  Swipe
                </Button>
              </div>
            </div>
          </div>

          {/* Content based on view mode */}
          {viewMode === 'grid' ? (/* Product Grid */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {productsLoading ?
          // Loading skeletons
          [...Array(8)].map((_, i) => <div key={`skeleton-${i}`} className="aspect-[3/4] bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl animate-pulse" />) :
          // Use gridProducts
          (gridProducts?.slice(0, 8) || []).map((product, i) => {
            const imageUrl = product.image_url || (product.media_urls && Array.isArray(product.media_urls) && product.media_urls.length > 0 ? product.media_urls[0] : typeof product.media_urls === 'string' ? JSON.parse(product.media_urls)[0] : null) || '/placeholder.svg';
            const imageProps = getResponsiveImageProps(imageUrl);
            return <div key={`product-${product.id}`} className="group relative aspect-[3/4] bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-slide-up-fade" style={{
              animationDelay: `${1.3 + i * 0.1}s`,
              animationFillMode: 'both'
            }}>
                      {/* Product Image */}
                      <img {...imageProps} alt={product.title || `Product ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" onError={e => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }} />
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* Heart Icon */}
                      <div className="absolute top-4 right-4 w-8 h-8 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer hover:bg-primary/10">
                        <Heart className="w-4 h-4 text-primary" />
                      </div>
                      
                      {/* AR Ready Badge */}
                      {i % 3 === 0 && <div className="absolute top-4 left-4 bg-primary/90 backdrop-blur-sm rounded-lg px-3 py-1">
                          <div className="flex items-center space-x-1">
                            <span className="text-xs font-medium text-white">AR Ready</span>
                          </div>
                        </div>}
                      
                      {/* Product Info */}
                      <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="text-sm font-medium line-clamp-1">{product.title || `Product ${i + 1}`}</div>
                        <div className="text-xs text-muted-foreground">
                          {product.brand ? typeof product.brand === 'string' ? product.brand : product.brand.name || 'Premium Brand' : 'Premium Brand'}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-sm font-bold text-primary">
                            {product.price_cents ? `${product.currency || '$'}${(product.price_cents / 100).toFixed(0)}` : 'Price on request'}
                          </div>
                          <div className="flex space-x-1">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-full bg-primary/10">
                              <ShoppingBag className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-full bg-primary/10" onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Shop now clicked for product:', product);
                      console.log('External URL:', product.external_url);
                      if (product.external_url) {
                        // Always open in new tab/window
                        window.open(product.external_url, '_blank', 'noopener,noreferrer');
                        console.log('Opened external link in new tab');
                      } else {
                        console.warn('No external URL found for product:', product.id);
                        // Could show a toast notification here if needed
                      }
                    }} title="Shop Now">
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>;
          })}
            </div>) : (/* Swipe Interface */
        <div className="mb-12">
              <div className="relative w-full max-w-sm mx-auto h-[600px]">
                <LandingSwipeDeck filter="all" subcategory="" gender="" priceRange={{
              min: 0,
              max: 1000
            }} searchQuery="" currency="USD" />
              </div>
              <div className="text-center mt-8">
                <p className="text-sm text-gray-600 mb-4">
                  Experience our swipe interface just like in the main app!
                </p>
                <Button variant="outline" onClick={() => navigate("/swipe")} className="px-6 py-2">
                  Try Full Swipe Experience
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>)}

          <div className="text-center">
            <Button size="lg" className="px-8 py-4 bg-primary hover:bg-primary/90" onClick={() => navigate("/auth")}>
              Start Discovering
              <ChevronRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* QUALITY SECTION */}
      <section id="features" className="py-24 lg:py-32 bg-gradient-to-b from-muted/30 to-muted/60 relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/8 via-transparent to-primary/12 opacity-60 animate-parallax-slow" />
        <div className="container max-w-7xl mx-auto px-6 lg:px-12 relative">
          <div ref={qualitySection.ref} className={`text-center mb-20 ${qualitySection.animationClasses}`}>
            <h2 className="font-cormorant text-4xl lg:text-6xl font-bold mb-6 text-foreground">
              Quality You'll
              <span className="block text-primary italic">Love</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Every piece is carefully selected for quality and style that matches your taste.
            </p>
          </div>

          <div className="flex justify-center mb-16">
            <div className="relative animate-parallax-float">
              <div className="w-80 h-80 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center shadow-xl animate-glow-pulse">
                <div className="w-64 h-64 bg-background/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-primary/20">
                  <div className="w-48 h-48 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Crown className="w-16 h-16 text-primary mx-auto" />
                      <div className="font-cormorant text-xl font-bold">Premium</div>
                      
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating quality indicators */}
              <div className="absolute -top-4 -right-4 bg-background/95 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-primary/20 animate-elastic-bounce" style={{
              animationDelay: '0.2s'
            }}>
                <div className="text-xs font-medium text-center text-muted-foreground">Quality Testing</div>
                <div className="text-lg font-bold text-primary text-center">80%</div>
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-background/95 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-primary/20 animate-elastic-bounce" style={{
              animationDelay: '0.4s'
            }}>
                <div className="text-xs font-medium text-center text-muted-foreground">Customer Satisfaction</div>
                <div className="text-lg font-bold text-primary text-center">4.9</div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[["Premium Design", "Curated pieces from top fashion brands and niche and rare collections."], ["Expert Curation", "Our fashion experts handpick every piece for quality and style."], ["Sustainable Practice", "We're committed to ethical and sustainable fashion, partnering with like-minded brands."]].map(([title, desc], index) => <div key={title} ref={qualityCards[index].ref} className={`text-center space-y-4 ${qualityCards[index].animationClasses}`}>
                 <div className="w-16 h-16 bg-gradient-to-r from-primary/20 to-primary/10 rounded-xl flex items-center justify-center mx-auto">
                   <CheckCircle className="w-8 h-8 text-primary" />
                 </div>
                 <h3 className="font-cormorant text-xl font-bold text-gray-800">{title}</h3>
                 <p className="text-gray-700">{desc}</p>
               </div>)}
          </div>
        </div>
      </section>

      {/* DESIGN FOR MODERN SECTION */}
      <section className="relative py-24 lg:py-32 bg-gradient-to-br from-foreground via-gray-950 to-gray-900 text-background overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 animate-parallax-slow" />
        <div className="absolute inset-0 bg-gradient-to-tr from-gray-900/80 via-transparent to-gray-800/60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(239,68,68,0.15),transparent_60%)]" />
        
        {/* Large Background Text */}
        <div className="absolute inset-0 flex items-center justify-start pl-12 pointer-events-none">
          <div className="font-cormorant text-[20vw] lg:text-[15vw] font-bold text-white/5 leading-none tracking-wider animate-parallax-float">
            AZYAH
          </div>
        </div>

        <div className="container max-w-7xl mx-auto px-6 lg:px-12 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div ref={modernSection.ref} className={`space-y-8 ${modernSection.animationClasses}`}>
              <div className="space-y-6">
                <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-primary uppercase tracking-wider">Innovation</span>
                </div>
                
                <h2 className="font-cormorant text-5xl lg:text-7xl font-bold leading-tight">
                  Design for
                  <span className="block text-primary italic">modern</span>
                </h2>
                
                <p className="text-xl text-background/80 leading-relaxed">
                  Luxury fashion that embraces your unique style from within, designed for radiant beauty and lasting results. Our AI-powered platform curates collections that match your personal aesthetic and lifestyle.
                </p>
              </div>
              
              <Button size="lg" className="px-8 py-4 bg-primary hover:bg-primary/90 text-white shadow-2xl" onClick={() => navigate("/auth")}>
                Learn More <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>

            <div className="relative animate-slide-left-fade" style={{
            animationDelay: '1.2s',
            animationFillMode: 'both'
          }}>
              <div className="aspect-[4/5] bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl overflow-hidden shadow-2xl border border-white/20">
                <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/20 flex items-center justify-center relative overflow-hidden">
                  <img src={luxuryFashionEditorial} alt="Editorial luxury fashion model in contemporary designer setting" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent"></div>
                  <div className="relative z-10 text-center space-y-4">
                    <p className="text-white font-medium text-lg drop-shadow-lg">Modern Fashion</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-24 lg:py-32 bg-gradient-to-b from-muted/60 to-muted relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-primary/5 opacity-60 animate-parallax-slow" />
        <div className="container max-w-4xl mx-auto px-6 lg:px-12 relative">
          <div ref={faqSection.ref} className={`text-center mb-16 ${faqSection.animationClasses}`}>
            <h2 className="font-cormorant text-4xl lg:text-6xl font-bold mb-6 text-foreground">
              Frequently Asked
              <span className="block text-primary italic">Questions</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to know about fashion discovery with Azyah.
            </p>
          </div>

          <div className="space-y-6">
            {[["How does AI-powered fashion discovery work?", "Our AI learns from your swipes and preferences to show you fashion pieces you'll love. The more you use Azyah, the better our recommendations become."], ["Do you sell the products directly?", "No, Azyah is a fashion discovery platform. We show you products that match your style, then redirect you to the retailer where you can purchase them."], ["How does the swipe discovery work?", "Swipe right on styles you love, left on ones you don't. Our AI learns from these interactions to show you more items you'll love."], ["What are the benefits of Premium?", "Premium members get 20 virtual fittings daily, unlimited AI replicas, UGC collaboration access, and priority support."], ["Can I save items to my closet and wishlist?", "Yes! You can save items to your personal closet, create wishlists, and organize your favorite finds. Share your collections with friends or keep them private - it's up to you."], ["How do I connect with the community?", "Join our global fashion community! Share your discoveries, follow other users, and get inspired by trending looks."]].map(([question, answer], index) => <div key={index} ref={faqCards[index].ref} className={`bg-white/80 backdrop-blur-sm rounded-2xl border border-primary/10 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ${faqCards[index].animationClasses}`}>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-cormorant text-xl font-bold pr-8">{question}</h3>
                    <ChevronRight className="w-5 h-5 text-primary flex-shrink-0" />
                  </div>
                  <p className="text-muted-foreground mt-4 leading-relaxed">{answer}</p>
                </div>
              </div>)}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-200 mb-6">Still have questions?</p>
            <Button variant="outline" size="lg" className="px-8 py-4 border-primary/30 hover:bg-primary/5">
              Contact Support
            </Button>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section id="retailers" className="relative py-24 lg:py-32 bg-gradient-to-br from-foreground via-gray-900 to-foreground text-background overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent animate-parallax-slow" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(239,68,68,0.1),transparent_50%)]" />
        
        <div className="container max-w-7xl mx-auto px-6 lg:px-12 text-center relative">
          <div ref={ctaSection.ref} className={`space-y-12 ${ctaSection.animationClasses}`}>
            <div className="space-y-8">
              <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">Get Started</span>
              </div>
              
              <h2 className="font-cormorant text-5xl lg:text-7xl font-bold leading-tight">
                Begin Your 
                <span className="block bg-gradient-to-r from-primary via-red-400 to-primary bg-clip-text text-transparent italic">Luxury Journey</span>
              </h2>
              
              <p className="text-xl lg:text-2xl text-background/80 max-w-4xl mx-auto leading-relaxed">
                Join the exclusive community that discovers, curates & celebrates luxury fashion with cutting-edge AI technology.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="px-10 py-4 bg-primary hover:bg-primary/90 text-white shadow-2xl" onClick={() => navigate("/auth")}>
                Start Your Journey <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
            
            <p className="text-background/60 text-sm uppercase tracking-wider font-medium">
              Exclusive • Curated • Personal
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-20 bg-white border-t border-primary/10">
        <div ref={footerSection.ref} className={`container max-w-7xl mx-auto px-6 lg:px-12 ${footerSection.animationClasses}`}>
          <div className="grid lg:grid-cols-4 gap-12 mb-12">
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-cormorant text-2xl font-bold">Azyah</h3>
                  <p className="text-xs text-primary font-medium uppercase tracking-wider">Fashion Discovery</p>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                The world's most exclusive luxury fashion discovery platform, powered by AI and driven by community.
              </p>
              <div className="flex space-x-4">
                {[Users, Globe, Heart].map((Icon, i) => <div key={i} className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center hover:bg-primary/20 transition-colors cursor-pointer">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>)}
              </div>
            </div>
            
            {[["Platform", ["Discover", "Collections", "Community", "Premium"]], ["Partners", ["For Brands", "For Retailers", "Analytics", "Support"]], ["Company", ["About", "Careers", "Press", "info@azyahstyle.com"]]].map(([title, links]) => <div key={title as string}>
                <h4 className="font-cormorant text-lg font-bold text-foreground mb-6">{title}</h4>
                <ul className="space-y-3">
                  {(links as string[]).map(l => <li key={l}>
                      <button className="text-muted-foreground hover:text-primary transition-colors text-sm">{l}</button>
                    </li>)}
                </ul>
              </div>)}
          </div>
          
          <div className="pt-8 border-t border-primary/10 flex flex-col md:flex-row items-center justify-between">
            <p className="text-sm text-muted-foreground">©2024 Azyah. All rights reserved.</p>
            <div className="flex items-center space-x-8 text-sm text-muted-foreground mt-4 md:mt-0">
              <button onClick={() => navigate('/privacy')} className="hover:text-primary transition-colors">Privacy Policy</button>
              <button onClick={() => navigate('/terms')} className="hover:text-primary transition-colors">Terms of Service</button>
              <button className="hover:text-primary transition-colors">Cookie Policy</button>
            </div>
          </div>
        </div>
      </footer>
      
      <InvestorContactModal isOpen={investorModalOpen} onOpenChange={setInvestorModalOpen} />
    </div>;
}
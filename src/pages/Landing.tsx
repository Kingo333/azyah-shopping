import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Heart, Users, Star, Sparkles, Play, Menu, X, CheckCircle, ShoppingBag, Globe, Crown, ChevronRight, LayoutGrid, ExternalLink, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import SwipeDeck from '@/components/SwipeDeck';
export default function Landing() {
  const [isVisible, setIsVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'swipe'>('grid');
  const {
    user
  } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  useEffect(() => setIsVisible(true), []);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    console.log('Landing page: user state:', user);
    if (user) {
      console.log('User is authenticated, redirecting to dashboard');
      navigate('/dashboard');
    } else {
      console.log('No user, staying on landing page');
    }
  }, [user, navigate]);
  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth'
      });
    }
  };

  // Show loading while user state is being determined
  if (user === undefined) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-background">
        <SEOHead title="Azyah — Luxury Fashion Curation" description="AI-curated luxury fashion discovery. Exclusive designer collections for the discerning style connoisseur." canonical="https://azyah.app/" />
      {/* NAV */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-primary/10">
        <div className="container max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden shadow-lg">
              <img src="/marketing/azyah-logo.png" alt="Azyah" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-cormorant text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Azyah</h1>
              <p className="text-xs text-primary/70 uppercase tracking-wider">
                Fashion Discovery
              </p>
            </div>
          </div>

          {/* Desktop links */}
          <nav className="hidden lg:flex items-center space-x-12">
            {[["Discover", "#discover"], ["Features", "#features"], ["For Brands", "#brands"], ["For Retailers", "#retailers"]].map(([label, href]) => <button key={href} onClick={() => scrollToSection(href)} className="relative text-sm font-medium text-muted-foreground hover:text-primary transition-colors group">
                {label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
              </button>)}
          </nav>

          {/* CTA + Actions */}
          <div className="hidden lg:flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button variant="default" size="sm" onClick={() => navigate("/auth")}>
              Explore Collection
            </Button>
          </div>

          {/* Mobile burger */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu" className="lg:hidden p-2 rounded-lg hover:bg-primary/10">
            {mobileMenuOpen ? <X className="w-6 h-6 text-primary" /> : <Menu className="w-6 h-6 text-primary" />}
          </button>
        </div>

        {/* Mobile drawer */}
        {mobileMenuOpen && <div role="dialog" aria-modal="true" className="lg:hidden bg-background/95 backdrop-blur-md border-t border-primary/10 py-6 px-6 space-y-6" onClick={e => {
        if (e.target === e.currentTarget) {
          setMobileMenuOpen(false);
        }
      }} onKeyDown={e => {
        if (e.key === 'Escape') {
          setMobileMenuOpen(false);
        }
      }}>
            <nav className="flex flex-col space-y-4">
              {[["Discover", "#discover"], ["Features", "#features"], ["For Brands", "#brands"], ["For Retailers", "#retailers"]].map(([label, href]) => <button key={href} onClick={() => {
            scrollToSection(href);
            setMobileMenuOpen(false);
          }} className="text-lg text-muted-foreground hover:text-primary text-left">
                  {label}
                </button>)}
            </nav>
            <div className="border-t border-primary/10 pt-4 space-y-3">
              <Button variant="ghost" size="lg" className="justify-start w-full" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
              <Button variant="default" size="lg" className="justify-start w-full" onClick={() => navigate("/auth")}>
                Explore Collection
              </Button>
            </div>
          </div>}
      </header>

      {/* PREMIUM BANNER */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-2 lg:py-3 px-4 lg:px-6">
        <div className="container max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-3">
            <Crown className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="font-medium text-xs lg:text-sm">Premium: 20 virtual fittings daily • unlimited AI replicas • UGC collaboration access</span>
          </div>
          <Button variant="secondary" size="sm" className="text-xs px-3 lg:px-4 py-1 h-6 lg:h-7" onClick={() => navigate("/auth")}>
            Learn More
          </Button>
        </div>
      </div>

      {/* HERO */}
      <section id="discover" className="relative overflow-hidden min-h-screen bg-gradient-to-br from-gray-800 via-gray-700 to-background">
        {/* Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_25%_25%,rgba(239,68,68,0.25),transparent_55%)]" />
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_75%_75%,rgba(239,68,68,0.2),transparent_60%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-gray-700/20" />
        </div>
        
        {/* Large Background Text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="font-cormorant text-[20vw] lg:text-[15vw] font-bold text-primary/5 leading-none tracking-wider">
            AZYAH
          </div>
        </div>

        <div className="container max-w-7xl mx-auto px-6 lg:px-12 pt-24 pb-20 lg:pt-32 lg:pb-32 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center transition-all duration-1000" style={{
          opacity: isVisible ? 1 : 0,
          transform: `translateY(${isVisible ? 0 : 32}px)`
        }}>
            
          {/* Hero Content */}
            <div className="space-y-6 lg:space-y-12 z-10">
              <div className="space-y-4 lg:space-y-8">
                <div className="inline-flex items-center space-x-2 lg:space-x-3 bg-background/90 backdrop-blur-sm border border-primary/20 rounded-full px-3 py-2 lg:px-6 lg:py-3 shadow-lg">
                  
                  <span className="text-xs lg:text-sm font-semibold text-primary uppercase tracking-wider">Luxury Fashion</span>
                </div>
                
                <div className="space-y-2 lg:space-y-4">
                  <h1 className="font-cormorant text-4xl sm:text-5xl lg:text-8xl xl:text-9xl font-bold leading-[0.85] tracking-tight">
                    <span className="block text-white">Find Your</span>
                    <span className="block bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent italic">Perfect</span>
                    <span className="block text-white">Style</span>
                  </h1>
                  <p className="text-sm sm:text-lg lg:text-2xl text-gray-200 max-w-lg leading-relaxed font-medium">
                    Smart AI fashion discovery that learns your style.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
                <Button size="sm" className="group px-4 py-3 lg:px-8 lg:py-4 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300" onClick={() => navigate("/auth")}>
                  <span className="text-sm lg:text-base">Explore Collection</span>
                  <ArrowRight className="ml-2 w-4 h-4 lg:w-5 lg:h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button variant="outline" size="sm" className="px-4 py-3 lg:px-8 lg:py-4 bg-background/50 backdrop-blur-sm border-2 border-primary/30 hover:bg-background/80 hover:border-primary/50">
                  <Play className="mr-2 w-4 h-4 lg:w-5 lg:h-5" /> 
                  <span className="text-sm lg:text-base">View Lookbook</span>
                </Button>
              </div>

              
            </div>

            {/* Hero Visual with floating cards */}
            <div className="relative lg:justify-self-end z-10">
              <div className="relative">
                <div className="aspect-[4/5] bg-gradient-to-br from-white/50 to-primary/10 rounded-2xl overflow-hidden shadow-2xl border border-white/30 backdrop-blur-sm">
                  <img src="/marketing/hero-visual.png" alt="Azyah luxury fashion discovery hero" className="w-full h-full object-cover" loading="eager" fetchPriority="high" decoding="async" />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent" />
                </div>
                
                {/* New Collection Card */}
                <div className="absolute -top-2 -right-4 lg:-top-4 lg:-right-8 w-48 lg:w-64 bg-background/95 backdrop-blur-sm rounded-xl lg:rounded-2xl shadow-xl border border-primary/20 p-3 lg:p-6">
                  <h3 className="font-cormorant text-lg lg:text-xl font-bold mb-1 lg:mb-2">New Collection</h3>
                  <p className="text-xs lg:text-sm text-muted-foreground mb-2 lg:mb-4">Designer pieces, curated for great taste.</p>
                  <Button size="sm" className="w-full bg-primary hover:bg-primary/90 text-xs lg:text-sm">
                    View Collection
                  </Button>
                </div>
                
                {/* Community Card */}
                <div className="absolute -bottom-4 -left-4 lg:-bottom-6 lg:-left-8 w-44 lg:w-56 bg-background/95 backdrop-blur-sm rounded-xl lg:rounded-2xl shadow-xl border border-primary/20 p-3 lg:p-4">
                  <div className="flex items-center space-x-2 mb-2 lg:mb-3">
                    <div className="text-xs lg:text-sm font-medium">Join Fashion Community</div>
                  </div>
                  <div className="flex -space-x-2 mb-2 lg:mb-3">
                    {[...Array(4)].map((_, i) => <div key={i} className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-r from-primary to-primary/80 rounded-full border-2 border-white" />)}
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-muted rounded-full border-2 border-white flex items-center justify-center">
                      <span className="text-xs font-medium">+</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRENDING STYLES SECTION */}
      <section className="py-24 lg:py-32 bg-gradient-to-b from-background to-muted/30 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-60" />
        <div className="container max-w-7xl mx-auto px-4 lg:px-12 relative">
          <div className="text-center mb-8 lg:mb-16">
            <h2 className="font-cormorant text-3xl lg:text-6xl font-bold mb-2 lg:mb-4 text-foreground">
              Curated Collections
              <span className="block text-primary italic">Premium Selection</span>
            </h2>
            <p className="text-sm lg:text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover fashion pieces you'll actually love.
            </p>
          </div>

          {/* Interactive Preview Section */}
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl lg:rounded-3xl p-4 lg:p-12 mb-8 lg:mb-16">
            <div className="grid lg:grid-cols-2 gap-6 lg:gap-12 items-center">
              <div className="space-y-4 lg:space-y-8">
                <div className="space-y-2 lg:space-y-4">
                  <div className="inline-flex items-center space-x-2 bg-primary/10 rounded-full px-3 lg:px-4 py-1 lg:py-2">
                    <Play className="w-3 h-3 lg:w-4 lg:h-4 text-primary" />
                    <span className="text-xs lg:text-sm font-semibold text-primary uppercase tracking-wider">How It Works</span>
                  </div>
                  <h3 className="font-cormorant text-2xl lg:text-4xl font-bold">
                    Discover Your
                    <span className="block text-primary italic">Perfect Style</span>
                  </h3>
                  <p className="text-sm lg:text-lg text-muted-foreground leading-relaxed">
                    AI learns your style and shows you pieces you'll love.
                  </p>
                </div>

                <div className="space-y-3 lg:space-y-4">
                  <div className="flex items-center space-x-3 lg:space-x-4">
                    <div className="w-8 h-8 lg:w-12 lg:h-12 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center">
                      <ArrowRight className="w-4 h-4 lg:w-6 lg:h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm lg:text-base font-semibold">Like to Save</h4>
                      <p className="text-xs lg:text-sm text-muted-foreground">Love it? Save to your collection.</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 lg:space-x-4">
                    <div className="w-8 h-8 lg:w-12 lg:h-12 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center">
                      <X className="w-4 h-4 lg:w-6 lg:h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm lg:text-base font-semibold">Pass to Refine</h4>
                      <p className="text-xs lg:text-sm text-muted-foreground">Not quite right? Pass to see better matches.</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 lg:space-x-4">
                    <div className="w-8 h-8 lg:w-12 lg:h-12 bg-gradient-to-r from-accent to-accent/80 rounded-full flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4 lg:w-6 lg:h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm lg:text-base font-semibold">Save for Later</h4>
                      <p className="text-xs lg:text-sm text-muted-foreground">Want to buy later? Save to wishlist.</p>
                    </div>
                  </div>
                </div>

                <Button size="sm" className="px-4 py-3 lg:px-8 lg:py-4 bg-primary hover:bg-primary/90" onClick={() => navigate("/auth")}>
                  <span className="text-sm lg:text-base">Start Discovering</span>
                  <ArrowRight className="ml-2 w-3 h-3 lg:w-4 lg:h-4" />
                </Button>
              </div>

              {/* Mock Swipe Interface */}
              <div className="relative">
                <div className="bg-white rounded-2xl shadow-2xl border border-primary/20 p-6 max-w-sm mx-auto">
                  <div className="aspect-[3/4] bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl mb-4 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3">
                        <h4 className="font-semibold text-sm">Trending Designer Dress</h4>
                        <p className="text-xs text-muted-foreground">Premium Brand</p>
                        <p className="text-lg font-bold text-primary">$299</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex justify-center space-x-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <X className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-accent" />
                    </div>
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Heart className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </div>
                
                {/* Swipe Indicators */}
                <div className="absolute -top-4 -left-4 bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-primary/20">
                  <div className="text-xs font-medium text-center">Swipe Direction</div>
                  <div className="flex space-x-2 mt-2">
                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-xs">←</span>
                    </div>
                    <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
                      <span className="text-xs">→</span>
                    </div>
                    <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center">
                      <span className="text-xs">↑</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Toggle Between Grid and List View */}
          <div className="flex items-center justify-between mb-8">
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
              {[...Array(8)].map((_, i) => <div key={i} className="group relative aspect-[3/4] bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Heart Icon */}
                  <div className="absolute top-4 right-4 w-8 h-8 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer hover:bg-primary/10">
                    <Heart className="w-4 h-4 text-primary" />
                  </div>
                  
                  {/* AR Ready Badge */}
                  {i % 3 === 0 && <div className="absolute top-4 left-4 bg-primary/90 backdrop-blur-sm rounded-lg px-3 py-1">
                      <div className="flex items-center space-x-1">
                        <Crown className="w-3 h-3 text-white" />
                        <span className="text-xs font-medium text-white">AR Ready</span>
                      </div>
                    </div>}
                  
                  {/* Product Info */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="text-sm font-medium line-clamp-1">Trending Item {i + 1}</div>
                    <div className="text-xs text-muted-foreground">Premium Brand</div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-sm font-bold text-primary">${(Math.random() * 200 + 50).toFixed(0)}</div>
                      <div className="flex space-x-1">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-full bg-primary/10">
                          <ShoppingBag className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-full bg-primary/10">
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>)}
            </div>) : (/* Swipe Interface */
        <div className="mb-12">
              <div className="max-w-sm mx-auto h-[600px] relative bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-4">
                <SwipeDeck filter="all" subcategory="" priceRange={{
              min: 0,
              max: 1000
            }} searchQuery="" currency="USD" />
              </div>
              <div className="text-center mt-6">
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
      <section className="py-24 lg:py-32 bg-gradient-to-b from-muted/30 to-muted/60 relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/8 via-transparent to-primary/12 opacity-60" />
        <div className="container max-w-7xl mx-auto px-6 lg:px-12 relative">
          <div className="text-center mb-20">
            <h2 className="font-cormorant text-4xl lg:text-6xl font-bold mb-6 text-foreground">
              Quality You'll
              <span className="block text-primary italic">Love</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Every piece is carefully selected for quality and style that matches your taste.
            </p>
          </div>

          <div className="flex justify-center mb-16">
            <div className="relative">
              <div className="w-80 h-80 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center shadow-xl">
                <div className="w-64 h-64 bg-background/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-primary/20">
                  <div className="w-48 h-48 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Crown className="w-16 h-16 text-primary mx-auto" />
                      <div className="font-cormorant text-xl font-bold">Premium</div>
                      <div className="text-sm text-muted-foreground">Quality Assured</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating quality indicators */}
              <div className="absolute -top-4 -right-4 bg-background/95 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-primary/20">
                <div className="text-xs font-medium text-center text-muted-foreground">Quality Testing</div>
                <div className="text-lg font-bold text-primary text-center">100%</div>
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-background/95 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-primary/20">
                <div className="text-xs font-medium text-center text-muted-foreground">Customer Satisfaction</div>
                <div className="text-lg font-bold text-primary text-center">4.9</div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[["Premium Materials", "Only the finest fabrics and materials make it into our collections."], ["Expert Curation", "Our fashion experts handpick every piece for quality and style."], ["Sustainable Practice", "We partner with brands committed to ethical and sustainable fashion."]].map(([title, desc]) => <div key={title} className="text-center space-y-4">
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
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5" />
        <div className="absolute inset-0 bg-gradient-to-tr from-gray-900/80 via-transparent to-gray-800/60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(239,68,68,0.15),transparent_60%)]" />
        
        {/* Large Background Text */}
        <div className="absolute inset-0 flex items-center justify-start pl-12 pointer-events-none">
          <div className="font-cormorant text-[20vw] lg:text-[15vw] font-bold text-white/5 leading-none tracking-wider">
            AZYAH
          </div>
        </div>

        <div className="container max-w-7xl mx-auto px-6 lg:px-12 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
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

            <div className="relative">
              <div className="aspect-[4/5] bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl overflow-hidden shadow-2xl border border-white/20">
                <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/20 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    
                    <p className="text-white/80 font-medium">Modern Fashion</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-24 lg:py-32 bg-gradient-to-b from-muted/60 to-muted relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-primary/5 opacity-60" />
        <div className="container max-w-4xl mx-auto px-6 lg:px-12 relative">
          <div className="text-center mb-16">
            <h2 className="font-cormorant text-4xl lg:text-6xl font-bold mb-6 text-foreground">
              Frequently Asked
              <span className="block text-primary italic">Questions</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to know about fashion discovery with Azyah.
            </p>
          </div>

          <div className="space-y-6">
            {[["How does AI-powered fashion discovery work?", "Our AI learns from your swipes and preferences to show you fashion pieces you'll love. The more you use Azyah, the better our recommendations become."], ["Do you sell the products directly?", "No, Azyah is a fashion discovery platform. We show you products that match your style, then redirect you to the retailer where you can purchase them."], ["How does the swipe discovery work?", "Swipe right on styles you love, left on ones you don't. Our AI learns from these interactions to show you more items you'll love."], ["What are the benefits of Premium?", "Premium members get 20 virtual fittings daily, unlimited AI replicas, UGC collaboration access, and priority support."], ["Can I save items to my closet and wishlist?", "Yes! You can save items to your personal closet, create wishlists, and organize your favorite finds. Share your collections with friends or keep them private - it's up to you."], ["How do I connect with the community?", "Join our global fashion community! Share your discoveries, follow other users, and get inspired by trending looks."]].map(([question, answer], index) => <div key={index} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-primary/10 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
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
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(239,68,68,0.1),transparent_50%)]" />
        
        <div className="container max-w-7xl mx-auto px-6 lg:px-12 text-center relative space-y-12">
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
            <Button variant="outline" size="lg" className="px-10 py-4 border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm">
              Learn More
            </Button>
          </div>
          
          <div className="flex items-center justify-center space-x-8 pt-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">50K+</div>
              <div className="text-sm text-background/70">Members</div>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">500+</div>
              <div className="text-sm text-background/70">Brands</div>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">4.9</div>
              <div className="text-sm text-background/70">Rating</div>
            </div>
          </div>
          
          <p className="text-background/60 text-sm uppercase tracking-wider font-medium">
            Exclusive • Curated • Personal
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-20 bg-white border-t border-primary/10">
        <div className="container max-w-7xl mx-auto px-6 lg:px-12">
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
            
            {[["Platform", ["Discover", "Collections", "Community", "Premium"]], ["Partners", ["For Brands", "For Retailers", "Analytics", "Support"]], ["Company", ["About", "Careers", "Press", "Contact"]]].map(([title, links]) => <div key={title as string}>
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
              {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(l => <button key={l} className="hover:text-primary transition-colors">{l}</button>)}
            </div>
          </div>
        </div>
      </footer>
    </div>;
}
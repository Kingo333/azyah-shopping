import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowRight,
  Heart,
  Users,
  Star,
  Sparkles,
  Play,
  Menu,
  X,
  CheckCircle,
  ShoppingBag,
  Globe,
  Crown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

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
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Show loading while user state is being determined
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Azyah — Luxury Fashion Discovery"
        description="Swipe to discover luxury fashion, AI curation, AR try-on, and a global community."
        canonical="https://azyah.app/"
      />
      {/* NAV */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-primary/10">
        <div className="container max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden shadow-lg">
              <img src="/marketing/azyah-logo.png" alt="Azyah" className="w-full h-full object-cover"/>
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
            {[
              ["Discover", "#discover"],
              ["Features", "#features"],
              ["For Brands", "#brands"],
              ["For Retailers", "#retailers"],
            ].map(([label, href]) => (
              <button
                key={href}
                onClick={() => scrollToSection(href)}
                className="relative text-sm font-medium text-muted-foreground hover:text-primary transition-colors group"
              >
                {label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"/>
              </button>
            ))}
          </nav>

          {/* CTA + Actions */}
          <div className="hidden lg:flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth")}
            >
              Sign In
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate("/auth")}
            >
              Start Shopping
            </Button>
          </div>

          {/* Mobile burger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            className="lg:hidden p-2 rounded-lg hover:bg-primary/10"
          >
            {mobileMenuOpen ? <X className="w-6 h-6 text-primary"/> : <Menu className="w-6 h-6 text-primary"/>}
          </button>
        </div>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div
            role="dialog"
            aria-modal="true"
            className="lg:hidden bg-background/95 backdrop-blur-md border-t border-primary/10 py-6 px-6 space-y-6"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setMobileMenuOpen(false);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setMobileMenuOpen(false);
              }
            }}
          >
            <nav className="flex flex-col space-y-4">
              {[
                ["Discover", "#discover"],
                ["Features", "#features"],
                ["For Brands", "#brands"],
                ["For Retailers", "#retailers"],
              ].map(([label, href]) => (
                <button 
                  key={href} 
                  onClick={() => {
                    scrollToSection(href);
                    setMobileMenuOpen(false);
                  }}
                  className="text-lg text-muted-foreground hover:text-primary text-left"
                >
                  {label}
                </button>
              ))}
            </nav>
            <div className="border-t border-primary/10 pt-4 space-y-3">
              <Button 
                variant="ghost" 
                size="lg" 
                className="justify-start w-full" 
                onClick={() => navigate("/auth")}
              >
                Sign In
              </Button>
              <Button 
                variant="default" 
                size="lg" 
                className="justify-start w-full" 
                onClick={() => navigate("/auth")}
              >
                Start Shopping
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* PREMIUM BANNER */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-3 px-6">
        <div className="container max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5" />
            <span className="font-medium text-sm">Premium: 20 AI Try-ons daily • Unlimited AI generation on Replica • Access to UGC collabs</span>
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            className="text-xs px-4 py-1 h-7"
            onClick={() => navigate("/auth")}
          >
            Learn More
          </Button>
        </div>
      </div>

      {/* HERO */}
      <section id="discover" className="relative overflow-hidden min-h-screen bg-gradient-to-br from-background via-primary-glow to-primary/5">
        {/* Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_25%_25%,rgba(239,68,68,0.15),transparent_50%)]"/>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_75%_75%,rgba(239,68,68,0.1),transparent_50%)]"/>
        </div>
        
        {/* Floating elements */}
        <div className="absolute top-32 left-16 w-40 h-40 bg-primary/8 rounded-full blur-3xl animate-pulse"/>
        <div className="absolute bottom-32 right-16 w-32 h-32 bg-primary/5 rounded-full blur-2xl animate-pulse"/>
        <div className="absolute top-1/2 left-1/4 w-6 h-6 bg-primary/20 rounded-full animate-bounce"/>
        <div className="absolute top-1/3 right-1/3 w-4 h-4 bg-primary/30 rounded-full animate-pulse delay-1000"/>

        <div className="container max-w-7xl mx-auto px-6 lg:px-12 pt-24 pb-20 lg:pt-32 lg:pb-32 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center transition-all duration-1000"
               style={{ opacity: isVisible ? 1 : 0, transform: `translateY(${isVisible ? 0 : 32}px)` }}>
            
            {/* Hero Content */}
            <div className="space-y-10 lg:space-y-12">
              <div className="space-y-8">
                <div className="inline-flex items-center space-x-3 bg-white/80 backdrop-blur-sm border border-primary/20 rounded-full px-6 py-3 shadow-lg">
                  <Sparkles className="w-5 h-5 text-primary"/>
                  <span className="text-sm font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent uppercase tracking-wider">Fashion Discovery</span>
                </div>
                
                <div className="space-y-4">
                  <h1 className="font-cormorant text-6xl lg:text-8xl xl:text-9xl font-bold leading-[0.85] tracking-tight">
                    <span className="block text-foreground">Discover</span>
                    <span className="block bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent italic">Fashion</span>
                    <span className="block text-foreground">Through Swipe</span>
                  </h1>
                  <p className="text-xl lg:text-2xl text-muted-foreground max-w-lg leading-relaxed font-medium">
                    Experience the future of fashion shopping with AI-powered curation and personalized style discovery.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="group px-8 py-4 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={() => navigate("/auth")}
                >
                  Shop Now
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform"/>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-4 bg-white/50 backdrop-blur-sm border-2 border-primary/30 hover:bg-white/80 hover:border-primary/50"
                >
                  <Play className="mr-2 w-5 h-5"/> Watch Film
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center space-y-6 sm:space-y-0 sm:space-x-12 pt-8">
                <div className="flex items-center space-x-4">
                  <div className="flex -space-x-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-primary/80 border-3 border-white shadow-lg"/>
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">50,000+ Members</p>
                    <p className="text-xs text-primary font-medium">Global Community</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-primary text-primary"/>)}
                  <span className="text-sm font-semibold ml-2">4.9/5</span>
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative lg:justify-self-end">
              <div className="relative">
                <div className="aspect-[4/5] bg-gradient-to-br from-white/50 to-primary/10 rounded-2xl overflow-hidden shadow-2xl border border-white/30 backdrop-blur-sm">
                  <img 
                    src="/marketing/hero-visual.png" 
                    alt="Azyah luxury fashion discovery hero" 
                    className="w-full h-full object-cover" 
                    loading="eager" 
                    fetchPriority="high" 
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent"/>
                </div>
                
                {/* Floating cards */}
                <div className="absolute -top-6 -right-6 w-24 h-32 bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-primary/20 p-3">
                  <div className="w-full h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg mb-2"/>
                  <div className="space-y-1">
                    <div className="h-2 bg-primary/30 rounded w-3/4"/>
                    <div className="h-2 bg-primary/20 rounded w-1/2"/>
                  </div>
                </div>
                
                <div className="absolute -bottom-6 -left-6 w-32 h-24 bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-primary/20 p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-primary to-primary/80 rounded-full"/>
                    <div className="space-y-1 flex-1">
                      <div className="h-2 bg-primary/30 rounded"/>
                      <div className="h-1 bg-primary/20 rounded w-2/3"/>
                    </div>
                  </div>
                  <div className="h-8 bg-gradient-to-r from-primary/20 to-primary/10 rounded"/>
                </div>
              </div>
              
              {/* Background effects */}
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/15 rounded-full blur-2xl animate-pulse"/>
              <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000"/>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative py-24 lg:py-32 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(239,68,68,0.08),transparent_50%)] opacity-60"/>
        <div className="container max-w-7xl mx-auto px-6 lg:px-12 relative">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-primary/10 rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-primary"/>
              <span className="text-sm font-semibold text-primary uppercase tracking-wider">Features</span>
            </div>
            <h2 className="font-cormorant text-5xl lg:text-7xl font-bold mb-6 leading-tight">
              The Future of
              <span className="block bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent italic">Fashion Discovery</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              AI-powered personalization • Quality brand partnerships • Curated collections
            </p>
            <div className="w-32 h-1 bg-gradient-to-r from-primary to-primary/70 mx-auto mt-8 rounded-full"/>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {[
              ["AI Curation", "/marketing/ai-curation-icon.png", "Our advanced AI learns your unique style and curates personalized collections.", ["Personalized recommendations","Style learning algorithm","Trend forecasting"]],
              ["Exclusive Access", "/marketing/exclusive-access-icon.png", "Access limited collections and early releases from premium brands.", ["Pre-launch access","Limited collections","VIP perks"]],
              ["Global Community", "/marketing/global-community-icon.png", "Connect with enthusiasts worldwide and share discoveries.", ["Style inspiration","Global trends","Community sharing"]],
            ].map(([title, icon, desc, bullets]) => (
              <article key={title as string} className="group bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-2xl border border-primary/10 hover:border-primary/20 transition-all duration-500 hover:-translate-y-2">
                <div className="w-16 h-16 relative rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6">
                  <img src={icon as string} alt={title as string} className="w-10 h-10 object-cover" loading="lazy" decoding="async"/>
                </div>
                <h3 className="font-cormorant text-2xl font-bold mb-4 text-foreground">{title}</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">{desc}</p>
                <ul className="space-y-3">
                  {(bullets as string[]).map(b => (
                    <li key={b} className="flex items-center space-x-3 text-sm text-muted-foreground">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-3 h-3 text-primary"/>
                      </div>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          {/* Additional modern section */}
          <div className="mt-24 bg-gradient-to-r from-primary/5 to-primary/10 rounded-3xl p-12 lg:p-16">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h3 className="font-cormorant text-4xl lg:text-5xl font-bold leading-tight">
                  Trending Styles
                  <span className="block text-primary italic">Every Woman Needs</span>
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Discover the latest trends and must-have pieces curated by our fashion experts and AI technology.
                </p>
                <Button className="bg-primary hover:bg-primary/90 text-white px-6 py-3">
                  View All Collections
                  <ChevronRight className="ml-2 w-4 h-4"/>
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="aspect-[3/4] bg-white/60 backdrop-blur-sm rounded-xl shadow-lg border border-primary/10 p-2">
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg"/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PARTNER CTA */}
      <section id="brands" className="py-24 lg:py-32 bg-gradient-to-br from-background to-primary/5">
        <div className="container max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-10">
              <div className="space-y-6">
                <div className="inline-flex items-center space-x-2 bg-primary/10 rounded-full px-4 py-2">
                  <Crown className="w-4 h-4 text-primary"/>
                  <span className="text-sm font-semibold text-primary uppercase tracking-wider">Partnership</span>
                </div>
                <h2 className="font-cormorant text-5xl lg:text-6xl font-bold leading-tight">
                  Partner with
                  <span className="block text-primary italic">Azyah</span>
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Showcase collections to a curated audience and grow your brand with our premium platform.
                </p>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-6">
                {[
                  ["For Brands", "/auth?role=brand"],
                  ["For Retailers", "/auth?role=retailer"],
                ].map(([label, href]) => (
                  <div key={label} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-primary/10 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="space-y-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-primary/20 to-primary/10 rounded-xl flex items-center justify-center">
                        {label === "For Brands" ? <ShoppingBag className="w-6 h-6 text-primary"/> : <Globe className="w-6 h-6 text-primary"/>}
                      </div>
                      <h3 className="font-cormorant text-2xl font-bold">{label}</h3>
                      <p className="text-muted-foreground">
                        {label === "For Brands" ? "Show your line to fashion lovers and build lasting connections." : "Expand reach with AI analytics and premium customer insights."}
                      </p>
                      <Button 
                        variant="outline" 
                        className="w-full border-primary/30 hover:bg-primary/5"
                        onClick={() => navigate(href as string)}
                      >
                        Join as {label.split(" ")[1]} <ChevronRight className="ml-2 w-4 h-4"/>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl p-12 lg:p-16">
                <div className="text-center space-y-8">
                  <div className="space-y-6">
                    <h3 className="font-cormorant text-3xl font-bold">
                      Uncompromising Quality,
                      <span className="block text-primary italic">Unmatched Design</span>
                    </h3>
                    <p className="text-muted-foreground">
                      Join thousands of premium brands and retailers who trust Azyah to showcase their finest collections.
                    </p>
                  </div>
                  
                  <div className="w-32 h-32 mx-auto bg-white/60 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl border border-primary/20">
                    <div className="w-20 h-20 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center">
                      <Crown className="w-10 h-10 text-white"/>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {[
                      ["500+", "Premium Brands"],
                      ["50K+", "Active Users"],
                      ["4.9", "Rating"]
                    ].map(([num, label]) => (
                      <div key={label}>
                        <div className="text-2xl font-bold text-primary">{num}</div>
                        <div className="text-xs text-muted-foreground">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section id="retailers" className="relative py-24 lg:py-32 bg-gradient-to-br from-foreground via-gray-900 to-foreground text-background overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent"/>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(239,68,68,0.1),transparent_50%)]"/>
        
        <div className="container max-w-7xl mx-auto px-6 lg:px-12 text-center relative space-y-12">
          <div className="space-y-8">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
              <Sparkles className="w-4 h-4 text-primary"/>
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
            <Button 
              size="lg" 
              className="px-10 py-4 bg-primary hover:bg-primary/90 text-white shadow-2xl"
              onClick={() => navigate("/auth")}
            >
              Start Your Journey <ArrowRight className="ml-2 w-5 h-5"/>
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="px-10 py-4 border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
            >
              Learn More
            </Button>
          </div>
          
          <div className="flex items-center justify-center space-x-8 pt-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">50K+</div>
              <div className="text-sm text-background/70">Members</div>
            </div>
            <div className="w-px h-8 bg-white/20"/>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">500+</div>
              <div className="text-sm text-background/70">Brands</div>
            </div>
            <div className="w-px h-8 bg-white/20"/>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">4.9★</div>
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
                  <Heart className="w-6 h-6 text-white"/>
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
                {[Users, Globe, Heart].map((Icon, i) => (
                  <div key={i} className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center hover:bg-primary/20 transition-colors cursor-pointer">
                    <Icon className="w-5 h-5 text-primary"/>
                  </div>
                ))}
              </div>
            </div>
            
            {[
              ["Platform", ["Discover", "Collections", "Community", "Premium"]],
              ["Partners", ["For Brands", "For Retailers", "Analytics", "Support"]],
              ["Company", ["About", "Careers", "Press", "Contact"]],
            ].map(([title, links]) => (
              <div key={title as string}>
                <h4 className="font-cormorant text-lg font-bold text-foreground mb-6">{title}</h4>
                <ul className="space-y-3">
                  {(links as string[]).map(l => 
                    <li key={l}>
                      <button className="text-muted-foreground hover:text-primary transition-colors text-sm">{l}</button>
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="pt-8 border-t border-primary/10 flex flex-col md:flex-row items-center justify-between">
            <p className="text-sm text-muted-foreground">©2024 Azyah. All rights reserved.</p>
            <div className="flex items-center space-x-8 text-sm text-muted-foreground mt-4 md:mt-0">
              {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(l => 
                <button key={l} className="hover:text-primary transition-colors">{l}</button>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

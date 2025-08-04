import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

export default function Landing() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => setIsVisible(true), []);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* NAV */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-primary/10">
        <div className="container max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden shadow-lg">
              <img src="/marketing/azyah-logo.png" alt="Azyah" className="w-full h-full object-cover"/>
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Azyah</h1>
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

      {/* HERO */}
      <section id="discover" className="relative bg-gradient-to-br from-background to-primary/5 pt-20 pb-32 lg:pt-32 lg:pb-40">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse"/>
        <div className="absolute bottom-20 right-10 w-24 h-24 bg-primary/5 rounded-full blur-2xl animate-pulse"/>

        <div className="container max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-16 items-center transition-all duration-1000"
             style={{ opacity: isVisible ? 1 : 0, transform: `translateY(${isVisible ? 0 : 32}px)` }}>
          {/* Copy */}
          <div className="space-y-10">
            <div className="space-y-6">
              <span className="inline-flex items-center space-x-3 bg-primary/10 border border-primary/20 rounded-full px-4 py-2">
                <span className="text-sm font-medium bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent uppercase tracking-wider">Fashion Discovery</span>
              </span>
              <h1 className="font-serif text-6xl lg:text-8xl font-bold leading-[0.9]">
                Discover
                <span className="block bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent italic">Fashion</span>
                <span className="block">Through Swipe</span>
              </h1>
              <p className="text-xl lg:text-2xl text-muted-foreground max-w-lg leading-relaxed">
                Experience the future of fashion shopping with AI-powered curation and personalized style discovery.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="default"
                size="lg"
                className="group px-8 py-4"
                onClick={() => navigate("/auth")}
              >
                Shop Now
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform"/>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="px-8 py-4"
              >
                <Play className="mr-2 w-5 h-5"/> Watch Film
              </Button>
            </div>

            <div className="flex items-center space-x-8 pt-8">
              <div className="flex items-center space-x-3">
                <div className="flex -space-x-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-primary/70 border-2 border-background"/>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-medium">50,000+ Members</p>
                  <p className="text-xs text-primary/70">Global Community</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-primary text-primary"/>)}
                <span className="text-sm font-medium">4.9/5</span>
              </div>
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="aspect-[4/5] bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg overflow-hidden shadow-lg border border-primary/10">
              <img src="/marketing/hero-visual.png" alt="Fashion Discovery" className="w-full h-full object-cover"/>
            </div>
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/20 rounded-full blur-xl animate-pulse"/>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary/10 rounded-full blur-xl animate-pulse"/>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative py-24 lg:py-32 bg-gradient-to-b from-primary/5 to-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary)_/_0.05),transparent_50%)]"/>
        <div className="container max-w-7xl mx-auto px-6 lg:px-12 relative">
          <div className="text-center mb-20">
            <h2 className="font-serif text-5xl lg:text-7xl font-bold mb-6">The Future of
              <span className="block bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent italic">Fashion Discovery</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              AI-powered personalization • Quality brand partnerships • Curated collections
            </p>
            <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/70 mx-auto mt-8 rounded-full"/>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {[
              ["AI Curation", "/marketing/ai-curation-icon.png", "Our advanced AI learns your unique style and curates personalized collections.", ["Personalized recommendations","Style learning algorithm","Trend forecasting"]],
              ["Exclusive Access", "/marketing/exclusive-access-icon.png", "Access limited collections and early releases from premium brands.", ["Pre-launch access","Limited collections","VIP perks"]],
              ["Global Community", "/marketing/global-community-icon.png", "Connect with enthusiasts worldwide and share discoveries.", ["Style inspiration","Global trends","Community sharing"]],
            ].map(([title, icon, desc, bullets]) => (
              <article key={title as string} className="group bg-card/50 backdrop-blur-sm rounded-lg p-10 shadow-lg hover:shadow-xl border border-primary/10 hover:border-primary/20 transition-all duration-300">
                <div className="w-16 h-16 relative rounded-lg shadow-md group-hover:shadow-lg transition-shadow">
                  <img src={icon as string} alt={title as string} className="w-full h-full object-cover rounded-lg"/>
                </div>
                <h3 className="font-serif text-2xl font-bold mt-6">{title}</h3>
                <p className="text-muted-foreground mt-4">{desc}</p>
                <ul className="space-y-2 mt-6">
                  {(bullets as string[]).map(b => (
                    <li key={b} className="flex items-center space-x-3 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0"/>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PARTNER CTA */}
      <section id="brands" className="py-24 lg:py-32">
        <div className="container max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-10">
            <h2 className="font-serif text-5xl lg:text-6xl font-bold">Partner with
              <span className="block text-primary italic">Azyah</span>
            </h2>
            <p className="text-xl text-muted-foreground">Showcase collections to a curated audience.</p>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                ["For Brands", "/auth?role=brand"],
                ["For Retailers", "/auth?role=retailer"],
              ].map(([label, href]) => (
                <div key={label} className="space-y-4">
                  <h3 className="font-serif text-2xl font-bold">{label}</h3>
                  <p className="text-muted-foreground">
                    {label === "For Brands" ? "Show your line to fashion lovers." : "Expand reach with AI analytics."}
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate(href as string)}
                  >
                    Join as {label.split(" ")[1]} <ChevronRight className="ml-2 w-4 h-4"/>
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/3] bg-muted rounded-lg shadow-lg flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-4">
                  <Crown className="w-12 h-12 text-primary"/>
                  <Globe className="w-12 h-12 text-primary"/>
                </div>
                <p className="text-muted-foreground">Partner Excellence</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section id="retailers" className="relative py-24 lg:py-32 bg-foreground text-background overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent"/>
        <div className="container max-w-7xl mx-auto px-6 lg:px-12 text-center relative space-y-10">
          <h2 className="font-serif text-5xl lg:text-7xl font-bold">
            Begin Your <span className="block text-primary italic">Luxury Journey</span>
          </h2>
          <p className="text-xl lg:text-2xl text-background/80 max-w-3xl mx-auto">
            Join the exclusive community that discovers, curates & celebrates luxury fashion.
          </p>
          <Button 
            variant="secondary" 
            size="lg" 
            className="px-10 py-4"
            onClick={() => navigate("/auth")}
          >
            Start Your Journey <ArrowRight className="ml-2 w-5 h-5"/>
          </Button>
          <p className="text-background/60 text-sm uppercase tracking-wider">Exclusive • Curated • Personal</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 bg-muted/30 border-t border-border">
        <div className="container max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary-foreground"/>
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold">Azyah</h3>
                <p className="text-xs text-muted-foreground uppercase">Fashion Discovery</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">The world's most exclusive luxury fashion discovery platform.</p>
          </div>
          {[
            ["Platform", ["Discover", "Collections", "Community", "Premium"]],
            ["Partners", ["For Brands", "For Retailers", "Analytics", "Support"]],
            ["Company", ["About", "Careers", "Press", "Contact"]],
          ].map(([title, links]) => (
            <div key={title as string}>
              <h4 className="font-medium text-foreground mb-4">{title}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(links as string[]).map(l => 
                  <li key={l}>
                    <button className="hover:text-foreground transition-colors">{l}</button>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
        <div className="container max-w-7xl mx-auto px-6 lg:px-12 mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between">
          <p className="text-sm text-muted-foreground">©2024 Azyah. All rights reserved.</p>
          <div className="flex items-center space-x-6 text-sm text-muted-foreground mt-4 md:mt-0">
            {["Privacy", "Terms", "Cookies"].map(l => 
              <button key={l} className="hover:text-foreground transition-colors">{l}</button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
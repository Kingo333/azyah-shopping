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
  Shirt,
  Search,
  TrendingUp,
  Zap,
  Plus,
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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-100">
      <SEOHead
        title="Divine Drape — Luxury Fashion Discovery"
        description="Discover luxury fashion through AI-powered curation and personalized style discovery."
        canonical="https://azyah.app/"
      />
      
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-pink-200/30">
        <div className="container max-w-7xl mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-pink-600 bg-clip-text text-transparent">
              Divine Drape
            </div>
          </div>

          <nav className="hidden lg:flex items-center space-x-8">
            {["Home", "Shop", "About", "FAQ"].map((item) => (
              <button
                key={item}
                className="text-gray-700 hover:text-pink-500 transition-colors text-sm font-medium"
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="hidden lg:flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              Login
            </Button>
            <Button 
              className="bg-pink-500 hover:bg-pink-600 text-white rounded-full px-6"
              onClick={() => navigate("/auth")}
            >
              Start Shopping
            </Button>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2"
          >
            {mobileMenuOpen ? <X className="w-6 h-6"/> : <Menu className="w-6 h-6"/>}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden bg-white/95 backdrop-blur-md border-t border-pink-200/30 py-6 px-6">
            <nav className="flex flex-col space-y-4">
              {["Home", "Shop", "About", "FAQ"].map((item) => (
                <button key={item} className="text-left text-gray-700 hover:text-pink-500">
                  {item}
                </button>
              ))}
            </nav>
            <div className="mt-4 space-y-3">
              <Button variant="ghost" className="w-full" onClick={() => navigate("/auth")}>
                Login
              </Button>
              <Button 
                className="w-full bg-pink-500 hover:bg-pink-600 text-white"
                onClick={() => navigate("/auth")}
              >
                Start Shopping
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-400/20 via-transparent to-pink-300/10" />
        
        <div className="container max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8 relative z-10">
            {/* Join Community Badge */}
            <div className="inline-flex items-center bg-gradient-to-r from-pink-100 to-white rounded-full px-4 py-2 border border-pink-200">
              <div className="flex -space-x-1 mr-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-r from-pink-300 to-pink-500 border-2 border-white" />
                ))}
              </div>
              <span className="text-sm font-medium text-pink-700">Join the Community of Fashion</span>
              <Plus className="w-4 h-4 ml-2 text-pink-500" />
            </div>

            {/* Large Typography */}
            <div className="space-y-4">
              <h1 className="text-7xl lg:text-9xl font-black leading-none tracking-tight">
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-pink-600">
                  DIVINE
                </span>
                <span className="block text-gray-900">
                  DRAPE
                </span>
              </h1>
            </div>

            {/* New Collection Card */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-pink-200/50 max-w-md">
              <h3 className="font-bold text-gray-900 mb-2">New Collection</h3>
              <p className="text-gray-600 text-sm mb-4">
                Discover the latest trends in women's fashion, crafted for every style and occasion.
              </p>
              <Button 
                className="bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 rounded-full px-6"
                onClick={() => navigate("/auth")}
              >
                View All
              </Button>
            </div>

            {/* Small Product Grid */}
            <div className="grid grid-cols-2 gap-3 max-w-xs">
              {[1,2,3,4].map((i) => (
                <div key={i} className="aspect-square bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl p-4 flex items-center justify-center">
                  <Shirt className="w-8 h-8 text-pink-500" />
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Model Image */}
          <div className="relative">
            <div className="aspect-[3/4] bg-gradient-to-br from-pink-200 to-pink-300 rounded-3xl overflow-hidden relative">
              {/* Placeholder for model image */}
              <div className="absolute inset-0 bg-gradient-to-t from-pink-400/30 to-transparent" />
              <div className="absolute bottom-8 left-8 text-white">
                <div className="w-12 h-12 bg-white/20 rounded-full backdrop-blur-sm flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg">Trending Styles</h3>
                <p className="text-white/80">Every Woman Needs</p>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-pink-400 rounded-full opacity-20 animate-pulse" />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-pink-300 rounded-full opacity-30 animate-pulse" />
          </div>
        </div>
      </section>

      {/* Trending Styles Grid */}
      <section className="py-24 bg-gradient-to-b from-gray-900 to-black text-white">
        <div className="container max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-6xl font-bold mb-4">
              Trending Styles
            </h2>
            <h3 className="text-2xl lg:text-3xl font-light mb-8">
              Every Woman Needs
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {[
              { name: "Casual Chic", color: "from-amber-400 to-orange-500" },
              { name: "Business Pro", color: "from-blue-400 to-indigo-500" },
              { name: "Evening Glam", color: "from-purple-400 to-pink-500" },
              { name: "Street Style", color: "from-green-400 to-teal-500" },
              { name: "Vintage Vibes", color: "from-yellow-400 to-orange-500" },
              { name: "Minimalist", color: "from-gray-400 to-slate-500" },
              { name: "Boho Chic", color: "from-pink-400 to-rose-500" },
              { name: "Sport Luxe", color: "from-cyan-400 to-blue-500" },
            ].map((style, i) => (
              <div key={i} className="group cursor-pointer">
                <div className={`aspect-square bg-gradient-to-br ${style.color} rounded-2xl mb-4 flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform duration-300`}>
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                  <Shirt className="w-12 h-12 text-white relative z-10" />
                </div>
                <h4 className="text-sm font-medium text-center">{style.name}</h4>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button 
              className="bg-pink-500 hover:bg-pink-600 text-white rounded-full px-8 py-3"
              onClick={() => navigate("/auth")}
            >
              View All Categories
            </Button>
          </div>
        </div>
      </section>

      {/* Quality Section */}
      <section className="py-24 bg-gradient-to-b from-gray-900 to-black text-white">
        <div className="container max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                Uncompromising Quality,
                <br />
                Unmatched Design
              </h2>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-6">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <p className="text-white/80 mb-6 leading-relaxed">
                  Luxury skincare that nourishes your skin from within, designed for radiant beauty and 
                  lasting results. Luxury skincare that nourishes your skin from within, designed for radiant 
                  beauty and lasting results.
                </p>
                <Button 
                  className="bg-pink-500 hover:bg-pink-600 text-white rounded-full px-6"
                  onClick={() => navigate("/auth")}
                >
                  Learn More
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
                <div className="w-64 h-64 bg-white/10 rounded-full backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <Sparkles className="w-16 h-16 text-white mx-auto mb-4" />
                    <p className="text-white font-medium">Premium Quality</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-gradient-to-b from-gray-900 to-black text-white">
        <div className="container max-w-4xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-8">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {[
              "Do You Accept Returns And Exchanges?",
              "How Do You Ensure The Quality Of Your Work?",
              "How Can I Track My Order?",
              "What Sizes Do You Offer?"
            ].map((question, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-colors cursor-pointer group">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">{question}</h3>
                  <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-12 space-x-4">
            <div className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">C</span>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">I</span>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">A</span>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">F</span>
            </div>
          </div>

          <div className="text-center mt-16">
            <p className="text-white/60 mb-8">Follow us and get a chance to win 80% off</p>
            <Button 
              className="bg-pink-500 hover:bg-pink-600 text-white rounded-full px-8 py-3"
              onClick={() => navigate("/auth")}
            >
              Follow Us
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-gray-900 text-white">
        <div className="container max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-4 gap-8 mb-12">
            <div className="space-y-4">
              <div className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-pink-600 bg-clip-text text-transparent">
                Divine Drape
              </div>
              <p className="text-gray-400 text-sm">
                The world's most exclusive luxury fashion discovery platform.
              </p>
            </div>
            
            {[
              ["Platform", ["Discover", "Collections", "Community", "Premium"]],
              ["Partners", ["For Brands", "For Retailers", "Analytics", "Support"]],
              ["Company", ["About", "Careers", "Press", "Contact"]],
            ].map(([title, links]) => (
              <div key={title as string} className="space-y-4">
                <h4 className="font-medium text-white">{title}</h4>
                <ul className="space-y-2">
                  {(links as string[]).map(link => (
                    <li key={link}>
                      <button className="text-sm text-gray-400 hover:text-white transition-colors">
                        {link}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-gray-400">© 2024 Divine Drape. All rights reserved.</p>
            <div className="flex space-x-6">
              {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(link => (
                <button key={link} className="text-sm text-gray-400 hover:text-white transition-colors">
                  {link}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

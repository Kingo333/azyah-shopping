import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { ArrowRight } from "lucide-react";

export default function Landing() {
  const {
    user,
    signIn,
    signOut,
    loading
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const handleSignIn = async () => {
    try {
      await signIn();
      toast({
        title: 'Login Successful',
        description: 'Redirecting to dashboard...',
        duration: 3000
      });
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Please check your credentials and try again.',
        duration: 5000
      });
    }
  };
  const handleNavigation = (path: string) => {
    navigate(path);
  };
  return <div className="min-h-screen bg-gradient-to-br from-background via-primary-glow/20 to-background overflow-x-hidden">
      {/* NAV - More Minimal for Mobile */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-primary/10">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo - Show Azyah text on all screen sizes */}
          <div className="flex items-center space-x-2 sm:space-x-4">
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

          {/* Navigation and Buttons */}
          <nav className="hidden lg:flex items-center space-x-6">
            <Button variant="ghost" size="sm" onClick={() => handleNavigation('/about')}>
              About
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleNavigation('/contact')}>
              Contact
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleNavigation('/pricing')}>
              Pricing
            </Button>
          </nav>
          <div className="space-x-2 flex items-center">
            {!user && <Button variant="outline" size="sm" onClick={handleSignIn} disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>}
            {user && <Button variant="default" size="sm" onClick={() => navigate('/dashboard')}>
                Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 sm:py-24 lg:py-32 bg-hero-pattern bg-cover bg-center text-center text-white">
        <div className="absolute inset-0 bg-gradient-hero opacity-80 z-0" />
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h1 className="font-playfair text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
            Discover Your Unique Style with Azyah
          </h1>
          <p className="text-lg sm:text-xl mb-8 sm:mb-12">
            AI-Powered Fashion Discovery Platform
          </p>
          <div className="flex justify-center space-x-4">
            <Button size="lg" className="bg-primary hover:bg-primary-foreground text-white" onClick={handleSignIn} disabled={loading}>
              Get Started
            </Button>
            <Button variant="outline" size="lg" className="text-white border-white hover:bg-white hover:text-primary">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature Card 1 */}
            <div className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
              <h3 className="text-xl font-semibold mb-2">AI-Powered Style Recommendations</h3>
              <p className="text-gray-700">
                Get personalized fashion recommendations based on your preferences and body type.
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
              <h3 className="text-xl font-semibold mb-2">Virtual Try-On</h3>
              <p className="text-gray-700">
                Experiment with different outfits and see how they look on you virtually.
              </p>
            </div>

            {/* Feature Card 3 */}
            <div className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
              <h3 className="text-xl font-semibold mb-2">Outfit Creation</h3>
              <p className="text-gray-700">
                Create unique outfits by mixing and matching items from different brands.
              </p>
            </div>

            {/* Feature Card 4 */}
            <div className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
              <h3 className="text-xl font-semibold mb-2">Fashion Community</h3>
              <p className="text-gray-700">
                Connect with other fashion enthusiasts, share your style, and get inspired.
              </p>
            </div>

            {/* Feature Card 5 */}
            <div className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
              <h3 className="text-xl font-semibold mb-2">Personalized Shopping</h3>
              <p className="text-gray-700">
                Discover new brands and products tailored to your style and budget.
              </p>
            </div>

            {/* Feature Card 6 */}
            <div className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
              <h3 className="text-xl font-semibold mb-2">Style Analysis</h3>
              <p className="text-gray-700">
                Get insights into your style preferences and learn how to improve your fashion sense.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 sm:py-20 bg-accent">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Elevate Your Style?</h2>
          <p className="text-lg mb-8">
            Join Azyah today and discover a world of personalized fashion.
          </p>
          <Button size="lg" className="bg-primary hover:bg-primary-foreground text-white" onClick={handleSignIn} disabled={loading}>
            Sign Up Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 bg-background border-t border-primary/10">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          <div className="mb-4">
            <h1 className="font-cormorant text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Azyah</h1>
            <p className="text-sm text-primary/70 uppercase tracking-wider">
              Fashion Discovery
            </p>
          </div>
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Azyah. All rights reserved.
          </p>
        </div>
      </footer>
    </div>;
}

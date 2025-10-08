import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import InstallBanner from "@/components/InstallBanner";

export default function Install() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Install Azyah - Get the App" 
        description="Install the Azyah app for faster loads, push notifications, and fullscreen experience." 
      />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-primary/10">
        <div className="container max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="font-cormorant text-xl font-bold">Install Azyah</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden shadow-lg">
              <img 
                src="/marketing/azyah-logo.png" 
                alt="Azyah App Icon" 
                className="w-full h-full object-cover" 
              />
            </div>
            <h2 className="font-cormorant text-3xl sm:text-4xl font-bold">
              Get the Azyah App
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Install Azyah for a better experience with faster loads, push notifications, and fullscreen browsing.
            </p>
          </div>

          {/* Install Banner */}
          <div className="max-w-md mx-auto">
            <InstallBanner />
          </div>

          {/* Benefits */}
          <div className="grid gap-6 sm:gap-8 max-w-2xl mx-auto">
            <div className="space-y-6">
              <h3 className="font-cormorant text-2xl font-bold text-center">Why Install?</h3>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-4 p-4 rounded-xl bg-primary/5">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">⚡</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Faster Performance</h4>
                    <p className="text-sm text-muted-foreground">
                      Lightning-fast app loads and smooth navigation
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 rounded-xl bg-primary/5">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">🔔</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Push Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      Get notified about new collections and style matches
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 rounded-xl bg-primary/5">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">📱</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Fullscreen Experience</h4>
                    <p className="text-sm text-muted-foreground">
                      Immersive browsing without browser UI distractions
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 rounded-xl bg-primary/5">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">🏠</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Home Screen Access</h4>
                    <p className="text-sm text-muted-foreground">
                      Quick access directly from your device's home screen
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center space-y-4">
            <Button 
              variant="outline" 
              onClick={() => navigate("/onboarding/signup")}
              className="w-full max-w-sm"
            >
              Continue in Browser
            </Button>
            <p className="text-xs text-muted-foreground">
              You can always install the app later from your browser menu
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Sparkles, TrendingUp } from "lucide-react";

export default function ShopSection() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-primary/10 rounded-full">
          <Heart className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Discover Your Style</h2>
          <p className="text-muted-foreground">
            Swipe through curated fashion items to build your personal style profile
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-xl border bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Smart Recommendations</h3>
              <p className="text-sm text-muted-foreground">AI-powered suggestions based on your preferences</p>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/swipe')}
            className="w-full"
          >
            Start Swiping
          </Button>
        </div>

        <div className="p-6 rounded-xl border bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Trending Now</h3>
              <p className="text-sm text-muted-foreground">See what's popular with other users</p>
            </div>
          </div>
          <Button 
            variant="outline"
            onClick={() => navigate('/trending-styles')}
            className="w-full"
          >
            View Trends
          </Button>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Ready to find your perfect style match?
        </p>
        <Button 
          size="lg"
          onClick={() => navigate('/swipe')}
          className="px-8"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Begin Style Journey
        </Button>
      </div>
    </div>
  );
}
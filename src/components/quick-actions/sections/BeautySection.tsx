import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Wand2, Sparkles, Camera, Star } from "lucide-react";

export default function BeautySection() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-full">
          <Wand2 className="h-8 w-8 text-pink-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Beauty Consultant</h2>
          <p className="text-muted-foreground">
            Get personalized beauty advice and recommendations from our AI consultant
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-xl border bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-500/10 rounded-lg flex items-center justify-center">
              <Camera className="h-5 w-5 text-pink-600" />
            </div>
            <div>
              <h3 className="font-semibold">Photo Analysis</h3>
              <p className="text-sm text-muted-foreground">Upload your photo for personalized beauty tips</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Star className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold">Product Recommendations</h3>
              <p className="text-sm text-muted-foreground">Get tailored beauty product suggestions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Button 
          size="lg"
          onClick={() => navigate('/beauty-consultant')}
          className="px-8"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Start Beauty Consultation
        </Button>
      </div>
    </div>
  );
}
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, Heart, MessageCircle, Share2 } from "lucide-react";

export default function FeedSection() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gradient-to-br from-blue-500/10 to-green-500/10 rounded-full">
          <Users className="h-8 w-8 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Fashion Feed</h2>
          <p className="text-muted-foreground">
            Connect with the fashion community and discover trending styles
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-xl border bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Heart className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">Like & Share</h3>
              <p className="text-sm text-muted-foreground">Engage with community posts</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold">Comment</h3>
              <p className="text-sm text-muted-foreground">Join style conversations</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Share2 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold">Share Your Style</h3>
              <p className="text-sm text-muted-foreground">Post your fashion looks</p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Button 
          size="lg"
          onClick={() => navigate('/fashion-feed')}
          className="px-8"
        >
          <Users className="h-4 w-4 mr-2" />
          Explore Feed
        </Button>
      </div>
    </div>
  );
}
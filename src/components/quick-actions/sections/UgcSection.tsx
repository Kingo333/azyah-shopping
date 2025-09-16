import { Button } from "@/components/ui/button";
import { Users, Camera, DollarSign, Star } from "lucide-react";

export default function UgcSection() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full">
          <Users className="h-8 w-8 text-purple-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">UGC Collaborations</h2>
          <p className="text-muted-foreground">
            Partner with brands to create user-generated content and earn rewards
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-xl border bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Camera className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold">Create Content</h3>
              <p className="text-sm text-muted-foreground">Share authentic brand experiences</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold">Earn Rewards</h3>
              <p className="text-sm text-muted-foreground">Get paid for quality content</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
              <Star className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold">Build Portfolio</h3>
              <p className="text-sm text-muted-foreground">Showcase your creative work</p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          Join our creator community and start collaborating with top fashion brands
        </p>
        <div className="flex gap-3 justify-center">
          <Button size="lg" className="px-8">
            <Users className="h-4 w-4 mr-2" />
            Browse Collaborations
          </Button>
          <Button variant="outline" size="lg" className="px-8">
            Apply to Create
          </Button>
        </div>
      </div>
    </div>
  );
}
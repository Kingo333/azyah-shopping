import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Heart, Star, ShoppingCart } from "lucide-react";

export default function WishlistSection() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gradient-to-br from-pink-500/10 to-red-500/10 rounded-full">
          <ShoppingBag className="h-8 w-8 text-pink-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Your Wishlist</h2>
          <p className="text-muted-foreground">
            Save and organize items you love for easy shopping later
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-xl border bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-500/10 rounded-lg flex items-center justify-center">
              <Heart className="h-5 w-5 text-pink-600" />
            </div>
            <div>
              <h3 className="font-semibold">Save Favorites</h3>
              <p className="text-sm text-muted-foreground">Keep track of items you love</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
              <Star className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold">Price Tracking</h3>
              <p className="text-sm text-muted-foreground">Get notified of price drops</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold">Quick Purchase</h3>
              <p className="text-sm text-muted-foreground">Buy saved items when ready</p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Button 
          size="lg"
          onClick={() => navigate('/wishlist')}
          className="px-8"
        >
          <ShoppingBag className="h-4 w-4 mr-2" />
          View Wishlist
        </Button>
      </div>
    </div>
  );
}
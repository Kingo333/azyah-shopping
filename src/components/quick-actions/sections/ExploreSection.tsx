import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, Filter, Eye, TrendingUp } from "lucide-react";

export default function ExploreSection() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gradient-to-br from-blue-500/10 to-teal-500/10 rounded-full">
          <Search className="h-8 w-8 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Explore Fashion</h2>
          <p className="text-muted-foreground">
            Discover products from top brands with advanced search and filters
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-xl border bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Search className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">Smart Search</h3>
              <p className="text-sm text-muted-foreground">Find exactly what you want</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Filter className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold">Advanced Filters</h3>
              <p className="text-sm text-muted-foreground">Sort by price, brand, style</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Eye className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold">Visual Search</h3>
              <p className="text-sm text-muted-foreground">Search using images</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold">Trending</h3>
              <p className="text-sm text-muted-foreground">Popular right now</p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Button 
          size="lg"
          onClick={() => navigate('/explore')}
          className="px-8"
        >
          <Search className="h-4 w-4 mr-2" />
          Start Exploring
        </Button>
      </div>
    </div>
  );
}
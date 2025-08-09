
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { FeatureFlagsProvider } from "@/contexts/FeatureFlagsContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Swipe from "./pages/Swipe";
import Feed from "./pages/Feed";
import UserProfile from "./pages/UserProfile";
import ProfileSettings from "./pages/ProfileSettings";
import BrandPortal from "./pages/BrandPortal";
import RetailerPortal from "./pages/RetailerPortal";
import Analytics from "./pages/Analytics";
import Affiliate from "./pages/Affiliate";
import TopInfluencers from "./pages/TopInfluencers";
import TrendingStyles from "./pages/TrendingStyles";
import FeaturedBrands from "./pages/FeaturedBrands";
import Explore from "./pages/Explore";
import Forum from "./pages/Forum";
import Likes from "./pages/Likes";
import Wishlist from "./pages/Wishlist";
import Closets from "./pages/Closets";
import ShoppingCart from "./pages/ShoppingCart";
import FashionFeed from "./pages/FashionFeed";
import ARTryOn from "./pages/ARTryOn";
import ImageSearch from "./pages/ImageSearch";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <FeatureFlagsProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/swipe"
                  element={
                    <ProtectedRoute>
                      <Swipe />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/feed"
                  element={
                    <ProtectedRoute>
                      <Feed />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile/:userId"
                  element={
                    <ProtectedRoute>
                      <UserProfile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile-settings"
                  element={
                    <ProtectedRoute>
                      <ProfileSettings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/brand-portal"
                  element={
                    <ProtectedRoute>
                      <BrandPortal />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/retailer-portal"
                  element={
                    <ProtectedRoute>
                      <RetailerPortal />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute>
                      <Analytics />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/affiliate"
                  element={
                    <ProtectedRoute>
                      <Affiliate />
                    </ProtectedRoute>
                  }
                />
                <Route path="/top-influencers" element={<TopInfluencers />} />
                <Route path="/trending-styles" element={<TrendingStyles />} />
                <Route path="/featured-brands" element={<FeaturedBrands />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/forum" element={<Forum />} />
                <Route
                  path="/likes"
                  element={
                    <ProtectedRoute>
                      <Likes />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/wishlist"
                  element={
                    <ProtectedRoute>
                      <Wishlist />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/closets"
                  element={
                    <ProtectedRoute>
                      <Closets />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cart"
                  element={
                    <ProtectedRoute>
                      <ShoppingCart />
                    </ProtectedRoute>
                  }
                />
                <Route path="/fashion-feed" element={<FashionFeed />} />
                {/* AR Try-On route - will be deprecated */}
                <Route
                  path="/ar-tryOn"
                  element={
                    <ProtectedRoute>
                      <ARTryOn />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/image-search"
                  element={
                    <ProtectedRoute>
                      <ImageSearch />
                    </ProtectedRoute>
                  }
                />
                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </BrowserRouter>
          </FeatureFlagsProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

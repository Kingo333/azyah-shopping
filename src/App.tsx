import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Swipe from "./pages/Swipe";
import Feed from "./pages/Feed";
import FashionFeed from "./pages/FashionFeed";
import Explore from "./pages/Explore";
import Wishlist from "./pages/Wishlist";
import Likes from "./pages/Likes";
import ShoppingCart from "./pages/ShoppingCart";
import ARTryOn from "./pages/ARTryOn";
import BrandPortal from "./pages/BrandPortal";
import RetailerPortal from "./pages/RetailerPortal";
import Affiliate from "./pages/Affiliate";
import Forum from "./pages/Forum";
import Closets from "./pages/Closets";
import Landing from "./pages/Landing";
import ProfileSettings from "./pages/ProfileSettings";
import ImageSearch from "./pages/ImageSearch";
import TrendingStyles from "./pages/TrendingStyles";
import TopInfluencers from "./pages/TopInfluencers";
import FeaturedBrands from "./pages/FeaturedBrands";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
          <AuthProvider>
            <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/swipe" element={
              <ProtectedRoute roles={['shopper', 'admin']}>
                <Swipe />
              </ProtectedRoute>
            } />
            <Route path="/explore" element={
              <ProtectedRoute roles={['shopper', 'admin']}>
                <Explore />
              </ProtectedRoute>
            } />
            <Route path="/trending-styles" element={
              <ProtectedRoute roles={['shopper', 'admin']}>
                <TrendingStyles />
              </ProtectedRoute>
            } />
            <Route path="/top-influencers" element={
              <ProtectedRoute roles={['shopper', 'admin']}>
                <TopInfluencers />
              </ProtectedRoute>
            } />
            <Route path="/featured-brands" element={
              <ProtectedRoute roles={['shopper', 'admin']}>
                <FeaturedBrands />
              </ProtectedRoute>
            } />
            <Route path="/wishlist" element={
              <ProtectedRoute roles={['shopper', 'admin']}>
                <Wishlist />
              </ProtectedRoute>
            } />
            <Route path="/likes" element={
              <ProtectedRoute roles={['shopper', 'admin']}>
                <Likes />
              </ProtectedRoute>
            } />
            <Route path="/affiliate" element={
              <ProtectedRoute roles={['shopper', 'admin']}>
                <Affiliate />
              </ProtectedRoute>
            } />
            <Route path="/forum" element={
              <ProtectedRoute roles={['shopper', 'admin']}>
                <Forum />
              </ProtectedRoute>
            } />
            <Route path="/fashion-feed" element={
              <ProtectedRoute roles={['shopper', 'admin']}>
                <FashionFeed />
              </ProtectedRoute>
            } />
            <Route path="/profile-settings" element={
              <ProtectedRoute>
                <ProfileSettings />
              </ProtectedRoute>
            } />
            <Route path="/image-search" element={
              <ProtectedRoute roles={['shopper', 'admin']}>
                <ImageSearch />
              </ProtectedRoute>
            } />
            <Route path="/ar-tryOn" element={
              <ProtectedRoute roles={['shopper', 'admin']}>
                <ARTryOn />
              </ProtectedRoute>
            } />
            <Route path="/brand-portal" element={
              <ProtectedRoute roles={['brand', 'admin']}>
                <BrandPortal />
              </ProtectedRoute>
            } />
            <Route path="/retailer-portal" element={
              <ProtectedRoute roles={['retailer', 'admin']}>
                <RetailerPortal />
              </ProtectedRoute>
            } />
            <Route path="/cart" element={
              <ProtectedRoute roles={['shopper', 'admin']}>
                <ShoppingCart />
              </ProtectedRoute>
            } />
            <Route path="/closets" element={
              <ProtectedRoute roles={['shopper', 'admin']}>
                <Closets />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </TooltipProvider>
</QueryClientProvider>
);

export default App;

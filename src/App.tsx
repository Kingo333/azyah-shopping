
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { FeatureFlagsProvider } from '@/contexts/FeatureFlagsContext';

import Index from './pages/Index';
import Auth from './pages/Auth';
import Landing from './pages/Landing';
import UserProfile from './pages/UserProfile';
import ProfileSettings from './pages/ProfileSettings';
import Swipe from './pages/Swipe';
import Wishlist from './pages/Wishlist';
import Likes from './pages/Likes';
import ShoppingCart from './pages/ShoppingCart';
import Closets from './pages/Closets';
import Feed from './pages/Feed';
import FashionFeed from './pages/FashionFeed';
import Forum from './pages/Forum';
import Explore from './pages/Explore';
import TrendingStyles from './pages/TrendingStyles';
import FeaturedBrands from './pages/FeaturedBrands';
import TopInfluencers from './pages/TopInfluencers';
import ImageSearch from './pages/ImageSearch';
import Affiliate from './pages/Affiliate';
import Analytics from './pages/Analytics';
import BrandPortal from './pages/BrandPortal';
import RetailerPortal from './pages/RetailerPortal';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FeatureFlagsProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/dashboard" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile/:userId" element={<UserProfile />} />
              <Route path="/settings" element={<ProfileSettings />} />
              <Route path="/swipe" element={<Swipe />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/likes" element={<Likes />} />
              <Route path="/cart" element={<ShoppingCart />} />
              <Route path="/closets" element={<Closets />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/fashion-feed" element={<FashionFeed />} />
              <Route path="/forum" element={<Forum />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/trending-styles" element={<TrendingStyles />} />
              <Route path="/featured-brands" element={<FeaturedBrands />} />
              <Route path="/top-influencers" element={<TopInfluencers />} />
              <Route path="/image-search" element={<ImageSearch />} />
              <Route path="/affiliate" element={<Affiliate />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/brand-portal" element={<BrandPortal />} />
              <Route path="/retailer-portal" element={<RetailerPortal />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
          <Toaster />
        </FeatureFlagsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

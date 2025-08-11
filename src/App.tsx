
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { AccessibilityProvider } from '@/contexts/AccessibilityProvider';
import { FeatureFlagsProvider } from '@/contexts/FeatureFlagsContext';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { GDPRCompliance } from '@/components/GDPRCompliance';
import Landing from '@/pages/Landing';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Feed from '@/pages/Feed';
import FashionFeed from '@/pages/FashionFeed';
import Forum from '@/pages/Forum';
import TopInfluencers from '@/pages/TopInfluencers';
import TrendingStyles from '@/pages/TrendingStyles';
import Explore from '@/pages/Explore';
import Swipe from '@/pages/Swipe';
import Closets from '@/pages/Closets';
import Wishlist from '@/pages/Wishlist';
import Likes from '@/pages/Likes';
import UserProfile from '@/pages/UserProfile';
import ProfileSettings from '@/pages/ProfileSettings';
import ShoppingCart from '@/pages/ShoppingCart';
import RetailerPortal from '@/pages/RetailerPortal';
import BrandPortal from '@/pages/BrandPortal';
import Affiliate from '@/pages/Affiliate';
import FeaturedBrands from '@/pages/FeaturedBrands';
import ImageSearch from '@/pages/ImageSearch';
import ARTryOn from '@/pages/ARTryOn';
import Analytics from '@/pages/Analytics';
import AiStudio from '@/pages/AiStudio';
import AiStudioTest from '@/pages/AiStudioTest';
import NotFound from '@/pages/NotFound';
import ProtectedRoute from '@/components/ProtectedRoute';
import './App.css';

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
    <HelmetProvider>
      <div className="App">
        <Helmet>
          <title>Azyah - Fashion Discovery Platform</title>
          <meta name="description" content="Discover, share, and shop the latest fashion trends with AI-powered recommendations." />
        </Helmet>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AccessibilityProvider>
              <FeatureFlagsProvider>
                <Router>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/landing" element={<Landing />} />
                    <Route path="/auth" element={<Auth />} />
                    
                    {/* Protected routes */}
                    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                    <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
                    <Route path="/fashion-feed" element={<ProtectedRoute><FashionFeed /></ProtectedRoute>} />
                    <Route path="/forum" element={<ProtectedRoute><Forum /></ProtectedRoute>} />
                    <Route path="/top-influencers" element={<ProtectedRoute><TopInfluencers /></ProtectedRoute>} />
                    <Route path="/trending-styles" element={<ProtectedRoute><TrendingStyles /></ProtectedRoute>} />
                    <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
                    <Route path="/swipe" element={<ProtectedRoute><Swipe /></ProtectedRoute>} />
                    <Route path="/closets" element={<ProtectedRoute><Closets /></ProtectedRoute>} />
                    <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
                    <Route path="/likes" element={<ProtectedRoute><Likes /></ProtectedRoute>} />
                    <Route path="/profile/:userId" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
                    <Route path="/profile-settings" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
                    <Route path="/cart" element={<ProtectedRoute><ShoppingCart /></ProtectedRoute>} />
                    <Route path="/retailer" element={<ProtectedRoute><RetailerPortal /></ProtectedRoute>} />
                    <Route path="/brand" element={<ProtectedRoute><BrandPortal /></ProtectedRoute>} />
                    <Route path="/affiliate" element={<ProtectedRoute><Affiliate /></ProtectedRoute>} />
                    <Route path="/featured-brands" element={<ProtectedRoute><FeaturedBrands /></ProtectedRoute>} />
                    <Route path="/image-search" element={<ProtectedRoute><ImageSearch /></ProtectedRoute>} />
                    <Route path="/ar-try-on" element={<ProtectedRoute><ARTryOn /></ProtectedRoute>} />
                    <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                    <Route path="/ai-studio" element={<ProtectedRoute><AiStudio /></ProtectedRoute>} />
                    <Route path="/ai-studio-test" element={<ProtectedRoute><AiStudioTest /></ProtectedRoute>} />
                    
                    {/* Catch all route */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Router>
                <GDPRCompliance />
                <Toaster />
              </FeatureFlagsProvider>
            </AccessibilityProvider>
          </AuthProvider>
        </QueryClientProvider>
      </div>
    </HelmetProvider>
  );
}

export default App;

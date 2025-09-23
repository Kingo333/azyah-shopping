import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { FeatureFlagsProvider } from '@/contexts/FeatureFlagsContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useSessionMonitor } from '@/hooks/useSessionMonitor';

import Index from './pages/Index';
import Auth from './pages/Auth';

import SelectRole from './pages/SelectRole';
import Landing from './pages/Landing';
import UserProfile from './pages/UserProfile';
import ProfileSettings from './pages/ProfileSettings';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailed from './pages/PaymentFailed';
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
import BrandDetail from './pages/BrandDetail';
import TopInfluencers from './pages/TopInfluencers';
import ImageSearch from './pages/ImageSearch';
import Affiliate from './pages/Affiliate';
import ToyReplica from './pages/ToyReplica';
import BeautyConsultant from './pages/BeautyConsultant';
import Events from './pages/Events';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';


import BrandPortal from './pages/BrandPortal';
import RetailerPortal from './pages/RetailerPortal';
import RetailerBrandDetail from './pages/RetailerBrandDetail';
import NotFound from './pages/NotFound';
import PhotoCloseup from './components/PhotoCloseup';
import UserDeletionTool from './components/UserDeletionTool';

import { DebugHealthPage } from './components/DebugHealthPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function AppContent() {
  useSessionMonitor();
  return (
    <>
      <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  } />
                  <Route path="/auth" element={<Auth />} />
                  
                  
                  <Route path="/select-role" element={<SelectRole />} />
                  <Route path="/profile/:userId" element={
                    <ProtectedRoute>
                      <UserProfile />
                    </ProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <ProfileSettings />
                    </ProtectedRoute>
                  } />
                  {/* Payment routes */}
                  <Route path="/payment-success" element={<PaymentSuccess />} />
                  <Route path="/payment-cancel" element={<PaymentFailed />} />
                  <Route path="/payment-failed" element={<PaymentFailed />} />
                  <Route path="/swipe" element={
                    <ProtectedRoute roles={['shopper', 'admin']}>
                      <Swipe />
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
                  <Route path="/feed" element={
                    <ProtectedRoute roles={['shopper', 'admin']}>
                      <Feed />
                    </ProtectedRoute>
                  } />
                  <Route path="/fashion-feed" element={
                    <ProtectedRoute roles={['shopper', 'admin']}>
                      <FashionFeed />
                    </ProtectedRoute>
                  } />
                  <Route path="/forum" element={
                    <ProtectedRoute roles={['shopper', 'admin']}>
                      <Forum />
                    </ProtectedRoute>
                  } />
                  <Route path="/explore" element={
                    <ProtectedRoute>
                      <Explore />
                    </ProtectedRoute>
                  } />
                  <Route path="/trending-styles" element={<TrendingStyles />} />
                  <Route path="/featured-brands" element={<FeaturedBrands />} />
                  <Route path="/brand/:slug" element={<BrandDetail />} />
                  <Route path="/top-influencers" element={<TopInfluencers />} />
                  <Route path="/image-search" element={
                    <ProtectedRoute roles={['shopper', 'admin']}>
                      <ImageSearch />
                    </ProtectedRoute>
                  } />
                  <Route path="/affiliate" element={
                    <ProtectedRoute>
                      <Affiliate />
                    </ProtectedRoute>
                  } />
                  <Route path="/toy-replica" element={
                    <ProtectedRoute roles={['shopper', 'admin']}>
                      <ToyReplica />
                    </ProtectedRoute>
                  } />
                  <Route path="/beauty-consultant" element={
                    <ProtectedRoute roles={['shopper', 'admin']}>
                      <BeautyConsultant />
                    </ProtectedRoute>
                  } />
                  <Route path="/events" element={
                    <ProtectedRoute roles={['shopper', 'admin']}>
                      <Events />
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
                  <Route path="/retailer-portal/brands/:brandId" element={
                    <ProtectedRoute roles={['retailer', 'admin']}>
                      <RetailerBrandDetail />
                    </ProtectedRoute>
                  } />
                  <Route path="/p/:id" element={
                    <ProtectedRoute roles={['shopper', 'admin']}>
                      <PhotoCloseup />
                    </ProtectedRoute>
                  } />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  
                  <Route path="/admin/delete-user" element={
                    <ProtectedRoute roles={['admin']}>
                      <UserDeletionTool />
                    </ProtectedRoute>
                  } />
                  <Route path="/debug/health" element={<DebugHealthPage />} />
                  <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={true}
          disableTransitionOnChange={false}
        >
          <AuthProvider>
            <FeatureFlagsProvider>
              <Router>
                <AppContent />
              </Router>
            </FeatureFlagsProvider>
          </AuthProvider>
        </ThemeProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;

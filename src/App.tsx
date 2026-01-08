import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { FeatureFlagsProvider } from '@/contexts/FeatureFlagsContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import AuthAwareRoute from '@/components/AuthAwareRoute';
import { useSessionMonitor } from '@/hooks/useSessionMonitor';
import { useAuthNavigation } from '@/hooks/useAuthNavigation';
import { useDeepLinkHandler } from '@/hooks/useDeepLinkHandler';

import Index from './pages/Index';
import Landing from './pages/Landing';
import UserProfile from './pages/UserProfile';
import ProfileSettings from './pages/ProfileSettings';
import Swipe from './pages/Swipe';
import Wishlist from './pages/Wishlist';
import Likes from './pages/Likes';
import ShoppingCart from './pages/ShoppingCart';
import DressMe from './pages/DressMe';
import DressMeWardrobe from './pages/DressMeWardrobe';
import DressMeCanvas from './pages/DressMeCanvas';
import DressMeCommunity from './pages/DressMeCommunity';
import Community from './pages/Community';
import OutfitDetail from './pages/OutfitDetail';
import ClothingItemDetail from './pages/ClothingItemDetail';
import DressMeOutfitDetail from './pages/DressMeOutfitDetail';
import Feed from './pages/Feed';
import FashionFeed from './pages/FashionFeed';
import Forum from './pages/Forum';
import Explore from './pages/Explore';
import TrendingStyles from './pages/TrendingStyles';
import FeaturedBrands from './pages/FeaturedBrands';
import BrandDetail from './pages/BrandDetail';
import Affiliate from './pages/Affiliate';
import BeautyConsultant from './pages/BeautyConsultant';
import Events from './pages/Events';
import UGCCollaborations from './pages/UGCCollaborations';
import Favorites from './pages/Favorites';
import Upgrade from './pages/dashboard/Upgrade';
import Rewards from './pages/Rewards';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';


import BrandPortal from './pages/BrandPortal';
import RetailerPortal from './pages/RetailerPortal';
import RetailerBrandDetail from './pages/RetailerBrandDetail';
import NotFound from './pages/NotFound';
import PhotoCloseup from './components/PhotoCloseup';
import UserDeletionTool from './components/UserDeletionTool';
import PublicOutfitView from './pages/PublicOutfitView';
import PublicItemView from './pages/PublicItemView';
import StyleLinkPage from './pages/StyleLinkPage';

import { DebugHealthPage } from './components/DebugHealthPage';
import { BottomNavigation } from './components/BottomNavigation';
import { StatusBarScrim } from './components/StatusBarScrim';

// Onboarding pages
import IntroCarousel from './pages/onboarding/IntroCarousel';
import SignUp from './pages/onboarding/SignUp';
import ResetPasswordRequest from './pages/ResetPasswordRequest';
import ResetPassword from './pages/ResetPassword';
import AuthCallback from './pages/AuthCallback';

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
  useAuthNavigation(); // Set up soft navigation for auth recovery
  useDeepLinkHandler(); // Handle deep links for Capacitor iOS/Android
  return (
    <>
      <StatusBarScrim />
      <Routes>
                  {/* Root route - show IntroCarousel only if NOT authenticated */}
                  <Route path="/" element={
                    <AuthAwareRoute redirectAuthenticatedTo="dashboard">
                      <IntroCarousel />
                    </AuthAwareRoute>
                  } />
                  <Route path="/landing" element={<Landing />} />
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard/upgrade" element={
                    <ProtectedRoute>
                      <Upgrade />
                    </ProtectedRoute>
                  } />
                  <Route path="/rewards" element={
                    <ProtectedRoute>
                      <Rewards />
                    </ProtectedRoute>
                  } />
                  
                  {/* Onboarding routes - redirect authenticated users away */}
                  <Route path="/onboarding/intro" element={
                    <AuthAwareRoute redirectAuthenticatedTo="dashboard">
                      <IntroCarousel />
                    </AuthAwareRoute>
                  } />
                  <Route path="/onboarding/signup" element={
                    <AuthAwareRoute redirectAuthenticatedTo="dashboard">
                      <SignUp />
                    </AuthAwareRoute>
                  } />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/reset-password-request" element={<ResetPasswordRequest />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  
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
                  <Route path="/swipe" element={
                    <ProtectedRoute roles={['shopper', 'admin']}>
                      <Swipe />
                    </ProtectedRoute>
                  } />
                  <Route path="/favorites" element={
                    <ProtectedRoute roles={['shopper', 'admin']}>
                      <Favorites />
                    </ProtectedRoute>
                  } />
                  <Route path="/wishlist" element={<Navigate to="/favorites?tab=wishlist" replace />} />
                  <Route path="/likes" element={<Navigate to="/favorites?tab=likes" replace />} />
                  <Route path="/cart" element={
                    <ProtectedRoute roles={['shopper', 'admin']}>
                      <ShoppingCart />
                    </ProtectedRoute>
                  } />
                  <Route path="/dress-me" element={
                    <ProtectedRoute roles={['shopper', 'admin']}>
                      <DressMeWardrobe />
                    </ProtectedRoute>
                  } />
                  <Route path="/dress-me/wardrobe" element={
                    <ProtectedRoute roles={['shopper', 'admin']}>
                      <DressMeWardrobe />
                    </ProtectedRoute>
                  } />
                  <Route path="/dress-me/canvas" element={
                    <ProtectedRoute roles={['shopper', 'admin']}>
                      <DressMeCanvas />
                    </ProtectedRoute>
                  } />
                  <Route path="/dress-me/community" element={
                    <ProtectedRoute roles={['shopper', 'admin']}>
                      <DressMeCommunity />
                    </ProtectedRoute>
                  } />
                  <Route path="/dress-me/outfit/:id" element={
                    <ProtectedRoute roles={['shopper', 'admin']}>
                      <DressMeOutfitDetail />
                    </ProtectedRoute>
                  } />
                  <Route path="/community" element={<Community />} />
                  <Route path="/community/outfit/:id" element={<OutfitDetail />} />
                  <Route path="/community/item/:id" element={<ClothingItemDetail />} />
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
                  <Route path="/affiliate" element={
                    <ProtectedRoute>
                      <Affiliate />
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
                  <Route path="/ugc" element={
                    <ProtectedRoute roles={['shopper', 'brand', 'retailer', 'admin']}>
                      <UGCCollaborations />
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
                  
                  {/* Public share routes - SLUG ONLY (no UUIDs) */}
                  <Route path="/share/outfit/:slug" element={<PublicOutfitView />} />
                  <Route path="/share/item/:slug" element={<PublicItemView />} />
                  
                  {/* Style Link page - public profile with outfits */}
                  <Route path="/u/:username" element={<StyleLinkPage />} />
                  
                  <Route path="/admin/delete-user" element={
                    <ProtectedRoute roles={['admin']}>
                      <UserDeletionTool />
                    </ProtectedRoute>
                  } />
                  <Route path="/debug/health" element={<DebugHealthPage />} />
                  <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
      <SonnerToaster position="top-center" />
      <BottomNavigation />
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

import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import { useTryOnJobMonitor } from '@/hooks/useTryOnJobMonitor';
import { lazyPage } from '@/lib/lazyPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppNavigation, NavV2Gate } from './components/nav/NavV2Gate';
import { DesignV3Root } from './components/DesignV3Root';
import { LiveCamHostProvider } from './components/live/LiveCamHost';
import { StatusBarScrim } from './components/StatusBarScrim';

// Pages load on demand (smaller first download); see src/lib/lazyPage.ts.
const Index = lazyPage(() => import('./pages/Index'));
const Landing = lazyPage(() => import('./pages/Landing'));
const UserProfile = lazyPage(() => import('./pages/UserProfile'));
const ProfileSettings = lazyPage(() => import('./pages/ProfileSettings'));
const Swipe = lazyPage(() => import('./pages/Swipe'));
const Wishlist = lazyPage(() => import('./pages/Wishlist'));
const Likes = lazyPage(() => import('./pages/Likes'));
const ShoppingCart = lazyPage(() => import('./pages/ShoppingCart'));
const DressMe = lazyPage(() => import('./pages/DressMe'));
const DressMeWardrobe = lazyPage(() => import('./pages/DressMeWardrobe'));
const DressMeCanvas = lazyPage(() => import('./pages/DressMeCanvas'));
const DressMeCommunity = lazyPage(() => import('./pages/DressMeCommunity'));
const Community = lazyPage(() => import('./pages/Community'));
const OutfitDetail = lazyPage(() => import('./pages/OutfitDetail'));
const ClothingItemDetail = lazyPage(() => import('./pages/ClothingItemDetail'));
const DressMeOutfitDetail = lazyPage(() => import('./pages/DressMeOutfitDetail'));
const Feed = lazyPage(() => import('./pages/Feed'));
const FashionFeed = lazyPage(() => import('./pages/FashionFeed'));
const Forum = lazyPage(() => import('./pages/Forum'));
const Explore = lazyPage(() => import('./pages/Explore'));
const TrendingStyles = lazyPage(() => import('./pages/TrendingStyles'));
const FeaturedBrands = lazyPage(() => import('./pages/FeaturedBrands'));
const BrandDetail = lazyPage(() => import('./pages/BrandDetail'));
const Affiliate = lazyPage(() => import('./pages/Affiliate'));

const Events = lazyPage(() => import('./pages/Events'));
const UGCCollaborations = lazyPage(() => import('./pages/UGCCollaborations'));
const Favorites = lazyPage(() => import('./pages/Favorites'));
const Upgrade = lazyPage(() => import('./pages/dashboard/Upgrade'));
const Rewards = lazyPage(() => import('./pages/Rewards'));
const Terms = lazyPage(() => import('./pages/Terms'));
const Privacy = lazyPage(() => import('./pages/Privacy'));
const CookiePolicy = lazyPage(() => import('./pages/CookiePolicy'));


const BrandPortal = lazyPage(() => import('./pages/BrandPortal'));
const RetailerPortal = lazyPage(() => import('./pages/RetailerPortal'));
const RetailerBrandDetail = lazyPage(() => import('./pages/RetailerBrandDetail'));
const NotFound = lazyPage(() => import('./pages/NotFound'));
const PhotoCloseup = lazyPage(() => import('./components/PhotoCloseup'));
const UserDeletionTool = lazyPage(() => import('./components/UserDeletionTool'));
const PartnerApprovals = lazyPage(() => import('./pages/admin/PartnerApprovals'));
const PublicOutfitView = lazyPage(() => import('./pages/PublicOutfitView'));
const PublicItemView = lazyPage(() => import('./pages/PublicItemView'));
const StyleLinkPage = lazyPage(() => import('./pages/StyleLinkPage'));
const PublicDealsPage = lazyPage(() => import('./pages/PublicDealsPage'));
const AffiliateRedirect = lazyPage(() => import('./pages/AffiliateRedirect'));
const ARExperience = lazyPage(() => import('./pages/ARExperience'));

const DebugHealthPage = lazyPage(() => import('./components/DebugHealthPage').then((m) => ({ default: m.DebugHealthPage })));

// Onboarding pages
const IntroCarousel = lazyPage(() => import('./pages/onboarding/IntroCarousel'));
const SignUp = lazyPage(() => import('./pages/onboarding/SignUp'));
const ResetPasswordRequest = lazyPage(() => import('./pages/ResetPasswordRequest'));
const ResetPassword = lazyPage(() => import('./pages/ResetPassword'));
const AuthCallback = lazyPage(() => import('./pages/AuthCallback'));
const OnboardingCalibration = lazyPage(() => import('./pages/OnboardingCalibration'));
const ExtensionAuth = lazyPage(() => import('./pages/ExtensionAuth'));
const OAuthConsent = lazyPage(() => import('./pages/OAuthConsent'));
const Profile = lazyPage(() => import('./pages/Profile'));
const TryOn = lazyPage(() => import('./pages/TryOn'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes garbage collection
      retry: 1,
      refetchOnWindowFocus: false, // Reduce background refetches
    },
  },
});

function PageLoading() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center" role="status" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}

// /discover (navigation v2 links) is the swipe feed; keep the query.
function DiscoverRedirect() {
  const { search } = useLocation();
  return <Navigate to={'/swipe' + search} replace />;
}

function AppContent() {
  useSessionMonitor();
  useAuthNavigation(); // Set up soft navigation for auth recovery
  useDeepLinkHandler(); // Handle deep links for Capacitor iOS/Android
  useTryOnJobMonitor(); // Monitor background try-on jobs and notify on completion
  return (
    <LiveCamHostProvider>
      <DesignV3Root />
      <StatusBarScrim />
      <Suspense fallback={<PageLoading />}>
      <Routes>
                  {/* Root route - show IntroCarousel only if NOT authenticated */}
                  <Route path="/" element={
                    <AuthAwareRoute redirectAuthenticatedTo="dashboard">
                      <IntroCarousel />
                    </AuthAwareRoute>
                  } />
                  <Route path="/landing" element={<Landing />} />
                  {/* Profile page - new primary route for user profile/insights */}
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />
                  {/* Dashboard redirects to profile for backward compatibility */}
                  <Route path="/dashboard" element={<Navigate to="/profile" replace />} />
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
                  <Route path="/onboarding-calibration" element={
                    <ProtectedRoute>
                      <OnboardingCalibration />
                    </ProtectedRoute>
                  } />
                  <Route path="/reset-password-request" element={<ResetPasswordRequest />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/extension-auth" element={<ExtensionAuth />} />
                  
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
                    <NavV2Gate>
                      <ProtectedRoute roles={['shopper', 'admin']}>
                        <DressMeCommunity />
                      </ProtectedRoute>
                    </NavV2Gate>
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
                    <NavV2Gate>
                      <ProtectedRoute roles={['shopper', 'admin']}>
                        <Feed />
                      </ProtectedRoute>
                    </NavV2Gate>
                  } />
                  <Route path="/fashion-feed" element={
                    <NavV2Gate>
                      <ProtectedRoute roles={['shopper', 'admin']}>
                        <FashionFeed />
                      </ProtectedRoute>
                    </NavV2Gate>
                  } />
                  <Route path="/forum" element={
                    <NavV2Gate>
                      <ProtectedRoute roles={['shopper', 'admin']}>
                        <Forum />
                      </ProtectedRoute>
                    </NavV2Gate>
                  } />
                  <Route path="/explore" element={
                    <ProtectedRoute>
                      <Explore />
                    </ProtectedRoute>
                  } />
                  {/* Navigation v2 (off unless this device opted in with ?nav_v2=1) */}
                  <Route path="/discover" element={<DiscoverRedirect />} />
                  <Route path="/try-on" element={
                    <ProtectedRoute roles={['shopper', 'admin']}>
                      <TryOn />
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
                  <Route path="/cookies" element={<CookiePolicy />} />

                  {/* Public share routes - SLUG ONLY (no UUIDs) */}
                  <Route path="/share/outfit/:slug" element={<PublicOutfitView />} />
                  <Route path="/share/item/:slug" element={<PublicItemView />} />
                  
                  {/* Style Link page - disabled via feature flag, redirect to profile */}
                  <Route path="/u/:username" element={<Navigate to="/profile" replace />} />
                  <Route path="/u/:username/deals" element={<Navigate to="/profile" replace />} />
                  
                  {/* Legacy affiliate route - resolve username and redirect to deals */}
                  <Route path="/affiliate/:userId" element={<AffiliateRedirect />} />
                  
                  {/* Admin check happens in the page and in the database
                      (the app's role lookup treats admin accounts as shoppers) */}
                  <Route path="/admin/partners" element={
                    <ProtectedRoute>
                      <PartnerApprovals />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/delete-user" element={
                    <ProtectedRoute roles={['admin']}>
                      <UserDeletionTool />
                    </ProtectedRoute>
                  } />
                  {/* AR Experience - public, accessed via QR code.
                      Wrapped in ErrorBoundary (Phase A8): any unhandled error in
                      the AR pipeline (WebGL, MediaPipe, three.js, scene init)
                      surfaces a friendly retry/home fallback instead of a
                      blank screen or stuck loading. */}
                  <Route
                    path="/ar/:eventId/:brandId"
                    element={
                      <ErrorBoundary>
                        <ARExperience />
                      </ErrorBoundary>
                    }
                  />
                  {/* Phase C local dev/test entry: bypasses Supabase when paired
                      with ?testMesh=/test-assets/<file>.glb. */}
                  <Route
                    path="/ar/test"
                    element={
                      <ErrorBoundary>
                        <ARExperience />
                      </ErrorBoundary>
                    }
                  />
                  <Route path="/oauth/consent" element={<OAuthConsent />} />
                  <Route path="/debug/health" element={<DebugHealthPage />} />
                  <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      <Toaster />
      <SonnerToaster position="top-center" />
      <AppNavigation />
    </LiveCamHostProvider>
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

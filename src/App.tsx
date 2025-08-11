
import React from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
} from 'react-router-dom';
import { ThemeProvider } from '@/components/theme-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AccessibilityProvider } from '@/components/AccessibilityProvider';
import { ErrorBoundary } from 'react-error-boundary';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthContext';
import { FeatureFlagsProvider } from './contexts/FeatureFlagsContext';

import { GDPRCompliance } from '@/components/GDPRCompliance';
import Home from '@/pages/Home';
import Dashboard from '@/pages/Dashboard';
import Pricing from '@/pages/Pricing';
import Contact from '@/pages/Contact';
import Legal from '@/pages/Legal';
import Profile from '@/pages/Profile';
import Auth from '@/pages/Auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleRoute from '@/components/RoleRoute';
import AdminDashboard from '@/pages/AdminDashboard';
import AiStudioTest from '@/pages/AiStudioTest';
import AiStudio from '@/pages/AiStudio';

const queryClient = new QueryClient();

function App() {
  return (
    <Router>
      <AuthProvider>
        <FeatureFlagsProvider>
          <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <HelmetProvider>
              <QueryClientProvider client={queryClient}>
                <AccessibilityProvider>
                  <GDPRCompliance />
                  <ErrorBoundary
                    FallbackComponent={({ error, resetErrorBoundary }) => (
                      <div className="min-h-screen flex items-center justify-center">
                        <div className="text-center">
                          <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
                          <p className="text-gray-600 mb-4">{error.message}</p>
                          <button
                            onClick={resetErrorBoundary}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Try again
                          </button>
                        </div>
                      </div>
                    )}
                  >
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/legal" element={<Legal />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/dashboard" element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      } />
                      <Route path="/profile" element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      } />
                      <Route path="/admin" element={
                        <ProtectedRoute>
                          <RoleRoute roles={['admin']}>
                            <AdminDashboard />
                          </RoleRoute>
                        </ProtectedRoute>
                      } />
                      <Route path="/ai-studio" element={
                        <ProtectedRoute>
                          <AiStudio />
                        </ProtectedRoute>
                      } />
                      <Route path="/ai-studio-test" element={
                        <ProtectedRoute>
                          <AiStudioTest />
                        </ProtectedRoute>
                      } />
                    </Routes>
                    <Toaster />
                  </ErrorBoundary>
                </AccessibilityProvider>
              </QueryClientProvider>
            </HelmetProvider>
          </ThemeProvider>
        </FeatureFlagsProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

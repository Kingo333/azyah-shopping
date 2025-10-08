import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface BrandPortalProtectedRouteProps {
  children: React.ReactNode;
}

export const BrandPortalProtectedRoute: React.FC<BrandPortalProtectedRouteProps> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">Please log in to access the brand portal.</p>
          <Button 
            onClick={() => navigate('/onboarding/signup?role=brand')} 
            variant="outline"
            className="mt-4"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  // Check user role - only brand users and admins can access brand portal
  const userRole = user.user_metadata?.role;
  if (userRole && userRole !== 'brand' && userRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            Only brand users can access the brand portal.
            {userRole === 'retailer' && ' You should use the Retailer Portal instead.'}
            {userRole === 'shopper' && ' You can browse products from the main dashboard.'}
          </p>
          <div className="flex gap-2 justify-center">
            <Button 
              onClick={() => navigate('/')} 
              variant="outline"
            >
              Go to Dashboard
            </Button>
            {userRole === 'retailer' && (
              <Button 
                onClick={() => navigate('/retailer-portal')} 
                variant="default"
              >
                Go to Retailer Portal
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default BrandPortalProtectedRoute;
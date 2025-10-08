import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface RetailerPortalProtectedRouteProps {
  children: React.ReactNode;
}

export const RetailerPortalProtectedRoute: React.FC<RetailerPortalProtectedRouteProps> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">Please log in to access the retailer portal.</p>
          <Button 
            onClick={() => navigate('/onboarding/signup?role=retailer')} 
            variant="outline"
            className="mt-4"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  // Check user role - only retailer users and admins can access retailer portal
  const userRole = user.user_metadata?.role;
  if (userRole && userRole !== 'retailer' && userRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            Only retailer users can access the retailer portal.
            {userRole === 'brand' && ' You should use the Brand Portal instead.'}
            {userRole === 'shopper' && ' You can browse products from the main dashboard.'}
          </p>
          <div className="flex gap-2 justify-center">
            <Button 
              onClick={() => navigate('/')} 
              variant="outline"
            >
              Go to Dashboard
            </Button>
            {userRole === 'brand' && (
              <Button 
                onClick={() => navigate('/brand-portal')} 
                variant="default"
              >
                Go to Brand Portal
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RetailerPortalProtectedRoute;
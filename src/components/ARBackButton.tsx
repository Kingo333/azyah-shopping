
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, X } from 'lucide-react';

interface ARBackButtonProps {
  onBack?: () => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const ARBackButton: React.FC<ARBackButtonProps> = ({
  onBack,
  className = '',
  variant = 'ghost',
  size = 'sm'
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    // Call custom back handler if provided
    if (onBack) {
      onBack();
      return;
    }

    // Check if we have state with return path
    const state = location.state as any;
    if (state?.returnTo) {
      navigate(state.returnTo);
      return;
    }

    // Fallback to browser history or default route
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Default fallback routes based on current path
      if (location.pathname.includes('/ar-tryOn')) {
        navigate('/swipe');
      } else {
        navigate('/');
      }
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleBack}
      className={`fixed top-4 left-4 z-50 bg-black/20 backdrop-blur-sm hover:bg-black/40 text-white border-0 ${className}`}
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      Back
    </Button>
  );
};

export default ARBackButton;

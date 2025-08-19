import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
interface BackButtonProps {
  onBack?: () => void;
  fallbackPath?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
  showIcon?: boolean;
}
export const BackButton: React.FC<BackButtonProps> = ({
  onBack,
  fallbackPath = '/',
  variant = 'ghost',
  size = 'sm',
  className,
  children,
  showIcon = true
}) => {
  const navigate = useNavigate();
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      // Try to go back in history, fallback to specified path
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate(fallbackPath);
      }
    }
  };
  return;
};
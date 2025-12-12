import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserPlus } from 'lucide-react';

interface GuestActionPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action?: string;
}

export const GuestActionPrompt = ({ 
  open, 
  onOpenChange, 
  action = 'use this feature' 
}: GuestActionPromptProps) => {
  const navigate = useNavigate();

  const handleSignUp = () => {
    onOpenChange(false);
    navigate('/onboarding/signup');
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
          </div>
          <AlertDialogTitle className="text-center">
            Create an Account
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Sign up for free to {action}. It only takes a few seconds!
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction 
            onClick={handleSignUp}
            className="w-full rounded-full"
          >
            Sign Up Free
          </AlertDialogAction>
          <AlertDialogCancel className="w-full rounded-full mt-0">
            Maybe Later
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

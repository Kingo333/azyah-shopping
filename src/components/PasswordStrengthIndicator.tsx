
import { Check, X } from "lucide-react";
import { PasswordStrength } from "@/lib/password-validation";

interface PasswordStrengthIndicatorProps {
  strength: PasswordStrength;
  password: string;
}

export const PasswordStrengthIndicator = ({ strength, password }: PasswordStrengthIndicatorProps) => {
  if (!password) return null;

  const requirements = [
    { key: 'minLength', label: 'At least 6 characters', met: strength.minLength },
    { key: 'hasThreeTypes', label: 'Mix of 3 types: lowercase, uppercase, numbers, symbols', met: strength.hasThreeTypes },
    { key: 'notCommon', label: 'Not a common password', met: strength.notCommon }
  ];

  const strengthColors = {
    weak: 'text-red-500',
    fair: 'text-orange-500', 
    good: 'text-yellow-500',
    strong: 'text-green-500'
  };

  const getStrengthLabel = () => {
    if (strength.score <= 3) return { label: 'Weak', color: strengthColors.weak };
    if (strength.score <= 4) return { label: 'Fair', color: strengthColors.fair };
    if (strength.score <= 5) return { label: 'Good', color: strengthColors.good };
    return { label: 'Strong', color: strengthColors.strong };
  };

  const strengthInfo = getStrengthLabel();

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Password strength:</span>
        <span className={`text-sm font-medium ${strengthInfo.color}`}>
          {strengthInfo.label}
        </span>
      </div>
      
      <div className="space-y-1">
        {requirements.map((req) => (
          <div key={req.key} className="flex items-center gap-2 text-xs">
            {req.met ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <X className="h-3 w-3 text-red-500" />
            )}
            <span className={req.met ? 'text-green-600' : 'text-muted-foreground'}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

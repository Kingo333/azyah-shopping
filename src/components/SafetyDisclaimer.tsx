import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Info, CheckCircle } from 'lucide-react';

interface SafetyDisclaimerProps {
  onAccept?: () => void;
  className?: string;
}

export const SafetyDisclaimer: React.FC<SafetyDisclaimerProps> = ({ 
  onAccept, 
  className = '' 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);

  const handleAccept = () => {
    setHasAccepted(true);
    onAccept?.();
  };

  return (
    <Card className={`border-orange-200 bg-orange-50/50 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <CardTitle className="text-sm text-orange-800">Important Safety Information</CardTitle>
          {hasAccepted && (
            <Badge variant="secondary" className="ml-auto">
              <CheckCircle className="h-3 w-3 mr-1" />
              Acknowledged
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="space-y-2 text-xs text-orange-800">
          <div className="flex items-start gap-2">
            <Shield className="h-3 w-3 mt-0.5 text-orange-600" />
            <p>
              <strong>This is cosmetic advice only</strong> - not medical advice. 
              Consult a dermatologist for skin concerns or conditions.
            </p>
          </div>
          
          <div className="flex items-start gap-2">
            <Info className="h-3 w-3 mt-0.5 text-orange-600" />
            <p>
              <strong>Always patch test</strong> new products before full application 
              to check for allergic reactions.
            </p>
          </div>
          
          {isExpanded && (
            <div className="space-y-2 pt-2 border-t border-orange-200">
              <div className="flex items-start gap-2">
                <Info className="h-3 w-3 mt-0.5 text-orange-600" />
                <p>
                  <strong>Age verification:</strong> Some products may have age restrictions. 
                  Check product guidelines before purchasing.
                </p>
              </div>
              
              <div className="flex items-start gap-2">
                <Info className="h-3 w-3 mt-0.5 text-orange-600" />
                <p>
                  <strong>Individual results vary:</strong> Product performance may differ 
                  based on individual skin characteristics, application, and environmental factors.
                </p>
              </div>
              
              <div className="flex items-start gap-2">
                <Info className="h-3 w-3 mt-0.5 text-orange-600" />
                <p>
                  <strong>Ingredient awareness:</strong> Review ingredient lists for known 
                  allergens or sensitivities, especially if you have sensitive skin.
                </p>
              </div>
              
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-3 w-3 mt-0.5 text-orange-600" />
                <p>
                  <strong>Stop use immediately</strong> if you experience irritation, 
                  redness, or adverse reactions and consult a healthcare provider if needed.
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-orange-700 border-orange-300 hover:bg-orange-100"
          >
            {isExpanded ? 'Show Less' : 'Read Full Disclaimer'}
          </Button>
          
          {!hasAccepted && (
            <Button
              variant="default"
              size="sm"
              onClick={handleAccept}
              className="text-xs bg-orange-600 hover:bg-orange-700"
            >
              I Understand
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
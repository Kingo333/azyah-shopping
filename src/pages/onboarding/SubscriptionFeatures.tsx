import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, X } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';

const features = [
  { name: 'Create outfits', free: true, subscription: true },
  { name: 'Connect with community', free: true, subscription: true },
  { name: 'Unlimited wardrobe items', free: true, subscription: true },
  { name: 'Daily AI outfit suggestions', free: false, subscription: true },
  { name: 'Advanced style insights', free: false, subscription: true },
  { name: 'UGC collaboration', free: false, subscription: true },
  { name: 'Nail / Salon reward', free: false, subscription: true },
  { name: 'AI Try-on', free: 'Limited to 4 uses', subscription: true },
];

export default function SubscriptionFeatures() {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Progress Bar */}
      <div className="w-full h-1 bg-muted">
        <div className="h-full bg-foreground transition-all" style={{ width: '95%' }} />
      </div>

      {/* Back Button */}
      <div className="p-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-6 pb-6 overflow-y-auto">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold mb-2 text-foreground">
              Dress better daily with Azyah Pro
            </h1>
          </div>

          <Card className="mb-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">Feature</th>
                    <th className="text-center p-4 font-semibold">Free</th>
                    <th className="text-center p-4 font-semibold">Subscription</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((feature, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="p-4 text-sm">{feature.name}</td>
                      <td className="p-4 text-center">
                        {typeof feature.free === 'string' ? (
                          <span className="text-xs text-muted-foreground">{feature.free}</span>
                        ) : feature.free ? (
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground mx-auto" />
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {feature.subscription && (
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Button
            onClick={() => navigate('/onboarding/plan-selection')}
            className="w-full h-12 text-base font-semibold rounded-xl"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

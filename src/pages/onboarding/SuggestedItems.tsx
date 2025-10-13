import { useState } from 'react';
/**
 * @deprecated This component is no longer used in the onboarding flow.
 * Kept for backward compatibility with existing users only.
 * DO NOT use in new features.
 * Planned for removal in v3.0
 */
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

const suggestedItems = [
  { id: '1', name: 'Basic Jeans', image: '/placeholder.svg' },
  { id: '2', name: 'White T-Shirt', image: '/placeholder.svg' },
  { id: '3', name: 'Adidas Samba', image: '/placeholder.svg' },
  { id: '4', name: 'Black Dress', image: '/placeholder.svg' },
  { id: '5', name: 'Abaya', image: '/placeholder.svg' },
  { id: '6', name: 'Kaftan', image: '/placeholder.svg' },
  { id: '7', name: 'Heels', image: '/placeholder.svg' },
  { id: '8', name: 'Handbag', image: '/placeholder.svg' },
];

export default function SuggestedItems() {
  const [selected, setSelected] = useState<string[]>([]);
  const navigate = useNavigate();

  const toggleItem = (id: string) => {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleNext = () => {
    // TODO: Create wardrobe items for selected items
    navigate('/onboarding/ai-analyzer-intro');
  };

  const handleSkip = () => {
    navigate('/onboarding/ai-analyzer-intro');
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Progress Bar */}
      <div className="w-full h-1 bg-muted">
        <div className="h-full bg-foreground transition-all" style={{ width: '75%' }} />
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
              Add suggested wardrobe pieces
            </h1>
            <p className="text-muted-foreground text-sm">
              Select items you own to get started with your digital wardrobe.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {suggestedItems.map((item) => (
              <Card
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`relative cursor-pointer transition-all overflow-hidden ${
                  selected.includes(item.id)
                    ? 'border-foreground ring-2 ring-foreground'
                    : 'border-border hover:border-muted-foreground'
                }`}
              >
                <div className="aspect-square bg-muted flex items-center justify-center">
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-center">{item.name}</p>
                </div>
                {selected.includes(item.id) && (
                  <div className="absolute top-2 right-2 bg-foreground text-background rounded-full p-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </Card>
            ))}
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleNext}
              className="w-full h-12 text-base font-semibold rounded-xl"
            >
              {selected.length > 0 ? `Continue with ${selected.length} items` : 'Continue'}
            </Button>
            
            <button
              onClick={handleSkip}
              className="w-full text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

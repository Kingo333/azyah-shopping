import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Package, Users } from 'lucide-react';
import { EventBrandManager } from './EventBrandManager';
import { BrandProductManager } from './BrandProductManager';

interface EventBrand {
  id: string;
  brand_name: string;
  logo_url?: string;
}

interface EventCatalogManagerProps {
  eventId: string;
  eventName: string;
  onBack: () => void;
}

export const EventCatalogManager = ({ eventId, eventName, onBack }: EventCatalogManagerProps) => {
  const [selectedBrand, setSelectedBrand] = useState<EventBrand | null>(null);

  if (selectedBrand) {
    return (
      <BrandProductManager
        brand={selectedBrand}
        onBack={() => setSelectedBrand(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Event Catalog Management</h1>
          <p className="text-muted-foreground">
            Manage brands and products for {eventName}
          </p>
        </div>
      </div>

      <EventBrandManager 
        eventId={eventId} 
        eventName={eventName}
      />
    </div>
  );
};
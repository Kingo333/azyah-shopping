/**
 * Salon Card component for displaying salon info in rewards page
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin } from 'lucide-react';
import { Salon } from '@/hooks/useSalons';

interface SalonCardProps {
  salon: Salon;
  onClick?: () => void;
}

export function SalonCard({ salon, onClick }: SalonCardProps) {
  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="relative h-32">
        <img 
          src={salon.cover_image_url || '/placeholder.svg'} 
          alt={salon.name}
          className="w-full h-full object-cover"
        />
        {salon.logo_url && (
          <div className="absolute bottom-2 left-2 w-12 h-12 rounded-full bg-background border-2 border-background overflow-hidden">
            <img 
              src={salon.logo_url} 
              alt={`${salon.name} logo`}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm truncate">{salon.name}</h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <MapPin className="h-3 w-3" />
              <span className="capitalize">{salon.city}</span>
            </div>
          </div>
          {salon.rating && salon.rating > 0 && (
            <Badge variant="secondary" className="flex items-center gap-0.5 shrink-0">
              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
              <span>{salon.rating.toFixed(1)}</span>
            </Badge>
          )}
        </div>
        {salon.description && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {salon.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCollaborations } from '@/hooks/useCollaborations';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Calendar, DollarSign, Gift } from 'lucide-react';
import { PLATFORM_OPTIONS } from '@/types/ugc';
import { CollabDetailModal } from './CollabDetailModal';
import { Collaboration } from '@/types/ugc';

export const CollabList: React.FC = () => {
  const { user } = useAuth();
  const [selectedCollab, setSelectedCollab] = useState<Collaboration | null>(null);
  const { data: collaborations, isLoading } = useCollaborations('shopper');

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) return 'Ends today';
    if (diffDays === 1) return 'Ends tomorrow';
    return `${diffDays} days left`;
  };

  const formatDeliverables = (deliverables: Record<string, any>) => {
    const summary: string[] = [];
    
    Object.entries(deliverables).forEach(([platform, items]) => {
      if (typeof items === 'object' && items && !Array.isArray(items)) {
        const total = Object.values(items as Record<string, any>).reduce((sum: number, count) => {
          const numCount = typeof count === 'number' ? count : Number(count) || 0;
          return sum + numCount;
        }, 0);
        if (total > 0) {
          const platformName = PLATFORM_OPTIONS.find(p => p.value === platform)?.label || platform;
          summary.push(`${total} ${platformName}`);
        }
      }
    });
    
    return summary.join(', ') || 'No deliverables specified';
  };

  const getPlatformIcons = (platforms: string[]) => {
    return platforms.map(platform => {
      const platformOption = PLATFORM_OPTIONS.find(p => p.value === platform);
      return platformOption ? platformOption.icon : '📱';
    }).join(' ');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading collaborations...</p>
        </div>
      </div>
    );
  }

  if (!collaborations?.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <Users className="h-16 w-16 text-muted-foreground/50 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold font-cormorant mb-2">No collaborations available</h3>
            <p className="text-muted-foreground">
              Check back later for new collaboration opportunities
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-full pr-4">
        <div className="grid gap-4">
          {collaborations.map((collab) => (
            <Card key={collab.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedCollab(collab)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    {(collab.brands?.logo_url || collab.retailers?.logo_url) && (
                      <img 
                        src={collab.brands?.logo_url || collab.retailers?.logo_url} 
                        alt="Brand logo"
                        className="w-10 h-10 rounded-full object-cover bg-muted"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base line-clamp-1">{collab.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {collab.brands?.name || collab.retailers?.name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Badge variant={collab.comp_type === 'PRODUCT_AND_PAID' ? 'default' : 'secondary'} className="shrink-0">
                      {collab.comp_type === 'PRODUCT_AND_PAID' ? (
                        <><DollarSign className="h-3 w-3 mr-1" />Paid</>
                      ) : (
                        <><Gift className="h-3 w-3 mr-1" />Product</>
                      )}
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {collab.brief || 'No description provided'}
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Platforms:</span>
                      <span>{getPlatformIcons(collab.platforms)}</span>
                      <span className="text-muted-foreground">
                        {collab.platforms.map(p => PLATFORM_OPTIONS.find(opt => opt.value === p)?.label).join(', ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{formatDeliverables(collab.deliverables)}</span>
                    </div>
                    
                    {collab.application_deadline && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDeadline(collab.application_deadline)}</span>
                      </div>
                    )}
                  </div>

                  {collab.comp_type === 'PRODUCT_AND_PAID' && collab.amount && (
                    <div className="flex items-center gap-1 text-sm font-medium text-primary">
                      <DollarSign className="h-4 w-4" />
                      <span>
                        {new Intl.NumberFormat('en-US', { 
                          style: 'currency', 
                          currency: collab.currency || 'USD' 
                        }).format(collab.amount)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t">
                  <Button size="sm" className="w-full">
                    View Details & Apply
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {selectedCollab && (
        <CollabDetailModal 
          collaboration={selectedCollab}
          open={!!selectedCollab}
          onOpenChange={(open) => !open && setSelectedCollab(null)}
        />
      )}
    </>
  );
};
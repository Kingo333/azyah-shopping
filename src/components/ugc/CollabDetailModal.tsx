import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Calendar, DollarSign, Gift, Users, Clock, Target, MessageSquare, Hash, AtSign, ExternalLink } from 'lucide-react';
import { Collaboration } from '@/types/ugc';
import { PLATFORM_OPTIONS } from '@/types/ugc';
import { ApplyModal } from './ApplyModal';
import { BrandReputationPanel } from './BrandReputationPanel';

interface CollabDetailModalProps {
  collaboration: Collaboration;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CollabDetailModal: React.FC<CollabDetailModalProps> = ({ 
  collaboration, 
  open, 
  onOpenChange 
}) => {
  const [showApplyModal, setShowApplyModal] = useState(false);

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDeliverables = (deliverables: Record<string, any>) => {
    const details: Array<{ platform: string; items: Array<{ type: string; count: number }> }> = [];
    
    Object.entries(deliverables).forEach(([platform, items]) => {
      if (typeof items === 'object' && items) {
        const platformItems = Object.entries(items)
          .filter(([, count]) => Number(count) > 0)
          .map(([type, count]) => ({ type, count: Number(count) }));
        
        if (platformItems.length > 0) {
          const platformOption = PLATFORM_OPTIONS.find(p => p.value === platform);
          details.push({
            platform: platformOption?.label || platform,
            items: platformItems
          });
        }
      }
    });
    
    return details;
  };

  const getPlatformIcon = (platform: string) => {
    const platformOption = PLATFORM_OPTIONS.find(p => p.label === platform);
    return platformOption ? platformOption.icon : '📱';
  };

  const deliverableDetails = formatDeliverables(collaboration.deliverables);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-start gap-3">
              {(collaboration.brands?.logo_url || collaboration.retailers?.logo_url) && (
                <img 
                  src={collaboration.brands?.logo_url || collaboration.retailers?.logo_url} 
                  alt="Brand logo"
                  className="w-12 h-12 rounded-full object-cover bg-muted"
                />
              )}
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-cormorant line-clamp-2">
                  {collaboration.title}
                </DialogTitle>
                <p className="text-muted-foreground mt-1">
                  {collaboration.brands?.name || collaboration.retailers?.name}
                </p>
              </div>
              <Badge variant={collaboration.comp_type === 'PRODUCT_AND_PAID' ? 'default' : 'secondary'}>
                {collaboration.comp_type === 'PRODUCT_AND_PAID' ? (
                  <><DollarSign className="h-3 w-3 mr-1" />Paid</>
                ) : (
                  <><Gift className="h-3 w-3 mr-1" />Product</>
                )}
              </Badge>
            </div>
          </DialogHeader>

          {/* Brand Reputation Panel */}
          <BrandReputationPanel brandId={collaboration.owner_org_id} />
          
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6">
              {/* Brief */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Brief
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {collaboration.brief || 'No brief provided'}
                </p>
              </div>

              <Separator />

              {/* Platforms & Deliverables */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Platforms & Deliverables
                </h3>
                <div className="space-y-3">
                  {deliverableDetails.map(({ platform, items }, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <span className="text-lg">{getPlatformIcon(platform)}</span>
                      <div>
                        <p className="font-medium">{platform}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {items.map(({ type, count }, itemIndex) => (
                            <Badge key={itemIndex} variant="outline" className="text-xs">
                              {count} {type}{count > 1 ? 's' : ''}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Compensation */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Compensation
                </h3>
                {collaboration.comp_type === 'PRODUCT_AND_PAID' && collaboration.amount ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-sm">
                      {new Intl.NumberFormat('en-US', { 
                        style: 'currency', 
                        currency: collaboration.currency || 'USD' 
                      }).format(collaboration.amount)}
                    </Badge>
                    <span className="text-muted-foreground">+ Product</span>
                  </div>
                ) : (
                  <Badge variant="secondary">Product Exchange Only</Badge>
                )}
              </div>

              {/* Tone & Talking Points */}
              {(collaboration.tone || collaboration.talking_points?.length) && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Tone & Talking Points
                    </h3>
                    {collaboration.tone && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Tone:</p>
                        <p className="text-sm">{collaboration.tone}</p>
                      </div>
                    )}
                    {collaboration.talking_points?.length && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Key Points:</p>
                        <ul className="space-y-1">
                          {collaboration.talking_points.map((point, index) => (
                            <li key={index} className="text-sm flex items-start gap-2">
                              <span className="text-primary">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              )}

              <Separator />

              {/* Application Details */}
              <div className="space-y-3">
                {collaboration.application_deadline && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Application deadline:</span>
                    <span className="font-medium">{formatDeadline(collaboration.application_deadline)}</span>
                  </div>
                )}
                
                {collaboration.max_creators && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Max creators:</span>
                    <span className="font-medium">{collaboration.max_creators}</span>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <div className="pt-4 border-t">
            <Button 
              onClick={() => setShowApplyModal(true)} 
              className="w-full"
              size="lg"
            >
              Apply to Collaboration
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showApplyModal && (
        <ApplyModal 
          collaboration={collaboration}
          open={showApplyModal}
          onOpenChange={setShowApplyModal}
        />
      )}
    </>
  );
};
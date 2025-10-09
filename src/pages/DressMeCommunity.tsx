import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicFitsGrid } from '@/components/PublicFitsGrid';
import { FitDetailsModal } from '@/components/FitDetailsModal';
import { SEOHead } from '@/components/SEOHead';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDressMeAnalytics } from '@/hooks/useDressMeAnalytics';

export default function DressMeCommunity() {
  const navigate = useNavigate();
  const analytics = useDressMeAnalytics();
  const [selectedFit, setSelectedFit] = useState<any>(null);
  const [isFitDetailsOpen, setIsFitDetailsOpen] = useState(false);

  const handleUsePublicFit = async (fitId: string) => {
    try {
      const { data: fitData, error } = await supabase
        .from('fits')
        .select('*')
        .eq('id', fitId)
        .eq('is_public', true)
        .single();

      if (error) throw error;
      if (!fitData) {
        toast.error('Outfit not found');
        return;
      }

      analytics.usePublicFit(fitId, fitData.user_id);
      
      // Store fit ID to load in canvas
      sessionStorage.setItem('dressme_load_fit', fitId);
      navigate('/dress-me/canvas');
      toast.success('Loading outfit...');
    } catch (error) {
      console.error('Error loading public outfit:', error);
      toast.error('Failed to load outfit');
    }
  };

  return (
    <>
      <SEOHead
        title="Community Outfits - Dress Me | Azyah"
        description="Get inspired by outfits from the community"
      />
      
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b">
        <div className="container max-w-6xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dress-me/wardrobe')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-bold">Community</h1>
            <div className="w-20" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-screen bg-background pb-8">
        <div className="container max-w-6xl mx-auto p-4">
          <p className="text-sm text-muted-foreground mb-6">
            Browse and get inspired by outfits created by the community
          </p>
          
          <PublicFitsGrid
            onFitClick={(fit) => {
              setSelectedFit(fit);
              setIsFitDetailsOpen(true);
            }}
          />
        </div>
      </div>

      {/* Fit Details Modal */}
      <FitDetailsModal
        fit={selectedFit}
        open={isFitDetailsOpen}
        onClose={() => setIsFitDetailsOpen(false)}
        onUseThisFit={handleUsePublicFit}
      />
    </>
  );
}

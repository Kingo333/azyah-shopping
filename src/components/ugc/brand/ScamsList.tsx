import { useState } from 'react';
import { useAllScams } from '@/hooks/useUGCBrand';
import { ScamCard } from './ScamCard';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { ScamFormModal } from './ScamFormModal';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentThreadModal } from './ContentThreadModal';

export const ScamsList = () => {
  const [showScamForm, setShowScamForm] = useState(false);
  const [selectedScamId, setSelectedScamId] = useState<string | null>(null);
  
  const { data: scams, isLoading } = useAllScams();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Scam Reports</h2>
          <Button onClick={() => setShowScamForm(true)} className="gap-2" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            Report Scam
          </Button>
        </div>

        {scams && scams.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No scam reports yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scams?.map((scam) => (
              <ScamCard
                key={scam.id}
                scam={scam}
                onClick={() => setSelectedScamId(scam.id)}
              />
            ))}
          </div>
        )}
      </div>

      <ScamFormModal
        open={showScamForm}
        onOpenChange={setShowScamForm}
      />

      <ContentThreadModal
        contentType="scam"
        contentId={selectedScamId}
        open={!!selectedScamId}
        onOpenChange={(open) => !open && setSelectedScamId(null)}
      />
    </>
  );
};
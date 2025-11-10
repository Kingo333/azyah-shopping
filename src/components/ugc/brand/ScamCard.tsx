import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BrandScamReport } from '@/types/ugcBrand';
import { formatDistanceToNow } from 'date-fns';

interface ScamCardProps {
  scam: BrandScamReport;
}

export const ScamCard = ({ scam }: ScamCardProps) => {
  const scamTypeLabels: Record<string, string> = {
    nonpayment: 'Non-Payment',
    counterfeit: 'Counterfeit Products',
    phishing: 'Phishing/Scam',
    ghosting: 'Ghosting After Delivery',
    other: 'Other',
  };

  return (
    <Card className="p-4 border-destructive/50 bg-destructive/5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <Badge variant="destructive">{scamTypeLabels[scam.scam_type]}</Badge>
          </div>
          
          <p className="text-sm mb-3">{scam.description}</p>

          {scam.evidence_urls && scam.evidence_urls.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-2">Evidence:</p>
              <div className="flex gap-2 flex-wrap">
                {scam.evidence_urls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Evidence {idx + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Reported by {scam.users?.name || 'Anonymous'} •{' '}
            {formatDistanceToNow(new Date(scam.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </Card>
  );
};

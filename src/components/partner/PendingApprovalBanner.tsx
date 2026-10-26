import React from 'react';
import { Clock } from 'lucide-react';
import { approvalNotice } from './approvalNotice';

/** Shown on the brand and retailer portals until the account is approved. */
export const PendingApprovalBanner: React.FC<{ status?: string | null }> = ({ status }) => {
  const notice = approvalNotice(status);
  if (!notice) return null;
  return (
    <div role="status" className="mb-4 flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-3 md:p-4">
      <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-foreground">{notice.title}</p>
        <p className="text-sm text-muted-foreground">{notice.body}</p>
      </div>
    </div>
  );
};

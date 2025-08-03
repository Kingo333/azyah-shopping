import React, { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BackButton } from '@/components/ui/back-button';

// Lazy load the InfiniteScrollForum component
const InfiniteScrollForum = React.lazy(() => import('@/components/InfiniteScrollForum'));

const LoadingFallback = () => (
  <div className="min-h-screen bg-background p-4">
    <div className="mx-auto max-w-4xl">
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-muted rounded-full"></div>
                  <div className="space-y-1">
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="h-3 bg-muted rounded w-16"></div>
                  </div>
                </div>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-5/6"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </div>
);

const Forum: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl p-4">
        <div className="flex items-center gap-3 mb-6">
          <BackButton />
          <h1 className="text-2xl font-bold">Fashion Forum</h1>
        </div>
        <Suspense fallback={<LoadingFallback />}>
          <InfiniteScrollForum />
        </Suspense>
      </div>
    </div>
  );
};

export default Forum;
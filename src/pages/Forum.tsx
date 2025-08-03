import React, { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';

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

const Forum = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="mx-auto max-w-4xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Fashion Community</h1>
              <p className="text-muted-foreground">Share, discover, and connect with fellow fashion enthusiasts</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl p-4">
        <Suspense fallback={<LoadingFallback />}>
          <InfiniteScrollForum />
        </Suspense>
      </div>
    </div>
  );
};

export default Forum;
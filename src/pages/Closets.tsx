import React, { useState, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BackButton } from '@/components/ui/back-button';
import { Grid3X3, LayoutGrid, Search, Plus } from 'lucide-react';

// Lazy load the MasonryMoodBoards component
const MasonryMoodBoards = React.lazy(() => import('@/components/MasonryMoodBoards'));

const LoadingFallback = () => (
  <div className="space-y-4">
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-muted rounded w-1/4"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-64 bg-muted rounded"></div>
        ))}
      </div>
    </div>
  </div>
);

const Closets = () => {
  const [activeTab, setActiveTab] = useState<'explore' | 'my-closets' | 'mood-boards'>('mood-boards');
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('masonry');
  const [searchQuery, setSearchQuery] = useState('');


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="mx-auto max-w-7xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BackButton />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Closets & Mood Boards</h1>
                <p className="text-muted-foreground">Discover and create curated fashion collections</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-4">
            <Button
              variant={activeTab === 'explore' ? 'default' : 'outline'}
              onClick={() => setActiveTab('explore')}
            >
              Explore
            </Button>
            <Button
              variant={activeTab === 'my-closets' ? 'default' : 'outline'}
              onClick={() => setActiveTab('my-closets')}
            >
              My Closets
            </Button>
            <Button
              variant={activeTab === 'mood-boards' ? 'default' : 'outline'}
              onClick={() => setActiveTab('mood-boards')}
            >
              Mood Boards
            </Button>
          </div>

          {/* Search and View Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search mood boards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'masonry' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('masonry')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl p-4">
        {activeTab === 'explore' && (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-4">Coming Soon</h3>
            <p className="text-muted-foreground">Explore community closets feature coming soon!</p>
          </div>
        )}

        {activeTab === 'my-closets' && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Grid3X3 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No closets yet</h3>
              <p className="text-muted-foreground">
                Create your first closet to start curating your fashion collection
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Closet
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'mood-boards' && (
          <Suspense fallback={<LoadingFallback />}>
            <MasonryMoodBoards viewMode={viewMode} />
          </Suspense>
        )}
      </div>
    </div>
  );
};

export default Closets;
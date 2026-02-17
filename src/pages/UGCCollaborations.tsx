import React, { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CollabList } from '@/components/ugc/CollabList';
import { ReviewsList } from '@/components/ugc/brand/ReviewsList';

export default function UGCCollaborations() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  // Normalize legacy tab values - redirect questions/scams to reviews
  const normalizedTab = useMemo(() => {
    if (tabParam === 'questions' || tabParam === 'scams') {
      return 'reviews';
    }
    if (tabParam === 'reviews') {
      return 'reviews';
    }
    return 'collabs';
  }, [tabParam]);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header 
        className="sticky top-0 z-10 bg-card border-b border-border h-[60px] flex items-center px-4"
        style={{ paddingTop: 'var(--safe-top, 0px)', height: 'calc(60px + var(--safe-top, 0px))' }}
      >
        <button 
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
         <h1 className="flex-1 text-center text-lg font-serif font-medium text-foreground pr-9">
          UGC
        </h1>
      </header>

      {/* Main Content */}
      <main className="pt-4 px-4 pb-20">
        <div className="max-w-[1200px] mx-auto">
          <Tabs value={normalizedTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="collabs">collabs</TabsTrigger>
              <TabsTrigger value="reviews">reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="collabs">
              <p className="text-xs text-muted-foreground mb-4">Partner with brands to create content and get paid for posting on social media.</p>
              <CollabList />
            </TabsContent>

            <TabsContent value="reviews">
              <p className="text-xs text-muted-foreground mb-4">Read and share honest reviews about brands — help the community spot great partners and avoid bad ones.</p>
              <ReviewsList />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

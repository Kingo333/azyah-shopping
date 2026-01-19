import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BackButton } from '@/components/ui/back-button';
import { SEOHead } from '@/components/SEOHead';
import { CommunityOutfits } from './CommunityOutfits';
import { CommunityClothes } from './CommunityClothes';
import { YourFitContent } from './YourFitContent';
import { Ruler } from 'lucide-react';

export default function Community() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'outfits';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync with URL params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['outfits', 'clothes', 'your-fit'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  return (
    <>
      <SEOHead
        title="Explore - Azyah"
        description="Discover and share outfits and clothing items with the Azyah community"
      />

      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b safe-area-pt">
          <div className="container flex items-center h-14 max-w-screen-2xl">
            <BackButton />
            <h1 className="text-lg font-semibold ml-2">Explore</h1>
          </div>
        </header>

        <div className="container max-w-screen-2xl px-4 py-6">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="outfits">Outfits</TabsTrigger>
              <TabsTrigger value="clothes">Clothes</TabsTrigger>
              <TabsTrigger value="your-fit" className="flex items-center gap-1">
                <Ruler className="h-3.5 w-3.5" />
                Your Fit
              </TabsTrigger>
            </TabsList>

            <TabsContent value="outfits" className="mt-6">
              <CommunityOutfits />
            </TabsContent>

            <TabsContent value="clothes" className="mt-6">
              <CommunityClothes />
            </TabsContent>

            <TabsContent value="your-fit" className="mt-6">
              <YourFitContent />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}

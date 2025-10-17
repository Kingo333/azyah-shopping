import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BackButton } from '@/components/ui/back-button';
import { SEOHead } from '@/components/SEOHead';
import { CommunityOutfits } from './CommunityOutfits';
import { CommunityClothes } from './CommunityClothes';

export default function Community() {
  const [activeTab, setActiveTab] = useState('outfits');

  return (
    <>
      <SEOHead
        title="Community - Azyah"
        description="Discover and share outfits and clothing items with the Azyah community"
      />

      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container flex items-center h-14 max-w-screen-2xl">
            <BackButton />
            <h1 className="text-lg font-semibold ml-2">Community</h1>
          </div>
        </header>

        <div className="container max-w-screen-2xl px-4 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="outfits">Outfits</TabsTrigger>
              <TabsTrigger value="clothes">Clothes</TabsTrigger>
            </TabsList>

            <TabsContent value="outfits" className="mt-6">
              <CommunityOutfits />
            </TabsContent>

            <TabsContent value="clothes" className="mt-6">
              <CommunityClothes />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}

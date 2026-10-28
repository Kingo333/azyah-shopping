import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BackButton } from '@/components/ui/back-button';
import { SEOHead } from '@/components/SEOHead';
import { CommunityOutfits } from './CommunityOutfits';
import { CommunityClothes } from './CommunityClothes';
import { YourFitContent } from './YourFitContent';
import { Ruler } from 'lucide-react';
import { features } from '@/lib/features';
import FeedComponent from '@/components/FeedComponent';
import { useDesignV3 } from '@/hooks/useDesignV3';
import { YourOutfitsRow } from '@/components/community/YourOutfitsRow';
import { CommunityCreateButton } from '@/components/community/CommunityCreateButton';

// Your Fit is hidden (owner decision); old ?tab=your-fit links open Outfits.
const YOUR_FIT_ENABLED = features.your_fit;
const TABS = YOUR_FIT_ENABLED ? ['outfits', 'clothes', 'your-fit'] : ['outfits', 'clothes'];
// Design v3: people's posts live here too (old /feed and /forum redirect to Community).
const V3_TABS = ['outfits', 'clothes', 'posts'];
const tabOrDefault = (tab: string | null, tabs: string[]) => (tab && tabs.includes(tab) ? tab : 'outfits');

export default function Community() {
  const v3 = useDesignV3();
  const tabs = v3 ? V3_TABS : TABS;
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(tabOrDefault(searchParams.get('tab'), tabs));
  // Bumped after a post is made from the Create button so the Posts list reloads.
  const [postsVersion, setPostsVersion] = useState(0);

  // Sync with URL params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tabOrDefault(tab, tabs));
    }
  }, [searchParams, tabs]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  return (
    <>
      <SEOHead
        title={v3 ? 'Community - Azyah' : 'Explore - Azyah'}
        description="Discover and share outfits and clothing items with the Azyah community"
      />

      <div className="min-h-screen bg-background pb-20">
        {v3 ? (
          <header className="bg-ground" style={{ paddingTop: 'calc(var(--safe-top, 0px) + 10px)' }}>
            <div className="container max-w-screen-2xl px-4 pt-2.5">
              <h1 className="text-[26px] font-semibold leading-tight text-ink">Community</h1>
            </div>
          </header>
        ) : (
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b safe-area-pt">
          <div className="container flex items-center h-14 max-w-screen-2xl">
            <BackButton />
            <h1 className="text-lg font-semibold ml-2">Explore</h1>
          </div>
        </header>
        )}

        <div className={v3 ? 'container max-w-screen-2xl px-4 py-3' : 'container max-w-screen-2xl px-4 py-6'}>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className={`grid w-full ${tabs.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="outfits">Outfits</TabsTrigger>
              <TabsTrigger value="clothes">Clothes</TabsTrigger>
              {v3 && <TabsTrigger value="posts">Posts</TabsTrigger>}
              {!v3 && YOUR_FIT_ENABLED && (
                <TabsTrigger value="your-fit" className="flex items-center gap-1">
                  <Ruler className="h-3.5 w-3.5" />
                  Your Fit
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="outfits" className={v3 ? 'mt-4' : 'mt-6'}>
              {v3 && <YourOutfitsRow />}
              <CommunityOutfits />
            </TabsContent>

            <TabsContent value="clothes" className="mt-6">
              <CommunityClothes />
            </TabsContent>

            {v3 && (
              <TabsContent value="posts" className="mt-4">
                <FeedComponent key={postsVersion} limit={30} />
              </TabsContent>
            )}

            {!v3 && YOUR_FIT_ENABLED && (
              <TabsContent value="your-fit" className="mt-6">
                <YourFitContent />
              </TabsContent>
            )}
          </Tabs>
        </div>
        {v3 && (
          <CommunityCreateButton
            onPostCreated={() => {
              setPostsVersion((n) => n + 1);
              handleTabChange('posts');
            }}
          />
        )}
      </div>
    </>
  );
}

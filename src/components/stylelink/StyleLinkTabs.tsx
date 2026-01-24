import React, { useState, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import StyledGrid from './StyledGrid';
import UserItemsGrid from './UserItemsGrid';
import { StyleLinkOutfit } from '@/hooks/useStyleLinkData';

interface StyleLinkTabsProps {
  userId: string;
  isOwner: boolean;
  outfits: StyleLinkOutfit[];
  onOutfitClick: (outfit: StyleLinkOutfit) => void;
}

const StyleLinkTabs: React.FC<StyleLinkTabsProps> = ({
  userId,
  isOwner,
  outfits,
  onOutfitClick,
}) => {
  const [activeTab, setActiveTab] = useState('outfits');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSticky, setIsSticky] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Handle sticky behavior
  useEffect(() => {
    const handleScroll = () => {
      if (tabsRef.current) {
        const rect = tabsRef.current.getBoundingClientRect();
        setIsSticky(rect.top <= 0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchQuery(''); // Reset search when changing tabs
  };

  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case 'outfits':
        return 'Search outfits...';
      case 'items':
        return 'Search items...';
      default:
        return 'Search...';
    }
  };

  return (
    <div className="w-full" ref={tabsRef}>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Sticky Header */}
        <div className={cn(
          "transition-all duration-200 bg-background/95 backdrop-blur-sm -mx-4 px-4",
          isSticky && "sticky top-0 z-20 py-2 shadow-sm border-b"
        )}>
          {/* Tab Headers - Renamed from Posts/Styled to Outfits/Items */}
          <TabsList className="grid w-full grid-cols-2 h-9 p-0.5 bg-muted/60 rounded-lg">
            <TabsTrigger 
              value="outfits" 
              className="text-xs rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Outfits
            </TabsTrigger>
            <TabsTrigger 
              value="items" 
              className="text-xs rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Items
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Search Bar */}
        <div className="relative mt-3">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={getSearchPlaceholder()}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-muted/30 border-muted focus:bg-background"
          />
        </div>

        {/* Outfits Tab (formerly Styled) */}
        <TabsContent value="outfits" className="mt-3">
          <StyledGrid 
            outfits={outfits} 
            isOwner={isOwner}
            onOutfitClick={onOutfitClick}
            searchQuery={searchQuery}
          />
        </TabsContent>

        {/* Items Tab (formerly Posts - now shows public wardrobe items) */}
        <TabsContent value="items" className="mt-3">
          <UserItemsGrid 
            userId={userId} 
            isOwner={isOwner} 
            searchQuery={searchQuery}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StyleLinkTabs;

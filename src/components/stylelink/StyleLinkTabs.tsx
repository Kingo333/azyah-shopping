import React, { useState, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import PostsGrid from './PostsGrid';
import StyledGrid from './StyledGrid';
import CreateStyleLinkPostModal from './CreateStyleLinkPostModal';
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
  const [activeTab, setActiveTab] = useState('posts');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
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
      case 'posts':
        return 'Search posts...';
      case 'styled':
        return 'Search outfits...';
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
          {/* Premium Tab Headers */}
          <TabsList className="grid w-full grid-cols-2 h-9 p-0.5 bg-muted/60 rounded-lg">
            <TabsTrigger 
              value="posts" 
              className="text-xs rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Posts
            </TabsTrigger>
            <TabsTrigger 
              value="styled" 
              className="text-xs rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Styled
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Search Bar - Refined */}
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

        {/* Posts Tab */}
        <TabsContent value="posts" className="mt-3">
          {isOwner && (
            <Button 
              onClick={() => setShowCreatePostModal(true)}
              className="w-full mb-3 h-8 text-xs"
              variant="outline"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Post
            </Button>
          )}
          <PostsGrid 
            userId={userId} 
            isOwner={isOwner} 
            searchQuery={searchQuery}
          />
        </TabsContent>

        {/* Styled Tab (Existing Outfits) */}
        <TabsContent value="styled" className="mt-3">
          <StyledGrid 
            outfits={outfits} 
            isOwner={isOwner}
            onOutfitClick={onOutfitClick}
            searchQuery={searchQuery}
          />
        </TabsContent>
      </Tabs>

      {/* Create Post Modal */}
      <CreateStyleLinkPostModal
        open={showCreatePostModal}
        onOpenChange={setShowCreatePostModal}
      />
    </div>
  );
};

export default StyleLinkTabs;

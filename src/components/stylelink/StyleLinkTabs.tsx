import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, ShoppingBag, Sparkles, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PostsGrid from './PostsGrid';
import ProductsGrid from './ProductsGrid';
import StyledGrid from './StyledGrid';
import CreateStyleLinkPostModal from './CreateStyleLinkPostModal';
import AddCreatorProductModal from './AddCreatorProductModal';
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
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchQuery(''); // Reset search when changing tabs
  };

  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case 'posts':
        return 'Search posts...';
      case 'products':
        return 'Search products...';
      case 'styled':
        return 'Search outfits...';
      default:
        return 'Search...';
    }
  };

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="flex flex-col gap-4 mb-4">
          {/* Tab Headers */}
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posts" className="flex items-center gap-1.5">
              <Camera className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Posts</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-1.5">
              <ShoppingBag className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Products</span>
            </TabsTrigger>
            <TabsTrigger value="styled" className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Styled</span>
            </TabsTrigger>
          </TabsList>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={getSearchPlaceholder()}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Posts Tab */}
        <TabsContent value="posts" className="mt-0">
          {isOwner && (
            <Button 
              onClick={() => setShowCreatePostModal(true)}
              className="w-full mb-4"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Post
            </Button>
          )}
          <PostsGrid 
            userId={userId} 
            isOwner={isOwner} 
            searchQuery={searchQuery}
          />
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="mt-0">
          {isOwner && (
            <Button 
              onClick={() => setShowAddProductModal(true)}
              className="w-full mb-4"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          )}
          <ProductsGrid 
            userId={userId} 
            isOwner={isOwner}
            searchQuery={searchQuery}
          />
        </TabsContent>

        {/* Styled Tab (Existing Outfits) */}
        <TabsContent value="styled" className="mt-0">
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

      {/* Add Product Modal */}
      <AddCreatorProductModal
        open={showAddProductModal}
        onOpenChange={setShowAddProductModal}
        userId={userId}
      />
    </div>
  );
};

export default StyleLinkTabs;

import React, { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Camera, Link2, Search, Tag, Sparkles } from 'lucide-react';
import { PhotoTab } from './PhotoTab';
import { LinkTab } from './LinkTab';
import { SearchTab } from './SearchTab';

interface DealsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'photo' | 'link' | 'search';
  initialQuery?: string;
}

export function DealsDrawer({ 
  open, 
  onOpenChange, 
  initialTab = 'photo',
  initialQuery = '' 
}: DealsDrawerProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="pb-2">
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Tag className="h-4 w-4 text-white" />
            </div>
            <DrawerTitle className="font-serif">Find Better Deals</DrawerTitle>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
        </DrawerHeader>

        <div className="px-4 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-4">
              <TabsTrigger value="photo" className="gap-1.5 text-xs">
                <Camera className="h-3.5 w-3.5" />
                Photo
              </TabsTrigger>
              <TabsTrigger value="link" className="gap-1.5 text-xs">
                <Link2 className="h-3.5 w-3.5" />
                Link
              </TabsTrigger>
              <TabsTrigger value="search" className="gap-1.5 text-xs">
                <Search className="h-3.5 w-3.5" />
                Search
              </TabsTrigger>
            </TabsList>

            <TabsContent value="photo" className="mt-0">
              <PhotoTab onClose={handleClose} />
            </TabsContent>

            <TabsContent value="link" className="mt-0">
              <LinkTab onClose={handleClose} />
            </TabsContent>

            <TabsContent value="search" className="mt-0">
              <SearchTab onClose={handleClose} initialQuery={initialQuery} />
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default DealsDrawer;

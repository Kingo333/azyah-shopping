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
      <DrawerContent 
        className="
          max-h-[85vh] 
          bg-white/85 dark:bg-gray-900/85 
          backdrop-blur-2xl 
          border-t border-white/20 
          shadow-2xl 
          rounded-t-[28px]
        "
      >
        <DrawerHeader className="pb-3">
          <div className="flex items-center justify-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-[0_4px_12px_rgba(251,191,36,0.3)]">
              <Tag className="h-3.5 w-3.5 text-white" />
            </div>
            <DrawerTitle className="font-serif text-lg" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              Find Better Deals
            </DrawerTitle>
            <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
          </div>
        </DrawerHeader>

        <div className="px-4 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 80px)' }}>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            {/* Glass segmented control tabs */}
            <TabsList className="w-full grid grid-cols-3 mb-4 bg-black/5 dark:bg-white/10 p-1.5 rounded-full h-auto">
              <TabsTrigger 
                value="photo" 
                className="
                  gap-1.5 text-xs py-2 rounded-full font-medium
                  transition-all duration-200
                  data-[state=inactive]:text-muted-foreground/70
                  data-[state=active]:bg-white/90 dark:data-[state=active]:bg-white/20
                  data-[state=active]:text-foreground
                  data-[state=active]:shadow-[0_0_12px_rgba(251,191,36,0.25)]
                  data-[state=active]:border data-[state=active]:border-white/30
                "
              >
                <Camera className="h-3.5 w-3.5" />
                Photo
              </TabsTrigger>
              <TabsTrigger 
                value="link" 
                className="
                  gap-1.5 text-xs py-2 rounded-full font-medium
                  transition-all duration-200
                  data-[state=inactive]:text-muted-foreground/70
                  data-[state=active]:bg-white/90 dark:data-[state=active]:bg-white/20
                  data-[state=active]:text-foreground
                  data-[state=active]:shadow-[0_0_12px_rgba(251,191,36,0.25)]
                  data-[state=active]:border data-[state=active]:border-white/30
                "
              >
                <Link2 className="h-3.5 w-3.5" />
                Link
              </TabsTrigger>
              <TabsTrigger 
                value="search" 
                className="
                  gap-1.5 text-xs py-2 rounded-full font-medium
                  transition-all duration-200
                  data-[state=inactive]:text-muted-foreground/70
                  data-[state=active]:bg-white/90 dark:data-[state=active]:bg-white/20
                  data-[state=active]:text-foreground
                  data-[state=active]:shadow-[0_0_12px_rgba(251,191,36,0.25)]
                  data-[state=active]:border data-[state=active]:border-white/30
                "
              >
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

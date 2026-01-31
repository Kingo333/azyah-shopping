import React, { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Camera, Link2, Tag } from 'lucide-react';
import { PhotoTab } from './PhotoTab';
import { LinkTab } from './LinkTab';

interface DealsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'photo' | 'link';
  initialUrl?: string | null;
}

export function DealsDrawer({ 
  open, 
  onOpenChange, 
  initialTab = 'photo',
  initialUrl = null,
}: DealsDrawerProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Switch to link tab when initialUrl is provided
  useEffect(() => {
    if (initialUrl) {
      setActiveTab('link');
    }
  }, [initialUrl]);

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
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-lg">
              <Tag className="h-3.5 w-3.5 text-white" />
            </div>
            <DrawerTitle className="font-serif text-lg" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              Find Better Deals
            </DrawerTitle>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 80px)' }}>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'photo' | 'link')} className="w-full">
            {/* Glass segmented control tabs - now 2 columns */}
            <TabsList className="w-full grid grid-cols-2 mb-4 bg-black/5 dark:bg-white/10 p-1.5 rounded-full h-auto">
              <TabsTrigger 
                value="photo" 
                className="
                  gap-1.5 text-xs py-2 rounded-full font-medium
                  transition-all duration-200
                  data-[state=inactive]:text-muted-foreground/70
                  data-[state=active]:bg-white/90 dark:data-[state=active]:bg-white/20
                  data-[state=active]:text-foreground
                  data-[state=active]:shadow-md
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
                  data-[state=active]:shadow-md
                  data-[state=active]:border data-[state=active]:border-white/30
                "
              >
                <Link2 className="h-3.5 w-3.5" />
                Link
              </TabsTrigger>
            </TabsList>

            <TabsContent value="photo" className="mt-0">
              <PhotoTab onClose={handleClose} />
            </TabsContent>

            <TabsContent value="link" className="mt-0">
              <LinkTab onClose={handleClose} initialUrl={initialUrl} />
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default DealsDrawer;

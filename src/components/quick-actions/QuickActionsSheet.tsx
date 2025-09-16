import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import QuickActionsGrid from "./QuickActionsGrid";

interface QuickActionsSheetProps {
  setAiStudioModalOpen: (open: boolean) => void;
  handleToyReplicaClick: () => void;
}

export default function QuickActionsSheet({ 
  setAiStudioModalOpen, 
  handleToyReplicaClick 
}: QuickActionsSheetProps) {
  return (
    <div className="w-full flex justify-center py-3">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="secondary"
            size="lg"
            aria-haspopup="dialog"
            aria-expanded="false"
            className="rounded-full px-6 py-2 shadow-sm hover:shadow-md transition-shadow"
          >
            <Zap className="h-4 w-4 mr-2" />
            Quick Actions
          </Button>
        </SheetTrigger>

        <SheetContent
          side="bottom"
          className="h-[75vh] max-h-[720px] rounded-t-3xl p-6 overflow-y-auto"
        >
          <SheetHeader className="pb-4">
            <SheetTitle className="text-lg font-semibold">Quick Actions</SheetTitle>
          </SheetHeader>
          
          <QuickActionsGrid 
            setAiStudioModalOpen={setAiStudioModalOpen}
            handleToyReplicaClick={handleToyReplicaClick}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
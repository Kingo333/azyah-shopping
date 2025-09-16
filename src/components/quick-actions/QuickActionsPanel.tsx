import React, { Suspense, useEffect, useRef } from "react";
import { useQuickActionsSelection } from "@/hooks/useQuickActionsSelection";

// Lazy-loaded section components
const ShopSection = React.lazy(() => import("./sections/ShopSection"));
const AiStudioSection = React.lazy(() => import("./sections/AiStudioSection"));
const BeautySection = React.lazy(() => import("./sections/BeautySection"));
const FeedSection = React.lazy(() => import("./sections/FeedSection"));
const WishlistSection = React.lazy(() => import("./sections/WishlistSection"));
const ExploreSection = React.lazy(() => import("./sections/ExploreSection"));
const UgcSection = React.lazy(() => import("./sections/UgcSection"));
const ToySection = React.lazy(() => import("./sections/ToySection"));
const DashboardSection = React.lazy(() => import("./sections/DashboardSection"));

const LoadingSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-8 bg-muted rounded-lg w-1/3" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-48 bg-muted rounded-xl" />
      ))}
    </div>
  </div>
);

interface QuickActionsPanelProps {
  aiStudioModalOpen?: boolean;
  setAiStudioModalOpen?: (open: boolean) => void;
  toyReplicaModalOpen?: boolean;
  setToyReplicaModalOpen?: (open: boolean) => void;
}

export default function QuickActionsPanel({
  aiStudioModalOpen,
  setAiStudioModalOpen,
  toyReplicaModalOpen,
  setToyReplicaModalOpen,
}: QuickActionsPanelProps) {
  const { selected } = useQuickActionsSelection();
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (anchorRef.current) {
      anchorRef.current.scrollIntoView({ 
        behavior: "smooth", 
        block: "start" 
      });
    }
  }, [selected]);

  return (
    <div 
      ref={anchorRef} 
      id="qa-panel" 
      role="tabpanel"
      aria-labelledby={`tab-${selected}`}
      className="mx-auto max-w-7xl px-4 mt-6"
      tabIndex={-1}
    >
      <Suspense fallback={<LoadingSkeleton />}>
        {selected === "shop" && <ShopSection />}
        {selected === "ai" && (
          <AiStudioSection 
            modalOpen={aiStudioModalOpen}
            setModalOpen={setAiStudioModalOpen}
          />
        )}
        {selected === "beauty" && <BeautySection />}
        {selected === "feed" && <FeedSection />}
        {selected === "wishlist" && <WishlistSection />}
        {selected === "explore" && <ExploreSection />}
        {selected === "ugc" && <UgcSection />}
        {selected === "toy" && (
          <ToySection 
            modalOpen={toyReplicaModalOpen}
            setModalOpen={setToyReplicaModalOpen}
          />
        )}
        {selected === "dashboard" && <DashboardSection />}
      </Suspense>
    </div>
  );
}
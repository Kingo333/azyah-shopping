import React, { Suspense, useEffect, useRef } from 'react';
import { useQuickActionsSelection } from '@/hooks/useQuickActionsSelection';

// Lazy load section components
const SwipeSection = React.lazy(() => import('@/pages/Swipe'));
const WishlistSection = React.lazy(() => import('@/pages/Wishlist'));
const ExploreSection = React.lazy(() => import('@/pages/Explore'));
const FeedSection = React.lazy(() => import('@/pages/FashionFeed'));
const BeautySection = React.lazy(() => import('@/pages/BeautyConsultant'));
const ToySection = React.lazy(() => import('@/pages/ToyReplica'));

// Simplified section components (remove navigation/header elements)
const ShopSection = React.lazy(() => import('./sections/ShopSection'));
const AiStudioSection = React.lazy(() => import('./sections/AiStudioSection'));
const UgcSection = React.lazy(() => import('./sections/UgcSection'));
const DashboardSection = React.lazy(() => import('./sections/DashboardSection'));

const LoadingSkeleton = () => (
  <div className="mx-auto max-w-7xl px-4 py-8">
    <div className="h-64 rounded-xl bg-muted animate-pulse" />
  </div>
);

interface QuickActionsPanelProps {
  aiStudioModalOpen: boolean;
  setAiStudioModalOpen: (open: boolean) => void;
  toyReplicaModalOpen: boolean;
  setToyReplicaModalOpen: (open: boolean) => void;
}

export function QuickActionsPanel({ 
  aiStudioModalOpen, 
  setAiStudioModalOpen,
  toyReplicaModalOpen,
  setToyReplicaModalOpen 
}: QuickActionsPanelProps) {
  const { selected } = useQuickActionsSelection();
  const anchorRef = useRef<HTMLDivElement>(null);

  // Smooth scroll to panel when selection changes
  useEffect(() => {
    if (anchorRef.current) {
      anchorRef.current.scrollIntoView({ 
        behavior: "smooth", 
        block: "start",
        inline: "nearest"
      });
    }
  }, [selected]);

  return (
    <div ref={anchorRef} id="qa-content-panel" role="tabpanel" className="mt-4">
      <Suspense fallback={<LoadingSkeleton />}>
        {selected === "shop" && <ShopSection />}
        {selected === "ai" && <AiStudioSection 
          modalOpen={aiStudioModalOpen} 
          setModalOpen={setAiStudioModalOpen}
        />}
        {selected === "beauty" && <BeautySection />}
        {selected === "feed" && <FeedSection />}
        {selected === "wishlist" && <WishlistSection />}
        {selected === "explore" && <ExploreSection />}
        {selected === "ugc" && <UgcSection />}
        {selected === "toy" && <ToySection />}
        {selected === "dashboard" && <DashboardSection />}
      </Suspense>
    </div>
  );
}
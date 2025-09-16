import React, { Suspense, useState, useCallback } from 'react';
import { useQuickActionsSelection, type QuickActionKey } from '@/hooks/useQuickActionsSelection';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load section components
const ShopSection = React.lazy(() => import('./sections/ShopSection'));
const AiStudioSection = React.lazy(() => import('./sections/AiStudioSection'));
const BeautySection = React.lazy(() => import('./sections/BeautySection'));
const FeedSection = React.lazy(() => import('./sections/FeedSection'));
const WishlistSection = React.lazy(() => import('./sections/WishlistSection'));
const ExploreSection = React.lazy(() => import('./sections/ExploreSection'));
const UgcSection = React.lazy(() => import('./sections/UgcSection'));
const ToySection = React.lazy(() => import('./sections/ToySection'));
const DashboardSection = React.lazy(() => import('./sections/DashboardSection'));

const SectionSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-48" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-48 w-full" />
      ))}
    </div>
  </div>
);

interface QuickActionsPanelProps {
  onAiStudioOpen: () => void;
  onToyReplicaClick: () => void;
  userProfile: any;
  dashboardStats: any;
  formatPrice: (amount: number, currency?: string) => string;
  leaderboardType: 'global' | 'country';
  setLeaderboardType: (type: 'global' | 'country') => void;
  ugcModalOpen: boolean;
  setUgcModalOpen: (open: boolean) => void;
}

export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({
  onAiStudioOpen,
  onToyReplicaClick,
  userProfile,
  dashboardStats,
  formatPrice,
  leaderboardType,
  setLeaderboardType,
  ugcModalOpen,
  setUgcModalOpen
}) => {
  const { selectedSection } = useQuickActionsSelection();
  const [loadedSections, setLoadedSections] = useState<Set<QuickActionKey>>(new Set());

  const handleSectionLoad = useCallback((section: QuickActionKey) => {
    setLoadedSections(prev => new Set([...prev, section]));
  }, []);

  const renderSection = (section: QuickActionKey) => {
    const isLoaded = loadedSections.has(section);
    const isVisible = selectedSection === section;

    // Track analytics for section switching
    if (isVisible && !isLoaded) {
      // Add analytics event
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'qa_inline_select', {
          sectionKey: section
        });
      }
      handleSectionLoad(section);
    }

    return (
      <div
        key={section}
        id={`panel-${section}`}
        role="tabpanel"
        aria-labelledby={`tab-${section}`}
        className={isVisible ? 'block' : 'hidden'}
      >
        <Suspense fallback={<SectionSkeleton />}>
          {section === 'dashboard' && (
            <DashboardSection 
              userProfile={userProfile}
              dashboardStats={dashboardStats}
              formatPrice={formatPrice}
              leaderboardType={leaderboardType}
              setLeaderboardType={setLeaderboardType}
            />
          )}
          {section === 'shop' && <ShopSection />}
          {section === 'ai' && <AiStudioSection onAiStudioOpen={onAiStudioOpen} />}
          {section === 'beauty' && <BeautySection />}
          {section === 'feed' && <FeedSection />}
          {section === 'wishlist' && <WishlistSection />}
          {section === 'explore' && <ExploreSection />}
          {section === 'ugc' && (
            <UgcSection 
              modalOpen={ugcModalOpen}
              setModalOpen={setUgcModalOpen}
            />
          )}
          {section === 'toy' && <ToySection onToyReplicaClick={onToyReplicaClick} />}
        </Suspense>
      </div>
    );
  };

  return (
    <div id="quick-actions-panel" className="min-h-[400px] px-4 pt-6">
      {['dashboard', 'shop', 'ai', 'beauty', 'feed', 'wishlist', 'explore', 'ugc', 'toy'].map(section => 
        renderSection(section as QuickActionKey)
      )}
    </div>
  );
};
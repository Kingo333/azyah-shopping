import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useAuth } from '@/contexts/AuthContext';
import { isGuestMode } from '@/hooks/useGuestMode';
import { ProfileCompletionCard } from './ProfileCompletionCard';
import { QuickSearchCard } from './QuickSearchCard';
import { PointsSummaryCard } from './PointsSummaryCard';
import { AiTryOnCard } from './AiTryOnCard';
import { StyleLinkCard } from './StyleLinkCard';
import { cn } from '@/lib/utils';

interface DashboardTopCarouselProps {
  showProfileCard?: boolean;
  showSearchCard?: boolean;
  showPointsCard?: boolean;
  showAiTryOnCard?: boolean;
  onOpenGlobalSearch: (query: string, tab?: 'products' | 'users' | 'brands') => void;
  onOpenAiTryOn?: () => void;
}

const DISMISS_KEY = 'profile-completion-dismissed';

export function DashboardTopCarousel({
  showProfileCard = true,
  showSearchCard = true,
  showPointsCard = true,
  showAiTryOnCard = true,
  onOpenGlobalSearch,
  onOpenAiTryOn
}: DashboardTopCarouselProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { percentage, isComplete, isLoading } = useProfileCompletion();
  const [isDismissed, setIsDismissed] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const isGuest = isGuestMode();

  // Check if banner was dismissed recently
  useEffect(() => {
    const dismissedData = localStorage.getItem(DISMISS_KEY);
    if (dismissedData) {
      const { timestamp } = JSON.parse(dismissedData);
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
      
      if (timestamp > twentyFourHoursAgo) {
        setIsDismissed(true);
      }
    }
  }, []);

  // Determine if profile card should be visible
  const profileCardVisible = showProfileCard && !isLoading && !isComplete && !isDismissed;

  // Build slides array based on visibility
  const slides: { key: string; component: React.ReactNode }[] = [];
  
  if (profileCardVisible) {
    slides.push({
      key: 'profile',
      component: (
        <ProfileCompletionCard
          percentage={percentage}
          onDismiss={() => {
            setIsDismissed(true);
            localStorage.setItem(DISMISS_KEY, JSON.stringify({ timestamp: Date.now() }));
          }}
          onGoToProfile={() => {
            const userRole = user?.user_metadata?.role;
            if (userRole === 'brand') {
              navigate('/brand-portal?tab=settings');
            } else if (userRole === 'retailer') {
              navigate('/retailer-portal?tab=settings');
            } else {
              navigate('/settings');
            }
          }}
        />
      )
    });
  }
  
  if (showSearchCard) {
    slides.push({
      key: 'search',
      component: <QuickSearchCard onOpenSearch={onOpenGlobalSearch} />
    });
  }
  
  if (showPointsCard) {
    slides.push({
      key: 'points',
      component: <PointsSummaryCard />
    });
  }
  
  if (showAiTryOnCard && onOpenAiTryOn) {
    slides.push({
      key: 'ai-tryon',
      component: <AiTryOnCard onTryNow={onOpenAiTryOn} />
    });
  }

  // Setup Embla carousel with autoplay
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    loop: true,
    skipSnaps: false
  }, [
    Autoplay({ 
      delay: 4000,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
      stopOnFocusIn: true
    })
  ]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Re-init carousel when slides change
  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
    }
  }, [emblaApi, slides.length]);

  // If no slides to show, return null (StyleLinkCard moved to RoleDashboard)
  if (slides.length === 0) {
    return null;
  }

  // If only one slide, show it full width
  if (slides.length === 1) {
    return (
      <div className="px-4 pt-4">
        <div className="w-full">
          {slides[0].component}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4">
      <div className="w-full">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-3">
            {slides.map((slide) => (
              <div 
                key={slide.key}
                className="flex-[0_0_100%] min-w-0"
              >
                {slide.component}
              </div>
            ))}
          </div>
        </div>
        
        {/* Dot indicators */}
        {slides.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {slides.map((slide, index) => (
              <button
                key={slide.key}
                onClick={() => emblaApi?.scrollTo(index)}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-200",
                  index === selectedIndex 
                    ? "bg-[hsl(var(--azyah-maroon))] w-3" 
                    : "bg-muted-foreground/30"
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

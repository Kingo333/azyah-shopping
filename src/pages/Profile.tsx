import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SEOHead } from '@/components/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '@/components/DashboardHeader';
import GlobalSearch from '@/components/GlobalSearch';
import { ChevronRight, Gift, CalendarIcon, MapPin } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CATEGORY_TREE, getCategoryDisplayName } from '@/lib/categories';
import type { TopCategory } from '@/lib/categories';
import TrendingStylesCarousel from '@/components/TrendingStylesCarousel';
import { isGuestMode } from '@/hooks/useGuestMode';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useFollowBrands } from '@/hooks/useFollowBrands';

// Profile section components
import { ProfileSummaryCard } from '@/components/profile/ProfileSummaryCard';
import { YourFitPill } from '@/components/profile/YourFitPill';
import { FavoritesSection } from '@/components/profile/FavoritesSection';
import { BrandsSection } from '@/components/profile/BrandsSection';
import { PostsSection } from '@/components/profile/PostsSection';
import { ClosetOutfitsSection } from '@/components/dashboard/ClosetOutfitsSection';

interface UserProfile {
  id: string;
  name: string;
  role: 'shopper' | 'brand' | 'retailer' | 'admin';
  avatar_url?: string;
  email: string;
  username?: string;
  height?: string;
}

const Profile: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState('');
  const [searchInitialTab, setSearchInitialTab] = useState<'products' | 'users' | 'brands'>('products');

  const [selectedTrendingCategory, setSelectedTrendingCategory] = useState<TopCategory | null>(null);
  const [isTrendingFilterOpen, setIsTrendingFilterOpen] = useState(false);
  const [featuredEvent, setFeaturedEvent] = useState<any>(null);

  const { followedBrands } = useFollowBrands();

  // User posts count
  const { data: postsCount } = useQuery({
    queryKey: ['user-posts-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  // Load saved category selection
  useEffect(() => {
    const savedCategory = localStorage.getItem('selectedTrendingCategory');
    if (savedCategory && savedCategory !== 'null') {
      setSelectedTrendingCategory(savedCategory as TopCategory);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('selectedTrendingCategory', selectedTrendingCategory || 'null');
  }, [selectedTrendingCategory]);

  useEffect(() => {
    document.title = 'Profile - Azyah';
    const initializeProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        await fetchUserProfile();
        await fetchFeaturedEvent();
      } catch (error) {
        console.error('Error initializing profile:', error);
      } finally {
        setLoading(false);
      }
    };
    initializeProfile();
  }, [user]);

  const fetchFeaturedEvent = async () => {
    try {
      const { data, error }: { data: any; error: any } = await supabase
        .from('retail_events')
        .select('*, retailer:retailers(name, logo_url)')
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setFeaturedEvent(data);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    }
  };

  const fetchUserProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUserProfile(data);
      } else {
        const roleFromMetadata = user.user_metadata?.role || 'shopper';
        setUserProfile({
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: roleFromMetadata as any,
          email: user.email!,
        });
      }
    } catch (error) {
      console.error('Error with user profile:', error);
      const roleFromMetadata = user.user_metadata?.role || 'shopper';
      setUserProfile({
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        role: roleFromMetadata as any,
        email: user.email!,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  const isGuest = isGuestMode();

  if (!user && !isGuest) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Welcome to Azyah</h2>
          <p className="text-muted-foreground">Please sign in to access your profile</p>
          <Button onClick={() => navigate('/onboarding/signup')}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <SEOHead
        title="Profile - Azyah"
        description="Your personal fashion profile and wardrobe"
        key="profile-seo"
      />
      <div className="min-h-screen bg-[hsl(var(--azyah-ivory))]">
        <DashboardHeader onOpenSearch={() => setSearchOpen(true)} />

        <div className="space-y-0 pb-[calc(80px+env(safe-area-inset-bottom))]">

          {/* 1. Profile Summary */}
          <ProfileSummaryCard
            userProfile={userProfile}
            postsCount={postsCount || 0}
            brandsCount={followedBrands.length}
          />

          {/* 2. Your Fit (compact pill) */}
          <YourFitPill height={userProfile?.height} />

          {/* 3. Your Posts (carousel) */}
          <PostsSection />

          {/* 4. Your Favorites (carousel) */}
          <FavoritesSection />

          {/* 5. Trending Looks (smaller cards) */}
          <section className="px-4 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-serif font-medium text-foreground">Trending Looks</h2>
              <Popover open={isTrendingFilterOpen} onOpenChange={setIsTrendingFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 h-6 px-2 rounded-full text-[10px]">
                    <SlidersHorizontal className="h-2.5 w-2.5" />
                    {selectedTrendingCategory ? getCategoryDisplayName(selectedTrendingCategory).substring(0, 8) + '...' : 'All'}
                    <ChevronDown className="h-2.5 w-2.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-3" align="end">
                  <div className="space-y-2">
                    <div className="font-medium text-xs">Filter by Category</div>
                    <div className="grid gap-1">
                      <Button
                        variant={selectedTrendingCategory === null ? "default" : "ghost"}
                        size="sm"
                        className="justify-start h-7 text-xs"
                        onClick={() => {
                          setSelectedTrendingCategory(null);
                          setIsTrendingFilterOpen(false);
                        }}
                      >
                        All Categories
                      </Button>
                      {Object.keys(CATEGORY_TREE).map((category) => (
                        <Button
                          key={category}
                          variant={selectedTrendingCategory === category ? "default" : "ghost"}
                          size="sm"
                          className="justify-start h-7 text-xs"
                          onClick={() => {
                            setSelectedTrendingCategory(category as TopCategory);
                            setIsTrendingFilterOpen(false);
                          }}
                        >
                          {getCategoryDisplayName(category as TopCategory)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <TrendingStylesCarousel limit={8} categoryFilter={selectedTrendingCategory} />
          </section>

          {/* 6. Wardrobe (Create & Earn + Add Items) */}
          <ClosetOutfitsSection />

          {/* 7. Your Brands */}
          <BrandsSection />

          {/* 7. Events Section */}
          <section className="px-4 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-serif font-medium text-foreground">Events</h2>
              <Button
                variant="link"
                size="sm"
                onClick={() => navigate('/events')}
                className="text-muted-foreground hover:text-foreground text-xs p-0 h-auto gap-1"
              >
                View All
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {!featuredEvent ? (
              <div className="flex items-center justify-center py-3 text-sm text-muted-foreground">
                <CalendarIcon className="h-4 w-4 mr-2" />
                <span>No upcoming events</span>
              </div>
            ) : (
              <Card className="bg-card border shadow-sm overflow-hidden">
                <CardContent className="p-0 flex gap-3">
                  <div className="w-28 h-28 flex-shrink-0 bg-muted">
                    <img
                      src={featuredEvent.banner_image_url || featuredEvent.image_url || '/placeholder.svg'}
                      alt={featuredEvent.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 py-3 pr-3">
                    <h3 className="font-semibold text-sm mb-2 line-clamp-2">{featuredEvent.name}</h3>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        <span>
                          {new Date(featuredEvent.event_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{featuredEvent.location || 'Online'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          {/* 8. Benefits & Offers */}
          <section className="px-4 pt-4">
            <Card
              className="bg-card border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/rewards')}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Gift className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-foreground">Benefits & Offers</h3>
                  <p className="text-xs text-muted-foreground">Unlock perks from your activity</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </section>

        </div>

        {/* Global Search Modal */}
        <GlobalSearch
          isOpen={searchOpen}
          onClose={() => {
            setSearchOpen(false);
            setSearchInitialQuery('');
            setSearchInitialTab('products');
          }}
          initialQuery={searchInitialQuery}
          initialTab={searchInitialTab}
        />
      </div>
    </ErrorBoundary>
  );
};

export default Profile;

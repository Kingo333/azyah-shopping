import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SEOHead } from '@/components/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import DashboardHeader from '@/components/DashboardHeader';
import GlobalSearch from '@/components/GlobalSearch';

import { Settings, ChevronRight, Gift, CalendarIcon, MapPin } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CATEGORY_TREE, getCategoryDisplayName } from '@/lib/categories';
import type { TopCategory } from '@/lib/categories';
import TrendingStylesCarousel from '@/components/TrendingStylesCarousel';
import { isGuestMode } from '@/hooks/useGuestMode';
import { ClosetOutfitsSection } from '@/components/dashboard/ClosetOutfitsSection';
import { StyleLinkCardCompact } from '@/components/dashboard/StyleLinkCardCompact';
import { useUserTasteProfile } from '@/hooks/useUserTasteProfile';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  role: 'shopper' | 'brand' | 'retailer' | 'admin';
  avatar_url?: string;
  email: string;
}

const Profile: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { tasteProfile } = useUserTasteProfile();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState('');
  const [searchInitialTab, setSearchInitialTab] = useState<'products' | 'users' | 'brands'>('products');
  
  const [selectedTrendingCategory, setSelectedTrendingCategory] = useState<TopCategory | null>(null);
  const [isTrendingFilterOpen, setIsTrendingFilterOpen] = useState(false);
  const [featuredEvent, setFeaturedEvent] = useState<any>(null);

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
        const defaultProfile = {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: roleFromMetadata as 'shopper' | 'brand' | 'retailer' | 'admin',
          email: user.email!
        };
        setUserProfile(defaultProfile);
      }
    } catch (error) {
      console.error('Error with user profile:', error);
      const roleFromMetadata = user.user_metadata?.role || 'shopper';
      const fallbackProfile = {
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        role: roleFromMetadata as 'shopper' | 'brand' | 'retailer' | 'admin',
        email: user.email!
      };
      setUserProfile(fallbackProfile);
    }
  };

  const modelProgress = Math.round((tasteProfile?.preference_confidence || 0) * 100);

  // Compact progress ring component
  const CompactProgressRing = ({ progress, size = 48 }: { progress: number; size?: number }) => {
    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;
    
    return (
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} fill="none" className="stroke-primary/20" />
          <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} fill="none" className="stroke-primary transition-all duration-500" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary">
          {progress}%
        </span>
      </div>
    );
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

          {/* StyleLink Card */}
          <div className="px-4 pb-2">
            <div className="rounded-xl border bg-gradient-to-br from-[hsl(var(--azyah-maroon))]/5 to-background p-2 flex items-center gap-2">
              <StyleLinkCardCompact />
            </div>
          </div>

          {/* Style Profile Card */}
          <div className="px-4 pb-2">
            <Card className="p-3 bg-gradient-to-br from-primary/5 to-background border hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <CompactProgressRing progress={modelProgress} size={48} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">Style Profile</p>
                  <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                    Discover people with similar measurements
                  </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-[10px] px-2"
                    onClick={() => navigate('/swipe')}
                  >
                    Refine
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-[10px] px-2"
                    onClick={() => navigate('/explore?tab=your-fit')}
                  >
                    Your fit
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Trending Looks */}
          <section className="px-4 pt-3">
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

          {/* Wardrobe Section */}
          <ClosetOutfitsSection />

          {/* Events Section */}
          <section className="px-4 pt-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-serif font-medium text-foreground">Events</h2>
              <Button 
                variant="link" 
                size="sm" 
                onClick={() => navigate('/events')}
                className="text-[hsl(var(--azyah-maroon))] hover:text-[hsl(var(--azyah-maroon))]/80 text-xs p-0 h-auto"
              >
                View All
              </Button>
            </div>

            {!featuredEvent ? (
              <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
                <CalendarIcon className="h-4 w-4 mr-2" />
                <span>No upcoming events</span>
              </div>
            ) : (
              <Card className="bg-card border-border shadow-sm overflow-hidden">
                <CardContent className="p-0 flex gap-3">
                  <div className="w-32 h-32 flex-shrink-0 bg-muted">
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
                            month: 'short', day: 'numeric', year: 'numeric' 
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

          {/* Benefits & Offers */}
          <section className="px-4 pt-3">
            <Card 
              className="bg-card border-border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/rewards')}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[hsl(var(--azyah-maroon))]/10 flex items-center justify-center">
                  <Gift className="h-6 w-6 text-[hsl(var(--azyah-maroon))]" />
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

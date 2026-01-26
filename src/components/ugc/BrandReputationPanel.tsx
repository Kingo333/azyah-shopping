import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Star, MessageSquare, AlertTriangle, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface BrandReputationPanelProps {
  brandId: string;
  compact?: boolean; // For card badge vs modal panel
  onNavigateToTab?: (tab: 'reviews' | 'questions' | 'scams') => void;
}

interface BrandStats {
  id: string;
  name: string;
  avg_rating: number | null;
  reviews_count: number;
  questions_count: number;
  scams_count: number;
}

interface ReviewSnippet {
  id: string;
  title: string;
  rating: number;
  body: string | null;
  created_at: string;
  users?: {
    name: string;
  };
}

export const BrandReputationPanel: React.FC<BrandReputationPanelProps> = ({
  brandId,
  compact = false,
  onNavigateToTab
}) => {
  // Fetch brand stats from ugc_brand_stats view
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['brand-reputation-stats', brandId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ugc_brand_stats')
        .select('id, name, avg_rating, reviews_count, questions_count, scams_count')
        .eq('id', brandId)
        .single();

      if (error) {
        // Brand might not exist in UGC brands table, return null stats
        return null;
      }
      return data as BrandStats;
    },
    enabled: !!brandId
  });

  // Fetch top 2 review snippets
  const { data: reviews = [] } = useQuery({
    queryKey: ['brand-review-snippets', brandId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_reviews')
        .select('id, title, rating, body, created_at')
        .eq('brand_id', brandId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(2);

      if (error) return [];
      // Map to ReviewSnippet format
      return (data || []).map(r => ({
        ...r,
        users: { name: 'Creator' }
      })) as ReviewSnippet[];
    },
    enabled: !!brandId && !compact
  });

  // Compact badge view for collab cards
  if (compact) {
    if (statsLoading) {
      return <Skeleton className="h-5 w-16" />;
    }

    if (!stats || stats.reviews_count === 0) {
      return (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-muted-foreground">
          No reviews
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 flex items-center gap-1">
        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        <span>{stats.avg_rating?.toFixed(1) || '0.0'}</span>
        <span className="text-muted-foreground">({stats.reviews_count})</span>
      </Badge>
    );
  }

  // Full panel view for collab detail modal
  if (statsLoading) {
    return (
      <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const hasStats = stats && (stats.reviews_count > 0 || stats.questions_count > 0 || stats.scams_count > 0);

  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Star className="h-4 w-4" />
          Brand Reputation
        </h4>
        {stats?.scams_count && stats.scams_count > 0 && (
          <Badge variant="destructive" className="text-[10px]">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {stats.scams_count} report{stats.scams_count !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {!hasStats ? (
        <div className="text-center py-3 text-muted-foreground text-sm">
          <p>No reviews yet</p>
          {onNavigateToTab && (
            <Button
              variant="link"
              size="sm"
              className="text-xs p-0 h-auto mt-1"
              onClick={() => onNavigateToTab('reviews')}
            >
              Be the first to review
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Rating summary */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= (stats?.avg_rating || 0)
                      ? 'fill-primary text-primary'
                      : 'text-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-medium">
              {stats?.avg_rating?.toFixed(1) || '0.0'}
            </span>
            <span className="text-xs text-muted-foreground">
              ({stats?.reviews_count || 0} review{stats?.reviews_count !== 1 ? 's' : ''})
            </span>
          </div>

          {/* Review snippets */}
          {reviews.length > 0 && (
            <div className="space-y-2">
              {reviews.map((review) => (
                <div key={review.id} className="p-2 bg-background rounded border text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${
                            star <= review.rating
                              ? 'fill-primary text-primary'
                              : 'text-muted-foreground/30'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-muted-foreground">
                      {(review.users as any)?.name || 'Anonymous'}
                    </span>
                  </div>
                  <p className="font-medium line-clamp-1">{review.title}</p>
                  {review.body && (
                    <p className="text-muted-foreground line-clamp-2 mt-0.5">{review.body}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Quick links */}
          {onNavigateToTab && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onNavigateToTab('reviews')}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Reviews
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onNavigateToTab('questions')}
              >
                Q&A ({stats?.questions_count || 0})
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BrandReputationPanel;

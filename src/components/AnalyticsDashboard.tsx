
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ReactECharts from 'echarts-for-react';
import { 
  TrendingUp, 
  Eye, 
  Heart, 
  Bookmark,
  Users,
  Target,
  Calendar,
  Download,
  Smartphone,
  ThumbsUp,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useAnalyticsOverview, useConversionFunnel, useTimeSeriesAnalytics } from '@/hooks/useAnalytics';
import { useTopProducts } from '@/hooks/useTopProducts';
import { useRealtimeActivity } from '@/hooks/useRealtimeActivity';
import { motion } from 'framer-motion';

interface AnalyticsDashboardProps {
  brandId?: string;
  retailerId?: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  brandId,
  retailerId
}) => {
  const [dateRange, setDateRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState<'swipes' | 'likes' | 'wishlists'>('swipes');

  // Calculate date filters
  const getDateFilter = (range: string) => {
    const now = new Date();
    const startDate = new Date();
    
    switch (range) {
      case '1d':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    };
  };

  // Memoize stable values to prevent query key changes
  const dateFilter = useMemo(() => getDateFilter(dateRange), [dateRange]);
  const entityId = useMemo(() => brandId || retailerId, [brandId, retailerId]);
  const entityType = useMemo(() => brandId ? 'brand' : 'retailer', [brandId, retailerId]);
  
  const overviewQuery = useAnalyticsOverview({
    ...dateFilter,
    brandId,
    retailerId
  });

  const funnelQuery = useConversionFunnel({
    ...dateFilter,
    brandId,
    retailerId
  });

  const timeSeriesQuery = useTimeSeriesAnalytics(
    selectedMetric,
    'day',
    dateFilter,
    entityId,
    entityType
  );

  // Queries for real product data
  const topProductsQuery = useTopProducts(brandId, retailerId, 6);
  const realtimeActivityQuery = useRealtimeActivity(brandId, retailerId, 8);

  // Extract data with explicit fallbacks
  const overview = overviewQuery.data || {
    swipe_appearances: 0,
    right_swipes: 0,
    wishlist_swipes: 0,
    likes: 0,
    engagement_rate: 0
  };
  
  const funnelData = funnelQuery.data || [];
  const timeSeriesData = timeSeriesQuery.data || [];
  
  const isOverviewLoading = overviewQuery.isLoading;
  const isFunnelLoading = funnelQuery.isLoading;
  const isTimeSeriesLoading = timeSeriesQuery.isLoading;
  
  const hasOverviewError = overviewQuery.isError;

  // Chart configurations
  const getLineChartOption = () => ({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: timeSeriesData?.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }) || [],
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      name: selectedMetric === 'swipes' ? 'Swipe Appearances' : selectedMetric === 'likes' ? 'Likes' : 'Wishlist Saves',
      type: 'line',
      data: timeSeriesData?.map(d => d.value) || [],
      smooth: true,
      areaStyle: {
        opacity: 0.3
      },
      itemStyle: {
        color: selectedMetric === 'swipes' ? '#3b82f6' : selectedMetric === 'likes' ? '#ef4444' : '#8b5cf6'
      }
    }]
  });

  // Metric cards data
  const metricCards = useMemo(() => [
    {
      title: 'Swipe Appearances',
      value: overview.swipe_appearances,
      icon: Smartphone,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      tooltip: 'Times your products appeared in users\' swipe deck'
    },
    {
      title: 'Right Swipes',
      value: overview.right_swipes,
      icon: ThumbsUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      tooltip: 'Users who swiped right to like your products'
    },
    {
      title: 'Wishlist Saves',
      value: overview.likes,
      icon: Heart,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      tooltip: 'Products saved to users\' liked items'
    },
    {
      title: 'Engagement Rate',
      value: `${overview.engagement_rate}%`,
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      tooltip: '(Right swipes + Wishlist saves) / Total swipe appearances'
    }
  ], [overview]);

  // Funnel stage icons config
  const funnelStageConfig: Record<string, { icon: any; color: string }> = {
    'Swipe Appearances': { icon: Smartphone, color: 'bg-blue-100 text-blue-600' },
    'Right Swipes (Likes)': { icon: ThumbsUp, color: 'bg-green-100 text-green-600' },
    'Wishlist Saves': { icon: Bookmark, color: 'bg-pink-100 text-pink-600' },
    'Saved to Likes': { icon: Heart, color: 'bg-purple-100 text-purple-600' }
  };

  // Activity type labels and colors
  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'swipe_right': return { label: 'Liked', color: 'bg-green-500' };
      case 'swipe_left': return { label: 'Passed', color: 'bg-gray-400' };
      case 'swipe_up': return { label: 'Saved to wishlist', color: 'bg-purple-500' };
      case 'wishlist': return { label: 'Added to wishlist', color: 'bg-purple-500' };
      case 'like': return { label: 'Saved to likes', color: 'bg-red-500' };
      default: return { label: 'Interacted', color: 'bg-blue-500' };
    }
  };

  // Show loading state
  if (isOverviewLoading || isFunnelLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (hasOverviewError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-muted-foreground">Failed to load analytics data. Please try again.</p>
              <Button 
                variant="outline" 
                onClick={() => {
                  overviewQuery.refetch();
                  funnelQuery.refetch();
                  timeSeriesQuery.refetch();
                }}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl lg:text-2xl font-bold text-foreground">Swipe Analytics</h2>
            <Badge variant="secondary" className="text-xs">
              <Smartphone className="h-3 w-3 mr-1" />
              Swipe Mode
            </Badge>
          </div>
          <p className="text-sm lg:text-base text-muted-foreground">Track how users interact with your products in swipe mode</p>
        </div>
        
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-xs lg:text-sm font-medium text-muted-foreground">
                        {metric.title}
                      </p>
                      <InfoTooltip content={metric.tooltip} />
                    </div>
                    <p className="text-xl lg:text-2xl font-bold">{typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}</p>
                  </div>
                  <div className={`p-2 lg:p-3 rounded-full ${metric.bgColor}`}>
                    <metric.icon className={`h-4 w-4 lg:h-6 lg:w-6 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="funnel">User Journey</TabsTrigger>
          <TabsTrigger value="performance">Products</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">Daily Trends</CardTitle>
                  <InfoTooltip content="See how your metrics change day by day" />
                </div>
                <Select value={selectedMetric} onValueChange={(value: any) => setSelectedMetric(value)}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="swipes">Swipe Appearances</SelectItem>
                    <SelectItem value="likes">Likes</SelectItem>
                    <SelectItem value="wishlists">Wishlist Saves</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {(() => {
                  const values = timeSeriesData?.map(d => d.value) || [];
                  const total = values.reduce((sum, val) => sum + (val || 0), 0);
                  const average = values.length > 0 ? total / values.length : 0;
                  const max = values.length > 0 ? Math.max(...values) : 0;
                  
                  // Calculate trend
                  const recent = values.slice(-3).reduce((sum, val) => sum + (val || 0), 0) / 3;
                  const earlier = values.slice(0, 3).reduce((sum, val) => sum + (val || 0), 0) / 3;
                  const trendUp = recent >= earlier;
                  
                  return (
                    <>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-lg font-bold">{total.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-lg font-bold">{Math.round(average).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Daily Avg</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-lg font-bold">{max.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Best Day</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-center gap-1">
                          {trendUp ? (
                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-600" />
                          )}
                          <p className={`text-lg font-bold ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
                            {trendUp ? 'Up' : 'Down'}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">Trend</p>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="h-64 lg:h-80">
                {isTimeSeriesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : (
                  <ReactECharts 
                    option={getLineChartOption()} 
                    style={{ height: '100%', width: '100%' }}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">User Journey</CardTitle>
                <Badge variant="outline" className="text-xs">Swipe Mode</Badge>
                <InfoTooltip content="How users progress from seeing your products to saving them" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isFunnelLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : funnelData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No data available yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {funnelData.map((stage, index) => {
                      const config = funnelStageConfig[stage.stage] || 
                        { icon: Eye, color: 'bg-gray-100 text-gray-600' };
                      const Icon = config.icon;
                      
                      return (
                        <div key={stage.stage} className="flex items-center gap-4 p-3 bg-accent/30 rounded-lg">
                          <div className={`p-2 rounded-full ${config.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm truncate">{stage.stage}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold">{stage.count.toLocaleString()}</span>
                                {index > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {stage.conversion_rate.toFixed(1)}%
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 mt-2">
                              <div 
                                className="h-2 rounded-full bg-primary transition-all duration-700"
                                style={{ width: `${Math.min(stage.percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {/* Conversion Insights */}
              {funnelData.length > 0 && (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {funnelData.length > 1 ? 
                          ((funnelData[1]?.count || 0) / (funnelData[0]?.count || 1) * 100).toFixed(1) : 
                          '0'
                        }%
                      </p>
                      <p className="text-sm text-muted-foreground">Like Rate</p>
                      <p className="text-xs text-muted-foreground mt-1">Users who swiped right</p>
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {funnelData.length > 2 ? 
                          ((funnelData[2]?.count || 0) / (funnelData[0]?.count || 1) * 100).toFixed(1) : 
                          '0'
                        }%
                      </p>
                      <p className="text-sm text-muted-foreground">Save Rate</p>
                      <p className="text-xs text-muted-foreground mt-1">Users who added to wishlist</p>
                    </div>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">Top Products</CardTitle>
                  <Badge variant="outline" className="text-xs">Swipe Mode</Badge>
                  <InfoTooltip content="Products ranked by swipe appearances and engagement in swipe mode" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topProductsQuery.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : topProductsQuery.error ? (
                    <div className="text-center py-8 text-destructive">
                      Error loading products
                    </div>
                  ) : !topProductsQuery.data || topProductsQuery.data.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No product data available yet
                    </div>
                  ) : (
                    topProductsQuery.data.map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.swipe_appearances} appearances • {product.right_swipes} likes • {product.wishlist_adds} saves
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {product.engagement_rate.toFixed(1)}%
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <Badge variant="outline" className="text-xs">Live</Badge>
                  <InfoTooltip content="Real-time swipe interactions with your products" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {realtimeActivityQuery.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : realtimeActivityQuery.error ? (
                    <div className="text-center py-8 text-destructive">
                      Error loading activity
                    </div>
                  ) : !realtimeActivityQuery.data || realtimeActivityQuery.data.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No recent activity
                    </div>
                  ) : (
                    realtimeActivityQuery.data.map((activity) => {
                      const { label, color } = getActivityLabel(activity.type);
                      return (
                        <div key={activity.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                          <div className={`w-2 h-2 rounded-full animate-pulse ${color}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">
                              {label} - {activity.product_title}
                              {activity.count && activity.count > 1 && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  {activity.count}x
                                </Badge>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{activity.time_ago}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

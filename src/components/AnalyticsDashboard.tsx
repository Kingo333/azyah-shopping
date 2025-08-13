
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
  MousePointer, 
  Heart, 
  ShoppingCart, 
  DollarSign,
  Users,
  Target,
  Calendar,
  Download,
  ExternalLink
} from 'lucide-react';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useAnalyticsOverview, useConversionFunnel, useTimeSeriesAnalytics } from '@/hooks/useAnalytics';
import { useTopProducts } from '@/hooks/useTopProducts';
import { useRealtimeActivity } from '@/hooks/useRealtimeActivity';
import { CustomerJourneyFlow } from '@/components/CustomerJourneyFlow';
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
  const [selectedMetric, setSelectedMetric] = useState<'impressions' | 'clicks' | 'conversions' | 'revenue'>('impressions');

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

  // New queries for real product data
  const topProductsQuery = useTopProducts(brandId, retailerId, 6);
  const realtimeActivityQuery = useRealtimeActivity(brandId, retailerId, 8);

  // Debug logging for React Query states
  console.log('Analytics Debug Info:', {
    overviewQuery: {
      isLoading: overviewQuery.isLoading,
      isError: overviewQuery.isError,
      error: overviewQuery.error,
      data: overviewQuery.data,
      status: overviewQuery.status
    },
    funnelQuery: {
      isLoading: funnelQuery.isLoading,
      isError: funnelQuery.isError,
      data: funnelQuery.data,
      status: funnelQuery.status
    },
    timeSeriesQuery: {
      isLoading: timeSeriesQuery.isLoading,
      isError: timeSeriesQuery.isError,
      data: timeSeriesQuery.data,
      status: timeSeriesQuery.status
    }
  });

  // Extract data with explicit fallbacks and validation
  const overview = overviewQuery.data || {
    impressions: 0,
    clicks: 0,
    ctr: 0,
    wishlist_adds: 0,
    conversions: 0,
    revenue_cents: 0
  };
  
  const funnelData = funnelQuery.data || [];
  const timeSeriesData = timeSeriesQuery.data || [];
  
  const isOverviewLoading = overviewQuery.isLoading;
  const isFunnelLoading = funnelQuery.isLoading;
  const isTimeSeriesLoading = timeSeriesQuery.isLoading;
  
  const hasOverviewError = overviewQuery.isError;
  const hasFunnelError = funnelQuery.isError;
  const hasTimeSeriesError = timeSeriesQuery.isError;

  // Chart configurations
  const getLineChartOption = () => ({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: [selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)]
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: timeSeriesData?.map(d => new Date(d.date).toLocaleDateString()) || [],
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      name: selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1),
      type: 'line',
      data: timeSeriesData?.map(d => d.value) || [],
      smooth: true,
      itemStyle: {
        color: '#8b5cf6'
      }
    }]
  });

  const getFunnelChartOption = () => ({
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b} : {c}%'
    },
    series: [{
      name: 'Conversion Funnel',
      type: 'funnel',
      left: '10%',
      top: 60,
      bottom: 60,
      width: '80%',
      data: funnelData?.map(stage => ({
        value: stage.conversion_rate,
        name: stage.stage
      })) || []
    }]
  });

  // Funnel stage explanations
  const funnelStageTooltips = {
    'Product Views': 'Users browsing and viewing products in your catalog',
    'External Store Clicks': 'Users clicking "Shop Now" to visit the retailer\'s website',
    'Wishlist Additions': 'Users saving products to their wishlist for later',
    'Tracked Conversions': 'Estimated purchases when users buy on external retailer sites'
  };

  // Metric cards data with explicit data validation
  const metricCards = useMemo(() => [
    {
      title: 'Product Views',
      value: overview.impressions,
      icon: Eye,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: '+12.5%',
      tooltip: 'Total times your products were viewed by users'
    },
    {
      title: 'Shop Now Clicks',
      value: overview.clicks,
      icon: ExternalLink,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: '+8.2%',
      tooltip: 'Users who clicked "Shop Now" to visit retailer websites - your main traffic driver'
    },
    {
      title: 'Wishlist Saves',
      value: overview.wishlist_adds,
      icon: Heart,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      change: '+15.3%',
      tooltip: 'Products saved to wishlists - indicates strong purchase intent'
    },
    {
      title: 'Actual Purchases',
      value: overview.conversions,
      icon: ShoppingCart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      change: '+22.1%',
      tooltip: 'Confirmed purchases completed after clicking through to retailer sites'
    },
    {
      title: 'Revenue Generated',
      value: `$${(overview.revenue_cents / 100).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      change: '+18.7%',
      tooltip: 'Total revenue from Shop Now clicks leading to purchases'
    }
  ], [overview]);

  // Show loading state or error handling
  if (isOverviewLoading || isFunnelLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
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

  // Show error state if queries failed
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
          <h2 className="text-xl lg:text-2xl font-bold text-foreground">Analytics Dashboard</h2>
          <p className="text-sm lg:text-base text-muted-foreground">Track your performance metrics and insights</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {metricCards.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        {metric.title}
                      </p>
                      <InfoTooltip content={metric.tooltip} />
                    </div>
                    <p className="text-2xl font-bold">{metric.value}</p>
                    <Badge variant="secondary" className="mt-1">
                      {metric.change}
                    </Badge>
                  </div>
                  <div className={`p-3 rounded-full ${metric.bgColor}`}>
                    <metric.icon className={`h-6 w-6 ${metric.color}`} />
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
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle>Performance Trends</CardTitle>
                  <InfoTooltip content="Track how your metrics change over time. Select different metrics to see their trends." />
                </div>
                <Select value={selectedMetric} onValueChange={(value: any) => setSelectedMetric(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="impressions">Product Views</SelectItem>
                    <SelectItem value="clicks">External Clicks</SelectItem>
                    <SelectItem value="conversions">Conversions</SelectItem>
                    <SelectItem value="revenue">Est. Revenue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {/* Data Summary Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
                {(() => {
                  const values = timeSeriesData?.map(d => d.value) || [];
                  const total = values.reduce((sum, val) => sum + (val || 0), 0);
                  const average = values.length > 0 ? total / values.length : 0;
                  const max = values.length > 0 ? Math.max(...values) : 0;
                  const min = values.length > 0 ? Math.min(...values) : 0;
                  
                  return (
                    <>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-lg font-bold text-blue-600">{total.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-lg font-bold text-green-600">{Math.round(average).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Daily Average</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <p className="text-lg font-bold text-purple-600">{max.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Peak Day</p>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <p className="text-lg font-bold text-orange-600">{min.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Lowest Day</p>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="h-80">
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

              {/* Additional Insights */}
              <div className="mt-4 p-4 bg-accent/30 rounded-lg">
                <h4 className="font-medium mb-2">Quick Insights</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  {(() => {
                    const values = timeSeriesData?.map(d => d.value) || [];
                    if (values.length < 2) return <p>Not enough data for trend analysis</p>;
                    
                    const recent = values.slice(-3).reduce((sum, val) => sum + (val || 0), 0) / 3;
                    const earlier = values.slice(0, 3).reduce((sum, val) => sum + (val || 0), 0) / 3;
                    const trend = recent > earlier ? 'increasing' : recent < earlier ? 'decreasing' : 'stable';
                    const trendColor = trend === 'increasing' ? 'text-green-600' : trend === 'decreasing' ? 'text-red-600' : 'text-muted-foreground';
                    
                    return (
                      <>
                        <p>Your {selectedMetric} trend is <span className={`font-medium ${trendColor}`}>{trend}</span> over the selected period.</p>
                        <p>Recent 3-day average: <span className="font-medium">{Math.round(recent).toLocaleString()}</span></p>
                      </>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Customer Journey Funnel</CardTitle>
                <InfoTooltip content="Shows how users progress from viewing products to making purchases. Each stage shows conversion rates to the next level." />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Enhanced Visual Funnel */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Conversion Flow</h3>
                  <div className="space-y-3">
                    {funnelData.map((stage, index) => {
                      const nextStage = funnelData[index + 1];
                      const dropOffRate = nextStage ? 
                        ((stage.count - nextStage.count) / stage.count * 100).toFixed(1) : 
                        '0';
                      
                      return (
                        <div key={stage.stage} className="relative">
                          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-lg border">
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`w-3 h-3 rounded-full ${
                                index === 0 ? 'bg-green-500' :
                                index === 1 ? 'bg-blue-500' :
                                index === 2 ? 'bg-purple-500' : 'bg-orange-500'
                              }`} />
                              <div className="flex-1">
                                <p className="font-medium">{stage.stage}</p>
                                <p className="text-sm text-muted-foreground">
                                  {stage.count.toLocaleString()} users ({stage.percentage.toFixed(1)}%)
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold">{stage.count.toLocaleString()}</p>
                              {nextStage && (
                                <p className="text-sm text-red-500">
                                  -{dropOffRate}% drop-off
                                </p>
                              )}
                            </div>
                          </div>
                          {index < funnelData.length - 1 && (
                            <div className="flex justify-center my-2">
                              <div className="w-0.5 h-4 bg-border" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Customer Journey Flow */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Customer Journey Flow</h3>
                  <div className="space-y-4">
                    {isFunnelLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                      </div>
                    ) : hasFunnelError ? (
                      <div className="text-center py-8 text-destructive">
                        Error loading funnel data
                      </div>
                    ) : funnelData.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No funnel data available
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {funnelData.map((stage, index) => {
                          const stageIcons = {
                            'Product Views': { icon: Eye, color: 'bg-blue-100 text-blue-600' },
                            'External Store Clicks': { icon: ExternalLink, color: 'bg-green-100 text-green-600' },
                            'Wishlist Additions': { icon: Heart, color: 'bg-pink-100 text-pink-600' },
                            'Actual Purchases': { icon: ShoppingCart, color: 'bg-purple-100 text-purple-600' }
                          };
                          
                          const config = stageIcons[stage.stage as keyof typeof stageIcons] || 
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
                                    style={{ width: `${stage.percentage}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Conversion Insights */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {funnelData.length > 1 ? 
                        ((funnelData[1]?.count || 0) / (funnelData[0]?.count || 1) * 100).toFixed(1) : 
                        '0'
                      }%
                    </p>
                    <p className="text-sm text-muted-foreground">View to Click Rate</p>
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
                    <p className="text-sm text-muted-foreground">View to Wishlist Rate</p>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">
                      {funnelData.length > 3 ? 
                        ((funnelData[3]?.count || 0) / (funnelData[0]?.count || 1) * 100).toFixed(1) : 
                        '0'
                      }%
                    </p>
                    <p className="text-sm text-muted-foreground">Overall Conversion Rate</p>
                  </div>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Top Performing Products</CardTitle>
                  <InfoTooltip content="Products ranked by views, likes, and estimated revenue. Performance based on user interactions within the app." />
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
                         <div>
                           <p className="font-medium">{product.title}</p>
                           <p className="text-sm text-muted-foreground">
                             {product.views} views • {product.likes} likes • ${product.est_revenue} est. revenue
                           </p>
                         </div>
                         <Badge variant="secondary">
                           {product.engagement_rate.toFixed(1)}% engagement
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
                  <CardTitle>Real-time Activity</CardTitle>
                  <InfoTooltip content="Live feed of user interactions with your products. Shows recent views, wishlist additions, and AR try-ons." />
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
                     realtimeActivityQuery.data.map((activity) => (
                       <div key={activity.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                         <div className={`w-2 h-2 rounded-full animate-pulse ${
                           activity.type === 'view' ? 'bg-blue-500' :
                           activity.type === 'click' ? 'bg-green-500' :
                           activity.type === 'like' ? 'bg-red-500' :
                           'bg-purple-500'
                         }`} />
                         <div className="flex-1 min-w-0">
                           <p className="text-sm truncate">
                             {activity.type === 'view' ? 'Product viewed' :
                              activity.type === 'click' ? 'Shop Now clicked' :
                              activity.type === 'like' ? 'Product liked' :
                              'Added to wishlist'} - {activity.product_title}
                             {activity.count && activity.count > 1 && (
                               <Badge variant="secondary" className="ml-2 text-xs">
                                 {activity.count}x
                               </Badge>
                             )}
                           </p>
                           <p className="text-xs text-muted-foreground">{activity.time_ago}</p>
                         </div>
                       </div>
                     ))
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

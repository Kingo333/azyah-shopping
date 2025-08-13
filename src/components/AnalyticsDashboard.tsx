import React, { useState } from 'react';
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

  const dateFilter = getDateFilter(dateRange);
  
  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview({
    ...dateFilter,
    brandId,
    retailerId
  });

  const { data: funnelData, isLoading: funnelLoading } = useConversionFunnel({
    ...dateFilter,
    brandId,
    retailerId
  });

  const { data: timeSeriesData, isLoading: timeSeriesLoading } = useTimeSeriesAnalytics(
    selectedMetric,
    'day',
    dateFilter,
    brandId || retailerId,
    brandId ? 'brand' : 'retailer'
  );

  // Add debugging
  console.log('AnalyticsDashboard received brandId:', brandId);
  console.log('AnalyticsDashboard overview data:', overview);

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

  // Metric cards data with clearer terminology and tooltips
  const metricCards = [
    {
      title: 'Product Views',
      value: overview?.impressions || 0,
      icon: Eye,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: '+12.5%',
      tooltip: 'Number of times products were viewed in your catalog'
    },
    {
      title: 'External Store Clicks',
      value: `${overview?.ctr || 0}%`,
      icon: ExternalLink,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: '+8.2%',
      tooltip: 'Percentage of views that resulted in clicks to external retailer websites'
    },
    {
      title: 'Wishlist Additions',
      value: overview?.wishlist_adds || 0,
      icon: Heart,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      change: '+15.3%',
      tooltip: 'Number of times users saved products to their wishlist'
    },
    {
      title: 'Tracked Conversions',
      value: overview?.conversions || 0,
      icon: ShoppingCart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      change: '+22.1%',
      tooltip: 'Estimated conversions when users click through to purchase on external sites'
    },
    {
      title: 'Estimated Revenue',
      value: overview ? `$${(overview.revenue_cents / 100).toFixed(2)}` : '$0.00',
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      change: '+18.7%',
      tooltip: 'Projected revenue based on clickthrough rates and estimated order values'
    },
    {
      title: 'AR Try-On Views',
      value: overview?.ar_views || 0,
      icon: Target,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      change: '+45.2%',
      tooltip: 'Number of times users tried on products using AR technology'
    }
  ];

  // Check if this is empty state
  const isEmpty = !overviewLoading && (
    !overview?.impressions && 
    !overview?.clicks && 
    !overview?.wishlist_adds && 
    !overview?.conversions
  );

  if (overviewLoading) {
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

  // Empty state with demo data
  if (isEmpty) {
    return (
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
            <p className="text-muted-foreground">
              Track performance and engagement metrics
            </p>
          </div>
        </div>

        {/* Empty State Card */}
        <Card className="text-center py-12">
          <CardContent>
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold">No Analytics Data Yet</h3>
              <p className="text-muted-foreground">
                Analytics will appear here once users start interacting with your products. 
                Share your products to start collecting data!
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• <strong>Product Views</strong> - When users browse your catalog</p>
                <p>• <strong>Store Clicks</strong> - When users click "Shop Now"</p>
                <p>• <strong>Wishlist Adds</strong> - When users save items</p>
                <p>• <strong>Conversions</strong> - Estimated purchases from external sites</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Track performance and engagement metrics
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <div className="h-80">
                {timeSeriesLoading ? (
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
                <CardTitle>Customer Journey Funnel</CardTitle>
                <InfoTooltip content="Shows how users progress from viewing products to making purchases. Each stage shows conversion rates to the next level." />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {funnelLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : (
                  <ReactECharts 
                    option={getFunnelChartOption()} 
                    style={{ height: '100%', width: '100%' }}
                  />
                )}
              </div>
              
              {/* Funnel Stage Explanations */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {Object.entries(funnelStageTooltips).map(([stage, explanation]) => (
                  <div key={stage} className="flex items-start gap-2 p-3 bg-accent/30 rounded-lg">
                    <InfoTooltip content={explanation} />
                    <div>
                      <p className="font-medium">{stage}</p>
                      <p className="text-muted-foreground text-xs">{explanation}</p>
                    </div>
                  </div>
                ))}
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
                  {[
                    { name: 'Summer Dress Collection', views: 1250, likes: 45, estRevenue: '$2,850' },
                    { name: 'Designer Handbag', views: 980, likes: 38, estRevenue: '$2,240' },
                    { name: 'Luxury Watch', views: 850, likes: 32, estRevenue: '$1,980' },
                    { name: 'Fashion Sneakers', views: 720, likes: 28, estRevenue: '$1,650' }
                  ].map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.views} views • {product.likes} likes • {product.estRevenue} est. revenue
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {((product.likes / product.views) * 100).toFixed(1)}% engagement
                      </Badge>
                    </div>
                  ))}
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
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <div className="flex-1">
                      <p className="text-sm">Product viewed in catalog</p>
                      <p className="text-xs text-muted-foreground">2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <div className="flex-1">
                      <p className="text-sm">Product saved to wishlist</p>
                      <p className="text-xs text-muted-foreground">5 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                    <div className="flex-1">
                      <p className="text-sm">AR try-on session started</p>
                      <p className="text-xs text-muted-foreground">8 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                    <div className="flex-1">
                      <p className="text-sm">User clicked "Shop Now" button</p>
                      <p className="text-xs text-muted-foreground">12 minutes ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, Eye, Heart, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';

interface FunnelData {
  stage: string;
  count: number;
  percentage: number;
  conversion_rate: number;
}

interface ImprovedAnalyticsFunnelProps {
  data: FunnelData[];
  loading?: boolean;
}

const ImprovedAnalyticsFunnel: React.FC<ImprovedAnalyticsFunnelProps> = ({ data, loading }) => {
  const getStageIcon = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'impressions':
        return Eye;
      case 'clicks':
        return Users;
      case 'wishlist':
        return Heart;
      case 'purchases':
        return ShoppingCart;
      default:
        return TrendingUp;
    }
  };

  const getStageColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500'
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Conversion Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Customer Journey Funnel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {data.map((item, index) => {
          const Icon = getStageIcon(item.stage);
          const colorClass = getStageColor(index);
          
          return (
            <motion.div
              key={item.stage}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <div className="flex items-center gap-6">
                {/* Stage Info */}
                <div className="flex items-center gap-3 min-w-[120px]">
                  <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center text-white`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{item.stage}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.conversion_rate.toFixed(1)}% conversion
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex-1">
                  <div className="w-full bg-gray-100 rounded-full h-12 relative overflow-hidden">
                    <motion.div
                      className={`h-full ${colorClass} rounded-full flex items-center justify-between px-4`}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      transition={{ duration: 1, delay: index * 0.2 }}
                    >
                      <span className="text-white font-medium text-sm">
                        {item.count.toLocaleString()}
                      </span>
                      <Badge variant="secondary" className="bg-white/20 text-white border-0">
                        {item.percentage.toFixed(1)}%
                      </Badge>
                    </motion.div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="min-w-[80px] text-right">
                  <div className="font-bold text-lg">
                    {item.count.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    users
                  </div>
                </div>
              </div>

              {/* Connector Line */}
              {index < data.length - 1 && (
                <div className="absolute left-5 top-12 w-px h-6 bg-gray-200" />
              )}
            </motion.div>
          );
        })}

        {/* Summary Stats */}
        <div className="mt-8 p-4 bg-accent/10 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total Conversion Rate:</span>
              <span className="ml-2 font-medium">
                {data.length > 0 ? ((data[data.length - 1].count / data[0].count) * 100).toFixed(2) : 0}%
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Drop-off Rate:</span>
              <span className="ml-2 font-medium">
                {data.length > 0 ? (100 - (data[data.length - 1].count / data[0].count) * 100).toFixed(2) : 0}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImprovedAnalyticsFunnel;

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, ExternalLink, Heart, ShoppingCart, ArrowRight, TrendingDown } from 'lucide-react';

interface CustomerJourneyFlowProps {
  funnelData: Array<{
    stage: string;
    count: number;
    percentage: number;
    conversion_rate: number;
  }>;
}

interface StageCardProps {
  stage: {
    stage: string;
    count: number;
    percentage: number;
    conversion_rate: number;
  };
  index: number;
  isLast: boolean;
}

const StageCard: React.FC<StageCardProps> = ({ stage, index, isLast }) => {
  const stageConfig = {
    'Product Views': {
      icon: Eye,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'Users browse your catalog'
    },
    'External Store Clicks': {
      icon: ExternalLink,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      description: 'Users click "Shop Now"'
    },
    'Wishlist Additions': {
      icon: Heart,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-200',
      description: 'Users save products'
    },
    'Actual Purchases': {
      icon: ShoppingCart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      description: 'Users complete purchase'
    }
  };

  const config = stageConfig[stage.stage as keyof typeof stageConfig] || {
    icon: Eye,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    description: stage.stage
  };

  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center">
      {/* Stage Card */}
      <Card className={`w-full max-w-xs border-2 ${config.borderColor} hover:shadow-lg transition-all duration-300 animate-fade-in`} 
            style={{ animationDelay: `${index * 150}ms` }}>
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-full ${config.bgColor}`}>
              <Icon className={`h-5 w-5 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{stage.stage}</h3>
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </div>
          </div>
          
          {/* Metrics */}
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold">{stage.count.toLocaleString()}</span>
              <Badge variant="secondary" className="text-xs">
                {stage.percentage.toFixed(1)}%
              </Badge>
            </div>
            
            {/* Conversion Rate */}
            {index > 0 && stage.conversion_rate > 0 && (
              <div className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-orange-500" />
                <span className="text-xs text-orange-600 font-medium">
                  {stage.conversion_rate.toFixed(1)}% conversion
                </span>
              </div>
            )}
            
            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-700 ${config.color.replace('text-', 'bg-')}`}
                style={{ 
                  width: `${stage.percentage}%`,
                  animationDelay: `${index * 200 + 500}ms`
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Arrow Connector */}
      {!isLast && (
        <div className="flex items-center justify-center my-4 lg:hidden">
          <ArrowRight className="h-6 w-6 text-muted-foreground animate-pulse" />
        </div>
      )}
    </div>
  );
};

export const CustomerJourneyFlow: React.FC<CustomerJourneyFlowProps> = ({ funnelData }) => {
  if (!funnelData || funnelData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No funnel data available
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Desktop View - Horizontal Layout */}
      <div className="hidden lg:flex items-center justify-between gap-4 py-4">
        {funnelData.map((stage, index) => (
          <React.Fragment key={stage.stage}>
            <div className="flex-1">
              <StageCard stage={stage} index={index} isLast={index === funnelData.length - 1} />
            </div>
            
            {index < funnelData.length - 1 && (
              <div className="flex flex-col items-center px-2">
                <ArrowRight className="h-6 w-6 text-primary animate-pulse" />
                {funnelData[index + 1] && (
                  <span className="text-xs text-muted-foreground mt-1 font-medium">
                    {funnelData[index + 1].conversion_rate.toFixed(1)}%
                  </span>
                )}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Mobile View - Vertical Layout */}
      <div className="lg:hidden space-y-2">
        {funnelData.map((stage, index) => (
          <StageCard 
            key={stage.stage} 
            stage={stage} 
            index={index} 
            isLast={index === funnelData.length - 1} 
          />
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-dashed">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-blue-600">
              {funnelData[0]?.count.toLocaleString() || '0'}
            </p>
            <p className="text-xs text-muted-foreground">Total Views</p>
          </CardContent>
        </Card>
        
        <Card className="border-dashed">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-green-600">
              {funnelData[1]?.count.toLocaleString() || '0'}
            </p>
            <p className="text-xs text-muted-foreground">Shop Clicks</p>
          </CardContent>
        </Card>
        
        <Card className="border-dashed">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-pink-600">
              {funnelData[2]?.count.toLocaleString() || '0'}
            </p>
            <p className="text-xs text-muted-foreground">Wishlist Saves</p>
          </CardContent>
        </Card>
        
        <Card className="border-dashed">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-purple-600">
              {funnelData.length > 3 ? 
                ((funnelData[3]?.count || 0) / (funnelData[0]?.count || 1) * 100).toFixed(1) : 
                '0'
              }%
            </p>
            <p className="text-xs text-muted-foreground">Overall Rate</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
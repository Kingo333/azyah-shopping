
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface FunnelData {
  stage: string;
  count: number;
  percentage: number;
}

interface AnalyticsFunnelProps {
  data: FunnelData[];
  loading?: boolean;
}

const AnalyticsFunnel: React.FC<AnalyticsFunnelProps> = ({ data, loading }) => {
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
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
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
          Conversion Funnel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={item.stage} className="flex items-center gap-4">
              <div className="w-20 text-sm font-medium">{item.stage}</div>
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-8">
                  <div
                    className="bg-gradient-to-r from-pink-500 to-purple-500 h-8 rounded-full flex items-center px-3"
                    style={{ width: `${item.percentage}%` }}
                  >
                    <span className="text-white text-sm font-medium">
                      {item.count} ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalyticsFunnel;

import React from 'react';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { useAuth } from '@/contexts/AuthContext';

const Analytics: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">Please log in to view analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <AnalyticsDashboard />
      </div>
    </div>
  );
};

export default Analytics;
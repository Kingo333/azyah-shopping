import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Users, BarChart3, Settings, TestTube } from 'lucide-react';
import { BrandPortalHeader } from '@/components/BrandPortalHeader';
import { RetailerPortalHeader } from '@/components/RetailerPortalHeader';
import { CollabDashboard } from '@/components/ugc/CollabDashboard';
import { AiStudioModal } from '@/components/AiStudioModal';
import { PaymentStatus } from '@/components/PaymentStatus';
import { PaymentTestRunner } from '@/components/PaymentTestRunner';

interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  paymentsProcessed: number;
}

export function RoleDashboard() {
  const { user, loading } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [showAiStudio, setShowAiStudio] = useState(false);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching role:', error);
        } else if (data) {
          setRole(data.role);
        }
      } catch (error) {
        console.error('Error fetching role:', error);
      }
    };

    const fetchDashboardMetrics = async () => {
      try {
        // Simulate fetching dashboard metrics
        const metricsData = {
          totalUsers: 1234,
          activeUsers: 567,
          paymentsProcessed: 890,
        };
        setMetrics(metricsData);
      } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
      }
    };

    if (!loading && user) {
      fetchRole();
      fetchDashboardMetrics();
    }
  }, [user, loading]);

  const renderHeader = () => {
    if (role === 'brand') {
      return <BrandPortalHeader onAiStudioClick={() => setShowAiStudio(true)} />;
    } else if (role === 'retailer') {
      return <RetailerPortalHeader />;
    }
    return null;
  };
  
  return (
    <div className="min-h-screen bg-background">
      {renderHeader()}
      
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">
              <Sparkles className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="collaborations">
              <Users className="w-4 h-4 mr-2" />
              Collaborations
            </TabsTrigger>
            <TabsTrigger value="testing">
              <TestTube className="w-4 h-4 mr-2" />
              Testing
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dashboard Overview</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center">
                        <div className="text-2xl font-bold">{metrics.totalUsers}</div>
                        <div className="text-muted-foreground">Total Users</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center">
                        <div className="text-2xl font-bold">{metrics.activeUsers}</div>
                        <div className="text-muted-foreground">Active Users</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center">
                        <div className="text-2xl font-bold">{metrics.paymentsProcessed}</div>
                        <div className="text-muted-foreground">Payments Processed</div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div>Loading metrics...</div>
                )}
              </CardContent>
            </Card>
            <PaymentStatus />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Detailed analytics and reporting will be available here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="collaborations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  User Generated Content <Badge variant="secondary">Beta</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CollabDashboard />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="testing" className="space-y-6">
            <PaymentTestRunner />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p>User settings and preferences can be configured here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AiStudioModal 
        isOpen={showAiStudio} 
        onClose={() => setShowAiStudio(false)} 
      />
    </div>
  );
}

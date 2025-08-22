import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Users, TrendingUp, Package, BarChart3, Settings, Wand2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { TasteProfileDashboard } from './TasteProfileDashboard';
import { CollabDashboard } from './ugc/CollabDashboard';
import { ToyReplicaUploader } from './ToyReplicaUploader';
import { AiStudioModal } from './AiStudioModal';

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  description,
  icon,
  badge,
  children,
  onClick
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer" onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        {badge && (
          <Badge variant="secondary" className="rounded-md">
            {badge}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <CardDescription className="text-xs text-muted-foreground">
          {description}
        </CardDescription>
        {children}
      </CardContent>
    </Card>
  );
};

const RoleDashboard = () => {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAiStudioOpen, setIsAiStudioOpen] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
        } else if (data && data.role === 'admin') {
          setIsAdmin(true);
        }
      }
    };

    checkAdminStatus();
  }, [user]);

  const handleAiStudioOpen = () => {
    setIsAiStudioOpen(true);
  };

  const handleAiStudioClose = () => {
    setIsAiStudioOpen(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="Analytics"
          description="Track your store's performance and customer behavior."
          icon={<BarChart3 className="h-4 w-4" />}
        >
          <AnalyticsDashboard />
        </DashboardCard>

        <DashboardCard
          title="Taste Profile"
          description="Understand your customers' preferences and personalize their experience."
          icon={<Sparkles className="h-4 w-4" />}
        >
          <TasteProfileDashboard />
        </DashboardCard>

        {isPremium && (
          <DashboardCard
            title="UGC Collaboration"
            description="Collaborate with users to generate content for your store."
            icon={<Users className="h-4 w-4" />}
            badge="Premium"
          >
            <CollabDashboard />
          </DashboardCard>
        )}

        {isAdmin && (
          <DashboardCard
            title="Replica Uploader"
            description="Upload toy replica data to the store."
            icon={<Package className="h-4 w-4" />}
            badge="Admin"
          >
            <ToyReplicaUploader />
          </DashboardCard>
        )}

        <DashboardCard
          title="AI Studio"
          description="Generate AI Try-On images"
          icon={<Wand2 className="h-4 w-4" />}
          onClick={handleAiStudioOpen}
        />

        <DashboardCard
          title="Settings"
          description="Configure your store settings and preferences."
          icon={<Settings className="h-4 w-4" />}
        />
      </div>
      
      <AiStudioModal
        isOpen={isAiStudioOpen}
        onClose={handleAiStudioClose}
      />
    </div>
  );
};

export default RoleDashboard;

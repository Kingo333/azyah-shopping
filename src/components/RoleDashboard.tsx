import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, Package, PenTool, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CreatePostModal } from '@/components/CreatePostModal';
import { AddProductModal } from '@/components/AddProductModal';
import AiStudioModal from '@/components/AiStudioModal';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  created_at: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
  badges?: Badge[];
}

const RoleDashboard = () => {
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user?.id
  });

  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAiStudioOpen, setIsAiStudioOpen] = useState(false);

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const userRole = profile.role || 'shopper';

  const quickActions = useMemo(() => {
    const actions = [];

    if (userRole === 'shopper') {
      actions.push(
        {
          title: 'Create Post',
          description: 'Share your style with the community',
          icon: PenTool,
          action: () => setIsCreatePostOpen(true),
          color: 'bg-blue-500'
        },
        {
          title: 'AI Studio',
          description: 'Generate AI fashion content with bitStudio',
          icon: Sparkles,
          action: () => setIsAiStudioOpen(true),
          color: 'bg-purple-500'
        }
      );
    }

    if (userRole === 'brand' || userRole === 'retailer') {
      actions.push({
        title: 'Add Product',
        description: 'Add new products to your catalog',
        icon: Package,
        action: () => setIsAddProductOpen(true),
        color: 'bg-green-500'
      });
    }

    return actions;
  }, [userRole]);

  const badges = Array.isArray(profile.badges) ? profile.badges : [];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {profile.name || user.email}!
        </h1>
        <p className="text-sm text-gray-600">
          You are logged in as a {userRole}.
        </p>
        {badges.length > 0 && (
          <div className="mt-4 flex items-center gap-2">
            {badges.map((badge) => (
              <div key={badge.id} className="flex items-center gap-1 text-xs bg-gray-100 border border-gray-200 rounded-full px-2 py-1">
                {badge.icon && <img src={badge.icon} alt={badge.name} className="h-4 w-4" />}
                <span>{badge.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Tools to speed up your workflow
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.map((action, index) => (
                <Card 
                  key={index}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={action.action}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${action.color} text-white`}>
                        <action.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{action.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role-Specific Dashboards */}
      {userRole === 'shopper' && (
        <Card>
          <CardHeader>
            <CardTitle>Shopper Dashboard</CardTitle>
            <p className="text-sm text-muted-foreground">
              Explore new styles and trends
            </p>
          </CardHeader>
          <CardContent>
            <p>Welcome to your personalized shopping experience!</p>
          </CardContent>
        </Card>
      )}

      {(userRole === 'brand' || userRole === 'retailer') && (
        <Card>
          <CardHeader>
            <CardTitle>{userRole === 'brand' ? 'Brand' : 'Retailer'} Dashboard</CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage your products and reach more customers
            </p>
          </CardHeader>
          <CardContent>
            <p>Manage your product catalog and track your sales performance.</p>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <CreatePostModal 
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onPostCreated={() => {}}
        userId={user.id}
      />

      <AddProductModal 
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        onProductAdded={() => {}}
        userType={userRole as 'brand' | 'retailer'}
        brandId={userRole === 'brand' ? user.id : undefined}
        retailerId={userRole === 'retailer' ? user.id : undefined}
      />

      <AiStudioModal
        isOpen={isAiStudioOpen}
        onClose={() => setIsAiStudioOpen(false)}
      />
    </div>
  );
};

export default RoleDashboard;

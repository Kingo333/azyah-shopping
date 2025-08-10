
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingBag, 
  Heart, 
  TrendingUp, 
  Users, 
  Package, 
  BarChart3, 
  Star,
  Plus,
  Zap,
  Sparkles,
  Share2,
  User
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AiStudioModal from '@/components/AiStudioModal';
import CreatePostModal from '@/components/CreatePostModal';
import AddProductModal from '@/components/AddProductModal';

const RoleDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<'shopper' | 'brand' | 'retailer' | null>(null);
  const [isAiStudioOpen, setIsAiStudioOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  useEffect(() => {
    // In a real app, you'd fetch this from your user profile
    // For now, we'll assume shopper as default
    setUserRole('shopper');
  }, [user]);

  if (!userRole) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const shopperQuickActions = [
    {
      title: "AI Studio",
      description: "Virtual try-on, generate images, upscale & more",
      icon: Sparkles,
      action: () => setIsAiStudioOpen(true),
      badge: "Powered by bitStudio",
      primary: true
    },
    {
      title: "Create Post",
      description: "Share your style with the community",
      icon: Plus,
      action: () => setIsCreatePostOpen(true)
    },
    {
      title: "Browse Likes",
      description: "View your liked products",
      icon: Heart,
      action: () => navigate('/likes')
    }
  ];

  const brandQuickActions = [
    {
      title: "Add Product",
      description: "Add new products to your catalog",
      icon: Plus,
      action: () => setIsAddProductOpen(true),
      primary: true
    },
    {
      title: "View Analytics",
      description: "Track your brand performance",
      icon: BarChart3,
      action: () => navigate('/analytics')
    },
    {
      title: "Brand Portal",
      description: "Manage your brand profile",
      icon: Package,
      action: () => navigate('/brand-portal')
    }
  ];

  const retailerQuickActions = [
    {
      title: "Add Product",
      description: "Add new products to your inventory",
      icon: Plus,
      action: () => setIsAddProductOpen(true),
      primary: true
    },
    {
      title: "View Analytics", 
      description: "Track your retail performance",
      icon: BarChart3,
      action: () => navigate('/analytics')
    },
    {
      title: "Retailer Portal",
      description: "Manage your retail profile",
      icon: Package,
      action: () => navigate('/retailer-portal')
    }
  ];

  const getQuickActions = () => {
    switch (userRole) {
      case 'shopper':
        return shopperQuickActions;
      case 'brand':
        return brandQuickActions;
      case 'retailer':
        return retailerQuickActions;
      default:
        return [];
    }
  };

  const getOverviewCards = () => {
    const baseCards = [
      {
        title: "Profile Views",
        value: "1,234",
        description: "This month",
        icon: User,
        trend: "+12%"
      },
      {
        title: "Activity Score",
        value: "95",
        description: "Engagement rating",
        icon: TrendingUp,
        trend: "+5%"
      }
    ];

    switch (userRole) {
      case 'shopper':
        return [
          {
            title: "Liked Products",
            value: "47",
            description: "Products you've liked",
            icon: Heart,
            trend: "+3 this week"
          },
          {
            title: "Posts Created",
            value: "12",
            description: "Your shared styles",
            icon: Share2,
            trend: "+2 this week"
          },
          ...baseCards
        ];
      case 'brand':
        return [
          {
            title: "Products Listed",
            value: "156",
            description: "Active products",
            icon: Package,
            trend: "+8 this week"
          },
          {
            title: "Total Likes",
            value: "2,847",
            description: "Across all products",
            icon: Heart,
            trend: "+156 this week"
          },
          ...baseCards
        ];
      case 'retailer':
        return [
          {
            title: "Products Listed",
            value: "89",
            description: "Active inventory",
            icon: ShoppingBag,
            trend: "+5 this week"
          },
          {
            title: "Brand Partnerships",
            value: "23",
            description: "Active partnerships",
            icon: Users,
            trend: "+2 this month"
          },
          ...baseCards
        ];
      default:
        return baseCards;
    }
  };

  const getWelcomeMessage = () => {
    switch (userRole) {
      case 'shopper':
        return {
          title: "Welcome to your Fashion Hub",
          description: "Discover new styles, share your looks, and connect with the fashion community"
        };
      case 'brand':
        return {
          title: "Welcome to your Brand Dashboard",
          description: "Manage your products, track performance, and grow your fashion brand"
        };
      case 'retailer':
        return {
          title: "Welcome to your Retail Dashboard", 
          description: "Manage inventory, partner with brands, and grow your retail business"
        };
      default:
        return {
          title: "Welcome to Azyah",
          description: "Your personalized fashion experience"
        };
    }
  };

  const welcomeMessage = getWelcomeMessage();
  const quickActions = getQuickActions();
  const overviewCards = getOverviewCards();

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-teal-500/10 rounded-2xl p-6 border">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {welcomeMessage.title}
            </h1>
            <p className="text-gray-600 max-w-2xl">
              {welcomeMessage.description}
            </p>
          </div>
          <Badge variant="outline" className="capitalize">
            {userRole}
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Tools to speed up your workflow
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <Card 
                key={index} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  action.primary ? 'ring-2 ring-purple-500/20 bg-gradient-to-br from-purple-50 to-blue-50' : ''
                }`}
                onClick={action.action}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <action.icon className={`h-6 w-6 ${action.primary ? 'text-purple-600' : 'text-gray-600'}`} />
                    {action.badge && (
                      <Badge variant="outline" className="text-xs">
                        {action.badge}
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {action.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {overviewCards.map((card, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <card.icon className="h-5 w-5 text-gray-600" />
                <Badge variant="outline" className="text-xs">
                  {card.trend}
                </Badge>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {card.value}
                </p>
                <p className="text-sm text-gray-600">
                  {card.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your latest interactions and updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Placeholder for recent activity */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">You liked a new product</p>
                <p className="text-xs text-gray-600">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">New follower joined</p>
                <p className="text-xs text-gray-600">5 hours ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Profile view milestone reached</p>
                <p className="text-xs text-gray-600">1 day ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <AiStudioModal 
        isOpen={isAiStudioOpen} 
        onClose={() => setIsAiStudioOpen(false)} 
      />
      
      <CreatePostModal 
        isOpen={isCreatePostOpen} 
        onClose={() => setIsCreatePostOpen(false)} 
      />
      
      <AddProductModal 
        isOpen={isAddProductOpen} 
        onClose={() => setIsAddProductOpen(false)} 
      />
    </div>
  );
};

export default RoleDashboard;

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  TrendingUp, 
  ShoppingBag, 
  Eye, 
  Plus, 
  Search,
  Sparkles,
  Image,
  Palette,
  Camera,
  Bot,
  Globe,
  BarChart3,
  Package,
  Building2,
  Blocks  // Import the Blocks icon for LEGO-style
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const RoleDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const stats = [
    {
      title: 'Total Users',
      value: '1,450',
      icon: Users,
      color: 'bg-blue-500',
      trend: '+12%',
    },
    {
      title: 'Revenue',
      value: '$23,456',
      icon: TrendingUp,
      color: 'bg-green-500',
      trend: '+8%',
    },
    {
      title: 'Orders',
      value: '678',
      icon: ShoppingBag,
      color: 'bg-yellow-500',
      trend: '+5%',
    },
    {
      title: 'Page Views',
      value: '4,567',
      icon: Eye,
      color: 'bg-red-500',
      trend: '-3%',
    },
  ];

  const handleCreateProduct = () => {
    navigate('/create-product');
  };

  const handleViewProducts = () => {
    navigate('/products');
  };

  const handleAnalytics = () => {
    navigate('/analytics');
  };

  const handleManageOrders = () => {
    navigate('/orders');
  };

  const quickActions = [
    {
      title: 'Toy Replica',
      subtitle: 'Turn your photo into a LEGO-style mini-figure',
      icon: Blocks,
      onClick: () => navigate('/toy-replica'),
      color: 'bg-orange-500'
    },
    {
      title: 'Create Product',
      subtitle: 'Add a new product to your catalog',
      icon: Plus,
      onClick: handleCreateProduct,
      color: 'bg-indigo-500'
    },
    {
      title: 'AI Try-On',
      subtitle: 'Virtual fitting room experience',
      icon: Camera,
      onClick: () => navigate('/ar-tryon'),
      color: 'bg-purple-500'
    },
    {
      title: 'Visual Search',
      subtitle: 'Find products with images',
      icon: Search,
      onClick: () => navigate('/image-search'),
      color: 'bg-green-500'
    },
    {
      title: 'AI Studio',
      subtitle: 'Create and edit product images',
      icon: Palette,
      onClick: () => navigate('/ai-studio'),
      color: 'bg-pink-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <stat.icon className="h-4 w-4" />
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stat.value}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span>{stat.trend}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Access powerful AI features to enhance your fashion experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-lg border p-4 hover:shadow-md transition-all cursor-pointer"
                onClick={action.onClick}
              >
                <div className="flex items-start space-x-3">
                  <div className={`shrink-0 rounded-md p-2 text-white ${action.color}`}>
                    <action.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.subtitle}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest activities on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">New order received</p>
                <p className="text-xs text-muted-foreground">2 minutes ago</p>
              </div>
              <Badge variant="secondary">View</Badge>
            </li>
            <li className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Product "Stylish Jacket" updated</p>
                <p className="text-xs text-muted-foreground">1 hour ago</p>
              </div>
              <Badge variant="secondary">View</Badge>
            </li>
            <li className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">New user registered</p>
                <p className="text-xs text-muted-foreground">3 hours ago</p>
              </div>
              <Badge variant="secondary">View</Badge>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleDashboard;

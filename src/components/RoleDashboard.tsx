import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { 
  Heart, 
  ShoppingBag, 
  Search, 
  Sparkles, 
  Camera,
  BarChart3,
  Users,
  Package,
  Settings,
  Store,
  TrendingUp,
  Plus,
  Eye,
  DollarSign,
  Globe
} from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  role: 'shopper' | 'brand' | 'retailer' | 'admin';
  avatar_url?: string;
  email: string;
}

interface DashboardStats {
  totalProducts?: number;
  totalViews?: number;
  totalSales?: number;
  totalRevenue?: number;
  totalWishlistItems?: number;
  totalCartItems?: number;
  affiliateEarnings?: number;
}

const RoleDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchDashboardStats();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Create default profile if none exists
      setUserProfile({
        id: user.id,
        name: user.email?.split('@')[0] || 'User',
        role: 'shopper',
        email: user.email!
      });
    }
  };

  const fetchDashboardStats = async () => {
    if (!user) return;

    try {
      // Fetch basic stats for all roles
      const [wishlistData, cartData, affiliateData] = await Promise.all([
        supabase.from('wishlist_items').select('*').eq('wishlist_id', user.id),
        supabase.from('cart_items').select('*').eq('user_id', user.id),
        supabase.from('affiliate_links').select('revenue_cents').eq('user_id', user.id)
      ]);

      const dashboardStats: DashboardStats = {
        totalWishlistItems: wishlistData.data?.length || 0,
        totalCartItems: cartData.data?.length || 0,
        affiliateEarnings: affiliateData.data?.reduce((sum, item) => sum + (item.revenue_cents || 0), 0) || 0
      };

      // Role-specific stats
      if (userProfile?.role === 'brand' || userProfile?.role === 'retailer') {
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .eq(userProfile.role === 'brand' ? 'brand_id' : 'retailer_id', user.id);
        
        dashboardStats.totalProducts = products?.length || 0;
      }

      setStats(dashboardStats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSwitch = async (newRole: 'shopper' | 'brand' | 'retailer') => {
    if (!user || !userProfile) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', user.id);

      if (error) throw error;

      setUserProfile({ ...userProfile, role: newRole });
      toast({ description: `Switched to ${newRole} mode` });
      
      // Refresh stats for new role
      fetchDashboardStats();
    } catch (error) {
      toast({ 
        description: "Failed to switch role", 
        variant: "destructive" 
      });
    }
  };

  const formatPrice = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p>Error loading profile</p>
        </div>
      </div>
    );
  }

  const renderShopperDashboard = () => (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Wishlist</p>
                <p className="text-xl font-bold">{stats.totalWishlistItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Cart Items</p>
                <p className="text-xl font-bold">{stats.totalCartItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Earnings</p>
                <p className="text-xl font-bold">{formatPrice(stats.affiliateEarnings || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">AR Tries</p>
                <p className="text-xl font-bold">12</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Button onClick={() => navigate('/swipe')} className="h-20 flex-col gap-2">
              <Heart className="h-6 w-6" />
              <span>Swipe Deck</span>
            </Button>
            <Button onClick={() => navigate('/explore')} variant="outline" className="h-20 flex-col gap-2">
              <Search className="h-6 w-6" />
              <span>Explore</span>
            </Button>
            <Button onClick={() => navigate('/ar-tryOn')} variant="outline" className="h-20 flex-col gap-2">
              <Camera className="h-6 w-6" />
              <span>AR Try-On</span>
            </Button>
            <Button onClick={() => navigate('/affiliate')} variant="outline" className="h-20 flex-col gap-2">
              <DollarSign className="h-6 w-6" />
              <span>Affiliate</span>
            </Button>
            <Button onClick={() => navigate('/landing')} variant="outline" className="h-20 flex-col gap-2">
              <Globe className="h-6 w-6" />
              <span>Landing</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderBrandDashboard = () => (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Products</p>
                <p className="text-xl font-bold">{stats.totalProducts || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Views</p>
                <p className="text-xl font-bold">{stats.totalViews || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Sales</p>
                <p className="text-xl font-bold">{stats.totalSales || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-xl font-bold">{formatPrice(stats.totalRevenue || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button onClick={() => navigate('/brand-portal')} className="h-20 flex-col gap-2">
              <Package className="h-6 w-6" />
              <span>Products</span>
            </Button>
            <Button onClick={() => navigate('/brand-portal')} variant="outline" className="h-20 flex-col gap-2">
              <BarChart3 className="h-6 w-6" />
              <span>Analytics</span>
            </Button>
            <Button onClick={() => navigate('/brand-portal')} variant="outline" className="h-20 flex-col gap-2">
              <Settings className="h-6 w-6" />
              <span>Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderRetailerDashboard = () => (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Brands</p>
                <p className="text-xl font-bold">5</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Products</p>
                <p className="text-xl font-bold">{stats.totalProducts || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Sales</p>
                <p className="text-xl font-bold">{stats.totalSales || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-xl font-bold">{formatPrice(stats.totalRevenue || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Retailer Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button onClick={() => navigate('/retailer-portal')} className="h-20 flex-col gap-2">
              <Package className="h-6 w-6" />
              <span>Inventory</span>
            </Button>
            <Button onClick={() => navigate('/retailer-portal')} variant="outline" className="h-20 flex-col gap-2">
              <Store className="h-6 w-6" />
              <span>Brands</span>
            </Button>
            <Button onClick={() => navigate('/retailer-portal')} variant="outline" className="h-20 flex-col gap-2">
              <BarChart3 className="h-6 w-6" />
              <span>Analytics</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {userProfile.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {userProfile.role}
            </Badge>
            {/* Role Switcher */}
            <Tabs value={userProfile.role} onValueChange={(value) => handleRoleSwitch(value as any)}>
              <TabsList>
                <TabsTrigger value="shopper">Shopper</TabsTrigger>
                <TabsTrigger value="brand">Brand</TabsTrigger>
                <TabsTrigger value="retailer">Retailer</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Role-based Dashboard Content */}
        {userProfile.role === 'shopper' && renderShopperDashboard()}
        {userProfile.role === 'brand' && renderBrandDashboard()}
        {userProfile.role === 'retailer' && renderRetailerDashboard()}
      </div>
    </div>
  );
};

export default RoleDashboard;
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Sparkles, 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  Camera,
  LogOut,
  Settings
} from 'lucide-react';

const Dashboard = () => {
  const { user, signOut } = useAuth();

  const quickActions = [
    {
      title: 'Swipe & Discover',
      description: 'Find your next favorite piece',
      icon: Heart,
      color: 'from-pink-500 to-rose-500',
      href: '/swipe'
    },
    {
      title: 'AR Try-On',
      description: 'See how it looks on you',
      icon: Camera,
      color: 'from-purple-500 to-violet-500',
      href: '/ar-tryOn'
    },
    {
      title: 'My Closets',
      description: 'Organize your favorites',
      icon: ShoppingBag,
      color: 'from-blue-500 to-cyan-500',
      href: '/closets'
    },
    {
      title: 'Fashion Feed',
      description: 'Community & trends',
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-500',
      href: '/feed'
    },
    {
      title: 'Style Forum',
      description: 'Connect with fashionistas',
      icon: Users,
      color: 'from-orange-500 to-amber-500',
      href: '/forum'
    },
    {
      title: 'Affiliate Center',
      description: 'Earn from sharing',
      icon: Sparkles,
      color: 'from-indigo-500 to-purple-500',
      href: '/affiliate'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-primary to-accent p-2 rounded-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Azyah
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {user?.email}
            </Badge>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome back! ✨
          </h2>
          <p className="text-muted-foreground text-lg">
            Ready to discover your next favorite fashion piece?
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Card 
                key={index}
                className="group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-white/80 backdrop-blur-sm"
              >
                <CardHeader className="pb-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {action.title}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {action.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary hover:to-accent text-primary hover:text-white border-0 transition-all duration-300"
                    variant="outline"
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Card className="text-center bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-primary">0</CardTitle>
              <CardDescription>Items Swiped</CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="text-center bg-gradient-to-br from-accent/10 to-transparent border-accent/20">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-accent">0</CardTitle>
              <CardDescription>Items Wishlisted</CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="text-center bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-green-600">$0</CardTitle>
              <CardDescription>Affiliate Earnings</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
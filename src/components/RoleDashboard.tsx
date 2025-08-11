
import React from 'react';
import { Sparkles, BarChart4, Settings, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  color: 'purple' | 'blue' | 'green' | 'yellow' | 'red';
}

const quickActions = [
  {
    title: "AI Try-On",
    description: "Try on outfits using AI technology",
    icon: Sparkles,
    href: "/ai-studio",
    color: "purple"
  },
  {
    title: "Analytics Dashboard",
    description: "View key metrics and insights",
    icon: BarChart4,
    href: "/analytics",
    color: "blue"
  },
  {
    title: "Account Settings",
    description: "Manage your profile and preferences",
    icon: Settings,
    href: "/profile-settings",
    color: "green"
  },
  {
    title: "Help & Support",
    description: "Get assistance and find answers",
    icon: HelpCircle,
    href: "/help",
    color: "yellow"
  },
];

const RoleDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {quickActions.map((action) => (
        <Card key={action.title} className="hover:shadow-md transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <action.icon className={`h-5 w-5 text-${action.color}-500`} />
              {action.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{action.description}</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4 w-full"
              onClick={() => navigate(action.href)}
            >
              Go to {action.title}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default RoleDashboard;


import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Blocks } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ToyReplicaQuickAction: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/toy-replica')}>
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className="bg-primary/10 p-3 rounded-lg">
            <Blocks className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Toy Replica</h3>
            <p className="text-sm text-muted-foreground">
              Turn your photo into a LEGO-style mini-figure
            </p>
          </div>
          <Button variant="ghost" size="sm">
            Try it
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

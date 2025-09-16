import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Camera, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UgcSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              UGC Collaboration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Collaborate with brands on user-generated content. Apply for brand partnerships and create sponsored content.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/ugc-collab')}>
                Browse Collaborations
              </Button>
              <Button variant="outline" onClick={() => navigate('/ugc-collab?tab=apply')}>
                Apply for Partnership
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Camera className="h-4 w-4" />
                <h3 className="font-medium">Content Creation</h3>
              </div>
              <p className="text-sm text-muted-foreground">Create engaging content for brands</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4" />
                <h3 className="font-medium">Monetization</h3>
              </div>
              <p className="text-sm text-muted-foreground">Earn from your collaborations</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4" />
                <h3 className="font-medium">Brand Partnerships</h3>
              </div>
              <p className="text-sm text-muted-foreground">Partner with top fashion brands</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UgcSection;
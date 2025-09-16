import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Palette, Heart, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BeautySection: React.FC = () => {
  const navigate = useNavigate();

  const handleOpenBeautyConsultant = () => {
    navigate('/beauty-consultant');
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Beauty Consultant</h2>
        <p className="text-muted-foreground">
          Get personalized beauty advice and product recommendations from our AI beauty consultant.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Beauty Analysis
            </CardTitle>
            <CardDescription>
              Upload your photo for personalized beauty recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleOpenBeautyConsultant} className="w-full">
              Start Beauty Consultation
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-secondary" />
              Color Matching
            </CardTitle>
            <CardDescription>
              Find the perfect makeup shades for your skin tone
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleOpenBeautyConsultant} className="w-full">
              Discover Your Colors
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              Skincare Routine
            </CardTitle>
            <CardDescription>
              Get a personalized skincare routine based on your skin type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleOpenBeautyConsultant} className="w-full">
              Build Routine
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-500" />
              Beauty Chat
            </CardTitle>
            <CardDescription>
              Ask questions and get expert beauty advice instantly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleOpenBeautyConsultant} className="w-full">
              Start Chat
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BeautySection;
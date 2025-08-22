
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Upload, Download, Loader2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { ZiinaPaymentButton } from '@/components/ZiinaPaymentButton';
import { ToyReplicaUploader } from '@/components/ToyReplicaUploader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SEOHead } from '@/components/SEOHead';

export default function ToyReplica() {
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const navigate = useNavigate();

  if (subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title="Toy Replica Generator"
        description="Transform your photos into toy-style replicas using AI"
      />
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-8 h-8 text-accent" />
              <h1 className="text-3xl font-bold">Toy Replica Generator</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Transform your photos into fun toy-style replicas using advanced AI technology. 
              Upload any image and watch it come to life as a toy version.
            </p>
            {isPremium && (
              <Badge variant="default" className="mt-2 bg-accent text-white">
                <Sparkles className="w-3 h-3 mr-1" />
                Premium Feature
              </Badge>
            )}
          </div>

          {!isPremium ? (
            <Card className="max-w-md mx-auto">
              <CardHeader className="text-center">
                <div className="text-accent mb-4">
                  <Sparkles className="w-12 h-12 mx-auto" />
                </div>
                <CardTitle>Premium Feature</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-muted-foreground">
                  The Toy Replica Generator requires a Premium subscription to access AI-powered transformations.
                </p>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Premium includes:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Unlimited toy replica generations</li>
                    <li>• High-quality AI processing</li>
                    <li>• Multiple style options</li>
                    <li>• Priority processing</li>
                  </ul>
                </div>
                <ZiinaPaymentButton className="w-full" />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Upload Your Image
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ToyReplicaUploader onImageSelect={setSelectedImage} />
                </CardContent>
              </Card>

              {selectedImage && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="w-5 h-5" />
                      Preview & Generate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-2">Original</h3>
                        <img
                          src={selectedImage}
                          alt="Original"
                          className="w-full rounded-lg border"
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Toy Replica</h3>
                        <div className="w-full aspect-square rounded-lg border bg-muted flex items-center justify-center">
                          <div className="text-center text-muted-foreground">
                            <Sparkles className="w-8 h-8 mx-auto mb-2" />
                            <p>AI transformation will appear here</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>How it works</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-accent" />
                      <h3 className="font-semibold mb-1">1. Upload</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose any photo you want to transform
                      </p>
                    </div>
                    <div className="text-center">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 text-accent" />
                      <h3 className="font-semibold mb-1">2. AI Transform</h3>
                      <p className="text-sm text-muted-foreground">
                        Our AI creates a toy-style version
                      </p>
                    </div>
                    <div className="text-center">
                      <Download className="w-8 h-8 mx-auto mb-2 text-accent" />
                      <h3 className="font-semibold mb-1">3. Download</h3>
                      <p className="text-sm text-muted-foreground">
                        Save your toy replica in high quality
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

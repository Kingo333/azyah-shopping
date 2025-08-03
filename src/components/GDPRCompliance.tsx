import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Shield, Download, Trash2, Eye, Settings, Cookie } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ConsentPreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
}

interface DataExportRequest {
  id: string;
  status: 'pending' | 'processing' | 'ready' | 'expired';
  requested_at: string;
  download_url?: string;
  expires_at?: string;
}

export const GDPRCompliance: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCookieBanner, setShowCookieBanner] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [consent, setConsent] = useState<ConsentPreferences>({
    essential: true,
    analytics: false,
    marketing: false,
    personalization: false,
  });
  const [dataExports, setDataExports] = useState<DataExportRequest[]>([]);
  const [isLoadingExport, setIsLoadingExport] = useState(false);
  const [isLoadingDeletion, setIsLoadingDeletion] = useState(false);

  // Check if user has given consent
  useEffect(() => {
    const savedConsent = localStorage.getItem('gdpr-consent');
    if (!savedConsent) {
      setShowCookieBanner(true);
    } else {
      setConsent(JSON.parse(savedConsent));
    }
  }, []);

  // Load user's data export requests
  useEffect(() => {
    if (user) {
      loadDataExports();
    }
  }, [user]);

  const loadDataExports = async () => {
    if (!user) return;

    try {
      // Mock data exports for now - would need proper table
      const mockExports: DataExportRequest[] = [{
        id: '1',
        status: 'ready',
        requested_at: new Date().toISOString(),
        download_url: '/export.zip',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }];
      setDataExports(mockExports);
    } catch (error) {
      console.error('Error loading data exports:', error);
    }
  };

  const handleConsentSave = () => {
    localStorage.setItem('gdpr-consent', JSON.stringify(consent));
    setShowCookieBanner(false);
    
    // Apply consent preferences
    if (consent.analytics) {
      // Enable analytics tracking
      (window as any).gtag?.('consent', 'update', {
        analytics_storage: 'granted'
      });
    }
    
    if (consent.marketing) {
      // Enable marketing cookies
      (window as any).gtag?.('consent', 'update', {
        ad_storage: 'granted'
      });
    }

    toast({
      title: "Preferences Saved",
      description: "Your privacy preferences have been updated.",
    });
  };

  const requestDataExport = async () => {
    if (!user) return;

    setIsLoadingExport(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-user-data', {
        body: { user_id: user.id }
      });

      if (error) throw error;

      toast({
        title: "Data Export Requested",
        description: "Your data export is being prepared. You'll receive an email when it's ready.",
      });

      await loadDataExports();
    } catch (error) {
      console.error('Error requesting data export:', error);
      toast({
        title: "Export Error",
        description: "Failed to request data export. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingExport(false);
    }
  };

  const requestDataDeletion = async () => {
    if (!user) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete all your data? This action cannot be undone.'
    );
    
    if (!confirmed) return;

    setIsLoadingDeletion(true);
    try {
      const { error } = await supabase.functions.invoke('delete-user-data', {
        body: { user_id: user.id }
      });

      if (error) throw error;

      toast({
        title: "Deletion Requested",
        description: "Your data deletion request has been submitted. You will be contacted within 30 days.",
      });

      // Log user out after deletion request
      setTimeout(() => {
        supabase.auth.signOut();
      }, 2000);
    } catch (error) {
      console.error('Error requesting data deletion:', error);
      toast({
        title: "Deletion Error",
        description: "Failed to submit deletion request. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDeletion(false);
    }
  };

  return (
    <>
      {/* Cookie Consent Banner */}
      {showCookieBanner && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 shadow-lg z-50">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Cookie className="h-5 w-5" />
                  <h3 className="font-semibold">Cookie Preferences</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  We use cookies to enhance your experience. You can customize your preferences below.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDataModal(true)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Customize
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setConsent(prev => ({ ...prev, analytics: true, personalization: true }));
                    handleConsentSave();
                  }}
                >
                  Accept All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConsentSave}
                >
                  Save Preferences
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Management Modal */}
      <Dialog open={showDataModal} onOpenChange={setShowDataModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy & Data Management
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Cookie Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cookie Preferences</CardTitle>
                <CardDescription>
                  Choose which types of cookies you allow us to use
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="font-medium">Essential Cookies</label>
                    <p className="text-sm text-muted-foreground">
                      Required for the website to function properly
                    </p>
                  </div>
                  <Checkbox checked={true} disabled />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="font-medium">Analytics Cookies</label>
                    <p className="text-sm text-muted-foreground">
                      Help us understand how you use our website
                    </p>
                  </div>
                  <Checkbox
                    checked={consent.analytics}
                    onCheckedChange={(checked) =>
                      setConsent(prev => ({ ...prev, analytics: !!checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="font-medium">Marketing Cookies</label>
                    <p className="text-sm text-muted-foreground">
                      Used to show you relevant advertisements
                    </p>
                  </div>
                  <Checkbox
                    checked={consent.marketing}
                    onCheckedChange={(checked) =>
                      setConsent(prev => ({ ...prev, marketing: !!checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="font-medium">Personalization Cookies</label>
                    <p className="text-sm text-muted-foreground">
                      Remember your preferences and personalize content
                    </p>
                  </div>
                  <Checkbox
                    checked={consent.personalization}
                    onCheckedChange={(checked) =>
                      setConsent(prev => ({ ...prev, personalization: !!checked }))
                    }
                  />
                </div>

                <Button onClick={handleConsentSave} className="w-full">
                  Save Cookie Preferences
                </Button>
              </CardContent>
            </Card>

            {user && (
              <>
                <Separator />

                {/* Data Export */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Download className="h-5 w-5" />
                      Export Your Data
                    </CardTitle>
                    <CardDescription>
                      Download a copy of all your personal data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Alert>
                        <Eye className="h-4 w-4" />
                        <AlertDescription>
                          Your data export will include your profile, preferences, swipe history, 
                          wishlists, and any other personal information we have stored.
                        </AlertDescription>
                      </Alert>

                      {dataExports.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium">Recent Export Requests</h4>
                          {dataExports.slice(0, 3).map((exportReq) => (
                            <div key={exportReq.id} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <span className="text-sm">
                                  Requested {new Date(exportReq.requested_at).toLocaleDateString()}
                                </span>
                                <Badge variant={
                                  exportReq.status === 'ready' ? 'default' :
                                  exportReq.status === 'processing' ? 'secondary' :
                                  exportReq.status === 'expired' ? 'destructive' : 'outline'
                                } className="ml-2">
                                  {exportReq.status}
                                </Badge>
                              </div>
                              {exportReq.download_url && (
                                <Button size="sm" variant="outline" asChild>
                                  <a href={exportReq.download_url} download>
                                    Download
                                  </a>
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <Button
                        onClick={requestDataExport}
                        disabled={isLoadingExport}
                        className="w-full"
                      >
                        {isLoadingExport ? "Processing..." : "Request Data Export"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Data Deletion */}
                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                      <Trash2 className="h-5 w-5" />
                      Delete Your Data
                    </CardTitle>
                    <CardDescription>
                      Permanently delete all your personal data (Right to be Forgotten)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Alert className="mb-4">
                      <AlertDescription className="text-destructive-foreground">
                        <strong>Warning:</strong> This action is irreversible. All your data including 
                        profile, preferences, history, and wishlists will be permanently deleted.
                      </AlertDescription>
                    </Alert>

                    <Button
                      variant="destructive"
                      onClick={requestDataDeletion}
                      disabled={isLoadingDeletion}
                      className="w-full"
                    >
                      {isLoadingDeletion ? "Processing..." : "Request Data Deletion"}
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// GDPR-compliant data collection hook
export const useGDPRCompliantTracking = () => {
  const [canTrack, setCanTrack] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('gdpr-consent');
    if (consent) {
      const parsedConsent = JSON.parse(consent);
      setCanTrack(parsedConsent.analytics || parsedConsent.personalization);
    }
  }, []);

  const trackEvent = (eventName: string, data?: any) => {
    if (!canTrack) return;
    
    // Only track if user has given consent
    console.log('Tracking event:', eventName, data);
    // Implement your tracking logic here
  };

  return { canTrack, trackEvent };
};
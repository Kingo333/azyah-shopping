import React from 'react';
import { Helmet } from 'react-helmet-async';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CookiePolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen dashboard-bg">
      <Helmet>
        <title>Cookie Policy - Azyah Style</title>
        <meta name="description" content="Cookie Policy for Azyah Style - Learn how we use cookies and similar technologies." />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="hover:bg-primary/10 premium-hover"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <GlassPanel variant="premium" className="p-8">
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-cormorant font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Cookie Policy
              </h1>
              <p className="text-muted-foreground text-lg">
                Last Updated: February 17, 2026
              </p>
            </div>

            <div className="prose prose-lg max-w-none space-y-8 text-foreground">
              <p className="text-lg">
                This Cookie Policy explains how Azyah Style ("we", "us", "our") uses cookies and similar technologies when you use our platform.
              </p>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">1. What Are Cookies</h2>
                <p className="text-muted-foreground">
                  Cookies are small text files stored on your device when you visit a website or use an app. They help websites remember your preferences, keep you logged in, and understand how you use the platform.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">2. Cookies We Use</h2>
                <div className="space-y-3 text-muted-foreground">
                  <h3 className="text-lg font-semibold text-foreground">Essential Cookies</h3>
                  <p>Required for the platform to function properly. These handle:</p>
                  <ul className="space-y-1 list-disc list-inside ml-4">
                    <li>User authentication and session management</li>
                    <li>Security and fraud prevention</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-foreground">Analytics Cookies</h3>
                  <p>Help us understand how users interact with the platform:</p>
                  <ul className="space-y-1 list-disc list-inside ml-4">
                    <li>Page views and navigation patterns</li>
                    <li>Feature usage and performance metrics</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-foreground">Preference Cookies</h3>
                  <p>Remember your settings and choices:</p>
                  <ul className="space-y-1 list-disc list-inside ml-4">
                    <li>Style preferences and theme settings</li>
                    <li>Language and region preferences</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-foreground">Affiliate Tracking Cookies</h3>
                  <p>Used for commission attribution when you click on product links:</p>
                  <ul className="space-y-1 list-disc list-inside ml-4">
                    <li>Track referrals to retailer and brand websites</li>
                    <li>Attribute commissions for affiliate partnerships</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">3. Managing Cookies</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p>You can control cookies through your browser or device settings:</p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Most browsers allow you to block or delete cookies in their settings</li>
                    <li>You can set your browser to notify you when cookies are being set</li>
                    <li>Disabling essential cookies may affect the functionality of the platform</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">4. Changes to This Policy</h2>
                <p className="text-muted-foreground">
                  We may update this Cookie Policy from time to time to reflect changes in technology or applicable regulations. Continued use of the platform constitutes acceptance of the updated policy.
                </p>
              </section>

              <div className="text-center pt-8 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  If you have questions about our use of cookies, please contact us at{' '}
                  <a href="mailto:support@azyahstyle.com" className="text-primary hover:underline">support@azyahstyle.com</a>.
                </p>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};

export default CookiePolicy;

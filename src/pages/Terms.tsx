import React from 'react';
import { Helmet } from 'react-helmet-async';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen dashboard-bg">
      <Helmet>
        <title>Terms & Conditions - Azyah Style</title>
        <meta name="description" content="Terms and Conditions for Azyah Style - AI-powered fashion discovery and referral service." />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
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
                Terms & Conditions
              </h1>
              <p className="text-muted-foreground text-lg">
                Last Updated: August 20, 2025
              </p>
            </div>

            <div className="prose prose-lg max-w-none space-y-8 text-foreground">
              <p className="text-lg">
                Welcome to Azyah Style ("the Platform"). By accessing or using the Platform, you agree to these Terms & Conditions ("Terms"). Please read them carefully before using our services.
              </p>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">1. About the Platform</h2>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li>Azyah Style is an AI-powered fashion discovery and referral service.</li>
                  <li>We do not sell products directly. Instead, we redirect users ("Shoppers") to third-party retailers or brand websites to complete purchases.</li>
                  <li>We are not a party to any transaction between a Shopper and a Brand/Retailer.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">2. Definitions</h2>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li><strong>Shoppers:</strong> Users browsing or discovering products through the Platform.</li>
                  <li><strong>Brands:</strong> Companies showcasing their products on the Platform for discovery and promotion.</li>
                  <li><strong>Retailers:</strong> Third-party sellers hosting the actual purchase and fulfillment process.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">3. Use of the Platform</h2>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li>Shoppers may browse, save, and interact with product listings but must complete purchases on third-party websites.</li>
                  <li>Brands and Retailers may list and promote their products, subject to our approval and content guidelines.</li>
                  <li>Users agree to provide accurate information when signing up and to use the Platform in compliance with applicable laws.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">4. No Responsibility for Transactions & Refunds</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p>All purchases are made directly with the Brand/Retailer.</p>
                  <p><strong>Azyah Style is not responsible for:</strong></p>
                  <ul className="space-y-2 list-disc list-inside ml-4">
                    <li>Product quality, safety, or authenticity</li>
                    <li>Shipping, delivery, or returns</li>
                    <li>Payments, refunds, or disputes</li>
                  </ul>
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mt-4">
                    <p className="font-semibold text-amber-800 dark:text-amber-200">
                      <strong>No Refunds:</strong> Azyah Style does not issue refunds under any circumstances. Any requests for refunds or exchanges must be handled directly with the Brand or Retailer where the purchase was made.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">5. Affiliate & Referral Links</h2>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li>Some links on the Platform may be affiliate links, meaning Azyah Style may earn a commission when a Shopper makes a purchase through a Brand/Retailer link.</li>
                  <li>This does not affect the Shopper's price.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">6. User-Generated Content</h2>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li>Shoppers, Brands, or Retailers may submit content (e.g., reviews, images, outfit ideas).</li>
                  <li>By submitting content, you grant Azyah Style a non-exclusive, worldwide, royalty-free license to display and use it on the Platform.</li>
                  <li>You are responsible for ensuring that submitted content does not infringe third-party rights.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">7. Data & Privacy</h2>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li>We collect and process user data in accordance with our Privacy Policy.</li>
                  <li>By using the Platform, you consent to the collection and use of your data as described.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">8. Intellectual Property</h2>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li>All content, branding, logos, and features of Azyah Style are owned by or licensed to us.</li>
                  <li>You may not copy, distribute, or exploit our materials without prior written consent.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">9. Limitation of Liability</h2>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li>The Platform is provided "as is."</li>
                  <li>We make no guarantees about the accuracy, availability, or reliability of product listings or referral links.</li>
                  <li>To the fullest extent permitted by law, Azyah Style is not liable for any direct, indirect, incidental, or consequential damages related to use of the Platform or transactions with Brands/Retailers.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">10. Account Suspension or Termination</h2>
                <p className="text-muted-foreground">
                  We may suspend or terminate accounts that violate these Terms or engage in fraudulent, misleading, or harmful activity.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">11. Changes to the Terms</h2>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li>We may update these Terms from time to time.</li>
                  <li>Continued use of the Platform after updates constitutes acceptance of the revised Terms.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">12. Governing Law</h2>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li>These Terms are governed by the laws of the United Arab Emirates.</li>
                  <li>Any disputes will be subject to the exclusive jurisdiction of the courts in Dubai, United Arab Emirates.</li>
                </ul>
              </section>

              <div className="text-center pt-8 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  If you have any questions about these Terms & Conditions, please contact us.
                </p>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};

export default Terms;
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
                Last Updated: February 17, 2026
              </p>
            </div>

            <div className="prose prose-lg max-w-none space-y-8 text-foreground">
              <p className="text-lg">
                Welcome to Azyah Style ("the Platform"). By accessing or using the Platform, you agree to these Terms & Conditions ("Terms"). Please read them carefully before using our services.
              </p>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">1. About the Platform</h2>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li>Azyah Style is an AI-powered fashion discovery, virtual try-on, and referral service.</li>
                  <li>We do not sell products directly. Instead, we redirect users ("Shoppers") to third-party retailers or brand websites to complete purchases.</li>
                  <li>We are not a party to any transaction between a Shopper and a Brand/Retailer.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">2. Definitions</h2>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li><strong>Shoppers:</strong> Users browsing, discovering, or virtually trying on products through the Platform.</li>
                  <li><strong>Brands:</strong> Companies showcasing their products on the Platform for discovery and promotion.</li>
                  <li><strong>Retailers:</strong> Third-party sellers hosting the actual purchase and fulfillment process.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">3. Use of the Platform</h2>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li>Shoppers may browse, save, interact with product listings, and use AI-powered features including virtual try-on and style personalization. Purchases must be completed on third-party websites.</li>
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
                <h2 className="text-2xl font-cormorant font-bold text-primary">5. Subscriptions & Auto-Renewal</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p>Azyah Premium is offered as an auto-renewable subscription managed through Apple In-App Purchases.</p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li><strong>Billing:</strong> Payment is charged to your Apple ID account at confirmation of purchase.</li>
                    <li><strong>Auto-Renewal:</strong> Your subscription automatically renews unless cancelled at least 24 hours before the end of the current billing period.</li>
                    <li><strong>Cancellation:</strong> You can manage and cancel your subscription at any time through your device's Settings &gt; Apple ID &gt; Subscriptions.</li>
                    <li><strong>Pricing:</strong> Subscription pricing is displayed in-app at the time of purchase and may vary by region and currency.</li>
                    <li><strong>No Partial Refunds:</strong> No refunds are provided for unused portions of a subscription period, unless required by applicable law.</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">6. Affiliate & Referral Links</h2>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li>Some links on the Platform may be affiliate links, meaning Azyah Style may earn a commission when a Shopper makes a purchase through a Brand/Retailer link.</li>
                  <li>This does not affect the Shopper's price.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">7. AI-Generated Content</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p>The Platform offers AI-powered virtual try-on features that generate synthetic preview images and videos.</p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>AI try-on results are approximations generated by artificial intelligence. They may not accurately reflect the actual appearance, fit, or color of products in real life.</li>
                    <li>Users retain ownership of their uploaded photos. By uploading photos, you grant Azyah Style a limited, non-exclusive license to process your images solely for the purpose of generating try-on results.</li>
                    <li>AI-generated outputs are provided for personal use and preview purposes only.</li>
                    <li>Azyah Style reserves the right to moderate or remove AI-generated content at its discretion.</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">8. Personalization & AI Features</h2>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li>The Platform uses AI to learn your style preferences ("taste learning") through your swipe interactions, browsing behavior, and saved items.</li>
                  <li>Height and fit fact-checking provides AI-estimated sizing guidance based on product data. Results are approximate and should not replace trying items on in person.</li>
                  <li>Price comparison features aggregate publicly available pricing data from multiple retailers. Azyah Style does not guarantee price accuracy or availability.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">9. Rewards & Points Program</h2>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li>Points earned through Platform activity have no cash value and are non-transferable between accounts.</li>
                  <li>Points may be redeemed for AI credits and other benefits as described in-app.</li>
                  <li>Azyah Style reserves the right to modify, suspend, or terminate the rewards program at any time, with or without notice.</li>
                  <li>Any unused points may expire at the company's discretion.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">10. User-Generated Content</h2>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li>Shoppers, Brands, or Retailers may submit content (e.g., reviews, images, outfit ideas, community posts).</li>
                  <li>By submitting content, you grant Azyah Style a non-exclusive, worldwide, royalty-free license to display and use it on the Platform.</li>
                  <li>You are responsible for ensuring that submitted content does not infringe third-party rights.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">11. UGC Collaborations</h2>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li>Users participating in brand collaborations through the Platform do so as independent parties. The Platform does not create an employment relationship between users and brands.</li>
                  <li>Content created through collaborations is subject to the terms agreed between the user and the brand.</li>
                  <li>Azyah Style facilitates collaboration opportunities but is not a party to payment, delivery, or content disputes between users and brands.</li>
                  <li>Users are responsible for the accuracy, legality, and originality of content they create for collaborations.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">12. Data & Privacy</h2>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li>We collect and process user data in accordance with our <button onClick={() => navigate('/privacy')} className="text-primary hover:underline">Privacy Policy</button>.</li>
                  <li>By using the Platform, you consent to the collection and use of your data as described.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">13. Intellectual Property</h2>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li>All content, branding, logos, and features of Azyah Style are owned by or licensed to us.</li>
                  <li>You may not copy, distribute, or exploit our materials without prior written consent.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">14. Limitation of Liability</h2>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li>The Platform is provided "as is."</li>
                  <li>We make no guarantees about the accuracy, availability, or reliability of product listings, AI-generated content, pricing comparisons, or referral links.</li>
                  <li>To the fullest extent permitted by law, Azyah Style is not liable for any direct, indirect, incidental, or consequential damages related to use of the Platform or transactions with Brands/Retailers.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">15. Account Suspension or Termination</h2>
                <p className="text-muted-foreground">
                  We may suspend or terminate accounts that violate these Terms or engage in fraudulent, misleading, or harmful activity.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">16. Changes to the Terms</h2>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li>We may update these Terms from time to time.</li>
                  <li>Continued use of the Platform after updates constitutes acceptance of the revised Terms.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">17. Governing Law</h2>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li>These Terms are governed by the laws of the United Arab Emirates.</li>
                  <li>Any disputes will be subject to the exclusive jurisdiction of the courts in Dubai, United Arab Emirates.</li>
                </ul>
              </section>

              <div className="text-center pt-8 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  If you have any questions about these Terms & Conditions, please contact us at{' '}
                  <a href="mailto:team@azyahstyle.com" className="text-primary hover:underline">team@azyahstyle.com</a>.
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

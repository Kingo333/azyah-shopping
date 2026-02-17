import React from 'react';
import { Helmet } from 'react-helmet-async';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen dashboard-bg">
      <Helmet>
        <title>Privacy Policy - Azyah Style</title>
        <meta name="description" content="Privacy Policy for Azyah Style - Learn how we protect your data and privacy." />
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
                Privacy Policy
              </h1>
              <p className="text-muted-foreground text-lg">
                Last Updated: February 17, 2026
              </p>
            </div>

            <div className="prose prose-lg max-w-none space-y-8 text-foreground">
              <p className="text-lg">
                At Azyah Style, we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our platform.
              </p>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">1. Information We Collect</h2>
                <div className="space-y-3 text-muted-foreground">
                  <h3 className="text-lg font-semibold text-foreground">Personal Information:</h3>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Name and email address (when you create an account)</li>
                    <li>Profile information (preferences, style choices)</li>
                    <li>Communication preferences</li>
                    <li>Facial and body imagery (uploaded for AI virtual try-on features)</li>
                    <li>Height and body measurements (for fit estimation features)</li>
                  </ul>
                  
                  <h3 className="text-lg font-semibold text-foreground">Usage Data:</h3>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Browsing behavior and interactions with products</li>
                    <li>Search queries and preferences</li>
                    <li>Style preference data from swipe interactions (taste learning)</li>
                    <li>Device information, device identifiers, and IP address</li>
                    <li>In-app purchase transaction metadata</li>
                    <li>Cookies and similar tracking technologies</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">2. How We Use Your Information</h2>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li>Provide personalized fashion recommendations</li>
                  <li>Generate AI virtual try-on images and videos using your uploaded photos</li>
                  <li>Provide height and fit fact-checking based on your measurements</li>
                  <li>Learn your style preferences through your interactions to personalize recommendations</li>
                  <li>Improve our AI-powered discovery algorithms</li>
                  <li>Send you relevant product updates and notifications</li>
                  <li>Process rewards points and credit redemptions</li>
                  <li>Process affiliate commissions and analytics</li>
                  <li>Ensure platform security and prevent fraud</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">3. Information Sharing</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p><strong>We do not sell your personal data.</strong></p>
                  <p>We may share information with:</p>
                  <ul className="space-y-2 list-disc list-inside ml-4">
                    <li><strong>Brand and Retailer Partners:</strong> Aggregated, non-personal analytics to help them understand trends</li>
                    <li><strong>AI Processing Partners:</strong> Your photos may be sent to third-party AI services to generate virtual try-on results. These services process images according to their own privacy policies and do not retain your data beyond the processing session.</li>
                    <li><strong>Service Providers:</strong> Third-party services that help us operate the platform (hosting, analytics, subscription management)</li>
                    <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and users' safety</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">4. Cookies and Tracking</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p>We use cookies and similar technologies to:</p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Remember your preferences and login status</li>
                    <li>Provide personalized content and recommendations</li>
                    <li>Analyze platform usage and performance</li>
                    <li>Support affiliate tracking for commissions</li>
                  </ul>
                  <p>You can control cookie preferences through your browser settings. For more details, see our <button onClick={() => navigate('/cookies')} className="text-primary hover:underline">Cookie Policy</button>.</p>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">5. Data Security</h2>
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  <li>We use industry-standard encryption to protect your data</li>
                  <li>Regular security audits and updates</li>
                  <li>Limited access to personal data on a need-to-know basis</li>
                  <li>Secure data centers and backup systems</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">6. Your Rights</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p>You have the right to:</p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li><strong>Access:</strong> Request a copy of your personal data</li>
                    <li><strong>Update:</strong> Correct inaccurate or incomplete information</li>
                    <li><strong>Delete:</strong> Request deletion of your account, uploaded photos, and AI-generated outputs</li>
                    <li><strong>Portability:</strong> Export your data in a common format</li>
                    <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                  </ul>
                  <p>To exercise these rights, please contact us at <a href="mailto:support@azyahstyle.com" className="text-primary hover:underline">support@azyahstyle.com</a> or through your platform settings.</p>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">7. Third-Party Services</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p>Our platform integrates with third-party services:</p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li><strong>Social Media:</strong> Optional login via Google, Apple, etc.</li>
                    <li><strong>Database & Authentication:</strong> Supabase for user accounts and data storage</li>
                    <li><strong>Subscription Management:</strong> RevenueCat and Apple In-App Purchases for premium subscription processing</li>
                    <li><strong>AI Services:</strong> Third-party AI providers for virtual try-on image and video generation</li>
                    <li><strong>Analytics:</strong> Usage analytics to improve platform performance</li>
                  </ul>
                  <p>These services have their own privacy policies, which we encourage you to review.</p>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">8. AI Data & Photo Processing</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p>When you use our AI virtual try-on features:</p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Photos you upload are processed by third-party AI services solely to generate the requested try-on result.</li>
                    <li>Generated try-on outputs are stored temporarily and can be deleted by you at any time through the app.</li>
                    <li>Azyah Style does not use your uploaded photos for purposes other than generating the requested try-on result and improving the service.</li>
                    <li>You can request deletion of all uploaded photos and generated outputs by contacting <a href="mailto:support@azyahstyle.com" className="text-primary hover:underline">support@azyahstyle.com</a>.</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">9. Data Retention</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p>We retain your data for the following typical periods:</p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li><strong>Account data:</strong> Retained until you request deletion of your account.</li>
                    <li><strong>AI try-on uploads and outputs:</strong> Retained until deleted by you, or 90 days after generation, whichever comes first.</li>
                    <li><strong>Style preference and interaction data:</strong> Retained for the duration of your active account.</li>
                    <li><strong>Analytics and usage logs:</strong> Retained for up to 24 months.</li>
                    <li><strong>Subscription transaction records:</strong> Retained as required by applicable tax and financial regulations.</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">10. International Users</h2>
                <p className="text-muted-foreground">
                  Azyah Style operates globally. Your data may be processed in countries other than your own. We ensure appropriate safeguards are in place to protect your privacy rights regardless of location.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">11. Children's Privacy</h2>
                <p className="text-muted-foreground">
                  Our platform is not intended for users under 13 years old. We do not knowingly collect personal information from children under 13. If we become aware of such data collection, we will delete it promptly.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">12. Changes to This Policy</h2>
                <p className="text-muted-foreground">
                  We may update this Privacy Policy from time to time. We will notify you of significant changes via email or platform notification. Your continued use of the platform constitutes acceptance of the updated policy.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-cormorant font-bold text-primary">13. Contact Us</h2>
                <div className="text-muted-foreground">
                  <p>If you have questions about this Privacy Policy or our data practices, please contact us:</p>
                  <ul className="space-y-1 list-disc list-inside mt-2">
                    <li>Through your platform settings</li>
                    <li>Via our support system</li>
                    <li>Email: <a href="mailto:support@azyahstyle.com" className="text-primary hover:underline">support@azyahstyle.com</a></li>
                  </ul>
                </div>
              </section>

              <div className="text-center pt-8 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  This Privacy Policy is designed to be transparent and easy to understand. We believe in giving you control over your data and privacy.
                </p>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};

export default Privacy;

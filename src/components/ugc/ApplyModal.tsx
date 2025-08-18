import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useApplyToCollaboration } from '@/hooks/useCollaborations';
import { supabase } from '@/integrations/supabase/client';
import { Collaboration } from '@/types/ugc';
import { PLATFORM_OPTIONS } from '@/types/ugc';
import { ExternalLink } from 'lucide-react';

interface ApplyModalProps {
  collaboration: Collaboration;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ApplyModal: React.FC<ApplyModalProps> = ({ 
  collaboration, 
  open, 
  onOpenChange 
}) => {
  const { user } = useAuth();
  const applyMutation = useApplyToCollaboration();
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load user's existing social links
  useEffect(() => {
    const loadUserSocialLinks = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('social_links')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data?.social_links) {
          setSocialLinks(data.social_links as Record<string, string>);
        }
      } catch (error) {
        console.error('Error loading user social links:', error);
      }
    };

    if (open) {
      loadUserSocialLinks();
    }
  }, [user?.id, open]);

  const handleSocialLinkChange = (platform: string, value: string) => {
    setSocialLinks(prev => ({ ...prev, [platform]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || isLoading) return;

    setIsLoading(true);

    try {
      // Validate that required social links are provided
      const requiredLinks: Record<string, string> = {};
      collaboration.platforms.forEach(platform => {
        const link = socialLinks[platform];
        if (link && link.trim()) {
          requiredLinks[platform] = link.trim();
        }
      });

      if (Object.keys(requiredLinks).length === 0) {
        throw new Error('Please provide at least one social media link for the required platforms');
      }

      await applyMutation.mutateAsync({
        collab_id: collaboration.id,
        shopper_id: user.id,
        social_links: requiredLinks,
        note: note.trim() || undefined
      });

      onOpenChange(false);
      setSocialLinks({});
      setNote('');
    } catch (error: any) {
      console.error('Error applying to collaboration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPlatformLabel = (platform: string) => {
    return PLATFORM_OPTIONS.find(p => p.value === platform)?.label || platform;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-cormorant">Apply to Collaboration</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h3 className="font-medium mb-3">Social Media Links</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Please provide your social media profiles for the platforms required by this collaboration.
            </p>
            
            <div className="space-y-3">
              {collaboration.platforms.map(platform => (
                <div key={platform}>
                  <Label htmlFor={`social-${platform}`} className="flex items-center gap-2">
                    <span>{PLATFORM_OPTIONS.find(p => p.value === platform)?.icon}</span>
                    {getPlatformLabel(platform)} Profile URL
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id={`social-${platform}`}
                      type="url"
                      placeholder={`https://${platform}.com/your-profile`}
                      value={socialLinks[platform] || ''}
                      onChange={(e) => handleSocialLinkChange(platform, e.target.value)}
                      className="pr-10"
                      required
                    />
                    {socialLinks[platform] && (
                      <a
                        href={socialLinks[platform]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="note">Additional Message (Optional)</Label>
            <Textarea
              id="note"
              placeholder="Tell the brand why you're perfect for this collaboration..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || applyMutation.isPending}
              className="flex-1"
            >
              {isLoading || applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
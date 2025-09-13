import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Users, Eye, Globe, X } from 'lucide-react';
import { usePublishLook } from '@/hooks/useLooks';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PublishLookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  look: any;
  onPublished?: () => void;
}

export const PublishLookModal: React.FC<PublishLookModalProps> = ({
  open,
  onOpenChange,
  look,
  onPublished
}) => {
  const publishMutation = usePublishLook();
  const [formData, setFormData] = useState({
    title: look?.title || '',
    description: look?.description || '',
    tags: look?.tags || [],
    isPublic: look?.is_public || false
  });
  const [newTag, setNewTag] = useState('');

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim().toLowerCase()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handlePublish = async () => {
    if (!look?.id) return;

    try {
      await publishMutation.mutateAsync({
        lookId: look.id,
        title: formData.title,
        description: formData.description,
        tags: formData.tags
      });

      toast({
        title: "Look published!",
        description: formData.isPublic 
          ? "Your outfit is now visible to the community" 
          : "Your outfit has been saved with your updates"
      });

      onOpenChange(false);
      onPublished?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to publish your look"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (!look) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Publish Your Outfit
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Outfit Preview */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="w-16 h-20 bg-gradient-to-br from-primary/5 to-primary/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-6 w-6 text-primary/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{look.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {look.canvas?.items?.length || 0} items in this outfit
                  </p>
                  {look.tags && look.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {look.tags.slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Publishing Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Outfit Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Give your outfit a catchy name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your style inspiration or occasion..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Style Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add tags like 'casual', 'summer', 'date-night'"
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                >
                  Add
                </Button>
              </div>
              
              {formData.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-2">
                  {formData.tags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      className="gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag}
                      <X className="h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Visibility Settings */}
            <div className="space-y-3">
              <Label>Visibility</Label>
              
              <div className="space-y-3">
                <div 
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                    !formData.isPublic ? "bg-primary/5 border-primary" : "hover:bg-muted/50"
                  )}
                  onClick={() => setFormData(prev => ({ ...prev, isPublic: false }))}
                >
                  <div className="flex items-center gap-3">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-sm">Private</div>
                      <div className="text-xs text-muted-foreground">Only visible to you</div>
                    </div>
                  </div>
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2",
                    !formData.isPublic ? "bg-primary border-primary" : "border-muted-foreground"
                  )} />
                </div>

                <div 
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                    formData.isPublic ? "bg-primary/5 border-primary" : "hover:bg-muted/50"
                  )}
                  onClick={() => setFormData(prev => ({ ...prev, isPublic: true }))}
                >
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-sm">Public</div>
                      <div className="text-xs text-muted-foreground">Share with the community & earn votes</div>
                    </div>
                  </div>
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2",
                    formData.isPublic ? "bg-primary border-primary" : "border-muted-foreground"
                  )} />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePublish}
              disabled={publishMutation.isPending || !formData.title.trim()}
              className="flex-1 gap-2"
            >
              {publishMutation.isPending ? (
                <div className="h-4 w-4 animate-spin rounded-full border border-current border-t-transparent" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {formData.isPublic ? 'Publish to Explore' : 'Save Updates'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
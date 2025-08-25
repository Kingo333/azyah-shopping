import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Share2, Tag, Calendar, Heart, X } from 'lucide-react';

interface PublishDialogProps {
  open: boolean;
  onClose: () => void;
  onPublish: (metadata: {
    title: string;
    description?: string;
    tags: string[];
    occasion?: string;
    mood?: string;
  }) => void;
}

export const PublishDialog: React.FC<PublishDialogProps> = ({
  open,
  onClose,
  onPublish
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [occasion, setOccasion] = useState('');
  const [mood, setMood] = useState('');

  const popularTags = [
    'casual', 'formal', 'workwear', 'weekend', 'date night',
    'summer', 'winter', 'spring', 'fall', 'abaya', 'modest',
    'minimalist', 'colorful', 'monochrome', 'vintage', 'modern'
  ];

  const occasions = [
    'Work', 'Date Night', 'Wedding', 'Casual', 'Party', 'Travel',
    'Beach', 'Gym', 'Shopping', 'Dinner', 'Brunch', 'Evening'
  ];

  const moods = [
    'Confident', 'Relaxed', 'Elegant', 'Playful', 'Sophisticated',
    'Edgy', 'Romantic', 'Professional', 'Comfortable', 'Bold'
  ];

  const handleAddTag = (tag: string) => {
    if (tag && !tags.includes(tag.toLowerCase())) {
      setTags([...tags, tag.toLowerCase()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handlePublish = () => {
    if (!title.trim()) return;

    onPublish({
      title: title.trim(),
      description: description.trim() || undefined,
      tags,
      occasion: occasion || undefined,
      mood: mood || undefined
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Publish Your Look
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Look Title *</Label>
            <Input
              id="title"
              placeholder="Give your look a catchy title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your look, styling tips, or inspiration..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tags
            </Label>
            
            {/* Current tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}

            {/* Add tag input */}
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(newTag);
                  }
                }}
              />
              <Button 
                variant="outline" 
                onClick={() => handleAddTag(newTag)}
                disabled={!newTag.trim()}
              >
                Add
              </Button>
            </div>

            {/* Popular tags */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Popular tags:</p>
              <div className="flex flex-wrap gap-2">
                {popularTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => handleAddTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Occasion */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Occasion
            </Label>
            <div className="flex flex-wrap gap-2">
              {occasions.map((occ) => (
                <Badge
                  key={occ}
                  variant={occasion === occ ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setOccasion(occasion === occ ? '' : occ)}
                >
                  {occ}
                </Badge>
              ))}
            </div>
          </div>

          {/* Mood */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Mood
            </Label>
            <div className="flex flex-wrap gap-2">
              {moods.map((m) => (
                <Badge
                  key={m}
                  variant={mood === m ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setMood(mood === m ? '' : m)}
                >
                  {m}
                </Badge>
              ))}
            </div>
          </div>

          {/* Publish info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm">Publishing to Explore</h4>
            <p className="text-sm text-muted-foreground">
              Your look will be visible to the community and can receive votes and comments. 
              You can make it private again at any time.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handlePublish}
            disabled={!title.trim()}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Publish Look
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
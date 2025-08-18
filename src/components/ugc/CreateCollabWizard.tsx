import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useCreateCollaboration } from '@/hooks/useCollaborations';
import { CollabCompType, PLATFORM_OPTIONS, DELIVERABLE_TYPES } from '@/types/ugc';
import { Plus, Minus } from 'lucide-react';

interface CreateCollabWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerOrgId: string;
  orgType: 'brand' | 'retailer';
}

interface FormData {
  title: string;
  brief: string;
  platforms: string[];
  deliverables: Record<string, Record<string, number>>;
  tone: string;
  talking_points: string[];
  comp_type: CollabCompType;
  currency: string;
  amount: number;
  visibility: string;
  max_creators?: number;
  application_deadline?: string;
}

export const CreateCollabWizard: React.FC<CreateCollabWizardProps> = ({
  open,
  onOpenChange,
  ownerOrgId,
  orgType
}) => {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    brief: '',
    platforms: [],
    deliverables: {},
    tone: '',
    talking_points: [],
    comp_type: 'PRODUCT_EXCHANGE',
    currency: 'USD',
    amount: 0,
    visibility: 'public',
    max_creators: undefined,
    application_deadline: undefined
  });
  const [newTalkingPoint, setNewTalkingPoint] = useState('');

  const { toast } = useToast();
  const createCollaboration = useCreateCollaboration();

  const handlePlatformChange = (platform: string, checked: boolean) => {
    const newPlatforms = checked 
      ? [...formData.platforms, platform]
      : formData.platforms.filter(p => p !== platform);
    
    setFormData(prev => ({ ...prev, platforms: newPlatforms }));
  };

  const handleDeliverableChange = (platform: string, type: string, count: number) => {
    setFormData(prev => ({
      ...prev,
      deliverables: {
        ...prev.deliverables,
        [platform]: {
          ...prev.deliverables[platform],
          [type]: Math.max(0, count)
        }
      }
    }));
  };

  const addTalkingPoint = () => {
    if (newTalkingPoint.trim()) {
      setFormData(prev => ({
        ...prev,
        talking_points: [...prev.talking_points, newTalkingPoint.trim()]
      }));
      setNewTalkingPoint('');
    }
  };

  const removeTalkingPoint = (index: number) => {
    setFormData(prev => ({
      ...prev,
      talking_points: prev.talking_points.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim() || !formData.brief.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and brief are required",
        variant: "destructive"
      });
      return false;
    }

    if (formData.platforms.length === 0) {
      toast({
        title: "Validation Error", 
        description: "At least one platform must be selected",
        variant: "destructive"
      });
      return false;
    }

    const hasDeliverables = Object.values(formData.deliverables).some(platform => 
      Object.values(platform).some(count => count > 0)
    );

    if (!hasDeliverables) {
      toast({
        title: "Validation Error",
        description: "At least one deliverable must be specified",
        variant: "destructive"
      });
      return false;
    }

    if (formData.comp_type === 'PRODUCT_AND_PAID' && formData.amount <= 0) {
      toast({
        title: "Validation Error",
        description: "Amount must be greater than 0 for paid compensation",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (status: 'DRAFT' | 'ACTIVE') => {
    if (!validateForm()) return;

    try {
      await createCollaboration.mutateAsync({
        owner_org_id: ownerOrgId,
        title: formData.title,
        brief: formData.brief,
        platforms: formData.platforms,
        deliverables: formData.deliverables as any,
        tone: formData.tone || undefined,
        talking_points: formData.talking_points.length > 0 ? formData.talking_points : undefined,
        comp_type: formData.comp_type,
        currency: formData.comp_type === 'PRODUCT_AND_PAID' ? formData.currency : undefined,
        amount: formData.comp_type === 'PRODUCT_AND_PAID' ? formData.amount : undefined,
        visibility: formData.visibility,
        max_creators: formData.max_creators,
        application_deadline: formData.application_deadline,
        status,
        created_by: ownerOrgId
      });

      toast({
        title: "Success!",
        description: `Collaboration ${status === 'DRAFT' ? 'saved as draft' : 'published'} successfully.`
      });
      
      onOpenChange(false);
      setFormData({
        title: '',
        brief: '',
        platforms: [],
        deliverables: {},
        tone: '',
        talking_points: [],
        comp_type: 'PRODUCT_EXCHANGE',
        currency: 'USD',
        amount: 0,
        visibility: 'public',
        max_creators: undefined,
        application_deadline: undefined
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create collaboration",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create Collaboration</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] pr-4">
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Summer Collection Campaign"
                  />
                </div>
                <div>
                  <Label htmlFor="brief">Brief *</Label>
                  <Textarea
                    id="brief"
                    value={formData.brief}
                    onChange={(e) => setFormData(prev => ({ ...prev, brief: e.target.value }))}
                    placeholder="Describe your collaboration requirements..."
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Visibility</Label>
                    <RadioGroup
                      value={formData.visibility}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, visibility: value }))}
                      className="mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="public" id="public" />
                        <Label htmlFor="public">Public</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="invite" id="invite" />
                        <Label htmlFor="invite">Invite Only</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label htmlFor="max_creators">Max Creators</Label>
                    <Input
                      id="max_creators"
                      type="number"
                      min="1"
                      value={formData.max_creators || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        max_creators: e.target.value ? parseInt(e.target.value) : undefined 
                      }))}
                      placeholder="No limit"
                    />
                  </div>
                  <div>
                    <Label htmlFor="deadline">Application Deadline</Label>
                    <Input
                      id="deadline"
                      type="datetime-local"
                      value={formData.application_deadline || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, application_deadline: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Platforms & Deliverables */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Platforms & Deliverables</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Select Platforms *</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {PLATFORM_OPTIONS.map((platform) => (
                      <div key={platform.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={platform.value}
                          checked={formData.platforms.includes(platform.value)}
                          onCheckedChange={(checked) => 
                            handlePlatformChange(platform.value, checked as boolean)
                          }
                        />
                        <Label htmlFor={platform.value} className="flex items-center gap-1">
                          <span>{platform.icon}</span>
                          {platform.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {formData.platforms.length > 0 && (
                  <div>
                    <Label>Deliverables *</Label>
                    <div className="grid gap-4 mt-2">
                      {formData.platforms.map((platform) => (
                        <Card key={platform} className="border-dashed">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <span>{PLATFORM_OPTIONS.find(p => p.value === platform)?.icon}</span>
                              {PLATFORM_OPTIONS.find(p => p.value === platform)?.label}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {DELIVERABLE_TYPES[platform as keyof typeof DELIVERABLE_TYPES]?.map((type) => (
                                <div key={type} className="flex items-center justify-between p-2 border rounded">
                                  <span className="text-sm">{type}</span>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDeliverableChange(
                                        platform, 
                                        type.toLowerCase(), 
                                        (formData.deliverables[platform]?.[type.toLowerCase()] || 0) - 1
                                      )}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="w-8 text-center text-sm">
                                      {formData.deliverables[platform]?.[type.toLowerCase()] || 0}
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDeliverableChange(
                                        platform, 
                                        type.toLowerCase(), 
                                        (formData.deliverables[platform]?.[type.toLowerCase()] || 0) + 1
                                      )}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Content Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Content Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="tone">Tone & Style</Label>
                  <Textarea
                    id="tone"
                    value={formData.tone}
                    onChange={(e) => setFormData(prev => ({ ...prev, tone: e.target.value }))}
                    placeholder="Describe the desired tone, style, and messaging..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Talking Points</Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={newTalkingPoint}
                        onChange={(e) => setNewTalkingPoint(e.target.value)}
                        placeholder="Add a talking point..."
                        onKeyPress={(e) => e.key === 'Enter' && addTalkingPoint()}
                      />
                      <Button onClick={addTalkingPoint} variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {formData.talking_points.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.talking_points.map((point, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {point}
                            <button onClick={() => removeTalkingPoint(index)}>
                              <Minus className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compensation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Compensation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Compensation Type *</Label>
                  <RadioGroup
                    value={formData.comp_type}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      comp_type: value as CollabCompType 
                    }))}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PRODUCT_EXCHANGE" id="product" />
                      <Label htmlFor="product">Product Exchange Only</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PRODUCT_AND_PAID" id="paid" />
                      <Label htmlFor="paid">Product + Paid Compensation</Label>
                    </div>
                  </RadioGroup>
                </div>

                {formData.comp_type === 'PRODUCT_AND_PAID' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Input
                        id="currency"
                        value={formData.currency}
                        onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                        placeholder="USD"
                      />
                    </div>
                    <div>
                      <Label htmlFor="amount">Amount *</Label>
                      <Input
                        id="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          amount: parseFloat(e.target.value) || 0 
                        }))}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <Separator />

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => handleSubmit('DRAFT')}
            disabled={createCollaboration.isPending}
          >
            Save as Draft
          </Button>
          <Button
            onClick={() => handleSubmit('ACTIVE')}
            disabled={createCollaboration.isPending}
          >
            Publish
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
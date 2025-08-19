import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogoUpload } from '@/components/LogoUpload';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, Plus, X } from 'lucide-react';

interface RetailerSettingsFormProps {
  retailer: {
    id: string;
    name: string;
    slug: string;
    bio: string | null;
    website: string | null;
    contact_email: string | null;
    logo_url: string | null;
    shipping_regions: string[];
    socials: Record<string, string>;
  };
  onRetailerUpdate: (updatedRetailer: any) => void;
}

export const RetailerSettingsForm: React.FC<RetailerSettingsFormProps> = ({
  retailer,
  onRetailerUpdate
}) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: retailer.name || '',
    bio: retailer.bio || '',
    website: retailer.website || '',
    contact_email: retailer.contact_email || '',
    shipping_regions: retailer.shipping_regions || [],
    socials: retailer.socials || {}
  });
  const [newRegion, setNewRegion] = useState('');
  const [newSocialPlatform, setNewSocialPlatform] = useState('');
  const [newSocialUrl, setNewSocialUrl] = useState('');

  const handleLogoUpdate = (logoUrl: string | null) => {
    onRetailerUpdate({ ...retailer, logo_url: logoUrl });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddRegion = () => {
    if (newRegion.trim() && !formData.shipping_regions.includes(newRegion.trim())) {
      handleInputChange('shipping_regions', [...formData.shipping_regions, newRegion.trim()]);
      setNewRegion('');
    }
  };

  const handleRemoveRegion = (region: string) => {
    handleInputChange('shipping_regions', formData.shipping_regions.filter(r => r !== region));
  };

  const handleAddSocial = () => {
    if (newSocialPlatform.trim() && newSocialUrl.trim()) {
      handleInputChange('socials', {
        ...formData.socials,
        [newSocialPlatform.trim()]: newSocialUrl.trim()
      });
      setNewSocialPlatform('');
      setNewSocialUrl('');
    }
  };

  const handleRemoveSocial = (platform: string) => {
    const { [platform]: removed, ...remainingSocials } = formData.socials;
    handleInputChange('socials', remainingSocials);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('retailers')
        .update({
          name: formData.name,
          bio: formData.bio,
          website: formData.website,
          contact_email: formData.contact_email,
          shipping_regions: formData.shipping_regions,
          socials: formData.socials,
          updated_at: new Date().toISOString()
        })
        .eq('id', retailer.id);

      if (error) throw error;

      const updatedRetailer = {
        ...retailer,
        ...formData
      };

      onRetailerUpdate(updatedRetailer);
      setIsEditing(false);
      
      toast({
        description: "Store settings updated successfully"
      });
    } catch (error: any) {
      console.error('Error updating retailer:', error);
      toast({
        title: "Error",
        description: "Failed to update store settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: retailer.name || '',
      bio: retailer.bio || '',
      website: retailer.website || '',
      contact_email: retailer.contact_email || '',
      shipping_regions: retailer.shipping_regions || [],
      socials: retailer.socials || {}
    });
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Store Settings</CardTitle>
          <Button onClick={() => setIsEditing(true)} variant="outline">
            Edit Settings
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Logo Section */}
            <div>
              <h3 className="text-lg font-medium mb-4">Store Logo</h3>
              <div className="flex items-center gap-4">
                {retailer.logo_url ? (
                  <img 
                    src={retailer.logo_url} 
                    alt={retailer.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center text-muted-foreground font-bold">
                    {retailer.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-medium">{retailer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {retailer.logo_url ? 'Logo uploaded' : 'No logo uploaded'}
                  </p>
                </div>
              </div>
            </div>

            {/* Store Information */}
            <div>
              <h3 className="text-lg font-medium mb-2">Store Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Store Name</label>
                  <p className="text-muted-foreground">{retailer.name || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Store Slug</label>
                  <p className="text-muted-foreground">{retailer.slug || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Website</label>
                  <p className="text-muted-foreground">{retailer.website || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Contact Email</label>
                  <p className="text-muted-foreground">{retailer.contact_email || 'Not set'}</p>
                </div>
              </div>
            </div>

            {/* Store Bio */}
            <div>
              <h3 className="text-lg font-medium mb-2">Store Description</h3>
              <p className="text-muted-foreground">{retailer.bio || 'No description available'}</p>
            </div>

            {/* Shipping Regions */}
            <div>
              <h3 className="text-lg font-medium mb-2">Shipping Regions</h3>
              <div className="flex flex-wrap gap-2">
                {retailer.shipping_regions?.length > 0 ? (
                  retailer.shipping_regions.map((region: string) => (
                    <Badge key={region} variant="outline">{region}</Badge>
                  ))
                ) : (
                  <p className="text-muted-foreground">No shipping regions configured</p>
                )}
              </div>
            </div>

            {/* Social Links */}
            <div>
              <h3 className="text-lg font-medium mb-2">Social Media</h3>
              <div className="flex flex-wrap gap-2">
                {Object.keys(retailer.socials || {}).length > 0 ? (
                  Object.entries(retailer.socials || {}).map(([platform, url]) => (
                    <Badge key={platform} variant="secondary">
                      {platform}: {url}
                    </Badge>
                  ))
                ) : (
                  <p className="text-muted-foreground">No social media links configured</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Store Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Logo Upload */}
          <div>
            <h3 className="text-lg font-medium mb-4">Store Logo</h3>
            <LogoUpload
              currentLogoUrl={retailer.logo_url}
              onLogoUpdate={handleLogoUpdate}
              entityType="retailer"
              entityId={retailer.id}
            />
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Store Name</label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter store name"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Website</label>
              <Input
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Contact Email</label>
              <Input
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                placeholder="contact@store.com"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-2 block">Store Description</label>
            <Textarea
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="Describe your store..."
              rows={4}
            />
          </div>

          {/* Shipping Regions */}
          <div>
            <label className="text-sm font-medium mb-2 block">Shipping Regions</label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newRegion}
                  onChange={(e) => setNewRegion(e.target.value)}
                  placeholder="Add shipping region"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddRegion()}
                />
                <Button type="button" onClick={handleAddRegion} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.shipping_regions.map((region) => (
                  <Badge key={region} variant="outline" className="gap-1">
                    {region}
                    <button
                      type="button"
                      onClick={() => handleRemoveRegion(region)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div>
            <label className="text-sm font-medium mb-2 block">Social Media Links</label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newSocialPlatform}
                  onChange={(e) => setNewSocialPlatform(e.target.value)}
                  placeholder="Platform (e.g., Instagram)"
                  className="flex-1"
                />
                <Input
                  value={newSocialUrl}
                  onChange={(e) => setNewSocialUrl(e.target.value)}
                  placeholder="URL"
                  className="flex-1"
                />
                <Button type="button" onClick={handleAddSocial} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(formData.socials).map(([platform, url]) => (
                  <Badge key={platform} variant="secondary" className="gap-1">
                    {platform}: {url}
                    <button
                      type="button"
                      onClick={() => handleRemoveSocial(platform)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
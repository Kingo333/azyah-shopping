import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogoUpload } from '@/components/LogoUpload';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, Plus, X, Trash2, CheckCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

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
  const [isDeleting, setIsDeleting] = useState(false);
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

  // Calculate profile completion - must match useProfileCompletion hook for consistency
  const getProfileCompletion = () => {
    const fields = {
      name: { value: retailer.name && retailer.name !== 'My Store', weight: 20 },
      logo_url: { value: retailer.logo_url, weight: 25 },
      bio: { value: retailer.bio, weight: 20 },
      website: { value: retailer.website, weight: 15 },
      contact_email: { value: retailer.contact_email, weight: 20 }
    };

    let totalScore = 0;
    Object.values(fields).forEach((field) => {
      const hasValue = field.value && (typeof field.value === 'string' ? field.value.trim() !== '' : true);
      if (hasValue) {
        totalScore += field.weight;
      }
    });

    return Math.round(totalScore);
  };

  const completionPercentage = getProfileCompletion();


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

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`https://klwolsopucgswhtdlsps.supabase.co/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }

      toast({
        title: "Account Deleted",
        description: "Your account and all associated data have been permanently deleted.",
      });

      // Sign out and redirect
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle>Store Settings</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={completionPercentage === 100 ? "default" : "secondary"}>
                  {completionPercentage}% Complete
                </Badge>
                {completionPercentage === 100 && <CheckCircle className="h-5 w-5 text-green-500" />}
              </div>
            </div>
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

        {/* Danger Zone */}
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Delete Account</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Permanently delete your retailer account and all associated data. This action cannot be undone.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isDeleting}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isDeleting ? 'Deleting...' : 'Delete Account'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your retailer account
                        and remove all of your data from our servers including:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Your store profile and settings</li>
                          <li>All uploaded products</li>
                          <li>Analytics and engagement data</li>
                          <li>Collaborations and applications</li>
                          <li>All other associated data</li>
                        </ul>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isDeleting}
                      >
                        {isDeleting ? 'Deleting...' : 'Yes, delete my account'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
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
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LogoUpload } from '@/components/LogoUpload';
import { Badge } from '@/components/ui/badge';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, AlertCircle, Globe, Mail, Users, Tag, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  bio: string | null;
  website: string | null;
  contact_email: string | null;
  socials: any;
  shipping_regions: string[];
}

interface BrandSettingsFormProps {
  brand: Brand;
  onBrandUpdate: (updatedBrand: Brand) => void;
}

export const BrandSettingsForm: React.FC<BrandSettingsFormProps> = ({ brand, onBrandUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: brand.name || '',
    bio: brand.bio || '',
    website: brand.website || '',
    contact_email: brand.contact_email || '',
    shipping_regions: brand.shipping_regions || [],
    socials: brand.socials || {}
  });

  const { toast } = useToast();

  // Calculate profile completion - must match useProfileCompletion hook for consistency
  const getProfileCompletion = () => {
    const fields = {
      name: { value: brand.name && brand.name !== 'My Brand', weight: 20 },
      logo_url: { value: brand.logo_url, weight: 25 },
      bio: { value: brand.bio, weight: 20 },
      website: { value: brand.website, weight: 15 },
      contact_email: { value: brand.contact_email, weight: 20 }
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

  const isNewBrand = () => {
    return !brand.bio && !brand.website && (!brand.name || brand.name === 'My Brand' || brand.name.includes('@'));
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddRegion = () => {
    const newRegion = prompt('Enter shipping region:');
    if (newRegion?.trim()) {
      setFormData(prev => ({
        ...prev,
        shipping_regions: [...prev.shipping_regions, newRegion.trim()]
      }));
    }
  };

  const handleRemoveRegion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      shipping_regions: prev.shipping_regions.filter((_, i) => i !== index)
    }));
  };

  const handleAddSocial = () => {
    const platform = prompt('Platform (e.g., instagram, tiktok):');
    const handle = prompt('Handle/Username:');
    if (platform?.trim() && handle?.trim()) {
      setFormData(prev => ({
        ...prev,
        socials: { ...prev.socials, [platform.trim().toLowerCase()]: handle.trim() }
      }));
    }
  };

  const handleRemoveSocial = (platform: string) => {
    setFormData(prev => {
      const newSocials = { ...prev.socials };
      delete newSocials[platform];
      return { ...prev, socials: newSocials };
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const { data, error } = await supabase
        .from('brands')
        .update({
          name: formData.name,
          bio: formData.bio,
          website: formData.website,
          contact_email: formData.contact_email,
          shipping_regions: formData.shipping_regions,
          socials: formData.socials,
          updated_at: new Date().toISOString()
        })
        .eq('id', brand.id)
        .select()
        .single();

      if (error) throw error;

      onBrandUpdate(data);
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your brand profile has been saved successfully!",
      });
    } catch (error) {
      console.error('Error updating brand:', error);
      toast({
        title: "Error",
        description: "Failed to update brand profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: brand.name || '',
      bio: brand.bio || '',
      website: brand.website || '',
      contact_email: brand.contact_email || '',
      shipping_regions: brand.shipping_regions || [],
      socials: brand.socials || {}
    });
    setIsEditing(false);
  };

  const handleLogoUpdate = (logoUrl: string | null) => {
    onBrandUpdate({ ...brand, logo_url: logoUrl });
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

  const completionPercentage = getProfileCompletion();

  if (!isEditing) {
    return (
      <div className="space-y-6">
        {/* Welcome Banner for New Brands */}
        {isNewBrand() && (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">Welcome to Your Brand Portal!</h3>
                  <p className="text-muted-foreground mb-4">
                    Complete your brand profile to start connecting with customers and content creators. 
                    A complete profile helps build trust and improves your brand's visibility.
                  </p>
                  <Button onClick={() => setIsEditing(true)} className="bg-primary hover:bg-primary/90">
                    Complete Your Profile
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Completion Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Brand Profile</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={completionPercentage === 100 ? "default" : "secondary"}>
                  {completionPercentage}% Complete
                </Badge>
                {completionPercentage === 100 && <CheckCircle className="h-5 w-5 text-green-500" />}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Section */}
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                Brand Logo
                <InfoTooltip content="Upload your brand logo to help customers recognize your brand" />
              </label>
              <LogoUpload
                currentLogoUrl={brand.logo_url}
                onLogoUpdate={handleLogoUpdate}
                entityType="brand"
                entityId={brand.id}
              />
            </div>

            {/* Basic Info Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Brand Name</label>
                <div className="p-3 bg-muted/50 rounded-md">
                  {brand.name || 'Not set'}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                  Contact Email
                  <InfoTooltip content="This email will be used for business communications" />
                </label>
                <div className="p-3 bg-muted/50 rounded-md">
                  {brand.contact_email || 'Not set'}
                </div>
              </div>
            </div>

            {/* Website */}
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Website
                <InfoTooltip content="Your brand's website or online store" />
              </label>
              <div className="p-3 bg-muted/50 rounded-md">
                {brand.website || 'Not set'}
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="text-sm font-medium mb-2 block">Brand Description</label>
              <div className="p-3 bg-muted/50 rounded-md min-h-[80px]">
                {brand.bio || 'No description added yet'}
              </div>
            </div>

            {/* Shipping Regions */}
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Users className="h-4 w-4" />
                Shipping Regions
                <InfoTooltip content="Regions where you ship your products" />
              </label>
              <div className="flex flex-wrap gap-2">
                {brand.shipping_regions?.length > 0 ? (
                  brand.shipping_regions.map((region, index) => (
                    <Badge key={index} variant="outline">{region}</Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">No shipping regions set</span>
                )}
              </div>
            </div>

            {/* Social Links */}
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Social Media
                <InfoTooltip content="Your brand's social media handles" />
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(brand.socials || {}).length > 0 ? (
                  Object.entries(brand.socials || {}).map(([platform, handle]) => (
                    <Badge key={platform} variant="outline">
                      {platform}: @{handle as string}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">No social media added</span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={() => setIsEditing(true)} className="w-full sm:w-auto">
                Edit Profile
              </Button>
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
                  Permanently delete your brand account and all associated data. This action cannot be undone.
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
                        This action cannot be undone. This will permanently delete your brand account
                        and remove all of your data from our servers including:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Your brand profile and settings</li>
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

  // Edit Mode
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit Brand Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              Brand Logo
              <InfoTooltip content="Upload a high-quality logo that represents your brand" />
            </label>
            <LogoUpload
              currentLogoUrl={brand.logo_url}
              onLogoUpdate={handleLogoUpdate}
              entityType="brand"
              entityId={brand.id}
            />
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Brand Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your brand name"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                Contact Email *
                <InfoTooltip content="Primary contact email for business communications" />
              </label>
              <Input
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                placeholder="contact@yourbrand.com"
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Website
            </label>
            <Input
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="https://yourbrand.com"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Brand Description
            </label>
            <Textarea
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="Tell customers about your brand, values, and what makes you unique..."
              rows={4}
            />
          </div>

          {/* Shipping Regions */}
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Users className="h-4 w-4" />
              Shipping Regions
            </label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {formData.shipping_regions.map((region, index) => (
                  <Badge key={index} variant="outline" className="cursor-pointer" onClick={() => handleRemoveRegion(index)}>
                    {region} ×
                  </Badge>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddRegion}>
                Add Region
              </Button>
            </div>
          </div>

          {/* Social Media */}
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Social Media
            </label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {Object.entries(formData.socials).map(([platform, handle]) => (
                  <Badge key={platform} variant="outline" className="cursor-pointer" onClick={() => handleRemoveSocial(platform)}>
                    {platform}: @{handle as string} ×
                  </Badge>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddSocial}>
                Add Social Platform
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
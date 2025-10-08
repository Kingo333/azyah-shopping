import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { BackButton } from '@/components/ui/back-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Upload, Instagram, Twitter, Globe, Music, Crown, CreditCard, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { COUNTRIES } from '@/lib/countries';
import { CITIES } from '@/lib/cities';

interface ProfileData {
  name: string;
  username: string;
  bio: string;
  country: string;
  city: string;
  avatar_url: string;
  socials: {
    instagram?: string;
    instagram_followers?: number;
    instagram_url?: string;
    twitter?: string;
    twitter_followers?: number;
    twitter_url?: string;
    tiktok?: string;
    tiktok_followers?: number;
    tiktok_url?: string;
    website?: string;
  };
}

const ProfileSettings: React.FC = () => {
  const { user, signOut } = useAuth();
  const { subscription, isPremium, createPaymentIntent, cancelSubscription } = useSubscription();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    username: '',
    bio: '',
    country: '',
    city: '',
    avatar_url: '',
    socials: {}
  });
  const [countryOpen, setCountryOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      if (data) {
        setProfileData({
          name: data.name || '',
          username: data.email?.split('@')[0] || '',
          bio: data.bio || '',
          country: data.country || '',
          city: (data as any).city || '',
          avatar_url: data.avatar_url || '',
          socials: (typeof data.socials === 'object' && data.socials !== null) ? data.socials as any : {}
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSocialChange = (platform: string, value: string | number) => {
    setProfileData(prev => ({
      ...prev,
      socials: {
        ...prev.socials,
        [platform]: value
      }
    }));
  };

  const saveProfile = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: profileData.name,
          bio: profileData.bio,
          country: profileData.country,
          city: profileData.city,
          avatar_url: profileData.avatar_url,
          socials: profileData.socials,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated."
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;

    setIsDeletingAccount(true);
    try {
      // Re-authenticate user before deletion
      const { error: reAuthError } = await supabase.auth.reauthenticate();
      if (reAuthError) {
        throw new Error('Re-authentication required for account deletion');
      }

      // Soft delete - mark account for deletion
      const { error } = await supabase
        .from('users')
        .update({
          email: `deleted_${Date.now()}@azyah.com`,
          name: 'Deleted User',
          bio: null,
          avatar_url: null,
          socials: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Account Scheduled for Deletion",
        description: "Your account will be permanently deleted in 30 days. You can contact support to recover it before then."
      });

      // Sign out user
      await signOut();
    } catch (error: any) {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const characterCount = profileData.bio.length;
  const maxBioLength = 160;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <BackButton />
          <h1 className="text-2xl font-bold">Profile Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Profile Picture */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profileData.avatar_url} />
                  <AvatarFallback className="text-lg">
                    {profileData.name ? profileData.name[0].toUpperCase() : user?.email?.[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photo
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Recommended: Square image, at least 200x200px
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Your display name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={profileData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    placeholder="@username"
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    Username cannot be changed
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profileData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell us about yourself..."
                  maxLength={maxBioLength}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {characterCount}/{maxBioLength} characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={countryOpen}
                      className="w-full justify-between"
                    >
                      {profileData.country || "Select your country..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search countries..." />
                      <CommandList>
                        <CommandEmpty>No country found.</CommandEmpty>
                        <CommandGroup>
                          {COUNTRIES.map((country) => (
                            <CommandItem
                              key={country.code}
                              value={country.name}
                              onSelect={(currentValue) => {
                                handleInputChange('country', currentValue === profileData.country ? "" : currentValue);
                                setCountryOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  profileData.country === country.name ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {country.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Popover open={cityOpen} onOpenChange={setCityOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={cityOpen}
                      className="w-full justify-between"
                    >
                      {profileData.city || "Select your city..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search cities..." />
                      <CommandList>
                        <CommandEmpty>No city found.</CommandEmpty>
                        <CommandGroup>
                          {CITIES.map((city) => (
                            <CommandItem
                              key={city.code}
                              value={city.name}
                              onSelect={(currentValue) => {
                                handleInputChange('city', currentValue === profileData.city ? "" : currentValue);
                                setCityOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  profileData.city === city.name ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {city.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <Label className="text-base font-medium">Instagram</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="instagram" className="text-sm">Username</Label>
                    <div className="flex">
                      <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-md">
                        <Instagram className="h-4 w-4" />
                      </div>
                      <Input
                        id="instagram"
                        value={profileData.socials.instagram || ''}
                        onChange={(e) => handleSocialChange('instagram', e.target.value)}
                        placeholder="@username"
                        className="rounded-l-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instagram-followers" className="text-sm">Followers</Label>
                    <Input
                      id="instagram-followers"
                      type="number"
                      value={profileData.socials.instagram_followers || ''}
                      onChange={(e) => handleSocialChange('instagram_followers', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram-url" className="text-sm">Profile Link</Label>
                  <div className="flex">
                    <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-md text-sm text-muted-foreground">
                      https://instagram.com/
                    </div>
                    <Input
                      id="instagram-url"
                      value={profileData.socials.instagram_url || ''}
                      onChange={(e) => handleSocialChange('instagram_url', e.target.value)}
                      placeholder="username"
                      className="rounded-l-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">Twitter/X</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="twitter" className="text-sm">Username</Label>
                    <div className="flex">
                      <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-md">
                        <Twitter className="h-4 w-4" />
                      </div>
                      <Input
                        id="twitter"
                        value={profileData.socials.twitter || ''}
                        onChange={(e) => handleSocialChange('twitter', e.target.value)}
                        placeholder="@username"
                        className="rounded-l-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twitter-followers" className="text-sm">Followers</Label>
                    <Input
                      id="twitter-followers"
                      type="number"
                      value={profileData.socials.twitter_followers || ''}
                      onChange={(e) => handleSocialChange('twitter_followers', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitter-url" className="text-sm">Profile Link</Label>
                  <div className="flex">
                    <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-md text-sm text-muted-foreground">
                      https://x.com/
                    </div>
                    <Input
                      id="twitter-url"
                      value={profileData.socials.twitter_url || ''}
                      onChange={(e) => handleSocialChange('twitter_url', e.target.value)}
                      placeholder="username"
                      className="rounded-l-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">TikTok</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tiktok" className="text-sm">Username</Label>
                    <div className="flex">
                      <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-md">
                        <Music className="h-4 w-4" />
                      </div>
                      <Input
                        id="tiktok"
                        value={profileData.socials.tiktok || ''}
                        onChange={(e) => handleSocialChange('tiktok', e.target.value)}
                        placeholder="@username"
                        className="rounded-l-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tiktok-followers" className="text-sm">Followers</Label>
                    <Input
                      id="tiktok-followers"
                      type="number"
                      value={profileData.socials.tiktok_followers || ''}
                      onChange={(e) => handleSocialChange('tiktok_followers', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tiktok-url" className="text-sm">Profile Link</Label>
                  <div className="flex">
                    <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-md text-sm text-muted-foreground">
                      https://tiktok.com/@
                    </div>
                    <Input
                      id="tiktok-url"
                      value={profileData.socials.tiktok_url || ''}
                      onChange={(e) => handleSocialChange('tiktok_url', e.target.value)}
                      placeholder="username"
                      className="rounded-l-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <div className="flex">
                  <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-md">
                    <Globe className="h-4 w-4" />
                  </div>
                  <Input
                    id="website"
                    value={profileData.socials.website || ''}
                    onChange={(e) => handleSocialChange('website', e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="rounded-l-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isPremium ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                        <Crown className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Premium Active</h3>
                        <p className="text-sm text-muted-foreground">
                          You have full access to all premium features
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <p className="font-medium capitalize">{subscription?.status}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Plan:</span>
                        <p className="font-medium">Premium Shopper</p>
                      </div>
                      {subscription?.current_period_end && (
                        <>
                          <div>
                            <span className="text-muted-foreground">Active Until:</span>
                            <p className="font-medium">
                              {new Date(subscription.current_period_end).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Renewal:</span>
                            <p className="font-medium">Manual</p>
                          </div>
                        </>
                      )}
                    </div>

                    <Separator className="my-4" />

                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Premium Benefits:</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          Unlimited AI Try-On generations
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          Unlimited Toy Replica generations
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          Full AI Beauty Consultant access
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          Priority customer support
                        </li>
                      </ul>
                    </div>
                  </div>

                  {subscription?.status === 'active' && (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button 
                        variant="outline" 
                        onClick={cancelSubscription}
                        className="flex-1"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Cancel Premium
                      </Button>
                      <Button 
                        onClick={() => createPaymentIntent()}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Renew Early
                      </Button>
                    </div>
                  )}

                  {subscription?.status === 'canceled' && (
                    <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <p className="text-sm text-orange-800 dark:text-orange-200 mb-2">
                        Your subscription has been canceled but remains active until {' '}
                        {subscription?.current_period_end && 
                          new Date(subscription.current_period_end).toLocaleDateString()
                        }.
                      </p>
                      <Button 
                        onClick={() => createPaymentIntent()}
                        size="sm"
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Reactivate Premium
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 rounded-lg border">
                    <div className="text-center space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <Crown className="h-6 w-6 text-gray-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Basic Plan</h3>
                        <p className="text-sm text-muted-foreground">
                          Limited access to premium features
                        </p>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Current Limitations:</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                          4 AI Try-On generations per day
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                          4 Toy Replica generations maximum
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                          Limited AI Beauty Consultant access
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                          Standard customer support
                        </li>
                      </ul>
                    </div>
                  </div>

                  <Button 
                    onClick={() => createPaymentIntent()}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                    size="lg"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Premium - 30 AED/month
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stripe integration will be added here once API keys are configured */}

          {/* Actions */}
          <div className="flex justify-between">
            <Button 
              onClick={saveProfile} 
              disabled={isLoading}
              className="px-8"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>

            {/* Danger Zone */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Account</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <div>
                      <strong>⚠️ This action cannot be undone.</strong> Your account will be scheduled for permanent deletion in 30 days.
                      All your data including wishlists, posts, and preferences will be removed.
                    </div>
                    {subscription && isPremium && (
                      <div className="p-3 bg-warning/10 border border-warning/20 rounded-md">
                        <strong>💳 Subscription Notice:</strong> You have an active premium subscription. Please cancel your subscription first to avoid future charges, then proceed with account deletion.
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground">
                      Please confirm that you understand this action is permanent and irreversible.
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={deleteAccount}
                    disabled={isDeletingAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
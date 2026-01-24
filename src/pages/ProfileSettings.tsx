import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { BackButton } from '@/components/ui/back-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Upload, Instagram, Twitter, Globe, Music, Crown, CreditCard, Calendar, LogOut, Users, Sparkles, TrendingUp, Gift, Check, ChevronsUpDown, Copy, Share2, ChevronDown, User, Link2, Lock, DollarSign, Ruler } from 'lucide-react';
import { AddYourFitModal } from '@/components/profile/AddYourFitModal';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { COUNTRIES } from '@/lib/countries';
import { CITIES } from '@/lib/cities';
import { useNavigate } from 'react-router-dom';
import { useUserReferralCode, useReferralStats, shareReferralCode, copyReferralCode } from '@/hooks/useReferrals';
import { cn } from '@/lib/utils';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { getCurrencyForCountry, getCountryCodeFromName } from '@/lib/countryCurrency';
interface ProfileData {
  name: string;
  username: string;
  bio: string;
  country: string;
  city: string;
  avatar_url: string;
  preferred_currency: string;
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
  const navigate = useNavigate();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  
  // Section open states
  const [personalInfoOpen, setPersonalInfoOpen] = useState(false);
  const [socialLinksOpen, setSocialLinksOpen] = useState(false);
  const [shoppingPrefsOpen, setShoppingPrefsOpen] = useState(false);
  const [yourFitOpen, setYourFitOpen] = useState(false);
  const [showFitModal, setShowFitModal] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  
  // Loading states for each section
  const [savingPersonalInfo, setSavingPersonalInfo] = useState(false);
  const [savingSocialLinks, setSavingSocialLinks] = useState(false);
  const [savingShoppingPrefs, setSavingShoppingPrefs] = useState(false);
  
  // Referral system hooks
  const { data: referralCode } = useUserReferralCode();
  const { data: referralStats } = useReferralStats();
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    username: '',
    bio: '',
    country: '',
    city: '',
    avatar_url: '',
    preferred_currency: '',
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
          name: data.name || data.username || '',
          username: data.username || '',
          bio: data.bio || '',
          country: data.country || '',
          city: (data as any).city || '',
          avatar_url: data.avatar_url || '',
          preferred_currency: data.preferred_currency || '',
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

  const savePersonalInfo = async () => {
    if (!user) return;

    setSavingPersonalInfo(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: profileData.name,
          bio: profileData.bio,
          country: profileData.country,
          city: profileData.city,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Personal Info Updated",
        description: "Your personal information has been saved."
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSavingPersonalInfo(false);
    }
  };
  
  const copyStyleLink = () => {
    if (profileData.username) {
      navigator.clipboard.writeText(`azyah.style/u/${profileData.username}`);
      toast({
        title: "Link Copied!",
        description: "Your Style Link has been copied to clipboard."
      });
    }
  };

  const saveSocialLinks = async () => {
    if (!user) return;

    setSavingSocialLinks(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          socials: profileData.socials,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Social Links Updated",
        description: "Your social links have been saved."
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSavingSocialLinks(false);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;

    setIsDeletingAccount(true);
    try {
      const { error: reAuthError } = await supabase.auth.reauthenticate();
      if (reAuthError) {
        throw new Error('Re-authentication required for account deletion');
      }

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

      if (error) throw error;

      toast({
        title: "Account Scheduled for Deletion",
        description: "Your account will be permanently deleted in 30 days."
      });

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

  // Helper to get summary text for collapsed sections
  const getPersonalInfoSummary = () => {
    const parts = [];
    if (profileData.name) parts.push(profileData.name);
    if (profileData.city && profileData.country) {
      parts.push(`${profileData.city}, ${profileData.country}`);
    } else if (profileData.country) {
      parts.push(profileData.country);
    } else if (profileData.city) {
      parts.push(profileData.city);
    }
    return parts.length > 0 ? parts.join(' • ') : 'Add your information';
  };

  const getSocialLinksSummary = () => {
    const links = [];
    if (profileData.socials.instagram) links.push('Instagram');
    if (profileData.socials.twitter) links.push('Twitter');
    if (profileData.socials.tiktok) links.push('TikTok');
    if (profileData.socials.website) links.push('Website');
    return links.length > 0 ? links.join(', ') : 'No social links added';
  };

  const getShoppingPrefsSummary = () => {
    if (profileData.preferred_currency) {
      const currency = SUPPORTED_CURRENCIES.find(c => c.code === profileData.preferred_currency);
      return `Currency: ${currency?.name || profileData.preferred_currency}`;
    }
    if (profileData.country) {
      const code = getCountryCodeFromName(profileData.country);
      const autoCurrency = getCurrencyForCountry(code || '');
      return `Currency: Auto (${autoCurrency})`;
    }
    return 'Set your display currency';
  };

  const saveShoppingPrefs = async () => {
    if (!user) return;
    setSavingShoppingPrefs(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          preferred_currency: profileData.preferred_currency || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Preferences Updated",
        description: "Your shopping preferences have been saved."
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSavingShoppingPrefs(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b safe-area-pt">
        <div className="container mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BackButton />
              <h1 className="text-2xl font-serif font-medium">Profile Settings</h1>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={signOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl p-4">
        <div className="space-y-3">
          {/* Profile Picture - Always visible */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={profileData.avatar_url} />
                <AvatarFallback className="text-lg">
                  {profileData.name ? profileData.name[0].toUpperCase() : user?.email?.[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photo
                </Button>
                <p className="text-xs text-muted-foreground">
                  Square image, at least 200x200px
                </p>
              </div>
            </div>
          </div>

          {/* Personal Information - Collapsible */}
          <Collapsible open={personalInfoOpen} onOpenChange={setPersonalInfoOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 rounded-lg border bg-card transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Personal Information</h3>
                    <p className="text-sm text-muted-foreground">{getPersonalInfoSummary()}</p>
                  </div>
                </div>
                <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", personalInfoOpen && "rotate-180")} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 pt-2 border border-t-0 rounded-b-lg bg-card -mt-2 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Your display name"
                />
                <p className="text-xs text-muted-foreground">
                  Your name as shown to others (e.g., "Sarah Fashion")
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center gap-2">
                  Style Handle
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="username"
                    value={profileData.username}
                    disabled
                    className="bg-muted"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyStyleLink}
                    disabled={!profileData.username}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your handle is permanent so your Style Link stays stable
                </p>
                {profileData.username && (
                  <p className="text-xs text-primary font-medium">
                    azyah.style/u/{profileData.username}
                  </p>
                )}
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

              <Button onClick={savePersonalInfo} disabled={savingPersonalInfo} className="w-full">
                {savingPersonalInfo ? 'Saving...' : 'Save Personal Info'}
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Social Links - Collapsible */}
          <Collapsible open={socialLinksOpen} onOpenChange={setSocialLinksOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 rounded-lg border bg-card transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Link2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Social Links</h3>
                    <p className="text-sm text-muted-foreground">{getSocialLinksSummary()}</p>
                  </div>
                </div>
                <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", socialLinksOpen && "rotate-180")} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 pt-2 border border-t-0 rounded-b-lg bg-card -mt-2 space-y-4">
              {/* Instagram */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Instagram</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
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
                  <div className="space-y-1">
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
                <div className="space-y-1">
                  <Label htmlFor="instagram-url" className="text-sm">Profile Link</Label>
                  <div className="flex">
                    <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-md text-xs text-muted-foreground">
                      instagram.com/
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

              <Separator />

              {/* Twitter/X */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Twitter/X</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
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
                  <div className="space-y-1">
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
                <div className="space-y-1">
                  <Label htmlFor="twitter-url" className="text-sm">Profile Link</Label>
                  <div className="flex">
                    <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-md text-xs text-muted-foreground">
                      x.com/
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

              <Separator />

              {/* TikTok */}
              <div className="space-y-3">
                <Label className="text-base font-medium">TikTok</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
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
                  <div className="space-y-1">
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
                <div className="space-y-1">
                  <Label htmlFor="tiktok-url" className="text-sm">Profile Link</Label>
                  <div className="flex">
                    <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-md text-xs text-muted-foreground">
                      tiktok.com/@
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

              <Separator />

              {/* Website */}
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

              <Button onClick={saveSocialLinks} disabled={savingSocialLinks} className="w-full">
                {savingSocialLinks ? 'Saving...' : 'Save Social Links'}
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Shopping Preferences - Collapsible */}
          <Collapsible open={shoppingPrefsOpen} onOpenChange={setShoppingPrefsOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 rounded-lg border bg-card transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Shopping Preferences</h3>
                    <p className="text-sm text-muted-foreground">{getShoppingPrefsSummary()}</p>
                  </div>
                </div>
                <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", shoppingPrefsOpen && "rotate-180")} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 pt-2 border border-t-0 rounded-b-lg bg-card -mt-2 space-y-4">
              <div className="space-y-2">
                <Label>Preferred Currency</Label>
                <p className="text-xs text-muted-foreground">
                  All prices will be shown in this currency
                </p>
                <Select 
                  value={profileData.preferred_currency || 'auto'} 
                  onValueChange={(v) => handleInputChange('preferred_currency', v === 'auto' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Auto (based on country)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        <span>Auto (based on country)</span>
                      </div>
                    </SelectItem>
                    {SUPPORTED_CURRENCIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>
                        <span>{c.symbol} {c.name} ({c.code})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!profileData.preferred_currency && profileData.country && (
                  <p className="text-xs text-muted-foreground italic">
                    Currently using {getCurrencyForCountry(getCountryCodeFromName(profileData.country) || '')} based on your country
                  </p>
                )}
              </div>
              
              <Button onClick={saveShoppingPrefs} disabled={savingShoppingPrefs} className="w-full">
                {savingShoppingPrefs ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Your Fit / Measurements - Collapsible */}
          <Collapsible open={yourFitOpen} onOpenChange={setYourFitOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 rounded-lg border bg-card transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                    <Ruler className="h-5 w-5 text-violet-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Your Fit / Measurements</h3>
                    <p className="text-sm text-muted-foreground">Find outfits from people your size</p>
                  </div>
                </div>
                <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", yourFitOpen && "rotate-180")} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 pt-2 border border-t-0 rounded-b-lg bg-card -mt-2 space-y-4">
              <p className="text-sm text-muted-foreground">
                Add your measurements to discover outfits from people with a similar body type. This information is private and only used for matching.
              </p>
              <Button onClick={() => setShowFitModal(true)} variant="outline" className="w-full gap-2">
                <Ruler className="h-4 w-4" />
                Edit Measurements
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Invite Friends - Collapsible */}
          <Collapsible open={inviteOpen} onOpenChange={setInviteOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 rounded-lg border bg-card transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Gift className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Invite Friends</h3>
                    <p className="text-sm text-muted-foreground">
                      {referralStats ? `${referralStats.total_referrals} friends invited` : 'Earn 15 points per referral'}
                    </p>
                  </div>
                </div>
                <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", inviteOpen && "rotate-180")} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 pt-2 border border-t-0 rounded-b-lg bg-card -mt-2 space-y-4">
              <p className="text-sm text-muted-foreground">
                Share your referral code with friends. When they sign up and complete their first action, you'll earn 15 points!
              </p>
              
              {referralCode ? (
                <>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={referralCode} 
                      readOnly 
                      className="font-mono text-center text-lg font-bold tracking-wider"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => copyReferralCode(referralCode)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => shareReferralCode(referralCode)}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {referralStats && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold">{referralStats.total_referrals}</p>
                        <p className="text-xs text-muted-foreground">People Referred</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold">{referralStats.total_points_earned}</p>
                        <p className="text-xs text-muted-foreground">Points Earned</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">Loading referral code...</p>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Subscription - Collapsible */}
          <Collapsible open={subscriptionOpen} onOpenChange={setSubscriptionOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 rounded-lg border bg-card transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    isPremium ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-muted"
                  )}>
                    <Crown className={cn("h-5 w-5", isPremium ? "text-white" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <h3 className="font-medium">Subscription</h3>
                    <p className="text-sm text-muted-foreground">
                      {isPremium ? 'Premium Active' : 'Basic Plan'}
                    </p>
                  </div>
                </div>
                <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", subscriptionOpen && "rotate-180")} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 pt-2 border border-t-0 rounded-b-lg bg-card -mt-2 space-y-4">
              {isPremium ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                        <Crown className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-serif font-medium text-foreground">Premium Active</h3>
                        <p className="text-sm font-light text-muted-foreground">
                          Full access to all premium features
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-medium">
                        <Users className="h-4 w-4" />
                        <span>UGC Collaboration</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-medium">
                        <Sparkles className="h-4 w-4" />
                        <span>10 AI Try-Ons Daily</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-medium">
                        <TrendingUp className="h-4 w-4" />
                        <span>AI Beauty Consultant</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-medium">
                        <Gift className="h-4 w-4" />
                        <span>Salon Rewards</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground font-light">Status:</span>
                        <p className="font-medium capitalize">{subscription?.status}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-light">Plan:</span>
                        <p className="font-medium">Premium Shopper</p>
                      </div>
                      {subscription?.current_period_end && (
                        <>
                          <div>
                            <span className="text-muted-foreground font-light">Active Until:</span>
                            <p className="font-medium">
                              {new Date(subscription.current_period_end).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-light">Renewal:</span>
                            <p className="font-medium">Manual</p>
                          </div>
                        </>
                      )}
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
                        <h3 className="font-serif font-medium text-foreground">Basic Plan</h3>
                        <p className="text-sm font-light text-muted-foreground">
                          Limited access to premium features
                        </p>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between py-1">
                        <span className="text-muted-foreground">Create outfits</span>
                        <span className="text-muted-foreground">5 total</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-muted-foreground">Wardrobe items</span>
                        <span className="text-muted-foreground">10 items</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-muted-foreground">AI Try-on</span>
                        <span className="text-muted-foreground">4 total</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-muted-foreground">AI Beauty Consultant</span>
                        <span className="text-muted-foreground">4 credits</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-muted-foreground">UGC collaboration</span>
                        <span className="text-muted-foreground">5 listings</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-muted-foreground">Salon rewards</span>
                        <span className="text-muted-foreground">—</span>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={() => window.location.href = '/dashboard/upgrade'}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                    size="lg"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Premium
                  </Button>
                  <p className="text-center text-xs font-light text-muted-foreground">
                    Unlock unlimited access to all features
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Danger Zone */}
          <div className="pt-4 border-t mt-6">
            <h3 className="text-sm font-medium text-destructive mb-3">Danger Zone</h3>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10">
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
                        <strong>💳 Subscription Notice:</strong> You have an active premium subscription. Please cancel your subscription first to avoid future charges.
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

      {/* Your Fit Modal */}
      <AddYourFitModal
        open={showFitModal}
        onOpenChange={setShowFitModal}
        onComplete={() => setShowFitModal(false)}
      />
    </div>
  );
};

export default ProfileSettings;

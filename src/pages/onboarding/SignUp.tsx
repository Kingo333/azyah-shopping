import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Mail, ArrowLeft, Loader2, CheckCircle, XCircle, User, Gift, MapPin, ChevronsUpDown, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { trackOnboardingEvent } from '@/lib/analytics/onboarding';
import { FloatingFashionIcons } from '@/components/FloatingFashionIcons';
import { useGuestMode } from '@/hooks/useGuestMode';
import { useApplyReferralCode, useValidateReferralCode } from '@/hooks/useReferrals';
import { COUNTRIES } from '@/lib/countries';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

type FlowStep = 'initial' | 'email-entry';
type UserRole = 'shopper' | 'brand' | 'retailer';

export default function SignUp() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<FlowStep>('initial');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showUsernameFields, setShowUsernameFields] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [isLegacyOAuthUser, setIsLegacyOAuthUser] = useState(false);
  const [legacyOAuthProvider, setLegacyOAuthProvider] = useState<string | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<UserRole>('shopper');
  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const { setGuestMode } = useGuestMode();
  const { mutate: validateReferralCode, data: referralValidation, isPending: checkingReferral } = useValidateReferralCode();
  const { mutateAsync: applyReferralCode } = useApplyReferralCode();

  const handleGuestContinue = () => {
    setGuestMode();
    navigate('/dashboard');
  };

  // Handle role-based signup, login mode, and referral code from URL params
  useEffect(() => {
    const roleParam = searchParams.get('role');
    const modeParam = searchParams.get('mode');
    const refParam = searchParams.get('ref');
    
    if (roleParam && (roleParam === 'brand' || roleParam === 'retailer')) {
      setUserRole(roleParam);
      setStep('email-entry'); // Skip initial screen for brand/retailer
    } else if (modeParam === 'login') {
      setStep('email-entry'); // Go directly to email entry for login
    }
    
    // Pre-fill referral code from URL
    if (refParam) {
      setReferralCode(refParam.toUpperCase());
      validateReferralCode(refParam);
    }
  }, [searchParams, validateReferralCode]);

  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckingEmail(true);

    try {
      // Call auth-check-email edge function
      const { data, error } = await supabase.functions.invoke('auth-check-email', {
        body: { email }
      });

      await trackOnboardingEvent('auth_check_email', { email_exists: data?.exists });

      if (error) {
        toast.error('Failed to check email. Please try again.');
        return;
      }

      const { exists, provider } = data;
      setEmailExists(exists || false);
      
      if (exists && provider && provider !== 'email') {
        // This is a legacy OAuth user (Google, Apple) - they need to reset password
        setIsLegacyOAuthUser(true);
        setLegacyOAuthProvider(provider);
      } else if (exists) {
        // Existing email/password user - show password field
        setShowPassword(true);
      } else {
        // New user - show username + password fields
        setShowUsernameFields(true);
        await trackOnboardingEvent('signup_started', { role: userRole });
      }
    } catch (error) {
      console.error('Error checking email:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setCheckingEmail(false);
    }
  };

  const checkUsernameAvailability = async (value: string) => {
    if (!value || value.length < 3) {
      setIsUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    try {
      const { data, error } = await supabase.functions.invoke('username-availability', {
        body: { username: value }
      });

      await trackOnboardingEvent('username_available_check', { 
        username: value, 
        available: data?.available 
      });

      if (error) {
        setIsUsernameAvailable(null);
        return;
      }

      setIsUsernameAvailable(data?.available || false);
      setUsernameSuggestions(data?.suggestions || []);
    } catch (error) {
      console.error('Error checking username:', error);
      setIsUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (emailExists) {
        // Existing user - sign in
        const { error: signInError } = await signIn(email, password);
        
        if (signInError) {
          toast.error('Incorrect password. Please try again.');
        } else {
          toast.success('Welcome back!');
          // Redirect based on role
          if (userRole === 'brand') {
            navigate('/brand-portal');
          } else if (userRole === 'retailer') {
            navigate('/retailer-portal');
          } else {
            navigate('/dashboard');
          }
        }
      } else {
        // New user - sign up with username
        if (password !== confirmPassword) {
          toast.error('Passwords do not match');
          setLoading(false);
          return;
        }

        const { error: signUpError } = await signUp(email, password, { 
          role: userRole,
          username: username.toLowerCase(),
          country: selectedCountry || undefined
        });
        
        if (signUpError) {
          toast.error(signUpError.message || 'Failed to create account');
        } else {
          toast.success('Check your email to verify your account');
          await trackOnboardingEvent('signup_completed', { has_username: !!username });
          // Don't navigate - wait for email confirmation
        }
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // OAuth has been removed - email/password only for all roles

  const handleBack = () => {
    if (isLegacyOAuthUser || showPassword || showUsernameFields) {
      setIsLegacyOAuthUser(false);
      setLegacyOAuthProvider(null);
      setShowPassword(false);
      setShowUsernameFields(false);
      setPassword('');
      setConfirmPassword('');
      setUsername('');
      setEmailExists(null);
      setIsUsernameAvailable(null);
    } else if (step === 'email-entry') {
      setStep('initial');
      setEmail('');
    } else {
      navigate('/');
    }
  };

  // Email entry screen
  if (step === 'email-entry') {
    const isBrandOrRetailer = userRole === 'brand' || userRole === 'retailer';
    const roleTitle = userRole === 'brand' ? 'Brand' : userRole === 'retailer' ? 'Retailer' : '';

    return (
      <div 
        className="flex flex-col bg-background"
        style={{
          height: '100dvh',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
          overflow: 'hidden',
        }}
      >
        <div className="p-2 md:p-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        <div 
          className="flex-1 flex items-center justify-center px-4 md:px-6 overflow-y-auto"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="w-full max-w-md py-4">
            <h1 className="text-xl md:text-2xl font-bold mb-1 md:mb-2 text-foreground text-center">
              {isBrandOrRetailer 
                ? `Create your ${roleTitle} account`
                : showUsernameFields
                  ? "Let's create your account"
                  : showPassword 
                    ? (emailExists ? 'Welcome back! 👋' : "Let's create your account") 
                    : 'Hi there 👋'
              }
            </h1>
            <p className="text-sm md:text-base text-muted-foreground text-center mb-6 md:mb-8">
              {isBrandOrRetailer
                ? 'Get started with your business account'
                : showUsernameFields
                  ? "We couldn't find an account with this email"
                  : showPassword 
                    ? (emailExists ? 'Enter your password to continue' : "You don't have an account yet")
                    : 'Log in or sign up in seconds.'
              }
            </p>

            <form onSubmit={(showPassword || showUsernameFields) ? handlePasswordSubmit : handleEmailContinue} className="space-y-3 md:space-y-4">
              <div>
                <label className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2 block">
                  Email address
                </label>
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 md:h-12 rounded-xl"
                  required
                  autoFocus={!showPassword}
                  disabled={showPassword}
                />
              </div>

              {showUsernameFields && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3 md:space-y-4">
                  <div>
                    <Label className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2 block">
                      Choose a unique username
                    </Label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="yourname123"
                        value={username}
                        onChange={(e) => {
                          const value = e.target.value;
                          setUsername(value);
                          checkUsernameAvailability(value);
                        }}
                        pattern="[a-zA-Z0-9_]{3,20}"
                        className="h-11 md:h-12 rounded-xl pr-10"
                        required
                        minLength={3}
                        maxLength={20}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {checkingUsername && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                        {!checkingUsername && isUsernameAvailable === true && <CheckCircle className="h-5 w-5 text-green-600" />}
                        {!checkingUsername && isUsernameAvailable === false && <XCircle className="h-5 w-5 text-red-600" />}
                      </div>
                    </div>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                      3-20 characters, letters, numbers, and underscore only
                    </p>
                    {isUsernameAvailable === false && usernameSuggestions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[10px] md:text-xs text-muted-foreground mb-1">Suggestions:</p>
                        <div className="flex gap-1 md:gap-2 flex-wrap">
                          {usernameSuggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => {
                                setUsername(suggestion);
                                checkUsernameAvailability(suggestion);
                              }}
                              className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 bg-muted rounded hover:bg-muted/80"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2 block">
                      Password
                    </Label>
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 md:h-12 rounded-xl"
                      required
                      minLength={6}
                    />
                  </div>

                  <div>
                    <Label className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2 block">
                      Confirm Password
                    </Label>
                    <Input
                      type="password"
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-11 md:h-12 rounded-xl"
                      required
                      minLength={6}
                    />
                  </div>

                  {/* Country selection (optional) */}
                  <div>
                    <Label className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2 block">
                      Your Country (optional)
                    </Label>
                    <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={countryOpen}
                          className="w-full h-11 md:h-12 rounded-xl justify-between font-normal"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className={selectedCountry ? 'text-foreground' : 'text-muted-foreground'}>
                              {selectedCountry || 'Select your country'}
                            </span>
                          </div>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
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
                                    setSelectedCountry(currentValue === selectedCountry ? '' : currentValue);
                                    setCountryOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      selectedCountry === country.name ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  {country.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                      Helps us show you relevant brands and prices
                    </p>
                  </div>

                  {/* Referral code input (optional) */}
                  <div>
                    <Label className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2 block">
                      Referral Code (optional)
                    </Label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <Gift className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Input
                        type="text"
                        placeholder="Enter code"
                        value={referralCode}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase();
                          setReferralCode(value);
                          if (value.length >= 6) {
                            validateReferralCode(value);
                          }
                        }}
                        className="h-11 md:h-12 rounded-xl pl-10 pr-10 uppercase"
                        maxLength={12}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {checkingReferral && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                        {!checkingReferral && referralValidation?.valid && <CheckCircle className="h-5 w-5 text-green-600" />}
                        {!checkingReferral && referralCode.length >= 6 && referralValidation && !referralValidation.valid && <XCircle className="h-5 w-5 text-red-600" />}
                      </div>
                    </div>
                    {referralCode.length >= 6 && referralValidation?.valid && (
                      <p className="text-[10px] md:text-xs text-green-600 mt-1">Valid! You'll both earn points.</p>
                    )}
                    {referralCode.length >= 6 && referralValidation && !referralValidation.valid && (
                      <p className="text-[10px] md:text-xs text-red-600 mt-1">Invalid referral code</p>
                    )}
                  </div>
                </div>
              )}

              {showPassword && !showUsernameFields && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-2">
                  <label className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2 block">
                    Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 md:h-12 rounded-xl"
                    required
                    minLength={6}
                    autoFocus
                  />
                  {emailExists && (
                    <button
                      type="button"
                      onClick={() => navigate('/reset-password-request')}
                      className="text-xs md:text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
              )}

              {/* Legacy OAuth User - Prompt to Reset Password */}
              {isLegacyOAuthUser && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center space-y-4">
                    <p className="text-sm text-amber-800">
                      This email was previously linked to {legacyOAuthProvider === 'google' ? 'Google' : legacyOAuthProvider === 'apple' ? 'Apple' : 'a social login'}. 
                      We've moved to email-only login for security. Please reset your password to continue.
                    </p>
                    <Button
                      type="button"
                      onClick={() => navigate('/reset-password-request')}
                      className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white rounded-full font-medium"
                    >
                      Reset Password
                    </Button>
                  </div>
                </div>
              )}

              {!isLegacyOAuthUser && (
                <Button
                  type="submit"
                  disabled={loading || checkingEmail || checkingUsername || (showUsernameFields && !isUsernameAvailable)}
                  className="w-full h-12 md:h-14 text-base md:text-lg font-semibold rounded-full bg-black hover:bg-black/90 text-white"
                >
                  {loading || checkingEmail ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {checkingEmail ? 'Checking...' : 'Processing...'}
                    </>
                  ) : showUsernameFields ? (
                    'Create account'
                  ) : showPassword ? (
                    emailExists ? 'Log in' : 'Create account'
                  ) : (
                    'Continue'
                  )}
                </Button>
              )}
            </form>

            {!isBrandOrRetailer && (
              <div className="mt-4 md:mt-6 text-center text-xs md:text-sm text-muted-foreground space-y-1 md:space-y-2">
                <p>
                  Are you a brand?{' '}
                  <span className="text-muted-foreground/80">(Clothing brands, agencies & studios)</span>
                  {' '}
                  <button
                    onClick={() => navigate('/onboarding/signup?role=brand')}
                    className="text-primary hover:underline font-medium"
                  >
                    Create a brand account
                  </button>
                </p>
                <p className="flex items-center justify-center gap-1">
                  <span>•</span>
                </p>
                <p>
                  Are you a retailer or pop-up?{' '}
                  <button
                    onClick={() => navigate('/onboarding/signup?role=retailer')}
                    className="text-primary hover:underline font-medium"
                  >
                    Create a retailer account
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Initial welcome screen - email only for all roles
  return (
    <div 
      className="flex flex-col overflow-hidden relative bg-background"
      style={{
        height: '100dvh',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {/* Floating Fashion Icons Background */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f1419]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7A143E]/10 via-transparent to-[#7A143E]/5" />
        <FloatingFashionIcons />
      </div>
      
      {/* Back Button */}
      <div className="p-2 md:p-4 relative z-10 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="text-white hover:bg-white/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Azyah Branding */}
      <div className="pt-2 pb-4 md:pt-4 md:pb-8 relative z-10 flex-shrink-0 flex justify-center items-center gap-2">
        <img 
          src="/marketing/azyah-logo.png" 
          alt="Azyah" 
          className="h-10 w-10 object-contain drop-shadow-lg"
        />
        <h1 className="text-4xl font-serif text-white tracking-wider drop-shadow-lg" style={{ fontWeight: 300, letterSpacing: '0.15em' }}>
          Azyah
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 md:px-6 relative z-10 min-h-0">
        <div className="w-full max-w-md text-center space-y-6 md:space-y-8">
          <p className="text-white text-base md:text-lg font-medium px-2" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
            Create your free account to backup outfits and sync across devices.
          </p>

          <div className="space-y-3 md:space-y-4">
            <Button
              onClick={() => setStep('email-entry')}
              className="w-full h-12 md:h-14 text-sm md:text-base font-semibold rounded-full bg-white hover:bg-gray-50 text-gray-800 border border-[#7A143E]/20 shadow-lg transition-all duration-200 hover:shadow-xl hover:shadow-[#7A143E]/10"
            >
              <Mail className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Continue with email
            </Button>
          </div>

          <div 
            className="relative z-10 text-center text-xs md:text-sm text-white/90 space-y-1 pb-2 flex-shrink-0"
            style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
          >
            <p>
              Are you a brand?{' '}
              <span className="text-white/70">(Clothing brands, agencies & studios)</span>
              {' '}
              <button
                onClick={() => navigate('/onboarding/signup?role=brand')}
                className="text-white hover:underline font-semibold"
              >
                Create a brand account
              </button>
            </p>
            <p className="flex items-center justify-center gap-1">
              <span>•</span>
            </p>
            <p>
              Are you a retailer or pop-up?{' '}
              <button
                onClick={() => navigate('/onboarding/signup?role=retailer')}
                className="text-white hover:underline font-semibold"
              >
                Create a retailer account
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

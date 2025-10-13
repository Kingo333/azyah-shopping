/**
 * DEPRECATION NOTICE FOR ONBOARDING FILES
 * ========================================
 * 
 * The following onboarding components are DEPRECATED as of the onboarding overhaul:
 * 
 * - GenderSelect.tsx
 * - MainGoals.tsx
 * - ReferralSource.tsx
 * - DateOfBirth.tsx
 * - UsernameSetup.tsx
 * - SuggestedItems.tsx
 * - AIAnalyzerIntro.tsx
 * - CommunityIntro.tsx
 * - NotificationsRequest.tsx
 * - LocationRequest.tsx
 * 
 * These components are no longer used in the main onboarding flow as of the migration
 * to dashboard-driven subscription and username collection during signup.
 * 
 * They are kept for backward compatibility with existing users only.
 * 
 * DO NOT use these components in new features.
 * 
 * Planned for removal in v3.0
 * 
 * New Onboarding Flow:
 * --------------------
 * 1. Landing page (/)
 * 2. Sign up with email + username collection (/onboarding/signup)
 * 3. Email verification
 * 4. Dashboard with Upgrade card (/dashboard)
 * 5. Optional: Upgrade to Premium (/dashboard/upgrade)
 */

export const DEPRECATED_ONBOARDING_ROUTES = [
  '/onboarding/gender-select',
  '/onboarding/main-goals',
  '/onboarding/referral-source',
  '/onboarding/date-of-birth',
  '/onboarding/username-setup',
  '/onboarding/suggested-items',
  '/onboarding/ai-analyzer-intro',
  '/onboarding/community-intro',
  '/onboarding/notifications',
  '/onboarding/location',
] as const;

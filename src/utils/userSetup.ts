import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'shopper' | 'brand' | 'retailer' | 'admin';

export interface UserSetupResult {
  success: boolean;
  error?: string;
  userRecord?: any;
  portalRecord?: any;
}

export const ensureUserSetup = async (user: User): Promise<UserSetupResult> => {
  try {
    // 1. Ensure user record exists in public.users
    const userRecord = await ensureUserRecord(user);
    if (!userRecord) {
      return { success: false, error: 'Failed to create user record' };
    }

    // 2. Ensure role-specific portal records exist
    const portalRecord = await ensurePortalRecord(user, userRecord.role);

    return {
      success: true,
      userRecord,
      portalRecord
    };
  } catch (error) {
    console.error('User setup failed:', error);
    return { success: false, error: 'Setup failed' };
  }
};

const ensureUserRecord = async (user: User) => {
  try {
    // Check if user record exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (existingUser) {
      return existingUser;
    }

    // Create user record
    const userRole = (user.user_metadata?.role || 'shopper') as UserRole;
    const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email!,
        name: userName,
        role: userRole,
        avatar_url: user.user_metadata?.avatar_url
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create user record:', error);
      return null;
    }

    return newUser;
  } catch (error) {
    console.error('Error ensuring user record:', error);
    return null;
  }
};

const ensurePortalRecord = async (user: User, role: UserRole) => {
  try {
    if (role === 'brand') {
      return await ensureBrandRecord(user);
    } else if (role === 'retailer') {
      return await ensureRetailerRecord(user);
    }
    return null; // Shoppers and admins don't need portal records
  } catch (error) {
    console.error('Error ensuring portal record:', error);
    return null;
  }
};

const ensureBrandRecord = async (user: User) => {
  try {
    const { data: existingBrand } = await supabase
      .from('brands')
      .select('*')
      .eq('owner_user_id', user.id)
      .maybeSingle();

    if (existingBrand) {
      return existingBrand;
    }

    const brandName = user.user_metadata?.name || user.email?.split('@')[0] || 'My Brand';
    const baseSlug = brandName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    
    // Generate unique slug
    const { data: existingSlugs } = await supabase
      .from('brands')
      .select('slug')
      .like('slug', `${baseSlug}%`);
    
    let slug = baseSlug;
    if (existingSlugs && existingSlugs.length > 0) {
      slug = `${baseSlug}-${Date.now()}`;
    }

    const { data: newBrand, error } = await supabase
      .from('brands')
      .insert({
        owner_user_id: user.id,
        name: brandName,
        slug,
        contact_email: user.email
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create brand record:', error);
      return null;
    }

    return newBrand;
  } catch (error) {
    console.error('Error ensuring brand record:', error);
    return null;
  }
};

const ensureRetailerRecord = async (user: User) => {
  try {
    const { data: existingRetailer } = await supabase
      .from('retailers')
      .select('*')
      .eq('owner_user_id', user.id)
      .maybeSingle();

    if (existingRetailer) {
      return existingRetailer;
    }

    const retailerName = user.user_metadata?.name || user.email?.split('@')[0] || 'My Store';
    const baseSlug = retailerName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    
    // Generate unique slug
    const { data: existingSlugs } = await supabase
      .from('retailers')
      .select('slug')
      .like('slug', `${baseSlug}%`);
    
    let slug = baseSlug;
    if (existingSlugs && existingSlugs.length > 0) {
      slug = `${baseSlug}-${Date.now()}`;
    }

    const { data: newRetailer, error } = await supabase
      .from('retailers')
      .insert({
        owner_user_id: user.id,
        name: retailerName,
        slug,
        contact_email: user.email
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create retailer record:', error);
      return null;
    }

    return newRetailer;
  } catch (error) {
    console.error('Error ensuring retailer record:', error);
    return null;
  }
};

export const getRedirectRoute = (role: UserRole): string => {
  switch (role) {
    case 'brand':
      return '/brand-portal';
    case 'retailer':
      return '/retailer-portal';
    case 'admin':
      return '/dashboard';
    case 'shopper':
    default:
      return '/';
  }
};
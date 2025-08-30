-- Create RPC functions for beauty profile management
CREATE OR REPLACE FUNCTION public.get_beauty_profile(target_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  skin_tone text,
  undertone text,
  face_shape text,
  color_palette text[],
  selfie_url text,
  analysis_summary text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow users to access their own profile
  IF target_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: You can only access your own beauty profile';
  END IF;
  
  RETURN QUERY
  SELECT 
    bp.id,
    bp.user_id,
    bp.skin_tone,
    bp.undertone,
    bp.face_shape,
    bp.color_palette,
    bp.selfie_url,
    bp.analysis_summary,
    bp.created_at,
    bp.updated_at
  FROM public.beauty_profiles bp
  WHERE bp.user_id = target_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.upsert_beauty_profile(
  target_user_id uuid,
  profile_updates jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  profile_id uuid;
BEGIN
  -- Only allow users to update their own profile
  IF target_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: You can only update your own beauty profile';
  END IF;
  
  INSERT INTO public.beauty_profiles (
    user_id,
    skin_tone,
    undertone,
    face_shape,
    color_palette,
    selfie_url,
    analysis_summary,
    updated_at
  ) VALUES (
    target_user_id,
    COALESCE((profile_updates->>'skin_tone'), NULL),
    COALESCE((profile_updates->>'undertone'), NULL),
    COALESCE((profile_updates->>'face_shape'), NULL),
    CASE 
      WHEN profile_updates->'color_palette' IS NOT NULL 
      THEN ARRAY(SELECT jsonb_array_elements_text(profile_updates->'color_palette'))
      ELSE NULL 
    END,
    COALESCE((profile_updates->>'selfie_url'), NULL),
    COALESCE((profile_updates->>'analysis_summary'), NULL),
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    skin_tone = COALESCE((profile_updates->>'skin_tone'), beauty_profiles.skin_tone),
    undertone = COALESCE((profile_updates->>'undertone'), beauty_profiles.undertone),
    face_shape = COALESCE((profile_updates->>'face_shape'), beauty_profiles.face_shape),
    color_palette = CASE 
      WHEN profile_updates->'color_palette' IS NOT NULL 
      THEN ARRAY(SELECT jsonb_array_elements_text(profile_updates->'color_palette'))
      ELSE beauty_profiles.color_palette 
    END,
    selfie_url = COALESCE((profile_updates->>'selfie_url'), beauty_profiles.selfie_url),
    analysis_summary = COALESCE((profile_updates->>'analysis_summary'), beauty_profiles.analysis_summary),
    updated_at = NOW()
  RETURNING id INTO profile_id;
  
  RETURN profile_id;
END;
$function$;
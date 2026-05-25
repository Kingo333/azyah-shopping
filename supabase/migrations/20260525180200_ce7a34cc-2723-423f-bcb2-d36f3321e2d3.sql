UPDATE public.wardrobe_garment_analysis
   SET final_prompt_hint = COALESCE(final_prompt_hint, prompt_hint),
       final_metadata    = COALESCE(final_metadata, gemini_metadata),
       primary_provider  = COALESCE(primary_provider, 'gemini')
 WHERE gemini_status = 'complete'
   AND gemini_metadata IS NOT NULL
   AND (final_prompt_hint IS NULL OR final_metadata IS NULL OR primary_provider IS NULL);
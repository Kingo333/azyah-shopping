-- Fix wardrobe items deletion by changing ON DELETE RESTRICT to ON DELETE CASCADE
-- This allows users to delete wardrobe items even if they're used in saved outfits

-- Drop the existing foreign key constraint with ON DELETE RESTRICT
ALTER TABLE public.fit_items
DROP CONSTRAINT IF EXISTS fit_items_wardrobe_item_id_fkey;

-- Add new constraint with ON DELETE CASCADE
-- This will automatically remove fit_items references when a wardrobe item is deleted
ALTER TABLE public.fit_items
ADD CONSTRAINT fit_items_wardrobe_item_id_fkey 
FOREIGN KEY (wardrobe_item_id) 
REFERENCES public.wardrobe_items(id) 
ON DELETE CASCADE;
-- Add men and women categories to the category_type enum
ALTER TYPE category_type ADD VALUE 'men';
ALTER TYPE category_type ADD VALUE 'women';

-- Add men's and women's subcategories
ALTER TYPE subcategory_type ADD VALUE 'mens clothing';
ALTER TYPE subcategory_type ADD VALUE 'mens footwear';
ALTER TYPE subcategory_type ADD VALUE 'mens accessories';
ALTER TYPE subcategory_type ADD VALUE 'womens clothing';
ALTER TYPE subcategory_type ADD VALUE 'womens footwear'; 
ALTER TYPE subcategory_type ADD VALUE 'womens accessories';
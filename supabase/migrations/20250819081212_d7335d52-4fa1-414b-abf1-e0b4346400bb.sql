-- Check current enum values for category types
SELECT unnest(enum_range(NULL::category_type)) as category_values;

-- Check current enum values for subcategory types  
SELECT unnest(enum_range(NULL::subcategory_type)) as subcategory_values;
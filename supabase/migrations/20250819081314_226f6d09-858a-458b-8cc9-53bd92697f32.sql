-- Get category enum values
SELECT enumlabel as category_values 
FROM pg_enum e 
JOIN pg_type t ON e.enumtypid = t.oid 
WHERE t.typname = 'category_type' 
ORDER BY e.enumsortorder;
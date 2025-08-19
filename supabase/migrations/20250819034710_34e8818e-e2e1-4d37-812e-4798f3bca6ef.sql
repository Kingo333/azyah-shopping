-- Move products from the generic retailer to the user's retailer
UPDATE products 
SET retailer_id = '68aa5b62-419f-432d-a50b-496ea3e6ccf0'
WHERE retailer_id = '01161d34-d4a1-4999-b222-049bc88315e3';
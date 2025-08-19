-- Fix ASOS product categorization directly in database
-- Update products based on title analysis

-- Update footwear products
UPDATE products 
SET category_slug = 'footwear',
    subcategory_slug = CASE
      WHEN title ILIKE '%sneaker%' OR title ILIKE '%trainer%' THEN 'sneakers'
      WHEN title ILIKE '%heel%' OR title ILIKE '%pump%' THEN 'heels'
      WHEN title ILIKE '%boot%' THEN 'boots'
      WHEN title ILIKE '%sandal%' THEN 'sandals'
      WHEN title ILIKE '%flat%' OR title ILIKE '%ballet%' THEN 'flats'
      WHEN title ILIKE '%loafer%' OR title ILIKE '%oxford%' THEN 'loafers'
      WHEN title ILIKE '%slipper%' THEN 'slippers'
      ELSE 'sneakers'
    END,
    updated_at = NOW()
WHERE category_slug = 'clothing' 
  AND subcategory_slug = 'tops'
  AND (title ILIKE '%shoe%' OR title ILIKE '%boot%' OR title ILIKE '%sneaker%' OR title ILIKE '%trainer%' 
       OR title ILIKE '%sandal%' OR title ILIKE '%heel%' OR title ILIKE '%flat%' OR title ILIKE '%loafer%' 
       OR title ILIKE '%slipper%' OR title ILIKE '%pump%');

-- Update bag products
UPDATE products 
SET category_slug = 'bags',
    subcategory_slug = CASE
      WHEN title ILIKE '%handbag%' OR title ILIKE '%purse%' THEN 'handbags'
      WHEN title ILIKE '%clutch%' THEN 'clutches'
      WHEN title ILIKE '%tote%' THEN 'totes'
      WHEN title ILIKE '%backpack%' OR title ILIKE '%rucksack%' THEN 'backpacks'
      WHEN title ILIKE '%wallet%' THEN 'wallets'
      ELSE 'handbags'
    END,
    updated_at = NOW()
WHERE category_slug = 'clothing' 
  AND subcategory_slug = 'tops'
  AND (title ILIKE '%bag%' OR title ILIKE '%handbag%' OR title ILIKE '%purse%' OR title ILIKE '%clutch%' 
       OR title ILIKE '%tote%' OR title ILIKE '%backpack%' OR title ILIKE '%wallet%');

-- Update jewelry products
UPDATE products 
SET category_slug = 'jewelry',
    subcategory_slug = CASE
      WHEN title ILIKE '%necklace%' OR title ILIKE '%pendant%' THEN 'necklaces'
      WHEN title ILIKE '%earring%' OR title ILIKE '%stud%' OR title ILIKE '%hoop%' THEN 'earrings'
      WHEN title ILIKE '%bracelet%' OR title ILIKE '%bangle%' THEN 'bracelets'
      WHEN title ILIKE '%ring%' THEN 'rings'
      WHEN title ILIKE '%anklet%' THEN 'anklets'
      WHEN title ILIKE '%brooch%' THEN 'brooches'
      ELSE 'necklaces'
    END,
    updated_at = NOW()
WHERE category_slug = 'clothing' 
  AND subcategory_slug = 'tops'
  AND (title ILIKE '%jewelry%' OR title ILIKE '%jewellery%' OR title ILIKE '%necklace%' OR title ILIKE '%earring%' 
       OR title ILIKE '%bracelet%' OR title ILIKE '%ring%' OR title ILIKE '%anklet%' OR title ILIKE '%brooch%');

-- Update accessory products
UPDATE products 
SET category_slug = 'accessories',
    subcategory_slug = CASE
      WHEN title ILIKE '%belt%' THEN 'belts'
      WHEN title ILIKE '%scarf%' OR title ILIKE '%wrap%' THEN 'scarves'
      WHEN title ILIKE '%hat%' OR title ILIKE '%cap%' OR title ILIKE '%beanie%' THEN 'hats'
      WHEN title ILIKE '%sunglasses%' OR title ILIKE '%glasses%' THEN 'sunglasses'
      WHEN title ILIKE '%watch%' THEN 'watches'
      ELSE 'hats'
    END,
    updated_at = NOW()
WHERE category_slug = 'clothing' 
  AND subcategory_slug = 'tops'
  AND (title ILIKE '%belt%' OR title ILIKE '%scarf%' OR title ILIKE '%hat%' OR title ILIKE '%cap%' 
       OR title ILIKE '%sunglasses%' OR title ILIKE '%watch%' OR title ILIKE '%hair%');

-- Update dress products
UPDATE products 
SET subcategory_slug = 'dresses',
    updated_at = NOW()
WHERE category_slug = 'clothing' 
  AND subcategory_slug = 'tops'
  AND (title ILIKE '%dress%' OR title ILIKE '%gown%' OR title ILIKE '%frock%');

-- Update specific clothing subcategories
UPDATE products 
SET subcategory_slug = CASE
    WHEN title ILIKE '%jean%' OR title ILIKE '%denim%' THEN 'jeans'
    WHEN title ILIKE '%trouser%' OR title ILIKE '%pant%' THEN 'trousers'
    WHEN title ILIKE '%skirt%' THEN 'skirts'
    WHEN title ILIKE '%short%' THEN 'shorts'
    WHEN title ILIKE '%jacket%' OR title ILIKE '%blazer%' THEN 'jackets'
    WHEN title ILIKE '%coat%' THEN 'coats'
    WHEN title ILIKE '%sweater%' OR title ILIKE '%jumper%' THEN 'sweaters'
    WHEN title ILIKE '%cardigan%' THEN 'cardigans'
    WHEN title ILIKE '%shirt%' AND NOT title ILIKE '%t-shirt%' AND NOT title ILIKE '%tshirt%' THEN 'shirts'
    WHEN title ILIKE '%t-shirt%' OR title ILIKE '%tshirt%' OR title ILIKE '%tee%' THEN 't-shirts'
    WHEN title ILIKE '%blouse%' THEN 'blouses'
    WHEN title ILIKE '%swimwear%' OR title ILIKE '%bikini%' OR title ILIKE '%swimsuit%' THEN 'swimwear'
    WHEN title ILIKE '%lingerie%' OR title ILIKE '%underwear%' OR title ILIKE '%bra%' THEN 'lingerie'
    WHEN title ILIKE '%active%' OR title ILIKE '%sport%' OR title ILIKE '%gym%' OR title ILIKE '%yoga%' THEN 'activewear'
    WHEN title ILIKE '%sleep%' OR title ILIKE '%pajama%' OR title ILIKE '%nightwear%' THEN 'sleepwear'
    WHEN title ILIKE '%lounge%' THEN 'loungewear'
    ELSE 'tops'
  END,
  updated_at = NOW()
WHERE category_slug = 'clothing' 
  AND subcategory_slug = 'tops';
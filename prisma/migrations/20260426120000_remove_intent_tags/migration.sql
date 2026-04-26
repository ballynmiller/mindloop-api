-- Remove intent-level tags (work, chill, quick-stop, meet) from the Tag table.
-- CoffeeShopTag and UserPreferredTag rows cascade-delete automatically.
DELETE FROM "Tag" WHERE slug IN ('work', 'chill', 'quick-stop', 'meet');

-- Remove the now-empty use-case TagCategory.
DELETE FROM "TagCategory" WHERE slug = 'use-case';

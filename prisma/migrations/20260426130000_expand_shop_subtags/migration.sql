-- Expand shop tags: replace removed intent tags (work, chill, quick-stop, meet)
-- with their constituent descriptive subtags. Idempotent via ON CONFLICT DO NOTHING.

WITH additions(shop_slug, tag_slug) AS (
  VALUES
    -- Daily Dose (had: work, chill, meet)
    ('daily-dose-cafe-grove-cir', 'quiet'),
    ('daily-dose-cafe-grove-cir', 'calm'),
    ('daily-dose-cafe-grove-cir', 'outlets'),
    ('daily-dose-cafe-grove-cir', 'minimalist'),
    ('daily-dose-cafe-grove-cir', 'food'),
    ('daily-dose-cafe-grove-cir', 'easy-parking'),
    ('daily-dose-cafe-grove-cir', 'public-bathroom'),
    ('daily-dose-cafe-grove-cir', 'modern'),

    -- Kingdom Coffee (had: work, chill, meet)
    ('kingdom-coffee-main-st', 'quiet'),

    -- Bean Co (had: chill, meet, quick-stop)
    ('bean-co-cafe-elm-creek-blvd-n', 'calm'),
    ('bean-co-cafe-elm-creek-blvd-n', 'quiet'),
    ('bean-co-cafe-elm-creek-blvd-n', 'minimalist'),
    ('bean-co-cafe-elm-creek-blvd-n', 'food'),
    ('bean-co-cafe-elm-creek-blvd-n', 'public-bathroom'),
    ('bean-co-cafe-elm-creek-blvd-n', 'easy-parking'),
    ('bean-co-cafe-elm-creek-blvd-n', 'modern'),

    -- Caribou (had: quick-stop, meet)
    ('caribou-the-grove-maple-grove-pkwy', 'food'),
    ('caribou-the-grove-maple-grove-pkwy', 'public-bathroom'),
    ('caribou-the-grove-maple-grove-pkwy', 'cozy'),
    ('caribou-the-grove-maple-grove-pkwy', 'calm'),
    ('caribou-the-grove-maple-grove-pkwy', 'quiet'),
    ('caribou-the-grove-maple-grove-pkwy', 'modern'),

    -- Starbucks (had: work, quick-stop, meet)
    ('starbucks-elm-creek-blvd', 'quiet'),
    ('starbucks-elm-creek-blvd', 'calm'),
    ('starbucks-elm-creek-blvd', 'minimalist'),
    ('starbucks-elm-creek-blvd', 'food'),
    ('starbucks-elm-creek-blvd', 'easy-parking'),
    ('starbucks-elm-creek-blvd', 'public-bathroom'),
    ('starbucks-elm-creek-blvd', 'cozy'),
    ('starbucks-elm-creek-blvd', 'modern'),

    -- Bruegger's (had: quick-stop)
    ('brueggers-bass-lake-rd', 'easy-parking'),
    ('brueggers-bass-lake-rd', 'food'),
    ('brueggers-bass-lake-rd', 'public-bathroom'),

    -- Dunkin' (had: quick-stop)
    ('dunkin-grove-dr-n', 'food'),
    ('dunkin-grove-dr-n', 'public-bathroom'),

    -- Great Harvest (had: quick-stop, chill)
    ('great-harvest-grove-dr-n', 'calm'),
    ('great-harvest-grove-dr-n', 'quiet'),
    ('great-harvest-grove-dr-n', 'minimalist'),
    ('great-harvest-grove-dr-n', 'food'),
    ('great-harvest-grove-dr-n', 'public-bathroom'),
    ('great-harvest-grove-dr-n', 'easy-parking'),

    -- Hinterland (had: work, meet)
    ('hinterland-coffee-robin-rd-n', 'quiet'),
    ('hinterland-coffee-robin-rd-n', 'minimalist'),
    ('hinterland-coffee-robin-rd-n', 'food'),
    ('hinterland-coffee-robin-rd-n', 'easy-parking'),
    ('hinterland-coffee-robin-rd-n', 'public-bathroom'),
    ('hinterland-coffee-robin-rd-n', 'cozy'),

    -- Uffda Donuts (had: quick-stop, chill)
    ('uffda-donuts-grove-dr-n', 'easy-parking'),
    ('uffda-donuts-grove-dr-n', 'food'),
    ('uffda-donuts-grove-dr-n', 'public-bathroom'),
    ('uffda-donuts-grove-dr-n', 'calm'),
    ('uffda-donuts-grove-dr-n', 'quiet'),
    ('uffda-donuts-grove-dr-n', 'minimalist')
)
INSERT INTO "CoffeeShopTag" ("id", "coffeeShopId", "tagId", "source", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  cs.id,
  t.id,
  'EDITORIAL'::"TagSource",
  NOW(),
  NOW()
FROM additions a
JOIN "CoffeeShop" cs ON cs.slug = a.shop_slug
JOIN "Tag"        t  ON t.slug  = a.tag_slug
ON CONFLICT ("coffeeShopId", "tagId") DO NOTHING;

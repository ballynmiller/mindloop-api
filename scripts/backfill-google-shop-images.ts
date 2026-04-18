/**
 * For each coffee shop with no images (or with Unsplash placeholders when --replace-placeholders),
 * resolve a Google Place (stored googlePlaceId or text search) and attach the first Places photo.
 * If there is no confident match, no photo, or the API errors, stores the shared café placeholder image.
 *
 * Requires: GOOGLE_PLACES_API_KEY (Places API New enabled)
 *
 *   pnpm backfill:google-images
 *   pnpm backfill:google-images -- --replace-placeholders
 *   pnpm backfill:google-images -- --force-slugs=hinterland-coffee-robin-rd-n
 */
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgConnectionString } from "../src/utils/pgConnectionString.js";
import {
  COFFEE_SHOP_PLACEHOLDER_IMAGE_URL,
  getFirstEstablishmentPhoto,
  isUnsplashPlaceholder,
  resolvePlaceIdForCoffeeShop,
  searchPlaceByText,
} from "../src/utils/googlePlacesPhoto.js";

function parseForceSlugs(): Set<string> {
  const raw = process.argv.find((a) => a.startsWith("--force-slugs="));
  if (!raw) return new Set();
  return new Set(
    raw
      .slice("--force-slugs=".length)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function buildPlacesTextQuery(shop: {
  name: string;
  addressLine1: string | null;
  city: string;
  state: string;
  postalCode: string | null;
}): string {
  return [shop.name, shop.addressLine1, shop.postalCode, shop.city, shop.state]
    .filter((x): x is string => Boolean(x?.trim()))
    .join(", ");
}

const rawConnectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!rawConnectionString) {
  throw new Error("Missing DATABASE_URL or DIRECT_URL.");
}

const pool = new Pool({
  connectionString: normalizePgConnectionString(rawConnectionString),
  connectionTimeoutMillis: 60_000,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const googleApiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
if (!googleApiKey) {
  console.error("Set GOOGLE_PLACES_API_KEY in .env (Places API New).");
  process.exit(1);
}
const apiKey: string = googleApiKey;

const replacePlaceholders = process.argv.includes("--replace-placeholders");
const forceSlugSet = parseForceSlugs();

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Replace all images for a shop with the shared café placeholder (no duplicate rows on re-run). */
async function setCoffeeShopPlaceholderOnlyImage(shop: {
  id: string;
  name: string;
  slug: string;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.coffeeShopImage.deleteMany({ where: { coffeeShopId: shop.id } });
    await tx.coffeeShopImage.create({
      data: {
        coffeeShopId: shop.id,
        url: COFFEE_SHOP_PLACEHOLDER_IMAGE_URL,
        sortOrder: 0,
        altText: `Coffee shop placeholder — ${shop.name}`,
        source: "EDITORIAL",
      },
    });
  });
  console.log(`  → coffee shop placeholder ${shop.slug}`);
}

async function main() {
  const shops = await prisma.coffeeShop.findMany({
    where: { isActive: true },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
    },
  });

  let updated = 0;
  let skipped = 0;

  for (const shop of shops) {
    const forceThis = forceSlugSet.has(shop.slug);
    const hasRealImage = shop.images.some((im) => !isUnsplashPlaceholder(im.url));
    const onlyPlaceholder =
      shop.images.length > 0 && shop.images.every((im) => isUnsplashPlaceholder(im.url));
    let needsImage =
      shop.images.length === 0 || (replacePlaceholders && onlyPlaceholder) || forceThis;

    if (forceThis) {
      await prisma.coffeeShopImage.deleteMany({ where: { coffeeShopId: shop.id } });
      await prisma.coffeeShop.update({
        where: { id: shop.id },
        data: { googlePlaceId: null },
      });
    }

    if (!needsImage) {
      skipped += 1;
      continue;
    }
    if (replacePlaceholders && hasRealImage && !onlyPlaceholder && !forceThis) {
      skipped += 1;
      continue;
    }

    let placeId: string | null = null;
    try {
      if (!forceThis && shop.googlePlaceId?.trim()) {
        placeId = shop.googlePlaceId.trim();
      } else if (shop.latitude != null && shop.longitude != null) {
        const q = buildPlacesTextQuery(shop);
        placeId = await resolvePlaceIdForCoffeeShop(
          q,
          shop.name,
          shop.latitude,
          shop.longitude,
          apiKey,
          {
            latitude: shop.latitude,
            longitude: shop.longitude,
            radiusMeters: 15_000,
          },
        );
      } else {
        placeId = await searchPlaceByText(
          `${shop.name} ${shop.city} ${shop.state}`,
          apiKey,
        );
      }
    } catch (e) {
      console.warn(`  search failed ${shop.slug}:`, e);
      await setCoffeeShopPlaceholderOnlyImage(shop);
      updated += 1;
      await sleep(150);
      continue;
    }

    if (!placeId) {
      console.warn(
        `  no confident Google Places match for ${shop.slug} — using coffee shop placeholder`,
      );
      await setCoffeeShopPlaceholderOnlyImage(shop);
      updated += 1;
      await sleep(150);
      continue;
    }

    let photo: Awaited<ReturnType<typeof getFirstEstablishmentPhoto>>;
    try {
      photo = await getFirstEstablishmentPhoto(placeId, apiKey);
    } catch (e) {
      console.warn(`  photo fetch failed ${shop.slug}:`, e);
      await setCoffeeShopPlaceholderOnlyImage(shop);
      updated += 1;
      await sleep(200);
      continue;
    }

    if (!photo) {
      console.warn(`  no photos for ${shop.slug} — using coffee shop placeholder`);
      await setCoffeeShopPlaceholderOnlyImage(shop);
      updated += 1;
      await sleep(200);
      continue;
    }

    const placeIdToStore = placeId.startsWith("places/")
      ? decodeURIComponent(placeId.slice("places/".length))
      : placeId;

    try {
      await prisma.$transaction(async (tx) => {
        if (replacePlaceholders && onlyPlaceholder) {
          await tx.coffeeShopImage.deleteMany({ where: { coffeeShopId: shop.id } });
        }
        await tx.coffeeShopImage.create({
          data: {
            coffeeShopId: shop.id,
            url: photo.url,
            sortOrder: 0,
            altText:
              photo.attributions.length > 0
                ? `Photo: ${photo.attributions.join(", ")}`
                : `Photo via Google Places — ${shop.name}`,
            source: "EDITORIAL",
          },
        });
      });
      if (forceThis || !shop.googlePlaceId?.trim()) {
        try {
          await prisma.coffeeShop.update({
            where: { id: shop.id },
            data: { googlePlaceId: placeIdToStore },
          });
        } catch {
          /* e.g. unique constraint on googlePlaceId */
        }
      }
    } catch (e) {
      console.warn(`  db write failed ${shop.slug}:`, e);
      skipped += 1;
      await sleep(200);
      continue;
    }

    console.log(`  ✓ ${shop.slug}`);
    updated += 1;
    await sleep(250);
  }

  console.log(`\nDone. Updated ${updated}, skipped ${skipped}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

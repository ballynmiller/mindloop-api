/**
 * For each coffee shop with no images (or with Unsplash placeholders when --replace-placeholders),
 * resolve a Google Place (stored googlePlaceId or text search) and attach the first Places photo.
 *
 * Requires: GOOGLE_PLACES_API_KEY (Places API New enabled)
 *
 *   pnpm backfill:google-images
 *   pnpm backfill:google-images -- --replace-placeholders
 */
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgConnectionString } from "../src/utils/pgConnectionString.js";
import {
  getFirstEstablishmentPhoto,
  isUnsplashPlaceholder,
  searchPlaceByText,
} from "../src/utils/googlePlacesPhoto.js";

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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
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
    const hasRealImage = shop.images.some((im) => !isUnsplashPlaceholder(im.url));
    const onlyPlaceholder =
      shop.images.length > 0 && shop.images.every((im) => isUnsplashPlaceholder(im.url));
    const needsImage = shop.images.length === 0 || (replacePlaceholders && onlyPlaceholder);

    if (!needsImage) {
      skipped += 1;
      continue;
    }
    if (replacePlaceholders && hasRealImage && !onlyPlaceholder) {
      skipped += 1;
      continue;
    }

    let placeId: string | null = shop.googlePlaceId?.trim() || null;
    if (!placeId) {
      const q = `${shop.name} ${shop.city} ${shop.state}`;
      try {
        placeId = await searchPlaceByText(
          q,
          apiKey,
          shop.latitude != null && shop.longitude != null
            ? {
                latitude: shop.latitude,
                longitude: shop.longitude,
                radiusMeters: 15_000,
              }
            : undefined,
        );
      } catch (e) {
        console.warn(`  search failed ${shop.slug}:`, e);
        skipped += 1;
        await sleep(150);
        continue;
      }
    }

    if (!placeId) {
      console.warn(`  no place for ${shop.slug}`);
      skipped += 1;
      await sleep(150);
      continue;
    }

    let photo: Awaited<ReturnType<typeof getFirstEstablishmentPhoto>>;
    try {
      photo = await getFirstEstablishmentPhoto(placeId, apiKey);
    } catch (e) {
      console.warn(`  photo fetch failed ${shop.slug}:`, e);
      skipped += 1;
      await sleep(200);
      continue;
    }

    if (!photo) {
      console.warn(`  no photos for ${shop.slug}`);
      skipped += 1;
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
      if (!shop.googlePlaceId) {
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
